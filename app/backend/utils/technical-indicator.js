/**
 * 技术指标计算模块
 * 包含各种常用技术指标的计算函数
 */

const BigNumber = require('bignumber.js');

// ============================================================
// 移动平均线 (MA)
// ============================================================

/**
 * 计算简单移动平均线 (SMA)
 * @param {Array} klineList - K线数据列表
 * @param {number} period - 周期，默认20
 * @returns {number} MA值
 */
const calculateMA = (klineList, period = 20) => {
  if (klineList.length < period) {
    // 数据不足，使用所有数据的平均值
    const closeList = klineList.map(k => k.close);
    return closeList.reduce((a, b) => a + b, 0) / closeList.length;
  }

  // 取最后period根K线计算MA
  const recentCloseList = klineList.slice(-period).map(k => k.close);
  return recentCloseList.reduce((a, b) => a + b, 0) / recentCloseList.length;
};

/**
 * 计算指数移动平均线 (EMA)
 * @param {Array} klineList - K线数据列表
 * @param {number} period - 周期，默认12
 * @returns {number} EMA值
 */
const calculateEMA = (klineList, period = 12) => {
  if (klineList.length === 0) return 0;

  const closeList = klineList.map(k => k.close);
  const multiplier = 2 / (period + 1);

  // 初始EMA使用SMA
  let ema = closeList.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // 从第period个数据开始计算EMA
  for (let i = period; i < closeList.length; i++) {
    ema = (closeList[i] - ema) * multiplier + ema;
  }

  return ema;
};

/**
 * 计算EMA序列（用于MACD等）
 * @param {Array} priceList - 价格列表
 * @param {number} period - 周期
 * @returns {Array} EMA序列
 */
const calculateEMASequence = (priceList, period) => {
  if (priceList.length === 0) return [];

  const emaList = [];
  const multiplier = 2 / (period + 1);

  // 初始EMA使用SMA
  let ema = priceList.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < priceList.length; i++) {
    if (i < period - 1) {
      emaList.push(undefined);
    } else if (i === period - 1) {
      emaList.push(ema);
    } else {
      ema = (priceList[i] - ema) * multiplier + ema;
      emaList.push(ema);
    }
  }

  return emaList;
};

// ============================================================
// 布林带 (Bollinger Bands)
// ============================================================

/**
 * 计算布林带
 * @param {Array} klineList - K线数据列表
 * @param {number} period - 周期，默认20
 * @param {number} stdDevMultiplier - 标准差倍数，默认2
 * @returns {Object} { upper, lower, middle }
 */
const calculateBollingerBands = (klineList, period = 20, stdDevMultiplier = 2) => {
  const closeList = klineList.map(k => k.close);
  const middle = closeList.reduce((a, b) => a + b, 0) / closeList.length;

  const variance = closeList.reduce((sum, price) => {
    return sum + Math.pow(price - middle, 2);
  }, 0) / closeList.length;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDevMultiplier * stdDev,
    lower: middle - stdDevMultiplier * stdDev,
    middle,
    stdDev
  };
};

// ============================================================
// ATR (Average True Range)
// ============================================================

/**
 * 计算ATR（平均真实波幅）
 * 
 * ATR用于衡量市场波动性，是止损和网格间距的重要参考
 * 
 * @param {Array} klineList - K线数据
 * @param {number} period - 计算周期，默认14根K线
 * @returns {number} ATR值（单位与价格相同）
 */
