const catchAsync = require('../utils/catchAsync');
const tradingPairsComparisonService = require('../service/trading-pairs-comparison.service.js');

/**
 * 获取有合约但没有现货的交易对
 */
const getFuturesOnlyPairs = catchAsync(async (req, res) => {
  try {
    const { suffix } = req.query;
    const result = await tradingPairsComparisonService.getFuturesOnlyPairs(suffix);
    res.json({
      success: true,
      data: result,
      message: '成功获取有合约但没有现货的交易对'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPARISON_ERROR',
        message: '无法获取交易对比较信息',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        operation: 'get_futures_only_pairs'
      },
      data: null
    });
  }
});

/**
 * 获取有现货但没有合约的交易对
 */
const getSpotOnlyPairs = catchAsync(async (req, res) => {
  try {
    const { suffix } = req.query;
    const result = await tradingPairsComparisonService.getSpotOnlyPairs(suffix);
    res.json({
      success: true,
      data: result,
      message: '成功获取有现货但没有合约的交易对'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPARISON_ERROR',
        message: '无法获取交易对比较信息',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        operation: 'get_spot_only_pairs'
      },
      data: null
    });
  }
});

/**
 * 获取交易对与基础资产综合分析报告
 * 包含现货与合约交易对对比、基础资产覆盖情况等综合信息
 */
const getComprehensiveReport = catchAsync(async (req, res) => {
  try {
    const { suffix } = req.query;
    const result = await tradingPairsComparisonService.getComprehensiveReport(suffix);
    res.json({
      success: true,
      data: result,
      message: '成功获取综合分析报告'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_ERROR',
        message: '无法生成综合分析报告',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        operation: 'generate_comprehensive_report'
      },
      data: null
    });
  }
});

/**
 * 分析特定交易对的可用性
 */
const analyzeTradingPairAvailability = catchAsync(async (req, res) => {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: '请提供交易对符号',
        details: '缺少必要的参数: symbol',
        timestamp: new Date().toISOString()
      },
      data: null
    });
  }

  try {
    const result = await tradingPairsComparisonService.analyzeTradingPairAvailability(symbol.toUpperCase());
    res.json({
      success: true,
      data: result,
      message: `成功分析交易对 ${symbol} 的可用性`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: `无法分析交易对 ${symbol} 的可用性`,
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        operation: 'analyze_trading_pair',
        symbol: symbol
      },
      data: null
    });
  }
});

/**
 * 获取现货交易对列表
 */
const getSpotTradingPairs = catchAsync(async (req, res) => {
  try {
    const { suffix } = req.query;
    const pairs = await tradingPairsComparisonService.fetchSpotTradingPairs(suffix);
    res.json({
      success: true,
      data: {
        count: pairs.length,
        pairs: pairs.sort(),
        description: suffix ? `以${suffix}结尾的现货交易对` : '所有现货交易对'
      },
      message: '成功获取现货交易对列表'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SPOT_API_ERROR',
        message: '无法获取现货交易对信息',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        source: 'binance_spot_api'
      },
      data: null
    });
  }
});

/**
 * 获取合约交易对列表
 */
const getFuturesTradingPairs = catchAsync(async (req, res) => {
  try {
    const { suffix } = req.query;
    const pairs = await tradingPairsComparisonService.fetchFuturesTradingPairs(suffix);
    res.json({
      success: true,
      data: {
        count: pairs.length,
        pairs: pairs.sort(),
        description: suffix ? `以${suffix}结尾的合约交易对（永续合约）` : '所有合约交易对（永续合约）'
      },
      message: '成功获取合约交易对列表'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FUTURES_API_ERROR',
        message: '无法获取合约交易对信息',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        source: 'binance_futures_api'
      },
      data: null
    });
  }
});

/**
 * 获取币本位合约交易对列表
 */
const getCoinMFuturesTradingPairs = catchAsync(async (req, res) => {
  try {
    const pairs = await tradingPairsComparisonService.fetchCoinMFuturesTradingPairs();
    res.json({
      success: true,
      data: {
        count: pairs.length,
        pairs: pairs.sort(),
        description: '所有币本位合约交易对（永续合约）'
      },
      message: '成功获取币本位合约交易对列表'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COIN_M_FUTURES_API_ERROR',
        message: '无法获取币本位合约交易对信息',
        details: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        source: 'binance_coin_m_futures_api'
      },
      data: null
    });
  }
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