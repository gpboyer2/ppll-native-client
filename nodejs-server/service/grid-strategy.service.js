/**
 * 网格策略服务
 * 单用户系统：API Key 即为用户标识，通过 API Key/Secret 实现数据隔离
 * 提供网格交易策略相关的业务逻辑处理，包括策略创建、管理和执行
 */
const db = require("../models/index.js");
const fs = require("fs");
const path = require("path");
const GridStrategy = db.grid_strategies;
const { readLocalFile } = require("../utils/file.js");
const { sanitizeParams } = require('../utils/pick.js');
const { createTradeHistory } = require('./grid-trade-history.service.js');
const dayjs = require("dayjs");
const UtilRecord = require('../utils/record-log.js');
const ApiError = require("../utils/api-error");
const usd_m_futures_infinite_grid_event_manager = require('../managers/usd-m-futures-infinite-grid-event-manager');
const execution_status = require('../constants/grid-strategy-status-map');


/**
 * 根据 trading_mode 动态获取网格插件
 * @param {string} trading_mode - 交易模式 ('spot' 现货, 'usdt_futures' U本位合约, 'coin_futures' B本位合约)
 * @returns {Object} 网格插件类
 * @throws {Error} 不支持的 trading_mode 时抛出错误
 */
const getGridPlugin = (trading_mode) => {
  switch (trading_mode) {
    case 'spot':
      return require('../plugin/spotInfiniteGrid.js');
    case 'usdt_futures':
      return require('../plugin/umInfiniteGrid.js');
    case 'coin_futures':
      return require('../plugin/cmInfiniteGrid.js');
    default:
      throw new Error(`不支持的 trading_mode: ${trading_mode}，仅支持 'spot'、'usdt_futures' 和 'coin_futures'`);
  }
};


global.gridMap = global.gridMap || {}; // 存储所有网格实例：id -> grid 实例
const gridMap = global.gridMap;
// 维护 symbol 订阅者集合：symbol -> Set<{ id, grid }>
const gridStrategyRegistry = new Map();
// 标记全局 tick 事件监听器是否已绑定
let tickListenerBound = false;

/**
 * 错误与关闭处理：移除订阅者，必要时退订
 * @param {string} symbol - 交易对符号
 * @param {number} id - 网格策略ID
 * @param {string} remark - 备注信息，如 "error" 或 "closed"
 */
const cleanupSubscriber = async (symbol, id, remark) => {
  try {
    const subs = gridStrategyRegistry.get(symbol);
    if (subs) {
      for (const item of subs) {
        if (item.id === id) {
          subs.delete(item);
          break;
        }
      }
      if (subs.size === 0) {
        gridStrategyRegistry.delete(symbol);
        global.wsManager.unsubscribeMarkPrice(symbol);
      }
    }
    await GridStrategy.update(
      { remark },
      { where: { id } }
    );
  } catch (e) {
    console.error("cleanupSubscriber error:", e);
  }
};

/**
 * 验证和清洗参数
 * @param {Object} params - 原始参数
 * @returns {Promise<Object>} - 验证后的参数
 */
async function validateAndSanitizeParams(params) {
  try {
    const valid_params = sanitizeParams(params, GridStrategy);
    return valid_params;
  } catch (error) {
    console.log(`[grid-strategy] ❌ sanitizeParams 失败:`, error.message);
    throw error;
  }
}

/**
 * 查找或创建策略（核心逻辑）
 * @param {Object} params - 包含 valid_params 和原始 params 的对象
 * @returns {Promise<Object>} - 返回 { row, created, instance }
 */
