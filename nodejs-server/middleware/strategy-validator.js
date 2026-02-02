/**
 * 策略参数验证中间件
 * 在创建/更新策略时验证参数是否符合币安交易所规则
 */

const strategyValidator = require('../utils/strategy-validator');
const binanceExchangeInfoService = require('../service/binance-exchange-info.service');

/**
 * 验证策略参数中间件
 */
const validateStrategyParams = async (req, res, next) => {
  try {
    const { api_key, secret_key } = req.apiCredentials;
    const {
      trading_pair,
      grid_trade_quantity,
      grid_long_open_quantity,
      grid_long_close_quantity,
      grid_short_open_quantity,
      grid_short_close_quantity,
      grid_price_difference
    } = req.body;

    // 1. 获取交易所信息（从数据库缓存）
    const exchangeInfo = await binanceExchangeInfoService.getLatestExchangeInfo();

    if (!exchangeInfo) {
      return res.apiError(null, '交易所信息未初始化，请稍后重试');
    }

    // 2. 查找交易对信息
    const symbolInfo = exchangeInfo.symbols?.find(s => s.symbol === trading_pair);

    if (!symbolInfo) {
      return res.apiError(null, `交易对 ${trading_pair} 不存在或不可用`);
    }

    // 3. 验证交易数量 - 支持新旧字段
    const quantitiesToValidate = [];

    // 旧字段
    if (grid_trade_quantity) {
      quantitiesToValidate.push(grid_trade_quantity);
    }

    // 新字段（做多/做空的开仓/平仓数量）
    if (grid_long_open_quantity) quantitiesToValidate.push(grid_long_open_quantity);
    if (grid_long_close_quantity) quantitiesToValidate.push(grid_long_close_quantity);
    if (grid_short_open_quantity) quantitiesToValidate.push(grid_short_open_quantity);
    if (grid_short_close_quantity) quantitiesToValidate.push(grid_short_close_quantity);

    // 验证每个数量字段
    for (const quantity of quantitiesToValidate) {
      const quantityResult = strategyValidator.validateQuantity(quantity, symbolInfo);
      if (!quantityResult.valid) {
        return res.apiError(null, `${quantityResult.message}${quantityResult.suggestion ? `，建议值: ${quantityResult.suggestion}` : ''}`);
      }
    }

    // 4. 验证最小交易金额（MIN_NOTIONAL）
    const minNotionalResult = strategyValidator.validateMinNotional(quantitiesToValidate, symbolInfo, trading_pair);
    if (!minNotionalResult.valid) {
      return res.apiError(null, minNotionalResult.message);
    }

    // 5. 验证价格差价
    if (grid_price_difference) {
      const priceResult = strategyValidator.validatePriceDifference(grid_price_difference, symbolInfo);
      if (!priceResult.valid) {
        return res.apiError(null, `${priceResult.message}${priceResult.suggestion ? `，建议值: ${priceResult.suggestion}` : ''}`);
      }
    }

    // 验证通过，继续执行
    next();
  } catch (error) {
    console.error('策略参数验证失败:', error);
    return res.apiError(null, '策略参数验证失败，请稍后重试');
  }
};

module.exports = {
  validateStrategyParams
};
