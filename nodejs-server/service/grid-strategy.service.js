/**
 * 网格策略服务
 * 提供网格交易策略相关的业务逻辑处理，包括策略创建、管理和执行
 */
const db = require("../models/index.js");
const fs = require("fs");
const path = require("path");
const GridStrategy = db.grid_strategies;
const User = db.users;
const InfiniteGrid = require("../plugin/umInfiniteGrid.js");
const { readLocalFile } = require("../utils/file.js");
const { sanitizeParams } = require('../utils/pick.js');   // 下文给出实现
const { mapKeys, camelCase } = require('lodash');
const { createTradeHistory } = require('./grid-trade-history.service.js');
const dayjs = require("dayjs");
const UtilRecord = require('../utils/record-log.js');
const ApiError = require("../utils/api-error");


const gridMap = {}; // 存储所有网格实例：id -> grid 实例
// 维护 symbol 订阅者集合：symbol -> Set<{ id, grid }>
const gridStrategyRegistry = new Map();
// 标记全局 tick 事件监听器是否已绑定
let tickListenerBound = false;

/**
 * 根据 api_key 和 api_secret 查询用户 ID
 * @param {string} apiKey - API密钥
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<number|null>} - 用户ID或null
 */
const getUserIdByApiKey = async (apiKey, api_secret) => {
  if (!apiKey || !api_secret) {
    return null;
  }

  const user = await User.findOne({
    where: {
      apiKey: apiKey,
      apiSecret: api_secret
    }
  });

  return user ? user.id : null;
};

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
 * 该函数使用findOrCreate方法在数据库中查找或创建网格交易策略。
 * 如果找到现有策略，则返回null；如果创建新策略，则返回新创建的策略对象。
 * @async
 * @function createGridStrategy
 * @param {Object} params - 网格策略参数
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {string} params.trading_pair - 交易对
 * @param {string} params.position_side - 持仓方向
 * @returns {Promise<Object|null>} - 如果创建新策略则返回策略对象，否则返回null
 */