async function findOrCreateStrategy(params) {
  const { valid_params } = params;
  const { api_key, api_secret, trading_pair, position_side, trading_mode } = params.original;

  // 必填校验
  if (!trading_mode) {
    throw new Error('trading_mode 是必填字段');
  }

  // 根据 trading_mode 选择插件
  const InfiniteGrid = getGridPlugin(trading_mode);

  // 先检查是否已存在
  const existing = await GridStrategy.findOne({
    where: { api_key, api_secret, trading_pair, position_side }
  });

  if (existing) {
    // 已存在，恢复实例
    if (gridMap[existing.id]) {
      return { row: existing, created: false, instance: gridMap[existing.id] };
    }

    // 恢复实例
    let instance_params = { ...valid_params };
    instance_params.id = existing.id;
    instance_params.api_key = api_key;
    instance_params.api_secret = api_secret;

    const instance = new InfiniteGrid(instance_params);

    // 启动插件实例
    try {
      await instance.start();
    } catch (error) {
      console.error('[grid-strategy.service] 插件实例启动失败:', error);
      throw new Error(`网格策略初始化失败：${error.message}`);
    }

    // 添加到 gridMap
    gridMap[existing.id] = instance;

    return { row: existing, created: false, instance };
  }

  // 不存在，调用插件创建方法（内部负责数据库创建）
  try {
    const instance = await InfiniteGrid.create(params.original);
    gridMap[instance.config.id] = instance;

    // 查询数据库记录
    const row = await GridStrategy.findByPk(instance.config.id);
    return { row, created: true, instance };
  } catch (error) {
    console.error('[grid-strategy.service] InfiniteGrid.create 失败:', error);
    throw new Error(`网格策略创建失败：${error.message}`);
  }
}

/**
 * 设置订阅
 * @param {Object} row - 数据库记录
 * @param {Object} params - 包含 valid_params 和 instance 的对象
 */
async function setupSubscription(row, params) {
  const { valid_params, instance } = params;
  const symbol = valid_params.trading_pair;

  if (!gridStrategyRegistry.has(symbol)) {
    gridStrategyRegistry.set(symbol, new Set());
    UtilRecord.log('[grid-strategy] 新增网格订阅', {
      symbol,
      strategyId: row.id,
      api_key: valid_params.api_key?.substring(0, 8),
      positionSide: valid_params.position_side,
      productType: valid_params.trading_mode,
      action: 'subscribe',
      isReused: false
    });
    global.wsManager.subscribeMarkPrice(symbol);
  } else {
    const currentCount = gridStrategyRegistry.get(symbol).size;
    UtilRecord.log('[grid-strategy] 复用现有网格订阅', {
      symbol,
      strategyId: row.id,
      api_key: valid_params.api_key?.substring(0, 8),
      positionSide: valid_params.position_side,
      productType: valid_params.trading_mode,
      action: 'subscribe',
      isReused: true,
      currentSubscribers: currentCount
    });
  }

  // 添加策略实例
  gridStrategyRegistry.get(symbol).add({ id: row.id, grid: instance });
}

/**
 * 绑定事件处理器
 * @param {Object} row - 数据库记录
 * @param {Object} params - 包含 valid_params 和 instance 的对象
 */
