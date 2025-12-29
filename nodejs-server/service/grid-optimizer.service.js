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
const binanceExchangeInfoService = require('./binance-exchange-info.service');

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
 * @param {string} volatility_level - 波动率等级：'高' | '中' | '低'
 * @param {number} leverage - 杠杆倍数（默认 20）
 * @param {number} grid_spacing_percent - 网格间距百分比（如 0.5 表示 0.5%）
 * @param {number} volatility_percent - 波动率百分比（如 5.23 表示 5.23%）
 * @returns {{ level: string, score: number }} 风险等级和分数
 */
const calculateRiskLevel = (volatility_level, leverage = 20, grid_spacing_percent, volatility_percent) => {
  let score = 0;

  // 1. 波动率因子（权重 30%）
  const volatility_score = volatility_level === '高' ? 0.8 : volatility_level === '中' ? 0.5 : 0.2;
  score += volatility_score * 0.3;

  // 2. 杠杆因子（权重 40%）
  // 杠杆 1-5 为低风险，5-20 为中风险，20+ 为高风险
  const leverage_score = leverage <= 5 ? 0.2 : leverage <= 20 ? 0.5 : 0.8;
  score += leverage_score * 0.4;

  // 3. 间距/波动率比值因子（权重 30%）
  // 间距越小相对于波动率，风险越高（容易被套）
  if (grid_spacing_percent > 0 && volatility_percent > 0) {
    const ratio = grid_spacing_percent / volatility_percent;
    // ratio < 0.1 高风险，0.1-0.3 中风险，> 0.3 低风险
    const ratio_score = ratio < 0.1 ? 0.8 : ratio < 0.3 ? 0.5 : 0.2;
    score += ratio_score * 0.3;
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
 * @param {Array} kline_list - 周期K线数据
 * @param {Array} dailyKlineList - 日K线数据（可选）
 * @returns {Object} { support, resistance, avg_price, volatility, price_range, identify_result }
 */
const calculateSupportResistance = (kline_list, dailyKlineList, symbol, atr) => {
  if (!kline_list || kline_list.length === 0) {
    throw new Error('K线数据为空');
  }

  const close_list = kline_list.map(k => k.close);
  const avg_price = close_list.reduce((a, b) => a + b, 0) / close_list.length;

  // 计算波动率（使用 technical-indicator.js 中的函数）
  const volatility = calculateVolatility(kline_list);

  // 使用新算法识别支撑/阻力位（传递 symbol 和 atr 用于历史关键位分析）
  const identify_result = identifySupportResistance({ symbol, kline_list, dailyKlineList, atr });

  let support, resistance;

  // 算法状态信息（供外部日志使用）
  let algorithmStatus = '';
  let algorithmSource = '';

  if (identify_result.success) {
    support = identify_result.support;
    resistance = identify_result.resistance;
    algorithmStatus = 'success';
    algorithmSource = identify_result.meta?.pairSource || 'unknown';
  } else {
    // 使用备选方案
    algorithmStatus = 'fallback';
    if (identify_result.fallback) {
      support = identify_result.fallback.support;
      resistance = identify_result.fallback.resistance;
      algorithmSource = identify_result.fallback.source;
    } else {
      // 最后兜底：使用简单的布林带（通过波动率计算）
      const std_dev = volatility * avg_price;
      support = avg_price - 2 * std_dev;
      resistance = avg_price + 2 * std_dev;
      algorithmSource = 'bollinger';
    }
  }

  return {
    support,
    resistance,
    avg_price,
    volatility,
    price_range: resistance - support,
    identify_result,
    // 算法状态信息（供外部日志使用）
    algorithmStatus,
    algorithmSource
  };
};

/**
 * 估算交易频率
 * 基于历史数据，统计价格穿越网格线的次数
 * @param {Array} kline_list - K线数据
 * @param {number} grid_spacing - 网格间距
 * @param {number} support - 支撑位
 * @param {number} resistance - 阻力位
 * @returns {number} 预期每根K线的平均交易次数
 */
const estimateTradeFrequency = (kline_list, grid_spacing, support, resistance) => {
  if (grid_spacing <= 0) return 0;

  let total_cross_count = 0;

  for (const kline of kline_list) {
    // 计算这根K线穿越了多少个网格
    const kline_range = kline.high - kline.low;
    // 在网格区间内的有效范围
    const effective_high = Math.min(kline.high, resistance);
    const effective_low = Math.max(kline.low, support);
    const effective_range = Math.max(0, effective_high - effective_low);

    // 穿越的网格数量
    const cross_count = Math.floor(effective_range / grid_spacing);
    total_cross_count += cross_count;
  }

  // 平均每根K线的交易次数
  return total_cross_count / kline_list.length;
};

/**
 * 优化目标：收益最大化
 * 
 * 多元优化：在 (grid_spacing, trade_value) 二维空间中找到日收益最大的点
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
  const { kline_list, market, total_capital, interval_config, min_trade_value: userMinTradeValue, max_trade_value: userMaxTradeValue, precision_rules } = params;
  const { support, resistance, avg_price, price_range } = market;
  const atr = calculateATR(kline_list);

  // 检查精度规则
  if (!precision_rules) {
    console.error('[optimizeForProfit] 缺少精度规则，无法进行优化');
    return null;
  }

  // 每笔交易金额范围：用户指定 或 默认 20~100 USDT
  const min_trade_value = userMinTradeValue || 20;
  const max_trade_value = userMaxTradeValue || 100;

  // 本金约束：日换手率上限（默认500%）
  const max_turnover_ratio = 5;

  // 精度规则辅助函数：调整数值到符合规则的精度
  const adjustToPrecision = (value, isPrice = false) => {
    // 防御性检查
    if (!precision_rules || !value || isNaN(value)) {
      return value;
    }

    const step = isPrice ? precision_rules.tickSize : precision_rules.stepSize;
    const minVal = isPrice ? precision_rules.minPrice : precision_rules.minQty;

    // 防御性检查
    if (!step || step <= 0 || isNaN(step)) {
      console.warn(`[adjustToPrecision] Invalid step: ${step}, returning original value: ${value}`);
      return value;
    }

    const adjusted = Math.floor(value / step) * step;

    // 如果调整后的值小于最小值，返回最小值
    if (!isNaN(adjusted) && adjusted >= minVal) {
      return adjusted;
    }

    return Math.max(adjusted || 0, minVal);
  };

  let best_config = null;
  let max_daily_profit = -Infinity;

  // 收集所有有效配置
  const config_list = [];

  // 二维遍历：间距 × 交易金额
  for (let atrMultiple = 0.3; atrMultiple <= 5; atrMultiple += 0.1) {
    // 原始网格间距
    let grid_spacing = atr * atrMultiple;

    // 调整到符合 tickSize 精度
    grid_spacing = adjustToPrecision(grid_spacing, true);

    // 跳过间距超出价格区间的配置
    if (grid_spacing > price_range * 0.5) continue;
    // 跳过间距过小的配置（小于最小价格）
    if (grid_spacing < precision_rules.minPrice) continue;

    // 估算交易频率（与trade_value无关）
    const freq_per_kline = estimateTradeFrequency(kline_list, grid_spacing, support, resistance);
    if (freq_per_kline <= 0) continue;

    const kline_per_day = 24 / interval_config.hours;
    const daily_frequency = freq_per_kline * kline_per_day;

    // 遍历不同的每笔交易金额
    for (let trade_value = min_trade_value; trade_value <= max_trade_value; trade_value += 2) {
      // 每笔交易数量（原始值）
      let trade_quantity = trade_value / avg_price;

      // 调整到符合 stepSize 精度
      trade_quantity = adjustToPrecision(trade_quantity, false);

      // 跳过超出最大数量的配置
      if (trade_quantity > precision_rules.maxQty) continue;

      // 单笔毛利润 = 网格间距 × 交易数量
      const gross_profit = grid_spacing * trade_quantity;
      // 手续费 = 买卖各一次
      const fee = trade_value * FEE_RATE * 2;
      // 单笔净利润
      const net_profit = gross_profit - fee;

      // 约束条件1：单笔必须盈利
      if (net_profit <= 0) continue;

      // 日收益（已扣除手续费的净收益）
      const daily_profit = net_profit * daily_frequency;
      // 日手续费（仅供展示，已包含在daily_profit的计算中）
      const daily_fee = fee * daily_frequency;

      // 日换手率
      const daily_turnover = trade_value * daily_frequency;
      const turnover_ratio = daily_turnover / total_capital;

      // 约束条件2：日换手率不超过上限（保护本金）
      if (turnover_ratio > max_turnover_ratio) continue;

      // 日收益率
      const daily_roi = daily_profit / total_capital;

      config_list.push({
        grid_spacing,
        grid_spacing_percent: grid_spacing / avg_price * 100,
        trade_value,
        daily_frequency,
        daily_profit,
        daily_roi,
        daily_fee,
        turnover_ratio,
        trade_quantity,
        net_profit
      });

      // 找日收益最大的配置
      if (daily_profit > max_daily_profit) {
        max_daily_profit = daily_profit;
        best_config = {
          grid_spacing: new BigNumber(grid_spacing).toFixed(6),
          grid_spacing_percent: new BigNumber(grid_spacing / avg_price * 100).toFixed(4) + '%',
          trade_quantity: new BigNumber(trade_quantity).toFixed(6),
          trade_value: new BigNumber(trade_value).toFixed(2),
          expected_daily_frequency: new BigNumber(daily_frequency).toFixed(2),
          expected_daily_profit: new BigNumber(daily_profit).toFixed(2),
          expected_daily_fee: new BigNumber(daily_fee).toFixed(2),
          expected_daily_roi: new BigNumber(daily_roi * 100).toFixed(4) + '%',
          single_net_profit: new BigNumber(net_profit).toFixed(6),
          turnover_ratio: new BigNumber(turnover_ratio * 100).toFixed(2) + '%'
        };
      }
    }
  }

  // 分析数据：日收益最高的5种配置
  let analysis = null;
  if (config_list.length > 0) {
    const top_list = config_list
      .sort((a, b) => b.daily_profit - a.daily_profit)
      .slice(0, 5)
      .map(config => ({
        grid_spacing: new BigNumber(config.grid_spacing).toFixed(6),
        grid_spacing_percent: new BigNumber(config.grid_spacing_percent).toFixed(4) + '%',
        trade_quantity: new BigNumber(config.trade_quantity).toFixed(6),
        trade_value: new BigNumber(config.trade_value).toFixed(2),
        expected_daily_frequency: new BigNumber(config.daily_frequency).toFixed(2),
        expected_daily_profit: new BigNumber(config.daily_profit).toFixed(2),
        expected_daily_roi: new BigNumber(config.daily_roi * 100).toFixed(4) + '%',
        single_net_profit: new BigNumber(config.net_profit).toFixed(6),
        turnover_ratio: new BigNumber(config.turnover_ratio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: config_list.length,
      top_list,
      avg_price
    };
  }

  if (best_config) {
    best_config.analysis = analysis;
  }

  return best_config;
};

/**
 * 优化目标：成本摊薄（高频交易降低持仓成本）
 * 多元优化：在 (grid_spacing, trade_value) 二维空间中找到换手效率最高的点
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
  const { kline_list, market, total_capital, interval_config, min_trade_value: userMinTradeValue, max_trade_value: userMaxTradeValue, precision_rules } = params;
  const { support, resistance, avg_price, price_range } = market;
  const atr = calculateATR(kline_list);

  // 检查精度规则
  if (!precision_rules) {
    console.error('[optimizeForCostReduction] 缺少精度规则，无法进行优化');
    return null;
  }

  let best_config = null;
  let max_efficiency = -Infinity; // 换手效率

  // 每笔交易金额范围：用户指定 或 默认 20~100 USDT
  const min_trade_value = userMinTradeValue || 20;
  const max_trade_value = userMaxTradeValue || 100;

  // 本金约束：日换手率上限（默认500%，即每天最多交易本金的5倍）
  const max_turnover_ratio = 5;

  // 精度规则辅助函数：调整数值到符合规则的精度
  const adjustToPrecision = (value, isPrice = false) => {
    // 防御性检查
    if (!precision_rules || !value || isNaN(value)) {
      return value;
    }

    const step = isPrice ? precision_rules.tickSize : precision_rules.stepSize;
    const minVal = isPrice ? precision_rules.minPrice : precision_rules.minQty;

    // 防御性检查
    if (!step || step <= 0 || isNaN(step)) {
      console.warn(`[adjustToPrecision] Invalid step: ${step}, returning original value: ${value}`);
      return value;
    }

    const adjusted = Math.floor(value / step) * step;

    // 如果调整后的值小于最小值，返回最小值
    if (!isNaN(adjusted) && adjusted >= minVal) {
      return adjusted;
    }

    return Math.max(adjusted || 0, minVal);
  };

  // 收集所有有效配置
  const config_list = [];

  // 遍历不同的网格间距（基于ATR的倍数，从0.1倍到2倍，步长更细）
  for (let atrMultiple = 0.1; atrMultiple <= 2; atrMultiple += 0.05) {
    // 原始网格间距
    let grid_spacing = atr * atrMultiple;

    // 调整到符合 tickSize 精度
    grid_spacing = adjustToPrecision(grid_spacing, true);

    // 跳过间距过小的配置（小于最小价格）
    if (grid_spacing < precision_rules.minPrice) continue;
    // 跳过间距超出价格区间的配置
    if (grid_spacing > price_range * 0.3) continue;

    // 估算交易频率（与trade_value无关）
    const freq_per_kline = estimateTradeFrequency(kline_list, grid_spacing, support, resistance);
    if (freq_per_kline <= 0) continue;

    // 遍历不同的每笔交易金额（步长更细，1U）
    for (let trade_value = min_trade_value; trade_value <= max_trade_value; trade_value += 2) {
      // 每笔交易数量（原始值）
      let trade_quantity = trade_value / avg_price;

      // 调整到符合 stepSize 精度
      trade_quantity = adjustToPrecision(trade_quantity, false);

      // 跳过超出最大数量的配置
      if (trade_quantity > precision_rules.maxQty) continue;

      // 手续费
      const fee = trade_value * FEE_RATE * 2;

      // 每根K线的预期交易次数
      const kline_per_day = 24 / interval_config.hours;
      const daily_frequency = freq_per_kline * kline_per_day;
      const daily_fee = fee * daily_frequency;

      // 单笔利润
      const gross_profit = grid_spacing * trade_quantity;
      const net_profit = gross_profit - fee;

      // 约束条件1：单笔必须不亏（不给交易所打工）
      if (net_profit < 0) continue;

      const daily_profit = net_profit * daily_frequency;

      // 成本摊薄效果
      const daily_turnover = trade_value * daily_frequency;
      const turnover_ratio = daily_turnover / total_capital;

      // 约束条件2：日换手率不超过上限（保护本金）
      if (turnover_ratio > max_turnover_ratio) continue;

      // 换手效率指标：换手率 / (1 + 亏损惩罚)
      // 亏损惩罚：如果亏损，降低效率评分
      const lossPenalty = daily_profit < 0 ? Math.abs(daily_profit) / daily_fee : 0;
      const efficiency = turnover_ratio / (1 + lossPenalty);

      config_list.push({
        grid_spacing,
        trade_value,
        efficiency,
        daily_profit,
        daily_frequency,
        daily_fee,
        turnover_ratio,
        daily_turnover,
        trade_quantity,
        net_profit
      });

      if (efficiency > max_efficiency) {
        max_efficiency = efficiency;
        best_config = {
          grid_spacing: new BigNumber(grid_spacing).toFixed(6),
          grid_spacing_percent: new BigNumber(grid_spacing / avg_price * 100).toFixed(4) + '%',
          trade_quantity: new BigNumber(trade_quantity).toFixed(6),
          trade_value: new BigNumber(trade_value).toFixed(2),
          expected_daily_frequency: new BigNumber(daily_frequency).toFixed(2),
          expected_daily_profit: new BigNumber(daily_profit).toFixed(2),
          expected_daily_fee: new BigNumber(daily_fee).toFixed(2),
          daily_turnover: new BigNumber(daily_turnover).toFixed(2),
          turnover_ratio: new BigNumber(turnover_ratio * 100).toFixed(2) + '%',
          // 新增：效率指标
          efficiency: new BigNumber(efficiency).toFixed(6),
          single_net_profit: new BigNumber(net_profit).toFixed(6)
        };
      }
    }
  }

  // 分析数据：换手效率最高的3种配置
  let analysis = null;
  if (config_list.length > 0) {
    const top_list = config_list
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3)
      .map(config => ({
        grid_spacing: new BigNumber(config.grid_spacing).toFixed(6),
        grid_spacing_percent: new BigNumber(config.grid_spacing / avg_price * 100).toFixed(4) + '%',
        trade_quantity: new BigNumber(config.trade_quantity).toFixed(6),
        trade_value: new BigNumber(config.trade_value).toFixed(2),
        expected_daily_frequency: new BigNumber(config.daily_frequency).toFixed(2),
        expected_daily_profit: new BigNumber(config.daily_profit).toFixed(2),
        expected_daily_roi: new BigNumber((config.daily_profit / total_capital) * 100).toFixed(4) + '%',
        single_net_profit: new BigNumber(config.net_profit).toFixed(6),
        turnover_ratio: new BigNumber(config.turnover_ratio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: config_list.length,
      top_list,
      avg_price
    };
  }

  if (best_config) {
    best_config.analysis = analysis;
  }

  return best_config;
};

/**
 * 优化目标：防守边界模式（蛰伏状态）
 * 
 * 场景：价格突破用户设定的边界后，进入低频、低资金的"冬眠"状态
 * 
 * 策略逻辑：
 * 1. 每笔金额固定为 min_trade_value（最小值）
 * 2. 网格间距最大化（在单笔不亏的前提下）
 * 3. 目标：日交易频率最低（像乌龟一样慢慢呼吸）
 * 
 * @param {Object} params - 优化参数
 * @returns {Object} 最优配置
 */
const optimizeForBoundary = (params) => {
  const { kline_list, market, total_capital, interval_config, min_trade_value: userMinTradeValue, precision_rules } = params;
  const { support, resistance, avg_price, price_range } = market;
  const atr = calculateATR(kline_list);

  // 检查精度规则
  if (!precision_rules) {
    console.error('[optimizeForBoundary] 缺少精度规则，无法进行优化');
    return null;
  }

  // 每笔交易金额：固定为最小值
  const trade_value = userMinTradeValue || 20;

  let best_config = null;
  let min_daily_frequency = Infinity; // 目标：日频率最低

  // 精度规则辅助函数：调整数值到符合规则的精度
  const adjustToPrecision = (value, isPrice = false) => {
    // 防御性检查
    if (!precision_rules || !value || isNaN(value)) {
      return value;
    }

    const step = isPrice ? precision_rules.tickSize : precision_rules.stepSize;
    const minVal = isPrice ? precision_rules.minPrice : precision_rules.minQty;

    // 防御性检查
    if (!step || step <= 0 || isNaN(step)) {
      console.warn(`[adjustToPrecision] Invalid step: ${step}, returning original value: ${value}`);
      return value;
    }

    const adjusted = Math.floor(value / step) * step;

    // 如果调整后的值小于最小值，返回最小值
    if (!isNaN(adjusted) && adjusted >= minVal) {
      return adjusted;
    }

    return Math.max(adjusted || 0, minVal);
  };

  // 收集所有有效配置
  const config_list = [];

  // 遍历不同的网格间距（从大到小，优先找大间距）
  // ATR倍数范围更大，从0.5倍到10倍
  for (let atrMultiple = 10; atrMultiple >= 0.5; atrMultiple -= 0.2) {
    // 原始网格间距
    let grid_spacing = atr * atrMultiple;

    // 调整到符合 tickSize 精度
    grid_spacing = adjustToPrecision(grid_spacing, true);

    // 跳过间距超出价格区间的配置
    if (grid_spacing > price_range * 0.8) continue;
    // 跳过间距过小的配置（小于最小价格）
    if (grid_spacing < precision_rules.minPrice) continue;
    // 跳过间距过小的配置（小于价格的0.1%）
    if (grid_spacing < avg_price * 0.001) continue;

    // 每笔交易数量（原始值）
    let trade_quantity = trade_value / avg_price;

    // 调整到符合 stepSize 精度
    trade_quantity = adjustToPrecision(trade_quantity, false);

    // 跳过超出最大数量的配置
    if (trade_quantity > precision_rules.maxQty) continue;

    // 单笔毛利润 = 网格间距 × 交易数量
    const gross_profit = grid_spacing * trade_quantity;
    // 手续费 = 买卖各一次
    const fee = trade_value * FEE_RATE * 2;
    // 单笔净利润
    const net_profit = gross_profit - fee;

    // 约束条件：单笔必须不亏（不给交易所打工）
    if (net_profit < 0) continue;

    // 估算交易频率
    const freq_per_kline = estimateTradeFrequency(kline_list, grid_spacing, support, resistance);
    if (freq_per_kline <= 0) continue;

    const kline_per_day = 24 / interval_config.hours;
    const daily_frequency = freq_per_kline * kline_per_day;

    // 日收益
    const daily_profit = net_profit * daily_frequency;
    // 日手续费
    const daily_fee = fee * daily_frequency;
    // 日换手率
    const daily_turnover = trade_value * daily_frequency;
    const turnover_ratio = daily_turnover / total_capital;
    // 日收益率
    const daily_roi = daily_profit / total_capital;

    config_list.push({
      grid_spacing,
      grid_spacing_percent: grid_spacing / avg_price * 100,
      trade_value,
      daily_frequency,
      daily_profit,
      daily_roi,
      daily_fee,
      turnover_ratio,
      trade_quantity,
      net_profit
    });

    // 找日频率最低的配置（蛰伏状态）
    if (daily_frequency < min_daily_frequency) {
      min_daily_frequency = daily_frequency;
      best_config = {
        grid_spacing: new BigNumber(grid_spacing).toFixed(6),
        grid_spacing_percent: new BigNumber(grid_spacing / avg_price * 100).toFixed(4) + '%',
        trade_quantity: new BigNumber(trade_quantity).toFixed(6),
        trade_value: new BigNumber(trade_value).toFixed(2),
        expected_daily_frequency: new BigNumber(daily_frequency).toFixed(2),
        expected_daily_profit: new BigNumber(daily_profit).toFixed(2),
        expected_daily_fee: new BigNumber(daily_fee).toFixed(2),
        expected_daily_roi: new BigNumber(daily_roi * 100).toFixed(4) + '%',
        single_net_profit: new BigNumber(net_profit).toFixed(6),
        turnover_ratio: new BigNumber(turnover_ratio * 100).toFixed(2) + '%'
      };
    }
  }

  // 分析数据：日频率最低的3种配置
  let analysis = null;
  if (config_list.length > 0) {
    const top_list = config_list
      .sort((a, b) => a.daily_frequency - b.daily_frequency) // 按频率从低到高排序
      .slice(0, 3)
      .map(config => ({
        grid_spacing: new BigNumber(config.grid_spacing).toFixed(6),
        grid_spacing_percent: new BigNumber(config.grid_spacing_percent).toFixed(4) + '%',
        trade_quantity: new BigNumber(config.trade_quantity).toFixed(6),
        trade_value: new BigNumber(config.trade_value).toFixed(2),
        expected_daily_frequency: new BigNumber(config.daily_frequency).toFixed(2),
        expected_daily_profit: new BigNumber(config.daily_profit).toFixed(2),
        expected_daily_roi: new BigNumber(config.daily_roi * 100).toFixed(4) + '%',
        single_net_profit: new BigNumber(config.net_profit).toFixed(6),
        turnover_ratio: new BigNumber(config.turnover_ratio * 100).toFixed(2) + '%'
      }));
    analysis = {
      totalConfigCount: config_list.length,
      top_list,
      avg_price
    };
  }

  if (best_config) {
    best_config.analysis = analysis;
  }

  return best_config;
};

/**
 * 网格参数优化主函数
 * @param {Object} options - 配置参数
 * @param {string} options.symbol - 交易对，如 'BTCUSDT'
 * @param {string} options.interval - K线周期: '1h' | '4h' | '1d' | '1w' | '1M'
 * @param {number} options.total_capital - 总投入资金 (USDT)
 * @param {string} options.optimize_target - 优化目标: 'profit' | 'cost'
 * @param {boolean} options.enable_boundary_defense - 是否开启防守边界选项，默认false
 * @param {number} options.min_trade_value - 每笔交易金额下限 (USDT)，默认20
 * @param {number} options.max_trade_value - 每笔交易金额上限 (USDT)，默认100
 * @param {string} options.api_key - 币安API Key
 * @param {string} options.api_secret - 币安API Secret
 * @returns {Promise<Object>} 优化结果
 */
const optimizeGridParams = async (options) => {
  const {
    symbol,
    interval = '4h',
    total_capital,
    optimize_target = 'profit',
    enable_boundary_defense = false,
    min_trade_value = 20,
    max_trade_value = 100,
    api_key,
    api_secret
  } = options;

  // 1. 参数校验
  if (!symbol) throw new Error('缺少交易对参数 symbol');
  if (!total_capital || total_capital <= 0) throw new Error('总资金必须大于0');
  if (!api_key || !api_secret) throw new Error('缺少API凭证');

  const interval_config = INTERVAL_MAP[interval];
  if (!interval_config) {
    throw new Error(`不支持的K线周期: ${interval}，支持: ${Object.keys(INTERVAL_MAP).join(', ')}`);
  }

  // 2. 获取交易所信息并验证精度规则
  const exchangeInfo = await binanceExchangeInfoService.getLatestExchangeInfo();
  if (!exchangeInfo) {
    throw new Error('交易所信息未初始化，请稍后重试');
  }

  const symbolInfo = exchangeInfo.symbols?.find(s => s.symbol === symbol);
  if (!symbolInfo) {
    throw new Error(`交易对 ${symbol} 不存在或不可用`);
  }

  // 获取交易规则
  const lotSizeFilter = symbolInfo.filters?.find(f => f.filterType === 'LOT_SIZE');
  const priceFilter = symbolInfo.filters?.find(f => f.filterType === 'PRICE_FILTER');

  if (!lotSizeFilter || !priceFilter) {
    console.error(`[优化参数] 交易对 ${symbol} 过滤器不完整`, {
      filters: symbolInfo.filters,
      lotSizeFilter,
      priceFilter
    });
    throw new Error(`交易对 ${symbol} 交易规则不完整`);
  }

  // 提取精度参数
  const minQty = Number(lotSizeFilter.minQty);
  const maxQty = Number(lotSizeFilter.maxQty);
  const stepSize = Number(lotSizeFilter.stepSize);
  const tickSize = Number(priceFilter.tickSize);
  const minPrice = Number(priceFilter.minPrice);

  console.log(`[优化参数] 交易对 ${symbol} 规则:`, {
    minQty,
    maxQty,
    stepSize,
    tickSize,
    minPrice
  });

  // 验证提取的精度参数是否有效
  if (isNaN(minQty) || isNaN(maxQty) || isNaN(stepSize) || isNaN(tickSize) || isNaN(minPrice)) {
    throw new Error(`交易对 ${symbol} 精度参数无效，请稍后重试`);
  }

  // 3. 调整用户输入的 min_trade_value 和 max_trade_value 到符合规则的范围
  const adjusted_min_trade_value = Math.max(min_trade_value, minQty * symbolInfo.filters?.find(f => f.filterType === 'MIN_NOTIONAL')?.notional || 10);
  const adjusted_max_trade_value = Math.max(max_trade_value, adjusted_min_trade_value);

  // 4. 创建客户端
  const client = createClient(api_key, api_secret);

  // 获取100根周期K线数据
  const kline_list = await fetchKlineList(client, symbol, interval);

  if (kline_list.length < 11) {
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
  const atr = calculateATR(kline_list);

  // 获取实时标记价格
  let current_price = kline_list[kline_list.length - 1].close; // 默认用最后一根K线收盘价
  try {
    const mark_price_data = await client.getMarkPrice({ symbol });
    current_price = parseFloat(mark_price_data.markPrice);
  } catch (error) {
    console.warn(`[警告] 获取实时标记价格失败，使用K线收盘价: ${error?.message || error}`);
  }

  // 计算市场数据（使用新算法 + 历史关键位分析）
  const market = calculateSupportResistance(kline_list, dailyKlineList, symbol, atr);
  market.currentPrice = current_price; // 添加实时价格

  // 5. 根据优化目标选择算法（传入精度规则）
  const optimize_params = {
    kline_list,
    market,
    total_capital,
    interval_config,
    min_trade_value: adjusted_min_trade_value,
    max_trade_value: adjusted_max_trade_value,
    // 精度规则
    precision_rules: {
      minQty,
      maxQty,
      stepSize,
      tickSize,
      minPrice
    }
  };

  let recommended;

  if (optimize_target === 'cost') {
    recommended = optimizeForCostReduction(optimize_params);
  } else {
    recommended = optimizeForProfit(optimize_params);
  }

  if (!recommended) {
    throw new Error(
      `无法找到合适的网格配置。` +
      `当前价格区间: ${market.support.toFixed(2)} - ${market.resistance.toFixed(2)}, ` +
      `波动率: ${(market.volatility * 100).toFixed(2)}%。` +
      `建议: 增加资金(当前${total_capital} USDT)或选择波动更大的交易对`
    );
  }

  // 如果开启防守边界选项，计算蛰伏状态参数
  let boundary_defense = undefined;
  if (enable_boundary_defense) {
    boundary_defense = optimizeForBoundary(optimize_params);
  }

  // 计算波动率等级
  const volatility_level = market.volatility > 0.05 ? '高' : market.volatility > 0.02 ? '中' : '低';
  const volatility_percent = market.volatility * 100;

  // 解析网格间距百分比（从 recommended 中获取）
  const grid_spacing_percent = recommended?.analysis?.topList?.[0]?.gridSpacingPercent || 0;

  // 计算风险等级（默认杠杆 20 倍，前端可根据用户选择重新计算）
  const riskResult = calculateRiskLevel(volatility_level, 20, grid_spacing_percent, volatility_percent);

  // 6. 返回结果（参数已在计算时符合交易所规则）
  return {
    symbol,
    interval,
    interval_label: interval_config.label,
    optimize_target,
    optimize_target_label: optimize_target === 'profit' ? '收益最大化' : '成本摊薄',
    enable_boundary_defense,
    total_capital,
    min_trade_value,
    max_trade_value,
    fee_rate: FEE_RATE,

    // 市场分析数据
    market: {
      current_price: new BigNumber(market.currentPrice).toFixed(6),
      support: new BigNumber(market.support).toFixed(6),
      resistance: new BigNumber(market.resistance).toFixed(6),
      avg_price: new BigNumber(market.avgPrice).toFixed(6),
      price_range: new BigNumber(market.priceRange).toFixed(6),
      // 波动率及其评级
      volatility: new BigNumber(volatility_percent).toFixed(2) + '%',
      volatility_level: volatility_level,
      volatility_advice: market.volatility > 0.05
        ? `市场活跃度高，价格波动达 ${volatility_percent.toFixed(2)}%，网格策略捕捉收益机会充足，适合激进型投资者追求更高回报`
        : market.volatility > 0.02
          ? `市场波动适中，价格波动约 ${volatility_percent.toFixed(2)}%，网格策略收益稳定，风险可控，适合稳健型投资者`
          : `市场波动偏低（${volatility_percent.toFixed(2)}%），价格变化较小，网格策略收益空间有限，建议选择波动更大的交易对或降低交易频次`,
      // ATR及其说明
      atr: new BigNumber(atr).toFixed(2),
      atr_desc: `每${interval_config.label}平均波动 ${new BigNumber(atr).toFixed(2)} USDT`,
      kline_count: kline_list.length,
      // 算法状态信息
      algorithm_status: market.algorithmStatus,
      algorithm_source: market.algorithmSource,
      // 间距信息（供日志使用）
      spread_str: market.identifyResult?.meta?.spreadStr,
      spread_ratio: market.identifyResult?.meta?.spreadRatio,
      // 识别结果详情（供日志使用）
      identify_result: market.identifyResult
    },

    // 风险评估
    risk: {
      level: riskResult.level,
      score: riskResult.score
    },

    // 推荐网格参数（正常状态使用，已符合交易所规则）
    recommended,

    // 防守边界参数（突破边界后使用，仅当 enableBoundaryDefense=true 时返回）
    boundary_defense
  };
};

module.exports = {
  optimizeGridParams,
  FEE_RATE,
  INTERVAL_MAP
};
