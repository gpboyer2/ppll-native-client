/**
 * 计算工具
 * 提供交易计算相关的工具函数，包括利润计算、价格计算等
 */
const bigNumber = require("bignumber.js");

/**
 * 当前每网格匹配成功所得利润(扣减0.1%手续费)
 *  let 当前价格下每次交易数量的价值 = 当前价格 * 每次交易数量
 *  let 假设上涨后每次交易数量的价值 = (当前价格 + 网格之间的价格差价) * 每次交易数量
 *  let 假设上涨后价值的手续费 = 假设上涨后每次交易数量的价值 * 0.001
 *  let 实际利润 = 假设上涨后每次交易数量的价值 - 当前价格下每次交易数量的价值 - 假设上涨后每次交易数量的价值_扣除手续费;
 *  return 实际利润;
 * @param {number} latestPrice - 最新价格。
 * @param {Object} params - 包含网格交易数量和网格价格差的参数对象。
 * @param {number} params.gridTradeQuantity - 网格交易的数量。
 * @param {number} params.grid_price_difference - 网格价格差。
 *
 * @returns {number} 每个网格匹配成功的实际利润
 */
const calculateExpectedProfit = (
    latestPrice,
    { gridTradeQuantity, grid_price_difference },
) => {
    let currentTradeValue = bigNumber(latestPrice).times(gridTradeQuantity);
    let expectedRiseTradeValue = bigNumber(latestPrice)
        .plus(grid_price_difference)
        .times(gridTradeQuantity);
    let expectedRiseTradeValueAfterFee = expectedRiseTradeValue.times(0.001);
    let actualProfit = expectedRiseTradeValue
        .minus(currentTradeValue)
        .minus(expectedRiseTradeValueAfterFee);
    return actualProfit.toNumber();
};

module.exports = { calculateExpectedProfit };