async function bindEventHandlers(row, params) {
  const { instance } = params;

  // 绑定错误处理事件
  instance.onWarn = async function (data) {
    UtilRecord.log('[grid-strategy] 网格策略错误', {
      strategyId: this.config.id,
      api_key: this.config.api_key?.substring(0, 8),
      symbol: this.config.trading_pair,
      positionSide: this.config.position_side,
      productType: this.config.trading_mode,
      error: data,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
    console.error("InfiniteGrid error:", data);

    // 记录到插件事件管理器
    await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategyId: parseInt(this.config.id),
      tradingPair: this.config.trading_pair,
      eventType: usd_m_futures_infinite_grid_event_manager.eventTypes.WARN,
      level: 'warn',
      message: data.message || '网格策略警告',
      details: data,
    });
  };

  // 绑定建仓成功事件
  instance.onOpenPosition = async function (data) {
    const gridTradeQuantity = instance.config.position_side === 'LONG'
      ? (instance.config.grid_long_open_quantity || instance.config.grid_trade_quantity)
      : (instance.config.grid_short_open_quantity || instance.config.grid_trade_quantity);

    await createTradeHistory({
      grid_id: data.id,
      trading_pair: data.symbol,
      api_key: instance.config.api_key,
      grid_price_difference: instance.config.grid_price_difference,
      grid_trade_quantity: gridTradeQuantity,
      max_position_quantity: instance.config.max_open_position_quantity || 0,
      min_position_quantity: instance.config.min_open_position_quantity || 0,
      fall_prevention_coefficient: instance.config.fall_prevention_coefficient || 0,
      entry_order_id: data.orderId,
      exit_order_id: "",
      grid_level: 0,
      entry_price: data.avgPrice,
      exit_price: 0,
      position_quantity: data.executedQty,
      profit_loss: 0,
      profit_loss_percentage: 0,
      entry_fee: 0,
      exit_fee: 0,
      total_fee: 0,
      fee_asset: "USDT",
      entry_time: new Date(data.time),
      exit_time: null,
      holding_period: 0,
      exchange: "BINANCE",
      trading_mode: instance.config.trading_mode,
      leverage: instance.config.leverage || 20,
      margin_type: "",
      margin_used: 0,
      realized_roe: 0,
      unrealized_pnl: 0,
      liquidation_price: 0,
      market_price: 0,
      market_volume: 0,
      funding_rate: 0,
      execution_delay: 0,
      slippage: 0,
      retry_count: 0,
      error_message: "",
      trade_direction: data.side,
      position_side: data.position_side || null,
      order_type: data.type,
      time_in_force: data.timeInForce || "GTC",
      avg_entry_price: data.avgPrice,
      avg_exit_price: 0,
      price_difference: 0,
      price_difference_percentage: 0,
      max_drawdown: 0,
      risk_reward_ratio: 0,
      win_rate: 0,
      initial_margin: 0,
      maintenance_margin: 0,
      funding_fee: 0,
      commission_asset: "USDT",
      market_trend: "",
      volatility: 0,
      volume_ratio: 0,
      rsi_entry: 0,
      rsi_exit: 0,
      ma_signal: "",
      execution_quality: "NORMAL",
      latency: 0,
      partial_fill_count: 0,
      cancel_count: 0,
      execution_type: "WEBSOCKET",
      status: "COMPLETED",
      remark: "Open position"
    }).catch((err) => {
      console.error("Error creating trade history for open position:", err);
    });

    // 记录建仓事件到插件事件管理器
    await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategyId: parseInt(instance.config.id),
      tradingPair: data.symbol,
      eventType: usd_m_futures_infinite_grid_event_manager.eventTypes.OPEN_POSITION,
      level: 'success',
      message: `建仓成功: ${data.side} ${data.executedQty} @ ${data.avgPrice}`,
      details: {
        side: data.side,
        quantity: data.executedQty,
        price: data.avgPrice,
        order_id: data.orderId,
        position_side: data.position_side,
      },
    });
  };

  // 绑定平仓成功事件
  instance.onClosePosition = async function (data) {
    const gridTradeQuantity = instance.config.position_side === 'LONG'
      ? (instance.config.grid_long_close_quantity || instance.config.grid_trade_quantity)
      : (instance.config.grid_short_close_quantity || instance.config.grid_trade_quantity);

    await createTradeHistory({
      grid_id: data.id,
      trading_pair: data.symbol,
      api_key: instance.config.api_key,
      grid_price_difference: instance.config.grid_price_difference,
      grid_trade_quantity: gridTradeQuantity,
      entry_order_id: "",
      exit_order_id: data.orderId,
      grid_level: 0,
      entry_price: 0,
      exit_price: data.avgPrice,
      position_quantity: data.executedQty,
      profit_loss: 0,
      profit_loss_percentage: 0,
      entry_fee: 0,
      exit_fee: 0,
      total_fee: 0,
      fee_asset: "USDT",
      entry_time: null,
      exit_time: new Date(data.time),
      holding_period: 0,
      exchange: "BINANCE",
      trading_mode: instance.config.trading_mode,
      leverage: instance.config.leverage || 20,
      margin_type: "",
      margin_used: 0,
      realized_roe: 0,
      unrealized_pnl: 0,
      liquidation_price: 0,
      market_price: 0,
      market_volume: 0,
      funding_rate: 0,
      execution_delay: 0,
      slippage: 0,
      retry_count: 0,
      error_message: "",
      trade_direction: data.side,
      position_side: data.position_side || null,
      order_type: data.type,
      time_in_force: data.timeInForce || "GTC",
      execution_type: "WEBSOCKET",
      status: "COMPLETED",
      remark: "Close position"
    }).catch((err) => {
      console.error("Error creating trade history for close position:", err);
    });

    // 记录平仓事件到插件事件管理器
    await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategyId: parseInt(instance.config.id),
      tradingPair: data.symbol,
      eventType: usd_m_futures_infinite_grid_event_manager.eventTypes.CLOSE_POSITION,
      level: 'success',
      message: `平仓成功: ${data.side} ${data.executedQty} @ ${data.avgPrice}`,
      details: {
        side: data.side,
        quantity: data.executedQty,
        price: data.avgPrice,
        order_id: data.orderId,
        position_side: data.position_side,
      },
    });
  };
}

