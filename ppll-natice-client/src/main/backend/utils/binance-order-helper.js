/**
 * 币安订单助手工具
 * 简化订单处理逻辑，减少复杂的精度处理
 */

const bigNumber = require("bignumber.js");
const { USDMClient } = require("binance");
const { getProxyConfig } = require("../utils/proxy.js");
const UtilRecord = require("../utils/record-log.js");

/** @type {any} */
const Binance = require("binance");

/**
 * 智能下单 - 按价值下单，自动处理精度
 * @param {Object} orderParams - 订单参数
 * @param {string} orderParams.symbol - 交易对符号
 * @param {string} orderParams.side - 买卖方向 (BUY/SELL)
 * @param {string} orderParams.positionSide - 持仓方向 (LONG/SHORT)
 * @param {number|string} orderParams.notionalValue - 订单价值（USDT）
 * @param {number|string} orderParams.currentPrice - 当前价格
 * @param {string} apiKey - API密钥
 * @param {string} apiSecret - API密钥Secret
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} 订单结果
 */
async function placeOrderByValue(
    orderParams,
    apiKey,
    apiSecret,
    maxRetries = 3,
) {
    const { symbol, side, positionSide, notionalValue, currentPrice } =
        orderParams;

    console.log(
        `开始按价值下单: ${symbol}, 价值: ${notionalValue} USDT, 价格: ${currentPrice}`,
    );

    // 计算基础数量
    let quantity = new bigNumber(notionalValue).div(currentPrice);

    // 获取交易对的基础精度信息
    let quantityPrecision = 8; // 默认精度

    try {
        const options = {
            api_key: apiKey,
            api_secret: apiSecret,
            beautify: true,
        };

        const requestOptions = {
            timeout: 10000,
        };

        if (process.env.NODE_ENV !== "production") {
            const proxyConfig = getProxyConfig();
            if (proxyConfig.proxy_obj) {
                requestOptions.proxy = proxyConfig.proxy_obj;
            }
        }

        const client = new USDMClient(options, requestOptions);
        const exchangeInfo = await client.getExchangeInfo();
        const symbolInfo = exchangeInfo.symbols.find(
            (s) => s.symbol === symbol,
        );
        if (symbolInfo) {
            quantityPrecision = symbolInfo.quantityPrecision;
        }
    } catch (error) {
        console.warn(`获取交易对信息失败，使用默认精度: ${error.message}`);
    }

    // 使用基础精度调整数量
    const quantityString = quantity.toFixed(quantityPrecision);
    quantity = new bigNumber(quantityString);

    let lastError = null;

    // 重试机制
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(
                `第 ${attempt} 次尝试下单: ${symbol}, 数量: ${quantity}`,
            );

            const options = {
                api_key: apiKey,
                api_secret: apiSecret,
                beautify: true,
            };

            const requestOptions = {
                timeout: 10000,
            };

            if (process.env.NODE_ENV !== "production") {
                const proxyConfig = getProxyConfig();
                if (proxyConfig.proxy_obj) {
                    requestOptions.proxy = proxyConfig.proxy_obj;
                }
            }

            const client = new USDMClient(options, requestOptions);
            const orderResult = await client.submitNewOrder({
                symbol,
                side: /** @type {any} */ (side),
                type: "MARKET",
                quantity: String(quantity),
                positionSide: /** @type {any} */ (positionSide),
            });

            console.log(`✅ ${symbol} 下单成功, 数量: ${quantity}`);
            return {
                success: true,
                symbol,
                quantity,
                notionalValue,
                attempt,
                result: orderResult,
            };
        } catch (error) {
            lastError = error;
            console.warn(
                `❌ ${symbol} 第 ${attempt} 次下单失败: ${error.message || error}`,
            );

            // 如果是精度错误，尝试调整数量
            if (typeof error === "string" && error.includes("-1111")) {
                console.log(`精度错误，尝试调整数量...`);

                // 策略1: 减少小数位数
                if (attempt === 1) {
                    const newPrecision = Math.max(0, quantityPrecision - 1);
                    quantity = new bigNumber(
                        new bigNumber(quantity).toFixed(newPrecision),
                    );
                    console.log(`调整精度到 ${newPrecision} 位: ${quantity}`);
                    continue;
                }

                // 策略2: 进一步减少数量
                if (attempt === 2) {
                    quantity = new bigNumber(
                        new bigNumber(quantity)
                            .multipliedBy(0.99)
                            .toFixed(quantityPrecision),
                    );
                    console.log(`减少1%数量: ${quantity}`);
                    continue;
                }

                // 策略3: 使用最小步长
                if (attempt === 3) {
                    quantity = new bigNumber(
                        new bigNumber(quantity).toFixed(0),
                    );
                    console.log(`使用整数数量: ${quantity}`);
                    continue;
                }
            }

            // 如果是余额不足等其他错误，直接中断
            if (
                typeof error === "string" &&
                (error.includes("-2019") || error.includes("-1013"))
            ) {
                break;
            }
        }
    }

    console.error(`❌ ${symbol} 下单最终失败，已重试 ${maxRetries} 次`);
    return {
        success: false,
        symbol,
        quantity,
        notionalValue,
        error: lastError?.message || lastError,
        maxRetries,
    };
}

