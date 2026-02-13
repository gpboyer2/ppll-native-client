/**
 * 策略参数验证器测试
 * 使用 TDD 方式开发
 */

const strategyValidator = require("../utils/strategy-validator");

describe("策略参数验证器", () => {
    // 模拟币安交易所信息
    const mockExchangeInfo = {
        symbol: "BTCUSDT",
        filters: [
            {
                filterType: "LOT_SIZE",
                minQty: "0.001",
                maxQty: "1000",
                stepSize: "0.001",
            },
            {
                filterType: "PRICE_FILTER",
                minPrice: "0.10",
                maxPrice: "1000000",
                tickSize: "0.10",
            },
            {
                filterType: "MIN_NOTIONAL",
                notional: "10",
            },
        ],
    };

    describe("交易数量验证", () => {
        test("应该接受符合最小数量限制的值", () => {
            const result = strategyValidator.validateQuantity(
                "0.001",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(true);
            expect(result.field).toBe("grid_trade_quantity");
        });

        test("应该拒绝小于最小数量的值", () => {
            const result = strategyValidator.validateQuantity(
                "0.0002",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(false);
            expect(result.field).toBe("grid_trade_quantity");
            expect(result.message).toContain("0.001");
            expect(result.suggestion).toBe("0.001");
        });

        test("应该拒绝超过最大数量的值", () => {
            const result = strategyValidator.validateQuantity(
                "2000",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(false);
            expect(result.field).toBe("grid_trade_quantity");
            expect(result.message).toContain("1000");
            expect(result.suggestion).toBe("1000");
        });
    });

    describe("价格差价验证", () => {
        test("应该接受符合 tickSize 的价格差价", () => {
            const result = strategyValidator.validatePriceDifference(
                "100.10",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(true);
            expect(result.field).toBe("grid_price_difference");
        });

        test("应该拒绝不符合 tickSize 的价格差价", () => {
            const result = strategyValidator.validatePriceDifference(
                "100.15",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(false);
            expect(result.field).toBe("grid_price_difference");
            expect(result.message).toContain("0.10");
            expect(result.suggestion).toBe("100.10");
        });

        test("应该拒绝小于 tickSize 的价格差价", () => {
            const result = strategyValidator.validatePriceDifference(
                "0.05",
                mockExchangeInfo,
            );

            expect(result.valid).toBe(false);
            expect(result.field).toBe("grid_price_difference");
            expect(result.message).toContain("0.10");
            expect(result.suggestion).toBe("0.10");
        });
    });

    describe("最小交易金额验证（MIN_NOTIONAL）", () => {
        const currentPrice = 50000;

        test("应该接受满足最小交易金额的数量", () => {
            const quantities = ["0.001"];
            const result = strategyValidator.validateMinNotional(
                quantities,
                mockExchangeInfo,
                "BTCUSDT",
                currentPrice,
            );

            expect(result.valid).toBe(true);
            expect(result.message).toBe("最小交易金额符合要求");
        });

        test("应该拒绝不满足最小交易金额的数量", () => {
            const quantities = ["0.0001"];
            const result = strategyValidator.validateMinNotional(
                quantities,
                mockExchangeInfo,
                "BTCUSDT",
                currentPrice,
            );

            expect(result.valid).toBe(false);
            expect(result.message).toContain("最小单笔交易金额为 10.00 USDT");
            expect(result.message).toContain("预估价值为 5.00 USDT");
            expect(result.message).toContain("建议交易数量至少为");
        });

        test("应该验证多个数量中的每一个", () => {
            const quantities = ["0.001", "0.0001", "0.002"];
            const result = strategyValidator.validateMinNotional(
                quantities,
                mockExchangeInfo,
                "BTCUSDT",
                currentPrice,
            );

            expect(result.valid).toBe(false);
            expect(result.message).toContain("0.0001");
        });

        test("当缺少当前价格时应该返回错误", () => {
            const quantities = ["0.001"];
            const result = strategyValidator.validateMinNotional(
                quantities,
                mockExchangeInfo,
                "BTCUSDT",
                null,
            );

            expect(result.valid).toBe(false);
            expect(result.message).toContain("缺少当前价格信息");
        });

        test("当没有 MIN_NOTIONAL 过滤器时应该跳过验证", () => {
            const exchangeInfoWithoutFilter = {
                filters: [],
            };
            const quantities = ["0.0001"];
            const result = strategyValidator.validateMinNotional(
                quantities,
                exchangeInfoWithoutFilter,
                "BTCUSDT",
                currentPrice,
            );

            expect(result.valid).toBe(true);
            expect(result.message).toContain("跳过最小交易金额验证");
        });
    });
});