/**
 * 绑定全局 tick 监听器
 */
function bindGlobalTickListener() {
  if (tickListenerBound) {
    return;
  }

  tickListenerBound = true;
  UtilRecord.log('[grid-strategy] 绑定全局 tick 事件监听器');
  global.wsManager.on("tick", ({ symbol, latestPrice }) => {
    const subs = gridStrategyRegistry.get(symbol);
    if (!subs || subs.size === 0) {
      // 静默处理没有订阅者的情况
      return;
    }
    subs.forEach(({ grid }) => {
      try {
        grid.gridWebsocket({ latestPrice });
      } catch (e) {
        UtilRecord.error(`[grid-strategy] gridWebsocket 执行错误`, e);
      }
    });
  });
  console.log(`[grid-strategy] ✅ tick 事件监听器绑定完成`);
}

/**
 * 创建网格交易策略
 *
 * 流程：
 * 1. 验证和清洗参数
 * 2. 查找或创建策略（核心逻辑）
 * 3. 设置订阅
 * 4. 绑定事件处理器
 * 5. 绑定全局 tick 监听器
 *
 * 单用户系统：API Key 即为用户标识，通过 api_key + api_secret 实现数据隔离
 * @async
 * @function createGridStrategy
 * @param {Object} params - 网格策略参数
 * @param {string} params.api_key - API密钥（用户标识）
 * @param {string} params.api_secret - API密钥Secret
 * @param {string} params.trading_pair - 交易对
 * @param {string} params.position_side - 持仓方向
 * @returns {Promise<Object>} - 返回创建的策略对象和是否创建成功的标记
 */
const createGridStrategy = async (/** @type {{api_key: string, api_secret: string, trading_pair: string, position_side: string, trading_mode?: string}} */ params) => {
  // 步骤1: 验证和清洗参数
  const valid_params = await validateAndSanitizeParams(params);

  // 步骤2: 查找或创建策略（核心逻辑）
  const { row, created, instance } = await findOrCreateStrategy({
    valid_params,
    original: params
  });

  // 步骤3: 设置订阅
  await setupSubscription(row, { valid_params, instance });

  // 步骤4: 绑定事件处理器
  await bindEventHandlers(row, { valid_params, instance });

  // 步骤5: 绑定全局 tick 监听器
  bindGlobalTickListener();

  return { row, created };
};

async function latestMessage(params) {
  const { api_key, api_secret } = params;

  const result = await GridStrategy.findOne({
    where: { api_key, api_secret },
    order: [["id", "DESC"]],
    limit: 1,
  });

  return result;
}

