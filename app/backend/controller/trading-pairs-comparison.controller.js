const catchAsync = require('../utils/catch-async');
const tradingPairsComparisonService = require('../service/trading-pairs-comparison.service.js');

/**
 * 获取有合约但没有现货的交易对
 */
const getFuturesOnlyPairs = catchAsync(async (req, res) => {
  const { suffix } = req.query;
  const result = await tradingPairsComparisonService.getFuturesOnlyPairs(suffix);
  return res.apiSuccess(result, '成功获取有合约但没有现货的交易对');
});

/**
 * 获取有现货但没有合约的交易对
 */
const getSpotOnlyPairs = catchAsync(async (req, res) => {
  const { suffix } = req.query;
  const result = await tradingPairsComparisonService.getSpotOnlyPairs(suffix);
  return res.apiSuccess(result, '成功获取有现货但没有合约的交易对');
});

/**
 * 获取交易对与基础资产综合分析报告
 * 包含现货与合约交易对对比、基础资产覆盖情况等综合信息
 */
const getComprehensiveReport = catchAsync(async (req, res) => {
  const { suffix } = req.query;
  const result = await tradingPairsComparisonService.getComprehensiveReport(suffix);
  return res.apiSuccess(result, '成功获取综合分析报告');
});

/**
 * 分析特定交易对的可用性
 */
const analyzeTradingPairAvailability = catchAsync(async (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.apiError(null, '请提供交易对符号');
  }

  const result = await tradingPairsComparisonService.analyzeTradingPairAvailability(symbol.toUpperCase());
  return res.apiSuccess(result, `成功分析交易对 ${symbol} 的可用性`);
});

/**
 * 获取现货交易对列表
 */
const getSpotTradingPairs = catchAsync(async (req, res) => {
  const { suffix } = req.query;
  const pairs = await tradingPairsComparisonService.fetchSpotTradingPairs(suffix);
  return res.apiSuccess({
    count: pairs.length,
    pairs: pairs.sort(),
    description: suffix ? `以${suffix}结尾的现货交易对` : '所有现货交易对'
  }, '成功获取现货交易对列表');
});

/**
 * 获取合约交易对列表
 */
const getFuturesTradingPairs = catchAsync(async (req, res) => {
  const { suffix } = req.query;
  const pairs = await tradingPairsComparisonService.fetchFuturesTradingPairs(suffix);
  return res.apiSuccess({
    count: pairs.length,
    pairs: pairs.sort(),
    description: suffix ? `以${suffix}结尾的合约交易对（永续合约）` : '所有合约交易对（永续合约）'
  }, '成功获取合约交易对列表');
});

/**
 * 获取币本位合约交易对列表
 */
const getCoinMFuturesTradingPairs = catchAsync(async (req, res) => {
  const pairs = await tradingPairsComparisonService.fetchCoinMFuturesTradingPairs();
  return res.apiSuccess({
    count: pairs.length,
    pairs: pairs.sort(),
    description: '所有币本位合约交易对（永续合约）'
  }, '成功获取币本位合约交易对列表');
});

module.exports = {
  getFuturesOnlyPairs,
  getSpotOnlyPairs,
  getComprehensiveReport,
  analyzeTradingPairAvailability,
  getSpotTradingPairs,
  getFuturesTradingPairs,
  getCoinMFuturesTradingPairs
};