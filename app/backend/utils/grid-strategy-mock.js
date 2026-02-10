/**
 * 网格策略 Mock 工具函数
 * 用于生成模拟的订单数据，方便测试和开发
 */

/**
 * 生成模拟订单数据
 * @param {Object} options - 订单配置参数
 * @param {string} [options.symbol='HYPEUSDT'] - 交易对
 * @param {string} [options.side='BUY'] - 买卖方向 (BUY/SELL)
 * @param {string} [options.positionSide='LONG'] - 持仓方向 (LONG/SHORT)
 * @param {string} [options.type='MARKET'] - 订单类型 (MARKET/LIMIT)
 * @param {string} [options.status='FILLED'] - 订单状态
 * @param {number} [options.quantity=5] - 交易数量
 * @param {number} [options.price] - 交易价格（如果不提供，则随机生成）
 * @param {number} [options.orderId] - 订单ID（如果不提供，则随机生成）
 * @param {string} [options.clientOrderId] - 客户端订单ID（如果不提供，则随机生成）
 * @returns {Object} 模拟订单数据
 */
function mockOrder(options = {}) {
  // 默认配置
  const defaultOptions = {
    symbol: 'HYPEUSDT',
    side: 'BUY',
    positionSide: 'LONG',
    type: 'MARKET',
    status: 'FILLED',
    quantity: 5,
    price: null,
    orderId: null,
    clientOrderId: null
  };

  // 合并配置
  const config = { ...defaultOptions, ...options };

  // 生成随机价格（如果没有提供）
  const avgPrice = config.price || (40 + Math.random() * 2).toFixed(4);

  // 生成随机订单ID（如果没有提供）
  const orderId = config.orderId || Math.floor(Math.random() * 9000000000) + 1000000000;

  // 生成随机客户端订单ID（如果没有提供）
  const clientOrderId = config.clientOrderId ||
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 9);

  // 计算总金额
  const cumQuote = (parseFloat(avgPrice) * config.quantity).toFixed(4);

  // 生成时间戳
  const currentTime = Date.now();

  // 返回模拟订单数据
  return {
    orderId,
    symbol: config.symbol,
    status: config.status,
    clientOrderId,
    price: "0.00000",  // 市价单通常为0
    avgPrice: avgPrice,
    origQty: config.quantity.toFixed(2),
    executedQty: config.quantity.toFixed(2),
    cumQuote,
    timeInForce: "GTC",
    type: config.type,
    reduceOnly: false,
    closePosition: false,
    side: config.side,
    positionSide: config.positionSide,
    stopPrice: "0.00000",
    workingType: "CONTRACT_PRICE",
    priceProtect: false,
    origType: config.type,
    priceMatch: "NONE",
    selfTradePreventionMode: "EXPIRE_MAKER",
    goodTillDate: 0,
    time: currentTime,
    updateTime: currentTime
  };
}

/**
 * 批量生成模拟订单
 * @param {number} count - 生成订单数量
 * @param {Object} baseOptions - 基础订单配置
 * @returns {Array} 模拟订单数组
 */
function mockOrders(count, baseOptions = {}) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    // 为每个订单生成不同的参数
    const orderOptions = {
      ...baseOptions,
      // 如果是批量生成，自动递增订单ID
      orderId: baseOptions.orderId ? baseOptions.orderId + i : null
    };
    orders.push(mockOrder(orderOptions));
  }
  return orders;
}

/**
 * 生成买单
 * @param {Object} options - 订单配置
 */
function mockBuyOrder(options = {}) {
  return mockOrder({ ...options, side: 'BUY' });
}

/**
 * 生成卖单
 * @param {Object} options - 订单配置
 */
function mockSellOrder(options = {}) {
  return mockOrder({ ...options, side: 'SELL' });
}

/**
 * 生成开仓订单
 * @param {Object} options - 订单配置
 */
function mockOpenPositionOrder(options = {}) {
  return mockOrder({
    ...options,
    reduceOnly: false,
    closePosition: false
  });
}

/**
 * 生成平仓订单
 * @param {Object} options - 订单配置
 */
function mockClosePositionOrder(options = {}) {
  return mockOrder({
    ...options,
    reduceOnly: true,
    closePosition: true
  });
}

/**
 * 生成做多订单
 * @param {Object} options - 订单配置
 */
function mockLongOrder(options = {}) {
  return mockOrder({
    ...options,
    positionSide: 'LONG'
  });
}

/**
 * 生成做空订单
 * @param {Object} options - 订单配置
 */
function mockShortOrder(options = {}) {
  return mockOrder({
    ...options,
    positionSide: 'SHORT'
  });
}

module.exports = {
  mockOrder,
  mockOrders,
  mockBuyOrder,
  mockSellOrder,
  mockOpenPositionOrder,
  mockClosePositionOrder,
  mockLongOrder,
  mockShortOrder
};