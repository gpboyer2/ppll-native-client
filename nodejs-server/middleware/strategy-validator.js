/**
 * 策略参数验证中间件
 * 在创建/更新策略时验证参数是否符合币安交易所规则
 */

const strategyValidator = require('../utils/strategy-validator');
const binanceExchangeInfoService = require('../service/binance-exchange-info.service');
const { sendError } = require('../utils/api-response');
const httpStatus = require('http-status');

/**
 * 验证策略参数中间件
 */
const validateStrategyParams = async (req, res, next) => {
  try {
    const { api_key, secret_key } = req.apiCredentials;
    const { trading_pair, grid_trade_quantity, grid_price_difference } = req.body;

    // 1. 获取交易所信息（从数据库缓存）
    const exchangeInfo = await binanceExchangeInfoService.getLatestExchangeInfo();

    if (!exchangeInfo) {
      return sendError(res, '交易所信息未初始化，请稍后重试', httpStatus.SERVICE_UNAVAILABLE);
    }

    // 2. 查找交易对信息
    const symbolInfo = exchangeInfo.symbols?.find(s => s.symbol === trading_pair);

    if (!symbolInfo) {
      return sendError(res, `交易对 ${trading_pair} 不存在或不可用`, httpStatus.BAD_REQUEST);
    }

    // 3. 验证交易数量
    if (grid_trade_quantity) {
      const quantityResult = strategyValidator.validateQuantity(grid_trade_quantity, symbolInfo);
      if (!quantityResult.valid) {
        return sendError(res, {
          message: quantityResult.message,
          field: quantityResult.field,
          suggestion: quantityResult.suggestion
        }, httpStatus.BAD_REQUEST);
      }
    }

    // 4. 验证价格差价
    if (grid_price_difference) {
      const priceResult = strategyValidator.validatePriceDifference(grid_price_difference, symbolInfo);
      if (!priceResult.valid) {
        return sendError(res, {
          message: priceResult.message,
          field: priceResult.field,
          suggestion: priceResult.suggestion
        }, httpStatus.BAD_REQUEST);
      }
    }

    // 验证通过，继续执行
    next();
  } catch (error) {
    console.error('策略参数验证失败:', error);
    return sendError(res, '策略参数验证失败，请稍后重试', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  validateStrategyParams
};