/**
 * 批量按价值下单
 * @param {Array} orders - 订单列表
 * @param {string} apiKey - API密钥
 * @param {string} apiSecret - API密钥Secret
 * @returns {Promise<Object>} 批量下单结果
 */
async function batchPlaceOrdersByValue(orders, apiKey, apiSecret) {
    const results = [];
    let successCount = 0;

    console.log(`开始批量下单，共 ${orders.length} 个订单`);

    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        try {
            const result = await placeOrderByValue(order, apiKey, apiSecret);
            results.push(result);

            if (result.success) {
                successCount++;
            }

            // 添加延迟避免API频率限制
            if (i < orders.length - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 200 + Math.random() * 300),
                );
            }
        } catch (error) {
            console.error(`批量下单第 ${i + 1} 个订单失败:`, error);
            results.push({
                success: false,
                symbol: order.symbol,
                error: error.message || error,
            });
        }
    }

    console.log(`✅ 批量下单完成: 成功 ${successCount}/${orders.length}`);

    return {
        success: successCount > 0,
        successCount,
        totalCount: orders.length,
        results,
    };
}

/**
 * 获取当前价格
 * @param {string} symbol - 交易对符号
 * @returns {Promise<number>} 当前价格
 */
async function getCurrentPrice(symbol, apiKey, apiSecret) {
    try {
        const options = {
            api_key: apiKey,
            api_secret: apiSecret,
            beautify: true,
        };

        const requestOptions = {
            timeout: 10000,
        };

        if (process.env.NODE_ENV !== "production") {
            const proxyConfig = getProxyConfig();
            if (proxyConfig.proxy_obj) {
                requestOptions.proxy = proxyConfig.proxy_obj;
            }
        }

        const client = new USDMClient(options, requestOptions);
        const priceData = await client.getSymbolPriceTicker({ symbol });
        return parseFloat(priceData.price);
    } catch (error) {
        throw new Error(`获取 ${symbol} 价格失败: ${error.message}`);
    }
}

/**
 * 创建建仓订单（简化版）
 * @param {string} symbol - 交易对符号
 * @param {number} longValue - 多单价值
 * @param {number} shortValue - 空单价值
 * @returns {Promise<Array>} 订单列表
 */
async function createPositionOrders(
    symbol,
    longValue,
    shortValue,
    apiKey,
    apiSecret,
) {
    const currentPrice = await getCurrentPrice(symbol, apiKey, apiSecret);
    const orders = [];

    if (longValue > 0) {
        orders.push({
            symbol,
            side: "BUY",
            positionSide: "LONG",
            notionalValue: longValue,
            currentPrice,
        });
    }

    if (shortValue > 0) {
        orders.push({
            symbol,
            side: "SELL",
            positionSide: "SHORT",
            notionalValue: shortValue,
            currentPrice,
        });
    }

    return orders;
}

module.exports = {
    placeOrderByValue,
    batchPlaceOrdersByValue,
    getCurrentPrice,
    createPositionOrders,
};
