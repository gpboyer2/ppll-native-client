/**
 * 币安U本位合约交易对服务
 * 从账户信息的positions中提取交易对，筛选USDT结尾的交易对存入数据库
 */
const db = require("../models");
const BinanceUmTradingPairs = db.binance_um_trading_pairs;
const UtilRecord = require("../utils/record-log.js");

/**
 * 从positions数组提取并更新交易对列表（钩子函数）
 * 当调用账户信息接口时自动更新交易对列表
 * @param {Array} positions - 账户信息的positions数组
 * @returns {Promise<number>} 更新的交易对数量
 */
const updateFromPositions = async (positions) => {
    if (!positions || !Array.isArray(positions)) {
        return 0;
    }

    const usdtPairs = positions
        .filter((p) => p.symbol && p.symbol.endsWith("USDT"))
        .map((p) => ({
            symbol: p.symbol,
            base_asset: p.symbol.replace("USDT", ""),
            quote_asset: "USDT",
        }));

    if (usdtPairs.length === 0) {
        return 0;
    }

    let updatedCount = 0;
    for (const pair of usdtPairs) {
        await BinanceUmTradingPairs.upsert(pair);
        updatedCount++;
    }

    return updatedCount;
};

/**
 * 获取所有交易对符号
 * @returns {Promise<Array<string>>} 交易对符号数组
 */
const getAllSymbols = async () => {
    const records = await BinanceUmTradingPairs.findAll({
        attributes: ["symbol"],
        order: [["symbol", "ASC"]],
    });

    return records.map((r) => r.symbol);
};

/**
 * 获取所有交易对
 * @returns {Promise<Array>} 交易对数组
 */
const getAllTradingPairs = async () => {
    return await BinanceUmTradingPairs.findAll({
        order: [["symbol", "ASC"]],
    });
};

module.exports = {
    updateFromPositions,
    getAllSymbols,
    getAllTradingPairs,
};
