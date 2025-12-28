/**
 * 网格参数优化器服务
 * 根据交易对的历史K线数据，计算最优网格参数
 * 
 * 架构说明：
 * - utils/kline-cache.js: K线缓存和币安客户端
 * - utils/technical-indicator.js: 技术指标计算
 * - utils/support-resistance.js: 支撑/阻力位识别算法
 * - 本 service 负责业务逻辑编排
 */

const BigNumber = require('bignumber.js');

// K线缓存和币安客户端
const {
  createClient,
  fetchKlineList,
  fetchDailyKlineList,
  INTERVAL_MAP,
  INTERVAL_HOURS
} = require('../utils/kline-cache.js');

// 技术指标
const {
  calculateATR,
  calculateVolatility,
  getVolatilityRating
} = require('../utils/technical-indicator.js');

// 支撑/阻力位识别
const {
  identifySupportResistance,
  formatResult
} = require('../utils/support-resistance.js');

// 固定手续费率：千分之0.5
const FEE_RATE = 0.0005;

/**
 * 计算风险等级
 * 综合考虑：波动率、杠杆倍数、网格间距与波动率的比值
 * @param {string} volatilityLevel - 波动率等级：'高' | '中' | '低'
 * @param {number} leverage - 杠杆倍数（默认 20）
 * @param {number} gridSpacingPercent - 网格间距百分比（如 0.5 表示 0.5%）
 * @param {number} volatilityPercent - 波动率百分比（如 5.23 表示 5.23%）
 * @returns {{ level: string, score: number }} 风险等级和分数
 */
const calculateRiskLevel = (volatilityLevel, leverage = 20, gridSpacingPercent, volatilityPercent) => {
  let score = 0;

  // 1. 波动率因子（权重 30%）
  const volatilityScore = volatilityLevel === '高' ? 0.8 : volatilityLevel === '中' ? 0.5 : 0.2;
  score += volatilityScore * 0.3;

  // 2. 杠杆因子（权重 40%）
  // 杠杆 1-5 为低风险，5-20 为中风险，20+ 为高风险
  const leverageScore = leverage <= 5 ? 0.2 : leverage <= 20 ? 0.5 : 0.8;
  score += leverageScore * 0.4;

  // 3. 间距/波动率比值因子（权重 30%）
  // 间距越小相对于波动率，风险越高（容易被套）
  if (gridSpacingPercent > 0 && volatilityPercent > 0) {
    const ratio = gridSpacingPercent / volatilityPercent;
    // ratio < 0.1 高风险，0.1-0.3 中风险，> 0.3 低风险
    const ratioScore = ratio < 0.1 ? 0.8 : ratio < 0.3 ? 0.5 : 0.2;
    score += ratioScore * 0.3;
  } else {
    score += 0.5 * 0.3; // 默认中等
  }

  // 根据分数确定等级
  let level;
  if (score < 0.35) {
    level = '保守型';
  } else if (score < 0.65) {
    level = '平衡型';
  } else {
    level = '激进型';
  }

  return { level, score: parseFloat(score.toFixed(2)) };
};

/**
 * 计算支撑位和阻力位（使用新算法）
 * 
 * 新算法特点：
 * - 100根周期K线 + 30根日线多周期确认
 * - 波段极点识别 + 成交量堡垒 + MA20 + 多周期共振计分
 * 
 * @param {Array} klineList - 周期K线数据
 * @param {Array} dailyKlineList - 日K线数据（可选）
 * @returns {Object} { support, resistance, avgPrice, volatility, priceRange, identifyResult }
 */
