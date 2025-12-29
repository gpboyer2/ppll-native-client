/**
 * 策略参数验证器测试
 * 使用 TDD 方式开发
 */

const strategyValidator = require('../utils/strategy-validator');

describe('策略参数验证器', () => {
  // 模拟币安交易所信息
  const mockExchangeInfo = {
    symbol: 'BTCUSDT',
    filters: [
      {
        filterType: 'LOT_SIZE',
        minQty: '0.001',
        maxQty: '1000',
        stepSize: '0.001'
      },
      {
        filterType: 'PRICE_FILTER',
        minPrice: '0.10',
        maxPrice: '1000000',
        tickSize: '0.10'
      },
      {
        filterType: 'MIN_NOTIONAL',
        notional: '10'
      }
    ]
  };

  describe('交易数量验证', () => {
    test('应该接受符合最小数量限制的值', () => {
      const result = strategyValidator.validateQuantity('0.001', mockExchangeInfo);

      expect(result.valid).toBe(true);
      expect(result.field).toBe('grid_trade_quantity');
    });

    test('应该拒绝小于最小数量的值', () => {
      const result = strategyValidator.validateQuantity('0.0002', mockExchangeInfo);

      expect(result.valid).toBe(false);
      expect(result.field).toBe('grid_trade_quantity');
      expect(result.message).toContain('0.001');
      expect(result.suggestion).toBe('0.001');
    });

    test('应该拒绝超过最大数量的值', () => {
      const result = strategyValidator.validateQuantity('2000', mockExchangeInfo);

      expect(result.valid).toBe(false);
      expect(result.field).toBe('grid_trade_quantity');
      expect(result.message).toContain('1000');
      expect(result.suggestion).toBe('1000');
    });
  });

  describe('价格差价验证', () => {
    test('应该接受符合 tickSize 的价格差价', () => {
      const result = strategyValidator.validatePriceDifference('100.10', mockExchangeInfo);

      expect(result.valid).toBe(true);
      expect(result.field).toBe('grid_price_difference');
    });

    test('应该拒绝不符合 tickSize 的价格差价', () => {
      const result = strategyValidator.validatePriceDifference('100.15', mockExchangeInfo);

      expect(result.valid).toBe(false);
      expect(result.field).toBe('grid_price_difference');
      expect(result.message).toContain('0.10');
      expect(result.suggestion).toBe('100.10');
    });

    test('应该拒绝小于 tickSize 的价格差价', () => {
      const result = strategyValidator.validatePriceDifference('0.05', mockExchangeInfo);

      expect(result.valid).toBe(false);
      expect(result.field).toBe('grid_price_difference');
      expect(result.message).toContain('0.10');
      expect(result.suggestion).toBe('0.10');
    });
  });
});
