/**
 * 网格策略服务
 * 单用户系统：API Key 即为用户标识，通过 API Key/Secret 实现数据隔离
 * 提供网格交易策略相关的业务逻辑处理，包括策略创建、管理和执行
 */
const db = require("../models/index.js");
const fs = require("fs");
const path = require("path");
const GridStrategy = db.grid_strategies;
const InfiniteGrid = require("../plugin/umInfiniteGrid.js");
const { readLocalFile } = require("../utils/file.js");
const { sanitizeParams } = require('../utils/pick.js');
const { createTradeHistory } = require('./grid-trade-history.service.js');
const dayjs = require("dayjs");
const UtilRecord = require('../utils/record-log.js');
const ApiError = require("../utils/api-error");
const usd_m_futures_infinite_grid_event_manager = require('../managers/usd-m-futures-infinite-grid-event-manager');


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
 * 创建网格交易策略
 *
 * 流程：
 * 1. 先检查是否已存在相同的策略
 * 2. 如果存在且实例运行中，直接返回
 * 3. 如果存在但实例未运行，恢复实例（服务重启场景）
 * 4. 如果不存在，创建数据库记录获得真实 ID，然后创建实例并初始化
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
const createGridStrategy = async (/** @type {{api_key: string, api_secret: string, trading_pair: string, position_side: string, exchange_type?: string}} */ params) => {
  // 单用户系统：直接使用 API Key/Secret，无需查询用户表
  let valid_params = sanitizeParams(params, GridStrategy);
  let wealthySoon; // 声明插件实例变量
  let row, created; // 声明返回值变量

  // 步骤 1: 先检查是否已存在相同的策略
  const existing = await GridStrategy.findOne({
    where: {
      api_key: params.api_key,
      api_secret: params.api_secret,
      trading_pair: params.trading_pair,
      position_side: params.position_side,
    },
  });

  if (existing) {
    // 策略已存在，检查是否已有运行实例
    if (gridMap[existing.id]) {
      // 实例已存在，直接返回
      return { row: existing, created: false };
    }

    // 策略存在但没有运行实例（可能是服务重启后恢复）
    row = existing;
    created = false;

    // 使用真实 ID 创建插件实例
    let infinite_grid_params = { ...valid_params };
    infinite_grid_params.id = row.id;
    infinite_grid_params.api_key = params.api_key;
    infinite_grid_params.secret_key = params.api_secret;

    wealthySoon = new InfiniteGrid(infinite_grid_params);

    // 初始化插件实例
    try {
      await wealthySoon.initOrders();
    } catch (error) {
      throw new Error(`网格策略初始化失败：${error.message}`);
    }

    // 添加到 gridMap
    gridMap[row.id] = wealthySoon;

    return { row, created: false };
  }

  // 步骤 2: 策略不存在，创建数据库记录获得真实 ID
  row = await GridStrategy.create({
    api_key: params.api_key,
    api_secret: params.api_secret,
    trading_pair: params.trading_pair,
    position_side: params.position_side,
    ...valid_params
  });
  created = true;

  // 步骤 3: 用真实 ID 创建 InfiniteGrid 实例
  let infinite_grid_params = { ...valid_params };
  infinite_grid_params.id = row.id;
  infinite_grid_params.api_key = params.api_key;
  infinite_grid_params.secret_key = params.api_secret;

  wealthySoon = new InfiniteGrid(infinite_grid_params);

  // 步骤 4: 初始化实例（验证 API Key、创建订单等）
  try {
    await wealthySoon.initOrders();
  } catch (error) {
    // 初始化失败，抛出错误让用户知道
    // 注意：数据库记录已创建，保留记录作为失败的证据
    throw new Error(`网格策略初始化失败：${error.message}`);
  }

  // 步骤 5: 添加到 gridMap
  gridMap[row.id] = wealthySoon;

  const symbol = valid_params.trading_pair;

  // 步骤 7: 初始化订阅
  if (!gridStrategyRegistry.has(symbol)) {
    gridStrategyRegistry.set(symbol, new Set());
    const logMessage = `
╔══════════════════════════════════════════════════╗
                 🎉 新增一个网格订阅
╠══════════════════════════════════════════════════╣
 交易对: ${symbol}
 时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
 策略ID: ${row.id}
 API Key: ${params.api_key?.substring(0, 8)}...
 持仓方向: ${params.position_side}
 产品类型: ${params.exchange_type || 'u本位合约'}
╚══════════════════════════════════════════════════╝
`;
    console.log(logMessage);
    UtilRecord.log('[grid-strategy] 新增网格订阅', {
      symbol,
      strategyId: row.id,
      api_key: params.api_key?.substring(0, 8),
      positionSide: params.position_side,
      productType: params.exchange_type || 'u本位合约',
      action: 'subscribe',
      isReused: false
    });
    global.wsManager.subscribeMarkPrice(symbol);
  } else {
    const currentCount = gridStrategyRegistry.get(symbol).size;
    const logMessage = `
╔══════════════════════════════════════════════════╗
                 🔄 复用现有网格订阅
╠══════════════════════════════════════════════════╣
 交易对: ${symbol}
 时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
 策略ID: ${row.id}
 API Key: ${params.api_key?.substring(0, 8)}...
 持仓方向: ${params.position_side}
 产品类型: ${params.exchange_type || 'u本位合约'}
 当前订阅数: ${currentCount + 1}
╚══════════════════════════════════════════════════╝
`;
    console.log(logMessage);
    UtilRecord.log('[grid-strategy] 复用现有网格订阅', {
      symbol,
      strategyId: row.id,
      api_key: params.api_key?.substring(0, 8),
      positionSide: params.position_side,
      productType: params.exchange_type || 'u本位合约',
      action: 'subscribe',
      isReused: true,
      currentSubscribers: currentCount
    });
  }

  // 添加策略实例
  gridStrategyRegistry.get(symbol).add({ id: row.id, grid: wealthySoon });

  // 绑定全局 WS 分发器（仅绑定一次，避免重复监听）
  if (!tickListenerBound) {
    tickListenerBound = true;
    UtilRecord.log('[grid-strategy] 绑定全局 tick 事件监听器');
    global.wsManager.on("tick", ({ symbol, latestPrice }) => {
      const subs = gridStrategyRegistry.get(symbol);
      if (!subs || subs.size === 0) return;
      UtilRecord.debug(`[grid-strategy] tick 事件分发: ${symbol} @ ${latestPrice}, 订阅者数量: ${subs.size}`);
      subs.forEach(({ grid }) => {
        try {
          grid.gridWebsocket({ latestPrice });
        } catch (e) {
          UtilRecord.error(`[grid-strategy] gridWebsocket 执行错误`, e);
        }
      });
    });
  }

  // 绑定错误处理事件
  wealthySoon.onWarn = async function (data) {
    UtilRecord.log('[grid-strategy] 网格策略错误', {
      strategyId: this.config.id,
      api_key: this.config.api_key?.substring(0, 8),
      symbol: this.config.trading_pair,
      positionSide: this.config.position_side,
      productType: this.config.exchange_type || 'u本位合约',
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
  wealthySoon.onOpenPosition = async function (data) {
    const gridTradeQuantity = wealthySoon.config.position_side === 'LONG'
      ? (wealthySoon.config.grid_long_open_quantity || wealthySoon.config.grid_trade_quantity)
      : (wealthySoon.config.grid_short_open_quantity || wealthySoon.config.grid_trade_quantity);

    await createTradeHistory({
      grid_id: data.id,
      trading_pair: data.symbol,
      api_key: wealthySoon.config.api_key,
      grid_price_difference: wealthySoon.config.grid_price_difference,
      grid_trade_quantity: gridTradeQuantity,
      max_position_quantity: wealthySoon.config.max_open_position_quantity || 0,
      min_position_quantity: wealthySoon.config.min_open_position_quantity || 0,
      fall_prevention_coefficient: wealthySoon.config.fall_prevention_coefficient || 0,
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
      exchange_type: "USDT-M",
      leverage: wealthySoon.config.leverage || 20,
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
      strategyId: parseInt(wealthySoon.config.id),
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
  wealthySoon.onClosePosition = async function (data) {
    const gridTradeQuantity = wealthySoon.config.position_side === 'LONG'
      ? (wealthySoon.config.grid_long_close_quantity || wealthySoon.config.grid_trade_quantity)
      : (wealthySoon.config.grid_short_close_quantity || wealthySoon.config.grid_trade_quantity);

    await createTradeHistory({
      grid_id: data.id,
      trading_pair: data.symbol,
      api_key: wealthySoon.config.api_key,
      grid_price_difference: wealthySoon.config.grid_price_difference,
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
      exchange_type: "USDT-M",
      leverage: wealthySoon.config.leverage || 20,
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
      strategyId: parseInt(wealthySoon.config.id),
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

  return { row, created: true };
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

    return {
      list: rows,
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
 * 根据ID删除网格策略的sql数据
 * 单用户系统：通过 api_key + api_secret 实现数据隔离
 *
 * @param {Object} updateBody - 删除的数据对象
 * @returns {Promise<Object>} - 返回删除结果
 */
const deleteGridStrategyById = async (updateBody) => {
  let grid_strategy_instance = GridStrategy.build(updateBody);
  let params = grid_strategy_instance.get();
  let { id, api_key, api_secret } = params;

  const whereCondition = { id, api_key, api_secret };

  const existed = await GridStrategy.findOne({ where: whereCondition });
  const row = await GridStrategy.destroy({
    where: whereCondition,
  });

  if (gridMap[id]) {
    try { gridMap[id].onManualPausedGrid(); } catch (e) {
      console.error(`[grid-strategy] 清理策略 ${id} 时出错:`, e);
      // 忽略清理策略时的错误，继续执行删除逻辑
    }
    delete gridMap[id];
  }

  if (row) {
    const symbol = existed?.trading_pair || existed?.symbol;
    UtilRecord.log('[grid-strategy] 删除策略，准备清理订阅', {
      strategyId: id,
      symbol,
      registryHasSymbol: gridStrategyRegistry.has(symbol),
      registrySize: gridStrategyRegistry.get(symbol)?.size || 0
    });
    if (symbol) {
      const subs = gridStrategyRegistry.get(symbol);
      if (subs) {
        for (const item of subs) {
          if (item.id === id) { subs.delete(item); break; }
        }
        UtilRecord.log('[grid-strategy] 清理后订阅者数量', { symbol, remaining: subs.size });
        if (subs.size === 0) {
          gridStrategyRegistry.delete(symbol);
          global.wsManager.unsubscribeMarkPrice(symbol);
          UtilRecord.log('[grid-strategy] 已取消订阅', { symbol, strategyId: id });
        }
      } else {
        UtilRecord.log('[grid-strategy] registry 中无记录，强制取消订阅', { symbol, strategyId: id });
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
