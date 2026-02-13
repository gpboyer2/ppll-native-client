/**
 * 交易对工具函数
 * 提供交易对过滤、验证等工具函数
 */

/**
 * 过滤交易对：只保留USDT永续合约
 * @param {Array} symbols - 交易对数组
 * @returns {Array} 过滤后的交易对数组
 *
 * 过滤条件：
 * 1. symbol以USDT结尾
 * 2. 不包含下划线（排除当季/季度合约，如BTCUSDT_260327）
 * 3. 不以4位数字结尾（排除日期格式，如BTCUSDT240327）
 * 4. contractType为PERPETUAL（永续合约）
 *
 * @example
 * const { filterUsdtPerpetualContracts } = require('./utils/trading-pairs');
 * const filtered = filterUsdtPerpetualContracts(symbols);
 * // 返回: [BTCUSDT, ETHUSDT, ...]
 */
function filterUsdtPerpetualContracts(symbols) {
    if (!symbols || !Array.isArray(symbols)) {
        return [];
    }

    return symbols.filter((symbol) => {
        const symbolName = symbol.symbol || "";

        // 必须满足以下条件：
        // 1. 以USDT结尾
        // 2. 不包含下划线（排除当季/季度合约）
        // 3. 不以4位数字结尾（排除日期格式）
        // 4. contractType为PERPETUAL（永续合约）
        return (
            symbolName.endsWith("USDT") &&
            !symbolName.includes("_") &&
            !symbolName.match(/\d{4}$/) &&
            symbol.contractType === "PERPETUAL"
        );
    });
}

module.exports = {
    filterUsdtPerpetualContracts,
};