/**
 * 获取所有网格策略
 * 单用户系统：通过 api_key + api_secret 实现数据隔离
 * @param {Object} filter - 查询条件
 * @param {Object} options - 分页选项
 * @returns {Promise<any>} 包含网格策略数据和分页信息的对象
 */
const getAllGridStrategys = async (
  filter = {},
  options = { currentPage: 1, pageSize: 10 }
) => {
  try {
    const { currentPage = 1, pageSize = 10 } = options;
    const offset = currentPage ? (currentPage - 1) * pageSize : 0;

    const { count, rows } = await GridStrategy.findAndCountAll({
      where: filter,
      limit: pageSize,
      offset,
      order: [["id", "DESC"]],
    });

    // 合并运行中策略的实时数据
    const list_with_runtime_data = rows.map(row => {
      const row_data = row.toJSON();
      const running_instance = gridMap[row.id];

      if (running_instance) {
        // 从运行中的插件实例获取实时数据
        return {
          ...row_data,
          total_open_position_quantity: running_instance.total_open_position_quantity ?? row_data.total_open_position_quantity,
          total_open_position_value: running_instance.total_open_position_value ?? row_data.total_open_position_value,
          total_open_position_entry_price: running_instance.total_open_position_entry_price ?? row_data.total_open_position_entry_price,
        };
      }

      return row_data;
    });

    return {
      list: list_with_runtime_data,
      pagination: {
        total: count,
        currentPage,
        pageSize
      }
    };
  } catch (error) {
    console.error("⚠️ 获取网格策略失败:", error);
    if (error instanceof ApiError) throw error;
    return {
      list: [],
      pagination: {
        total: 0,
        currentPage: 1,
        pageSize: 10
      }
    };
  }
};

const getGridStrategyById = async (id) => {
  return GridStrategy.findOne({ where: { id } });
};

const getGridStrategyByApiKey = async (api_key, api_secret) => {
  return GridStrategy.findOne({ where: { api_key, api_secret } });
};

/**
 * 根据ID更新网格策略的sql数据
 * 单用户系统：通过 api_key + api_secret 实现数据隔离
 *
 * @param {Object} updateBody - 更新的数据对象
 * @returns {Promise<Object>} - 返回更新后的网格策略对象
 */
const updateGridStrategyById = async (updateBody) => {
  let grid_strategy_instance = GridStrategy.build(updateBody);
  let params = grid_strategy_instance.get();
  let { id, api_key, api_secret, paused } = params;

  const whereCondition = { id, api_key, api_secret };

  // 获取当前策略数据，用于状态校验
  const currentStrategy = await GridStrategy.findOne({ where: whereCondition });
  if (!currentStrategy) {
    return { affectedCount: 0, data: null };
  }

  // 状态校验：不允许对已停止或已删除的策略进行暂停/恢复操作
  if (paused !== undefined && (currentStrategy.status === 'STOPPED' || currentStrategy.status === 'DELETED')) {
    throw new Error(`无法${paused ? '暂停' : '恢复'}策略：策略状态为 ${currentStrategy.status}`);
  }

  // 同步更新 execution_status 字段
  if (paused === true) {
    params.execution_status = execution_status.PAUSED_MANUAL;
  } else if (paused === false) {
    params.execution_status = execution_status.TRADING;
  }

  const [affectedCount] = await GridStrategy.update(params, {
    where: whereCondition,
  });

  let data = undefined;
  if (affectedCount > 0) {
    data = await GridStrategy.findByPk(id);

    if (paused === true && gridMap[id]) {
      gridMap[id].onManualPausedGrid();
    }
    if (paused === false) {
      if (gridMap[id]) {
        gridMap[id].onManualContinueGrid();
      } else if (data) {
        UtilRecord.log('[grid-strategy] 策略实例不存在，正在重新创建...', {
          strategyId: id,
          tradingPair: data.trading_pair,
          positionSide: data.position_side
        });
        const strategyData = data.dataValues || data;
        await createGridStrategy({
          ...strategyData,
          trading_pair: strategyData.trading_pair,
          position_side: strategyData.position_side
        });
        UtilRecord.log('[grid-strategy] 策略实例重新创建成功', { strategyId: id });
      }
    }
  }

  return { affectedCount, data };
};