const createGridStrategy = async (params) => {
  // 根据 api_key 和 api_secret 查询用户 ID
  const userId = await getUserIdByApiKey(params.api_key, params.api_secret);
  let validParams = sanitizeParams({ ...params, user_id: userId }, GridStrategy);

  const [row, created] = await GridStrategy.findOrCreate({
    where: {
      api_key: params.api_key,
      api_secret: params.api_secret,
      trading_pair: params.trading_pair,
      position_side: params.position_side,
    },
    defaults: validParams,
  });

  // 假设新创建的网格策略或者网格策略不存在时，初始化网格实例
  if (created || !gridMap[row.id]) {
    setTimeout(() => {
      let infiniteGridParams = convertKeysToCamelCase(validParams);
      infiniteGridParams.id = row.id;
      infiniteGridParams.userId = userId; // 传入 userId 以使用缓存机制
      const wealthySoon = new InfiniteGrid(infiniteGridParams);
      wealthySoon.initOrders();
      gridMap[row.id] = wealthySoon; // 存储网格实例

      const symbol = validParams.trading_pair;

      // 初始化订阅
      if (!gridStrategyRegistry.has(symbol)) {
        gridStrategyRegistry.set(symbol, new Set());
        const logMessage = `
╔══════════════════════════════════════════════════╗
                 🎉 新增一个网格订阅                  
╠══════════════════════════════════════════════════╣
 交易对: ${symbol}                      
 时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}      
 策略ID: ${row.id}           
 用户ID: ${userId ? userId : '未获取'} 
 持仓方向: ${params.position_side}      
 产品类型: ${params.exchange_type || 'u本位合约'}      
╚══════════════════════════════════════════════════╝
`;
        console.log(logMessage);
        UtilRecord.log('[grid-strategy] 新增网格订阅', {
          symbol,
          strategyId: row.id,
          userId,
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
 用户ID: ${userId ? userId : '未获取'} 
 持仓方向: ${params.position_side}      
 产品类型: ${params.exchange_type || 'u本位合约'}
 当前订阅数: ${currentCount + 1}                   
╚══════════════════════════════════════════════════╝
`;
        console.log(logMessage);
        UtilRecord.log('[grid-strategy] 复用现有网格订阅', {
          symbol,
          strategyId: row.id,
          userId,
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

      wealthySoon.onWarn = async function (data) {
        // 错误处理
        UtilRecord.log('[grid-strategy] 网格策略错误', {
          strategyId: this.config.id,
          userId: this.config.user_id,
          symbol: this.config.trading_pair,
          positionSide: this.config.position_side,
          productType: this.config.exchange_type || 'u本位合约',
          error: data,
          timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
        });
        console.error("InfiniteGrid error:", data);
      };

      // 建仓成功事件处理
      wealthySoon.onOpenPosition = async function (data) {
        // 根据持仓方向获取网格交易数量
        const gridTradeQuantity = wealthySoon.config.positionSide === 'LONG'
          ? (wealthySoon.config.gridLongOpenQuantity || wealthySoon.config.gridTradeQuantity)
          : (wealthySoon.config.gridShortOpenQuantity || wealthySoon.config.gridTradeQuantity);

        await createTradeHistory({
          grid_id: data.id, // 网格策略ID
          trading_pair: data.symbol, // 交易对
          api_key: wealthySoon.config.apiKey, // API密钥
          grid_price_difference: wealthySoon.config.gridPriceDifference, // 网格价差
          grid_trade_quantity: gridTradeQuantity, // 网格交易数量
          max_position_quantity: wealthySoon.config.maxOpenPositionQuantity || 0, // 最大持仓数量
          min_position_quantity: wealthySoon.config.minOpenPositionQuantity || 0, // 最小持仓数量
          fall_prevention_coefficient: wealthySoon.config.fallPreventionCoefficient || 0, // 防跌系数
          entry_order_id: data.orderId, // 开仓订单ID
          exit_order_id: "", // 平仓订单ID（开仓时为空）
          grid_level: 0, // 网格层级（暂时设为0）
          entry_price: data.avgPrice, // 开仓价格
          exit_price: 0, // 平仓价格（开仓时为0）
          position_quantity: data.executedQty, // 仓位数量
          profit_loss: 0, // 收益(USDT)（开仓时为0）
          profit_loss_percentage: 0, // 收益率(%)
          entry_fee: 0, // 开仓手续费（暂时设为0）
          exit_fee: 0, // 平仓手续费（开仓时为0）
          total_fee: 0, // 总手续费（暂时设为0）
          fee_asset: "USDT", // 手续费资产类型
          entry_time: new Date(data.time), // 开仓时间
          exit_time: null, // 平仓时间（开仓时为空）
          holding_period: 0, // 持仓时长(秒)（开仓时为0）
          exchange: "BINANCE", // 交易所
          exchange_type: "USDT-M", // 交易所类型
          leverage: wealthySoon.config.leverage || 20, // 杠杆倍数
          margin_type: "", // 保证金模式（暂时为空）
          margin_used: 0, // 占用保证金（暂时为0）
          realized_roe: 0, // 已实现收益率(%)
          unrealized_pnl: 0, // 未实现盈亏（暂时为0）
          liquidation_price: 0, // 强平价格（暂时为0）
          market_price: 0, // 开仓时市场价格（暂时为0）
          market_volume: 0, // 开仓时24h成交量（暂时为0）
          funding_rate: 0, // 当时资金费率(%)
          execution_delay: 0, // 执行延迟(ms)
          slippage: 0, // 滑点(%)
          retry_count: 0, // 重试次数
          error_message: "", // 错误信息
          trade_direction: data.side, // 交易方向(BUY/SELL)
          position_side: data.positionSide || null, // 持仓方向(LONG/SHORT)
          order_type: data.type, // 订单类型(MARKET/LIMIT)
          time_in_force: data.timeInForce || "GTC", // 订单有效期(GTC/IOC/FOK)
          avg_entry_price: data.avgPrice, // 平均开仓价格
          avg_exit_price: 0, // 平均平仓价格（开仓时为0）
          price_difference: 0, // 开平仓价差（开仓时为0）
          price_difference_percentage: 0, // 价差百分比(%)
          max_drawdown: 0, // 最大回撤(%)
          risk_reward_ratio: 0, // 风险收益比
          win_rate: 0, // 胜率(%)
          initial_margin: 0, // 初始保证金（暂时为0）
          maintenance_margin: 0, // 维持保证金（暂时为0）
          funding_fee: 0, // 资金费用（暂时为0）
          commission_asset: "USDT", // 手续费资产
          market_trend: "", // 市场趋势(BULLISH/BEARISH/SIDEWAYS)
          volatility: 0, // 波动率(%)
          volume_ratio: 0, // 成交量比率
          rsi_entry: 0, // 开仓时RSI值（暂时为0）
          rsi_exit: 0, // 平仓时RSI值（开仓时为0）
          ma_signal: "", // 均线信号
          execution_quality: "NORMAL", // 执行质量(EXCELLENT/GOOD/NORMAL/POOR)
          latency: 0, // 网络延迟(ms)
          partial_fill_count: 0, // 部分成交次数
          cancel_count: 0, // 撤单次数
          user_id: userId, // 用户ID
          execution_type: "WEBSOCKET", // 执行方式(HTTP/WEBSOCKET)
          status: "COMPLETED", // 状态(COMPLETED/FAILED)
          remark: "Open position" // 备注
        });
      };

      // 平仓成功事件处理
      wealthySoon.onClosePosition = async function (data) {
        try {
          // 根据持仓方向获取网格交易数量
          const gridTradeQuantity = wealthySoon.config.positionSide === 'LONG'
            ? (wealthySoon.config.gridLongCloseQuantity || wealthySoon.config.gridTradeQuantity)
            : (wealthySoon.config.gridShortCloseQuantity || wealthySoon.config.gridTradeQuantity);

          await createTradeHistory({
            grid_id: data.id, // 网格策略ID
            trading_pair: data.symbol, // 交易对
            api_key: wealthySoon.config.apiKey, // API密钥
            grid_price_difference: wealthySoon.config.gridPriceDifference, // 网格价差
            grid_trade_quantity: gridTradeQuantity, // 网格交易数量
            entry_order_id: "", // 开仓订单ID（平仓时为空）
            exit_order_id: data.orderId, // 平仓订单ID
            entry_price: 0, // 开仓价格（平仓时为0）
            exit_price: data.avgPrice, // 平仓价格
            entry_time: null, // 开仓时间（平仓时为空）
            exit_time: new Date(data.time), // 平仓时间
            trade_direction: data.side, // 交易方向(BUY/SELL)
            position_side: data.positionSide || null, // 持仓方向(LONG/SHORT)
            order_type: data.type, // 订单类型(MARKET/LIMIT)
            position_quantity: data.executedQty, // 仓位数量
            exchange: "BINANCE", // 交易所
            exchange_type: "USDT-M", // 交易所类型
            execution_type: "WEBSOCKET", // 执行方式(HTTP/WEBSOCKET)
            status: "COMPLETED", // 状态(COMPLETED/FAILED)
            remark: "Close position" // 备注
          });
        } catch (error) {
          // 移除throw，确保异步流程不被中断，只记录日志
          console.error("Error creating trade history for close position:", error);
        }
      };
    }, 0);
  }

  return { row, created };
};


async function latestMessage(params) {
  const { api_key, api_secret } = params;

  const result = await GridStrategy.findOne({
    where: { api_key, api_secret },
    order: [["id", "DESC"]], // Assuming there's a created_at field to determine the order
    limit: 1,
  });

  return result;
}

/**
 * 判断用户是否为管理员
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
const isAdmin = (user) => {
  return user?.role === 'admin' || user?.role === 'super_admin';
};

/**
 * 获取所有网格策略
 * @param {Object} filter - 查询条件
 * @param {Object} options - 分页选项
 * @param {Object} currentUser - 当前用户（来自 req.vipUser）
 * @returns {Object} 包含网格策略数据和分页信息的对象
 */
const getAllGridStrategys = async (
  filter = {},
  options = { currentPage: 1, pageSize: 10 },
  currentUser = null
) => {
  try {
    const { currentPage = 1, pageSize = 10 } = options;
    const offset = currentPage ? (currentPage - 1) * pageSize : 0;

    // 数据隔离：非管理员只能查看自己的数据
    const whereCondition = { ...filter };
    if (currentUser && !isAdmin(currentUser)) {
      whereCondition.user_id = currentUser.id;
    }

    const { count, rows } = await GridStrategy.findAndCountAll({
      where: whereCondition,
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
 *
 * @param {Object} updateBody - 更新的数据对象
 * @param {Object} currentUser - 当前用户（来自 req.vipUser）
 * @returns {Promise<Object>} - 返回更新后的网格策略对象
 */
const updateGridStrategyById = async (updateBody, currentUser = null) => {
  // 根据 api_key 和 api_secret 查询用户 ID
  const userId = await getUserIdByApiKey(updateBody.api_key, updateBody.api_secret);

  const updateBodyWithUserId = {
    ...updateBody,
    user_id: userId
  };

  let gridStrategyInstance = GridStrategy.build(updateBodyWithUserId);
  let params = gridStrategyInstance.get();
  let { id, api_key, api_secret, paused } = params;

  // 数据隔离：非管理员只能更新自己的数据
  const whereCondition = { id, api_key, api_secret };
  if (currentUser && !isAdmin(currentUser)) {
    whereCondition.user_id = currentUser.id;
  }

  const [affectedCount] = await GridStrategy.update(params, {
    where: whereCondition,
  });

  let data = undefined;
  if (affectedCount > 0) {
    data = await GridStrategy.findByPk(id);

    // 更新成功后，同步更新内存中的网格实例状态
    if (paused === true && gridMap[id]) {
      gridMap[id].onManualPausedGrid();
    }
    if (paused === false) {
      if (gridMap[id]) {
        // 内存中存在策略实例，直接恢复
        gridMap[id].onManualContinueGrid();
      } else if (data) {
        // 内存中不存在策略实例（服务重启后），需要重新创建
        UtilRecord.log('[grid-strategy] 策略实例不存在，正在重新创建...', {
          strategyId: id,
          tradingPair: data.trading_pair,
          positionSide: data.position_side
        });
        const strategyData = data.dataValues || data;
        // 调用 createGridStrategy 重新创建策略实例
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
 *
 * @param {Object} updateBody - 删除的数据对象
 * @param {Object} currentUser - 当前用户（来自 req.vipUser）
 * @returns {Promise<Object>} - 返回删除结果
 */
const deleteGridStrategyById = async (updateBody, currentUser = null) => {
  // 根据 api_key 和 api_secret 查询用户 ID
  const userId = await getUserIdByApiKey(updateBody.api_key, updateBody.api_secret);

  const updateBodyWithUserId = {
    ...updateBody,
    user_id: userId
  };

  let gridStrategyInstance = GridStrategy.build(updateBodyWithUserId);
  let params = gridStrategyInstance.get();
  let { id, api_key, api_secret } = params;

  // 数据隔离：非管理员只能删除自己的数据
  const whereCondition = { id, api_key, api_secret };
  if (currentUser && !isAdmin(currentUser)) {
    whereCondition.user_id = currentUser.id;
  }

  // 获取 symbol 用于退订引用计数
  const existed = await GridStrategy.findOne({ where: whereCondition });
  const row = await GridStrategy.destroy({
    where: whereCondition,
  });

  // 清理内存中的策略实例
  if (gridMap[id]) {
    try { gridMap[id].onManualPausedGrid(); } catch (e) { }
    delete gridMap[id];
  }

  // 清理 WebSocket 订阅（无论 gridMap[id] 是否存在都要执行）
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
        // registry 中没有记录，但仍尝试取消订阅（处理服务重启后的情况）
        UtilRecord.log('[grid-strategy] registry 中无记录，强制取消订阅', { symbol, strategyId: id });
        global.wsManager.unsubscribeMarkPrice(symbol);
      }
    }
  }

  return { status: row };
};


/**
 * 递归地将对象的所有键（key）从下划线命名法（snake_case）转换为驼峰命名法（camelCase）。
 * 支持深层嵌套对象和数组的键名转换。
 * 
 * @param {Object|Array} obj - 需要转换键名的对象或数组。如果是基本类型（如 string/number），则直接返回。
 * @returns {Object|Array} 转换后的新对象或数组，原对象不会被修改（深拷贝）。
 * 
 * @example
 * // 转换普通对象
 * const snakeCaseObj = { user_name: 'Alice', contact_info: { phone_number: '123' } };
 * const camelCaseObj = convertKeysToCamelCase(snakeCaseObj);
 * // 返回: { userName: 'Alice', contactInfo: { phoneNumber: '123' } }
 * 
 * @example
 * // 转换数组中的对象
 * const data = [{ order_id: 1 }, { order_id: 2 }];
 * convertKeysToCamelCase(data);
 * // 返回: [{ orderId: 1 }, { orderId: 2 }]
 * 
 * @example
 * // 非对象类型直接返回
 * convertKeysToCamelCase('hello_world'); // 返回 'hello_world'（字符串不会自动转换）
 * 
 * @throws {TypeError} 如果参数是 null 或 undefined（因为 typeof null === 'object'）
 */
const convertKeysToCamelCase = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  return mapKeys(obj, (value, key) => camelCase(key));
};


module.exports = {
  createGridStrategy,
  deleteGridStrategyById,
  updateGridStrategyById,
  getAllGridStrategys,
  getGridStrategyById,
  getGridStrategyByApiKey,
};
