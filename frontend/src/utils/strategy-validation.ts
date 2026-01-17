/**
 * 策略参数验证工具
 * 根据币安交易所规则验证策略参数（前端版本）
 */

import type { BinanceSymbol, StrategyValidationResult } from '../types/binance';

/**
 * 验证交易数量
 * @param quantity - 交易数量
 * @param symbolInfo - 交易对信息
 * @returns 验证结果
 */
export function validateQuantity(
  quantity: string | number,
  symbolInfo: BinanceSymbol | null | undefined
): StrategyValidationResult {
  if (!symbolInfo) {
    return {
      isValid: true,
      message: '未获取到交易对信息，跳过验证'
    };
  }

  const qty = Number(quantity);

  // 获取 LOT_SIZE 过滤器
  const lotSizeFilter = symbolInfo.filters?.find(
    (f) => f.filterType === 'LOT_SIZE'
  ) as any;

  if (!lotSizeFilter) {
    return {
      isValid: true,
      field: 'grid_trade_quantity',
      message: '未找到 LOT_SIZE 过滤器'
    };
  }

  const minQty = Number(lotSizeFilter.minQty);
  const maxQty = Number(lotSizeFilter.maxQty);

  // 检查最小值
  if (qty < minQty) {
    return {
      isValid: false,
      field: 'grid_trade_quantity',
      message: `交易数量 ${quantity} 小于最小值 ${minQty}`,
      suggestion: minQty.toString()
    };
  }

  // 检查最大值
  if (qty > maxQty) {
    return {
      isValid: false,
      field: 'grid_trade_quantity',
      message: `交易数量 ${quantity} 超过最大值 ${maxQty}`,
      suggestion: maxQty.toString()
    };
  }

  return {
    isValid: true,
    field: 'grid_trade_quantity',
    message: '交易数量符合要求'
  };
}

/**
 * 验证价格差价
 * @param priceDiff - 价格差价
 * @param symbolInfo - 交易对信息
 * @returns 验证结果
 */
export function validatePriceDifference(
  priceDiff: string | number,
  symbolInfo: BinanceSymbol | null | undefined
): StrategyValidationResult {
  if (!symbolInfo) {
    return {
      isValid: true,
      message: '未获取到交易对信息，跳过验证'
    };
  }

  const price = Number(priceDiff);

  // 获取 PRICE_FILTER 过滤器
  const priceFilter = symbolInfo.filters?.find(
    (f) => f.filterType === 'PRICE_FILTER'
  ) as any;

  if (!priceFilter) {
    return {
      isValid: true,
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
      isValid: false,
      field: 'grid_price_difference',
      message: `价格差价 ${priceDiff} 小于最小 tickSize ${tickSizeStr}`,
      suggestion: tickSizeStr
    };
  }

  // 检查是否小于最小价格
  if (price < minPrice) {
    return {
      isValid: false,
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
  const isAligned =
    Math.abs(remainder) < EPSILON || Math.abs(remainder - tickSize) < EPSILON;

  if (!isAligned) {
    // 向下取整到最近的 tick
    const tickCount = Math.floor(price / tickSize);
    const adjustedPrice = tickCount * tickSize;
    // 计算小数位数
    const tickDecimals = tickSizeStr.split('.')[1]?.length || 2;
    return {
      isValid: false,
      field: 'grid_price_difference',
      message: `价格差价 ${priceDiff} 不符合 tickSize ${tickSizeStr}`,
      suggestion: adjustedPrice.toFixed(tickDecimals)
    };
  }

  return {
    isValid: true,
    field: 'grid_price_difference',
    message: '价格差价符合要求'
  };
}

/**
 * 验证杠杆倍数
 * @param leverage - 杠杆倍数
 * @returns 验证结果
 */
export function validateLeverage(leverage: string | number): StrategyValidationResult {
  const lev = Number(leverage);

  if (isNaN(lev) || lev <= 0) {
    return {
      isValid: false,
      field: 'leverage',
      message: '杠杆倍数必须是大于0的数字'
    };
  }

  if (lev > 125) {
    return {
      isValid: false,
      field: 'leverage',
      message: '杠杆倍数不能超过125倍',
      suggestion: '125'
    };
  }

  return {
    isValid: true,
    field: 'leverage',
    message: '杠杆倍数符合要求'
  };
}

/**
 * 根据字段名称验证策略参数
 * @param field_name - 字段名称
 * @param value - 字段值
 * @param symbolInfo - 交易对信息
 * @returns 验证结果
 */
export function validateStrategyField(
  field_name: string,
  value: string | number,
  symbolInfo: BinanceSymbol | null | undefined
): StrategyValidationResult {
  switch (field_name) {
    case 'grid_trade_quantity':
    case 'grid_long_open_quantity':
    case 'grid_long_close_quantity':
    case 'grid_short_open_quantity':
    case 'grid_short_close_quantity':
      return validateQuantity(value, symbolInfo);

    case 'grid_price_difference':
      return validatePriceDifference(value, symbolInfo);

    case 'leverage':
      return validateLeverage(value);

    default:
      return {
        isValid: true,
        message: '该字段无需验证'
      };
  }
}
