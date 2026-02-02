/**
 * 策略参数验证器
 * 根据币安交易所规则验证策略参数
 */

/**
 * 验证交易数量
 * @param {string|number} quantity - 交易数量
 * @param {object} exchangeInfo - 交易所信息
 * @returns {object} 验证结果 {valid, field, message, suggestion}
 */
function validateQuantity(quantity, exchangeInfo) {
  const qty = Number(quantity);

  // 获取 LOT_SIZE 过滤器
  const lotSizeFilter = exchangeInfo.filters?.find(f => f.filterType === 'LOT_SIZE');
  if (!lotSizeFilter) {
    return {
      valid: true,
      field: 'grid_trade_quantity',
      message: '未找到 LOT_SIZE 过滤器'
    };
  }

  const minQty = Number(lotSizeFilter.minQty);
  const maxQty = Number(lotSizeFilter.maxQty);

  // 检查最小值
  if (qty < minQty) {
    return {
      valid: false,
      field: 'grid_trade_quantity',
      message: `交易数量 ${quantity} 小于最小值 ${minQty}`,
      suggestion: minQty.toString()
    };
  }

  // 检查最大值
  if (qty > maxQty) {
    return {
      valid: false,
      field: 'grid_trade_quantity',
      message: `交易数量 ${quantity} 超过最大值 ${maxQty}`,
      suggestion: maxQty.toString()
    };
  }

  return {
    valid: true,
    field: 'grid_trade_quantity',
    message: '交易数量符合要求'
  };
}

/**
 * 验证最小交易金额（MIN_NOTIONAL）
 * @param {array} quantities - 交易数量数组
 * @param {object} exchangeInfo - 交易所信息
 * @param {string} symbol - 交易对符号
 * @param {number} currentPrice - 当前市场价格
 * @returns {object} 验证结果 {valid, message}
 */
function validateMinNotional(quantities, exchangeInfo, symbol, currentPrice) {
  const minNotionalFilter = exchangeInfo.filters?.find(f => f.filterType === 'MIN_NOTIONAL');

  if (!minNotionalFilter) {
    return { valid: true, message: '未找到 MIN_NOTIONAL 过滤器，跳过最小交易金额验证' };
  }

  const minNotional = Number(minNotionalFilter.notional ?? minNotionalFilter.minNotional);

  if (minNotional <= 0) {
    return { valid: true, message: 'MIN_NOTIONAL 值无效，跳过验证' };
  }

  if (!currentPrice) {
    return { valid: false, message: `无法验证最小交易金额，缺少当前价格信息` };
  }

  for (const qty of quantities) {
    const quantity = Number(qty);
    const estimatedValue = quantity * currentPrice;

    if (estimatedValue < minNotional) {
      const requiredQty = minNotional / currentPrice;
      return {
        valid: false,
        message: `根据币安官方要求，${symbol} 最小单笔交易金额为 ${minNotional.toFixed(2)} USDT。` +
                 `当前交易数量 ${quantity} 的预估价值为 ${estimatedValue.toFixed(2)} USDT，不满足要求。` +
                 `建议交易数量至少为 ${requiredQty.toFixed(6)} ${symbol.replace('USDT', '')}`
      };
    }
  }

  return { valid: true, message: '最小交易金额符合要求' };
}

/**
 * 验证价格差价
 * @param {string|number} priceDiff - 价格差价
 * @param {object} exchangeInfo - 交易所信息
 * @returns {object} 验证结果 {valid, field, message, suggestion}
 */
function validatePriceDifference(priceDiff, exchangeInfo) {
  const price = Number(priceDiff);

  // 获取 PRICE_FILTER 过滤器
  const priceFilter = exchangeInfo.filters?.find(f => f.filterType === 'PRICE_FILTER');
  if (!priceFilter) {
    return {
      valid: true,
      field: 'grid_price_difference',
      message: '未找到 PRICE_FILTER 过滤器'
    };
  }

  const tickSize = Number(priceFilter.tickSize);
  const tickSizeStr = priceFilter.tickSize; // 保持原始格式
  const minPrice = Number(priceFilter.minPrice);

  // 检查是否小于 tickSize
  if (price < tickSize) {
    return {
      valid: false,
      field: 'grid_price_difference',
      message: `价格差价 ${priceDiff} 小于最小 tickSize ${tickSizeStr}`,
      suggestion: tickSizeStr
    };
  }

  // 检查是否小于最小价格
  if (price < minPrice) {
    return {
      valid: false,
      field: 'grid_price_difference',
      message: `价格差价 ${priceDiff} 小于最小价格 ${minPrice}`,
      suggestion: minPrice.toString()
    };
  }

  // 检查是否符合 tickSize 精度
  // 使用容差避免浮点数精度问题
  const EPSILON = 0.00000001;
  const remainder = price % tickSize;

  // 如果余数接近 0 或接近 tickSize，则认为符合要求
  const isAligned = Math.abs(remainder) < EPSILON || Math.abs(remainder - tickSize) < EPSILON;

  if (!isAligned) {
    // 向下取整到最近的 tick
    const tickCount = Math.floor(price / tickSize);
    const adjustedPrice = tickCount * tickSize;
    // 计算小数位数
    const tickDecimals = tickSizeStr.split('.')[1]?.length || 2;
    return {
      valid: false,
      field: 'grid_price_difference',
      message: `价格差价 ${priceDiff} 不符合 tickSize ${tickSizeStr}`,
      suggestion: adjustedPrice.toFixed(tickDecimals)
    };
  }

  return {
    valid: true,
    field: 'grid_price_difference',
    message: '价格差价符合要求'
  };
}

module.exports = {
  validateQuantity,
  validateMinNotional,
  validatePriceDifference
};
