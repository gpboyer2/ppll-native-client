/**
 * 币安U本位合约交易对控制器
 * 处理交易对列表查询
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const binanceUmTradingPairsService = require("../service/binance-um-trading-pairs.service");

/**
 * 查询交易对列表
 */
const getTradingPairs = catchAsync(async (req, res) => {
  try {
    const trading_pairs = await binanceUmTradingPairsService.getAllTradingPairs();

    return res.apiSuccess({
      list: trading_pairs,
      total: trading_pairs.length,
    }, "获取交易对列表成功");
  } catch (err) {
    console.error("获取交易对列表出错:", err);
    return res.apiError(null, err.message || "获取交易对列表失败");
  }
});

module.exports = {
  getTradingPairs,
};