const calculateATR = (klineList, period = 14) => {
  if (klineList.length < period + 1) {
    // 数据不足，使用简化计算
    const rangeList = klineList.map(k => k.high - k.low);
    return rangeList.reduce((a, b) => a + b, 0) / rangeList.length;
  }

  const trList = [];
  for (let i = 1; i < klineList.length; i++) {
    const current = klineList[i];
    const prev = klineList[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trList.push(tr);
  }

  // 计算ATR（简单移动平均）
  const recentTR = trList.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
};

// ============================================================
// MACD (Moving Average Convergence Divergence)
// ============================================================

/**
 * 计算MACD
 * @param {Array} klineList - K线数据列表
 * @param {number} fastPeriod - 快线周期，默认12
 * @param {number} slowPeriod - 慢线周期，默认26
 * @param {number} signalPeriod - 信号线周期，默认9
 * @returns {Object} { macd, signal, histogram }
 */
const calculateMACD = (klineList, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const closeList = klineList.map(k => k.close);

  // 计算快线和慢线EMA
  const fastEMA = calculateEMASequence(closeList, fastPeriod);
  const slowEMA = calculateEMASequence(closeList, slowPeriod);

  // 计算DIF (MACD线)
  const difList = [];
  for (let i = 0; i < closeList.length; i++) {
    if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
      difList.push(fastEMA[i] - slowEMA[i]);
    } else {
      difList.push(undefined);
    }
  }

  // 过滤掉undefined值用于计算信号线
  const validDifList = difList.filter(v => v !== undefined);
  const signalEMA = calculateEMASequence(validDifList, signalPeriod);

  // 获取最新值
  const macd = validDifList[validDifList.length - 1] || 0;
  const signal = signalEMA[signalEMA.length - 1] || 0;
  const histogram = macd - signal;

  return {
    macd,
    signal,
    histogram,
    // 完整序列（供图表使用）
    difList: validDifList,
    signalList: signalEMA
  };
};

// ============================================================
// RSI (Relative Strength Index)
// ============================================================

/**
 * 计算RSI
 * @param {Array} klineList - K线数据列表
 * @param {number} period - 周期，默认14
 * @returns {number} RSI值 (0-100)
 */
const calculateRSI = (klineList, period = 14) => {
  if (klineList.length < period + 1) {
    return 50; // 数据不足返回中性值
  }

  const closeList = klineList.map(k => k.close);
  let gainSum = 0;
  let lossSum = 0;

  // 计算涨跌
  for (let i = closeList.length - period; i < closeList.length; i++) {
    const change = closeList[i] - closeList[i - 1];
    if (change > 0) {
      gainSum += change;
    } else {
      lossSum += Math.abs(change);
    }
  }

  const avgGain = gainSum / period;
  const avgLoss = lossSum / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
};

// ============================================================
// 波动率计算
// ============================================================

/**
 * 计算价格波动率
 * @param {Array} klineList - K线数据列表
 * @returns {number} 波动率（0-1之间的小数）
 */
const calculateVolatility = (klineList) => {
  const closeList = klineList.map(k => k.close);
  const avgPrice = closeList.reduce((a, b) => a + b, 0) / closeList.length;

  const variance = closeList.reduce((sum, price) => {
    return sum + Math.pow(price - avgPrice, 2);
  }, 0) / closeList.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / avgPrice;
};

/**
 * 获取波动率评级
 * @param {number} volatility - 波动率
 * @returns {Object} { level, advice }
 */
const getVolatilityRating = (volatility) => {
  if (volatility > 0.05) {
    return {
      level: '高',
      advice: '非常适合做网格，交易机会多'
    };
  } else if (volatility > 0.02) {
    return {
      level: '中',
      advice: '适合做网格'
    };
  } else {
    return {
      level: '低',
      advice: '波动较小，可能亏手续费'
    };
  }
};

// ============================================================
// 价格统计
// ============================================================

/**
 * 计算K线数据的基础统计信息
 * @param {Array} klineList - K线数据列表
 * @returns {Object} 统计信息
 */
const calculatePriceStats = (klineList) => {
  const highList = klineList.map(k => k.high);
  const lowList = klineList.map(k => k.low);
  const closeList = klineList.map(k => k.close);
  const volumeList = klineList.map(k => k.volume);

  const maxHigh = Math.max(...highList);
  const minLow = Math.min(...lowList);
  const avgPrice = closeList.reduce((a, b) => a + b, 0) / closeList.length;
  const avgVolume = volumeList.reduce((a, b) => a + b, 0) / volumeList.length;
  const currentPrice = closeList[closeList.length - 1];

  return {
    maxHigh,
    minLow,
    avgPrice,
    avgVolume,
    currentPrice,
    priceRange: maxHigh - minLow
  };
};

module.exports = {
  // 移动平均线
  calculateMA,
  calculateEMA,
  calculateEMASequence,

  // 布林带
  calculateBollingerBands,

  // ATR
  calculateATR,

  // MACD
  calculateMACD,

  // RSI
  calculateRSI,

  // 波动率
  calculateVolatility,
  getVolatilityRating,

  // 价格统计
  calculatePriceStats
};