const calculateSupportResistance = (klineList, dailyKlineList, symbol, atr) => {
  if (!klineList || klineList.length === 0) {
    throw new Error('K线数据为空');
  }

  const closeList = klineList.map(k => k.close);
  const avgPrice = closeList.reduce((a, b) => a + b, 0) / closeList.length;

  // 计算波动率（使用 technical-indicator.js 中的函数）
  const volatility = calculateVolatility(klineList);

  // 使用新算法识别支撑/阻力位（传递 symbol 和 atr 用于历史关键位分析）
  const identifyResult = identifySupportResistance({ symbol, klineList, dailyKlineList, atr });

  let support, resistance;

  // 算法状态信息（供外部日志使用）
  let algorithmStatus = '';
  let algorithmSource = '';

  if (identifyResult.success) {
    support = identifyResult.support;
    resistance = identifyResult.resistance;
    algorithmStatus = 'success';
    algorithmSource = identifyResult.meta?.pairSource || 'unknown';
  } else {
    // 使用备选方案
    algorithmStatus = 'fallback';
    if (identifyResult.fallback) {
      support = identifyResult.fallback.support;
      resistance = identifyResult.fallback.resistance;
      algorithmSource = identifyResult.fallback.source;
    } else {
      // 最后兜底：使用简单的布林带（通过波动率计算）
      const stdDev = volatility * avgPrice;
      support = avgPrice - 2 * stdDev;
      resistance = avgPrice + 2 * stdDev;
      algorithmSource = 'bollinger';
    }
  }

  return {
    support,
    resistance,
    avgPrice,
    volatility,
    priceRange: resistance - support,
    identifyResult,
    // 算法状态信息（供外部日志使用）
    algorithmStatus,
    algorithmSource
  };
};

/**
 * 估算交易频率
 * 基于历史数据，统计价格穿越网格线的次数
 * @param {Array} klineList - K线数据
 * @param {number} gridSpacing - 网格间距
 * @param {number} support - 支撑位
 * @param {number} resistance - 阻力位
 * @returns {number} 预期每根K线的平均交易次数
 */
const estimateTradeFrequency = (klineList, gridSpacing, support, resistance) => {
  if (gridSpacing <= 0) return 0;

  let totalCrossCount = 0;

  for (const kline of klineList) {
    // 计算这根K线穿越了多少个网格
    const klineRange = kline.high - kline.low;
    // 在网格区间内的有效范围
    const effectiveHigh = Math.min(kline.high, resistance);
    const effectiveLow = Math.max(kline.low, support);
    const effectiveRange = Math.max(0, effectiveHigh - effectiveLow);

    // 穿越的网格数量
    const crossCount = Math.floor(effectiveRange / gridSpacing);
    totalCrossCount += crossCount;
  }

  // 平均每根K线的交易次数
  return totalCrossCount / klineList.length;
};

/**
 * 优化目标：收益最大化
 * 
 * 多元优化：在 (gridSpacing, tradeValue) 二维空间中找到日收益最大的点
 * 
 * 约束条件：
 * 1. 单笔必须盈利（间距% > 手续费率%）
 * 2. 日换手率不超过500%（保护本金）
 * 
 * 优化指标：日收益 = 单笔净利润 × 日频率
 * 
 * @param {Object} params - 优化参数
 * @returns {Object} 最优配置
 */