/**
 * 根据ID删除网格策略的sql数据（支持批量）
 * 单用户系统：通过 api_key + api_secret 实现数据隔离
 *
 * @param {Object} updateBody - 删除的数据对象
 * @param {number[]} updateBody.id - 策略ID数组
 * @param {string} updateBody.api_key - API密钥
 * @param {string} updateBody.api_secret - API密钥Secret
 * @returns {Promise<Object>} - 返回删除结果
 */
const deleteGridStrategyById = async (updateBody) => {
  let { id, api_key, api_secret } = updateBody;

  // id 必须是数组
  const id_list = Array.isArray(id) ? id : [id];

  if (id_list.length === 0) {
    return { status: 0 };
  }

  // 1. 先查询所有要删除的策略记录，用于后续清理订阅
  const strategies = await GridStrategy.findAll({
    where: {
      id: id_list,
      api_key,
      api_secret,
    },
  });

  if (strategies.length === 0) {
    return { status: 0 };
  }

  // 2. 停止所有运行中的策略并清理事件监听器
  for (const strategy_id of id_list) {
    if (gridMap[strategy_id]) {
      try {
        // 暂停网格策略
        gridMap[strategy_id].onManualPausedGrid();
      } catch (e) {
        console.error(`[grid-strategy] 清理策略 ${strategy_id} 时出错:`, e);
        // 忽略清理策略时的错误，继续执行删除逻辑
      }

      // 清理事件监听器
      if (gridMap[strategy_id].onWarn) {
        gridMap[strategy_id].onWarn = null;
      }
      if (gridMap[strategy_id].onOpenPosition) {
        gridMap[strategy_id].onOpenPosition = null;
      }
      if (gridMap[strategy_id].onClosePosition) {
        gridMap[strategy_id].onClosePosition = null;
      }

      delete gridMap[strategy_id];
    }
  }

  // 3. 批量删除数据库记录
  const row = await GridStrategy.destroy({
    where: {
      id: id_list,
      api_key,
      api_secret,
    },
  });

  // 4. 清理订阅
  for (const strategy of strategies) {
    const symbol = strategy?.trading_pair || strategy?.symbol;
    const strategy_id = strategy.id;

    UtilRecord.log('[grid-strategy] 删除策略，准备清理订阅', {
      strategyId: strategy_id,
      symbol,
      registryHasSymbol: gridStrategyRegistry.has(symbol),
      registrySize: gridStrategyRegistry.get(symbol)?.size || 0
    });

    if (symbol) {
      const subs = gridStrategyRegistry.get(symbol);
      if (subs) {
        for (const item of subs) {
          if (item.id === strategy_id) { subs.delete(item); break; }
        }
        UtilRecord.log('[grid-strategy] 清理后订阅者数量', { symbol, remaining: subs.size });
        if (subs.size === 0) {
          gridStrategyRegistry.delete(symbol);
          global.wsManager.unsubscribeMarkPrice(symbol);
          UtilRecord.log('[grid-strategy] 已取消订阅', { symbol, strategyId: strategy_id });
        }
      } else {
        UtilRecord.log('[grid-strategy] registry 中无记录，强制取消订阅', { symbol, strategyId: strategy_id });
        global.wsManager.unsubscribeMarkPrice(symbol);
      }
    }
  }

  return { status: row };
};


module.exports = {
  createGridStrategy,
  deleteGridStrategyById,
  updateGridStrategyById,
  getAllGridStrategys,
  getGridStrategyById,
  getGridStrategyByApiKey,
};