const optimizeForProfit = (params) => {
  const { klineList, market, totalCapital, intervalConfig, minTradeValue: userMinTradeValue, maxTradeValue: userMaxTradeValue } = params;
  const { support, resistance, avgPrice, priceRange } = market;
  const atr = calculateATR(klineList);

  // 每笔交易金额范围：用户指定 或 默认 20~100 USDT
  const minTradeValue = userMinTradeValue || 20;
  const maxTradeValue = userMaxTradeValue || 100;

  // 本金约束：日换手率上限（默认500%）
  const maxTurnoverRatio = 5;

  let bestConfig = null;
  let maxDailyProfit = -Infinity;

  // 收集所有有效配置
  const configList = [];

  // 二维遍历：间距 × 交易金额
  for (let atrMultiple = 0.3; atrMultiple <= 5; atrMultiple += 0.1) {
    const gridSpacing = atr * atrMultiple;

    // 跳过间距超出价格区间的配置
    if (gridSpacing > priceRange * 0.5) continue;
    // 跳过间距过小的配置（小于价格的0.1%）
    if (gridSpacing < avgPrice * 0.001) continue;

    // 估算交易频率（与tradeValue无关）
    const freqPerKline = estimateTradeFrequency(klineList, gridSpacing, support, resistance);
    if (freqPerKline <= 0) continue;

    const klinePerDay = 24 / intervalConfig.hours;
    const dailyFrequency = freqPerKline * klinePerDay;

    // 遍历不同的每笔交易金额
    for (let tradeValue = minTradeValue; tradeValue <= maxTradeValue; tradeValue += 2) {
      // 每笔交易数量
      const tradeQuantity = tradeValue / avgPrice;

      // 单笔毛利润 = 网格间距 × 交易数量
      const grossProfit = gridSpacing * tradeQuantity;
      // 手续费 = 买卖各一次
      const fee = tradeValue * FEE_RATE * 2;
      // 单笔净利润
      const netProfit = grossProfit - fee;

      // 约束条件1：单笔必须盈利
      if (netProfit <= 0) continue;

      // 日收益（已扣除手续费的净收益）
      const dailyProfit = netProfit * dailyFrequency;
      // 日手续费（仅供展示，已包含在dailyProfit的计算中）
      const dailyFee = fee * dailyFrequency;

      // 日换手率
      const dailyTurnover = tradeValue * dailyFrequency;
      const turnoverRatio = dailyTurnover / totalCapital;

      // 约束条件2：日换手率不超过上限（保护本金）
      if (turnoverRatio > maxTurnoverRatio) continue;

      // 日收益率
      const dailyROI = dailyProfit / totalCapital;

      configList.push({
        gridSpacing,
        gridSpacingPercent: gridSpacing / avgPrice * 100,
        tradeValue,
        dailyFrequency,
        dailyProfit,
        dailyROI,
        dailyFee,
        turnoverRatio,
        tradeQuantity,
        netProfit
      });

      // 找日收益最大的配置
      if (dailyProfit > maxDailyProfit) {
        maxDailyProfit = dailyProfit;
        bestConfig = {
          gridSpacing: new BigNumber(gridSpacing).toFixed(6),
          gridSpacingPercent: new BigNumber(gridSpacing / avgPrice * 100).toFixed(4) + '%',
          tradeQuantity: new BigNumber(tradeQuantity).toFixed(6),
          tradeValue: new BigNumber(tradeValue).toFixed(2),
          expectedDailyFrequency: new BigNumber(dailyFrequency).toFixed(2),
          expectedDailyProfit: new BigNumber(dailyProfit).toFixed(2),
          expectedDailyFee: new BigNumber(dailyFee).toFixed(2),
          expectedDailyROI: new BigNumber(dailyROI * 100).toFixed(4) + '%',
          singleNetProfit: new BigNumber(netProfit).toFixed(6),
          turnoverRatio: new BigNumber(turnoverRatio * 100).toFixed(2) + '%'
        };
      }
    }
  }

  // 分析数据：日收益最高的5种配置
  let analysis = null;
  if (configList.length > 0) {
    const topList = configList
      .sort((a, b) => b.dailyProfit - a.dailyProfit)
      .slice(0, 5)
      .map(config => ({
        gridSpacing: new BigNumber(config.gridSpacing).toFixed(6),
        gridSpacingPercent: new BigNumber(config.gridSpacingPercent).toFixed(4) + '%',
        tradeQuantity: new BigNumber(config.tradeQuantity).toFixed(6),
        tradeValue: new BigNumber(config.tradeValue).toFixed(2),
        expectedDailyFrequency: new BigNumber(config.dailyFrequency).toFixed(2),
        expectedDailyProfit: new BigNumber(config.dailyProfit).toFixed(2),
        expectedDailyROI: new BigNumber(config.dailyROI * 100).toFixed(4) + '%',
        singleNetProfit: new BigNumber(config.netProfit).toFixed(6),
        turnoverRatio: new BigNumber(config.turnoverRatio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: configList.length,
      topList,
      avgPrice
    };
  }

  if (bestConfig) {
    bestConfig.analysis = analysis;
  }

  return bestConfig;
};

/**
 * 优化目标：成本摊薄（高频交易降低持仓成本）
 * 多元优化：在 (gridSpacing, tradeValue) 二维空间中找到换手效率最高的点
 * 
 * 约束条件：
 * 1. 单笔必须不亏（不给交易所打工）
 * 2. 日换手率不超过500%（保护本金，避免过度交易）
 * 
 * 优化指标：换手效率 = 日换手率
 * 
 * @param {Object} params - 优化参数
 * @returns {Object} 最优配置
 */
const optimizeForCostReduction = (params) => {
  const { klineList, market, totalCapital, intervalConfig, minTradeValue: userMinTradeValue, maxTradeValue: userMaxTradeValue } = params;
  const { support, resistance, avgPrice, priceRange } = market;
  const atr = calculateATR(klineList);

  let bestConfig = null;
  let maxEfficiency = -Infinity; // 换手效率

  // 每笔交易金额范围：用户指定 或 默认 20~100 USDT
  const minTradeValue = userMinTradeValue || 20;
  const maxTradeValue = userMaxTradeValue || 100;

  // 本金约束：日换手率上限（默认500%，即每天最多交易本金的5倍）
  const maxTurnoverRatio = 5;

  // 收集所有有效配置
  const configList = [];

  // 遍历不同的网格间距（基于ATR的倍数，从0.1倍到2倍，步长更细）
  for (let atrMultiple = 0.1; atrMultiple <= 2; atrMultiple += 0.05) {
    const gridSpacing = atr * atrMultiple;

    // 跳过间距过小的配置（小于价格的0.05%）
    if (gridSpacing < avgPrice * 0.0005) continue;
    // 跳过间距超出价格区间的配置
    if (gridSpacing > priceRange * 0.3) continue;

    // 估算交易频率（与tradeValue无关）
    const freqPerKline = estimateTradeFrequency(klineList, gridSpacing, support, resistance);
    if (freqPerKline <= 0) continue;

    // 遍历不同的每笔交易金额（步长更细，1U）
    for (let tradeValue = minTradeValue; tradeValue <= maxTradeValue; tradeValue += 2) {
      // 每笔交易数量
      const tradeQuantity = tradeValue / avgPrice;

      // 手续费
      const fee = tradeValue * FEE_RATE * 2;

      // 每根K线的预期交易次数
      const klinePerDay = 24 / intervalConfig.hours;
      const dailyFrequency = freqPerKline * klinePerDay;
      const dailyFee = fee * dailyFrequency;

      // 单笔利润
      const grossProfit = gridSpacing * tradeQuantity;
      const netProfit = grossProfit - fee;

      // 约束条件1：单笔必须不亏（不给交易所打工）
      if (netProfit < 0) continue;

      const dailyProfit = netProfit * dailyFrequency;

      // 成本摊薄效果
      const dailyTurnover = tradeValue * dailyFrequency;
      const turnoverRatio = dailyTurnover / totalCapital;

      // 约束条件2：日换手率不超过上限（保护本金）
      if (turnoverRatio > maxTurnoverRatio) continue;

      // 换手效率指标：换手率 / (1 + 亏损惩罚)
      // 亏损惩罚：如果亏损，降低效率评分
      const lossPenalty = dailyProfit < 0 ? Math.abs(dailyProfit) / dailyFee : 0;
      const efficiency = turnoverRatio / (1 + lossPenalty);

      configList.push({
        gridSpacing,
        tradeValue,
        efficiency,
        dailyProfit,
        dailyFrequency,
        dailyFee,
        turnoverRatio,
        dailyTurnover,
        tradeQuantity,
        netProfit
      });

      if (efficiency > maxEfficiency) {
        maxEfficiency = efficiency;
        bestConfig = {
          gridSpacing: new BigNumber(gridSpacing).toFixed(6),
          gridSpacingPercent: new BigNumber(gridSpacing / avgPrice * 100).toFixed(4) + '%',
          tradeQuantity: new BigNumber(tradeQuantity).toFixed(6),
          tradeValue: new BigNumber(tradeValue).toFixed(2),
          expectedDailyFrequency: new BigNumber(dailyFrequency).toFixed(2),
          expectedDailyProfit: new BigNumber(dailyProfit).toFixed(2),
          expectedDailyFee: new BigNumber(dailyFee).toFixed(2),
          dailyTurnover: new BigNumber(dailyTurnover).toFixed(2),
          turnoverRatio: new BigNumber(turnoverRatio * 100).toFixed(2) + '%',
          // 新增：效率指标
          efficiency: new BigNumber(efficiency).toFixed(6),
          singleNetProfit: new BigNumber(netProfit).toFixed(6)
        };
      }
    }
  }

  // 分析数据：换手效率最高的3种配置
  let analysis = null;
  if (configList.length > 0) {
    const topList = configList
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3)
      .map(config => ({
        gridSpacing: new BigNumber(config.gridSpacing).toFixed(6),
        gridSpacingPercent: new BigNumber(config.gridSpacing / avgPrice * 100).toFixed(4) + '%',
        tradeQuantity: new BigNumber(config.tradeQuantity).toFixed(6),
        tradeValue: new BigNumber(config.tradeValue).toFixed(2),
        expectedDailyFrequency: new BigNumber(config.dailyFrequency).toFixed(2),
        expectedDailyProfit: new BigNumber(config.dailyProfit).toFixed(2),
        expectedDailyROI: new BigNumber((config.dailyProfit / totalCapital) * 100).toFixed(4) + '%',
        singleNetProfit: new BigNumber(config.netProfit).toFixed(6),
        turnoverRatio: new BigNumber(config.turnoverRatio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: configList.length,
      topList,
      avgPrice
    };
  }

  if (bestConfig) {
    bestConfig.analysis = analysis;
  }

  return bestConfig;
};

/**
 * 优化目标：防守边界模式（蛰伏状态）
 * 
 * 场景：价格突破用户设定的边界后，进入低频、低资金的"冬眠"状态
 * 
 * 策略逻辑：
 * 1. 每笔金额固定为 minTradeValue（最小值）
 * 2. 网格间距最大化（在单笔不亏的前提下）
 * 3. 目标：日交易频率最低（像乌龟一样慢慢呼吸）
 * 
 * @param {Object} params - 优化参数
 * @returns {Object} 最优配置
 */
const optimizeForBoundary = (params) => {
  const { klineList, market, totalCapital, intervalConfig, minTradeValue: userMinTradeValue } = params;
  const { support, resistance, avgPrice, priceRange } = market;
  const atr = calculateATR(klineList);

  // 每笔交易金额：固定为最小值
  const tradeValue = userMinTradeValue || 20;

  let bestConfig = null;
  let minDailyFrequency = Infinity; // 目标：日频率最低

  // 收集所有有效配置
  const configList = [];

  // 遍历不同的网格间距（从大到小，优先找大间距）
  // ATR倍数范围更大，从0.5倍到10倍
  for (let atrMultiple = 10; atrMultiple >= 0.5; atrMultiple -= 0.2) {
    const gridSpacing = atr * atrMultiple;

    // 跳过间距超出价格区间的配置
    if (gridSpacing > priceRange * 0.8) continue;
    // 跳过间距过小的配置（小于价格的0.1%）
    if (gridSpacing < avgPrice * 0.001) continue;

    // 每笔交易数量
    const tradeQuantity = tradeValue / avgPrice;

    // 单笔毛利润 = 网格间距 × 交易数量
    const grossProfit = gridSpacing * tradeQuantity;
    // 手续费 = 买卖各一次
    const fee = tradeValue * FEE_RATE * 2;
    // 单笔净利润
    const netProfit = grossProfit - fee;

    // 约束条件：单笔必须不亏（不给交易所打工）
    if (netProfit < 0) continue;

    // 估算交易频率
    const freqPerKline = estimateTradeFrequency(klineList, gridSpacing, support, resistance);
    if (freqPerKline <= 0) continue;

    const klinePerDay = 24 / intervalConfig.hours;
    const dailyFrequency = freqPerKline * klinePerDay;

    // 日收益
    const dailyProfit = netProfit * dailyFrequency;
    // 日手续费
    const dailyFee = fee * dailyFrequency;
    // 日换手率
    const dailyTurnover = tradeValue * dailyFrequency;
    const turnoverRatio = dailyTurnover / totalCapital;
    // 日收益率
    const dailyROI = dailyProfit / totalCapital;

    configList.push({
      gridSpacing,
      gridSpacingPercent: gridSpacing / avgPrice * 100,
      tradeValue,
      dailyFrequency,
      dailyProfit,
      dailyROI,
      dailyFee,
      turnoverRatio,
      tradeQuantity,
      netProfit
    });

    // 找日频率最低的配置（蛰伏状态）
    if (dailyFrequency < minDailyFrequency) {
      minDailyFrequency = dailyFrequency;
      bestConfig = {
        gridSpacing: new BigNumber(gridSpacing).toFixed(6),
        gridSpacingPercent: new BigNumber(gridSpacing / avgPrice * 100).toFixed(4) + '%',
        tradeQuantity: new BigNumber(tradeQuantity).toFixed(6),
        tradeValue: new BigNumber(tradeValue).toFixed(2),
        expectedDailyFrequency: new BigNumber(dailyFrequency).toFixed(2),
        expectedDailyProfit: new BigNumber(dailyProfit).toFixed(2),
        expectedDailyFee: new BigNumber(dailyFee).toFixed(2),
        expectedDailyROI: new BigNumber(dailyROI * 100).toFixed(4) + '%',
        singleNetProfit: new BigNumber(netProfit).toFixed(6),
        turnoverRatio: new BigNumber(turnoverRatio * 100).toFixed(2) + '%'
      };
    }
  }

  // 分析数据：日频率最低的3种配置
  let analysis = null;
  if (configList.length > 0) {
    const topList = configList
      .sort((a, b) => a.dailyFrequency - b.dailyFrequency) // 按频率从低到高排序
      .slice(0, 3)
      .map(config => ({
        gridSpacing: new BigNumber(config.gridSpacing).toFixed(6),
        gridSpacingPercent: new BigNumber(config.gridSpacingPercent).toFixed(4) + '%',
        tradeQuantity: new BigNumber(config.tradeQuantity).toFixed(6),
        tradeValue: new BigNumber(config.tradeValue).toFixed(2),
        expectedDailyFrequency: new BigNumber(config.dailyFrequency).toFixed(2),
        expectedDailyProfit: new BigNumber(config.dailyProfit).toFixed(2),
        expectedDailyROI: new BigNumber(config.dailyROI * 100).toFixed(4) + '%',
        singleNetProfit: new BigNumber(config.netProfit).toFixed(6),
        turnoverRatio: new BigNumber(config.turnoverRatio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: configList.length,
      topList,
      avgPrice
    };
  }

  if (bestConfig) {
    bestConfig.analysis = analysis;
  }

  return bestConfig;
};

/**
 * 网格参数优化主函数
 * @param {Object} options - 配置参数
 * @param {string} options.symbol - 交易对，如 'BTCUSDT'
 * @param {string} options.interval - K线周期: '1h' | '4h' | '1d' | '1w' | '1M'
 * @param {number} options.totalCapital - 总投入资金 (USDT)
 * @param {string} options.optimizeTarget - 优化目标: 'profit' | 'cost'
 * @param {boolean} options.enableBoundaryDefense - 是否开启防守边界选项，默认false
 * @param {number} options.minTradeValue - 每笔交易金额下限 (USDT)，默认20
 * @param {number} options.maxTradeValue - 每笔交易金额上限 (USDT)，默认100
 * @param {string} options.apiKey - 币安API Key
 * @param {string} options.apiSecret - 币安API Secret
 * @returns {Promise<Object>} 优化结果
 */
const optimizeGridParams = async (options) => {
  const {
    symbol,
    interval = '4h',
    totalCapital,
    optimizeTarget = 'profit',
    enableBoundaryDefense = false,
    minTradeValue = 20,
    maxTradeValue = 100,
    apiKey,
    apiSecret
  } = options;

  // 参数校验
  if (!symbol) throw new Error('缺少交易对参数 symbol');
  if (!totalCapital || totalCapital <= 0) throw new Error('总资金必须大于0');
  if (!apiKey || !apiSecret) throw new Error('缺少API凭证');

  const intervalConfig = INTERVAL_MAP[interval];
  if (!intervalConfig) {
    throw new Error(`不支持的K线周期: ${interval}，支持: ${Object.keys(INTERVAL_MAP).join(', ')}`);
  }

  // 创建客户端
  const client = createClient(apiKey, apiSecret);

  // 获取100根周期K线数据
  const klineList = await fetchKlineList(client, symbol, interval);

  if (klineList.length < 11) {
    throw new Error('K线数据不足，无法进行优化分析（需要至少11根K线）');
  }

  // 获取30根日K线数据（用于多周期确认）
  let dailyKlineList = [];
  try {
    dailyKlineList = await fetchDailyKlineList(client, symbol, 30);
  } catch (error) {
    console.warn(`[警告] 获取日K线数据失败，将不使用多周期确认: ${error?.message || error}`);
  }

  // 计算ATR（需要先计算，用于市场结构分析）
  const atr = calculateATR(klineList);

  // 获取实时标记价格
  let currentPrice = klineList[klineList.length - 1].close; // 默认用最后一根K线收盘价
  try {
    const markPriceData = await client.getMarkPrice({ symbol });
    currentPrice = parseFloat(markPriceData.markPrice);
  } catch (error) {
    console.warn(`[警告] 获取实时标记价格失败，使用K线收盘价: ${error?.message || error}`);
  }

  // 计算市场数据（使用新算法 + 历史关键位分析）
  const market = calculateSupportResistance(klineList, dailyKlineList, symbol, atr);
  market.currentPrice = currentPrice; // 添加实时价格

  // 根据优化目标选择算法
  const optimizeParams = { klineList, market, totalCapital, intervalConfig, minTradeValue, maxTradeValue };
  let recommended;

  if (optimizeTarget === 'cost') {
    recommended = optimizeForCostReduction(optimizeParams);
  } else {
    recommended = optimizeForProfit(optimizeParams);
  }

  if (!recommended) {
    throw new Error(
      `无法找到合适的网格配置。` +
      `当前价格区间: ${market.support.toFixed(2)} - ${market.resistance.toFixed(2)}, ` +
      `波动率: ${(market.volatility * 100).toFixed(2)}%。` +
      `建议: 增加资金(当前${totalCapital} USDT)或选择波动更大的交易对`
    );
  }

  // 如果开启防守边界选项，计算蛰伏状态参数
  let boundaryDefense = undefined;
  if (enableBoundaryDefense) {
    boundaryDefense = optimizeForBoundary(optimizeParams);
  }

  // 计算波动率等级
  const volatilityLevel = market.volatility > 0.05 ? '高' : market.volatility > 0.02 ? '中' : '低';
  const volatilityPercent = market.volatility * 100;

  // 解析网格间距百分比（从 recommended 中获取）
  const gridSpacingPercent = recommended?.analysis?.topList?.[0]?.gridSpacingPercent || 0;

  // 计算风险等级（默认杠杆 20 倍，前端可根据用户选择重新计算）
  const riskResult = calculateRiskLevel(volatilityLevel, 20, gridSpacingPercent, volatilityPercent);

  // 返回结果
  return {
    symbol,
    interval,
    intervalLabel: intervalConfig.label,
    optimizeTarget,
    optimizeTargetLabel: optimizeTarget === 'profit' ? '收益最大化' : '成本摊薄',
    enableBoundaryDefense,
    totalCapital,
    minTradeValue,
    maxTradeValue,
    feeRate: FEE_RATE,

    // 市场分析数据
    market: {
      currentPrice: new BigNumber(market.currentPrice).toFixed(6),
      support: new BigNumber(market.support).toFixed(6),
      resistance: new BigNumber(market.resistance).toFixed(6),
      avgPrice: new BigNumber(market.avgPrice).toFixed(6),
      priceRange: new BigNumber(market.priceRange).toFixed(6),
      // 波动率及其评级
      volatility: new BigNumber(volatilityPercent).toFixed(2) + '%',
      volatilityLevel,
      volatilityAdvice: market.volatility > 0.05
        ? `市场活跃度高，价格波动达 ${volatilityPercent.toFixed(2)}%，网格策略捕捉收益机会充足，适合激进型投资者追求更高回报`
        : market.volatility > 0.02
          ? `市场波动适中，价格波动约 ${volatilityPercent.toFixed(2)}%，网格策略收益稳定，风险可控，适合稳健型投资者`
          : `市场波动偏低（${volatilityPercent.toFixed(2)}%），价格变化较小，网格策略收益空间有限，建议选择波动更大的交易对或降低交易频次`,
      // ATR及其说明
      atr: new BigNumber(atr).toFixed(2),
      atrDesc: `每${intervalConfig.label}平均波动 ${new BigNumber(atr).toFixed(2)} USDT`,
      klineCount: klineList.length,
      // 算法状态信息
      algorithmStatus: market.algorithmStatus,
      algorithmSource: market.algorithmSource,
      // 间距信息（供日志使用）
      spreadStr: market.identifyResult?.meta?.spreadStr,
      spreadRatio: market.identifyResult?.meta?.spreadRatio,
      // 识别结果详情（供日志使用）
      identifyResult: market.identifyResult
    },

    // 风险评估
    risk: {
      level: riskResult.level,
      score: riskResult.score
    },

    // 推荐网格参数（正常状态使用）
    recommended,

    // 防守边界参数（突破边界后使用，仅当 enableBoundaryDefense=true 时返回）
    boundaryDefense
  };
};

module.exports = {
  optimizeGridParams,
  FEE_RATE,
  INTERVAL_MAP
};
