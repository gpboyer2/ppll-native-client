/**
 * 币安交易精度处理工具
 * 解决订单数量精度超限问题 (-1111 "Precision is over the maximum defined for this asset")
 */

const bigNumber = require("bignumber.js");
const UtilRecord = require("./record-log.js");

/**
 * 根据币安交易对过滤器规则调整订单数量
 * @param {string} symbol - 交易对符号
 * @param {number|string} quantity - 原始数量
 * @param {Array} symbolFilters - 交易对过滤器数组
 * @param {boolean} silent - 是否静默模式（减少日志输出）
 * @returns {string} 调整后的合规数量
 */
function adjustQuantityByFilters(
    symbol,
    quantity,
    symbolFilters,
    silent = false,
) {
    if (!symbolFilters || !symbolFilters.length) {
        if (!silent)
            UtilRecord.warn(
                `⚠️  [精度处理] ${symbol} 缺少过滤器信息，使用默认精度`,
            );
        return new bigNumber(quantity).toFixed(8);
    }

    // 查找 LOT_SIZE 过滤器
    const lotSizeFilter = symbolFilters.find(
        (filter) => filter.filterType === "LOT_SIZE",
    );

    if (!lotSizeFilter) {
        if (!silent)
            UtilRecord.warn(
                `⚠️  [精度处理] ${symbol} 缺少LOT_SIZE过滤器，使用默认精度`,
            );
        return new bigNumber(quantity).toFixed(8);
    }

    const { minQty, maxQty, stepSize } = lotSizeFilter;
    const originalQuantity = quantity;
    let adjustedQuantity = new bigNumber(quantity);
    let hasAdjustment = false;

    // 检查最小数量要求
    if (adjustedQuantity.isLessThan(minQty)) {
        if (!silent) {
            UtilRecord.log(
                `[精度警告-最小值] ${symbol} 数量不足提示 - 当前: ${quantity}, 最小限制: ${minQty}, 建议: 请使用不少于最小限制的数量`,
            );
        }
        // 修改逻辑为： 不自动调整，保持原数量
        // adjustedQuantity = new bigNumber(minQty);
        // hasAdjustment = true;
    }

    // 检查最大数量要求
    if (adjustedQuantity.isGreaterThan(maxQty)) {
        if (!silent) {
            const precision = getDecimalPlaces(stepSize);
            UtilRecord.log(
                `[精度调整-最大值] ${symbol} 数量超限检测 - 当前: ${quantity}, 最大限制: ${maxQty}, 精度要求: ${precision}位小数, 调整动作: 降低至最大允许数量`,
            );
        }
        adjustedQuantity = new bigNumber(maxQty);
        hasAdjustment = true;
    }

    // 根据精度要求调整数量
    if (stepSize && stepSize !== "0") {
        const precision = getDecimalPlaces(stepSize);
        const currentPrecision = adjustedQuantity.toFixed(precision);

        if (adjustedQuantity.toString() !== currentPrecision) {
            // 调整到指定精度
            const beforePrecisionAdjust = adjustedQuantity.toString();
            adjustedQuantity = new bigNumber(currentPrecision);
            if (!silent) {
                UtilRecord.log(
                    `[精度调整] ${symbol} 精度对齐处理 - 精度要求: ${precision}位小数, 调整前: ${beforePrecisionAdjust}, 调整后: ${adjustedQuantity.toString()}, 调整规则: 按精度要求截取小数位`,
                );
            }
            hasAdjustment = true;
        }
    }

    // 获取 stepSize 的小数位数作为精度
    const precision = getDecimalPlaces(stepSize);
    const result = adjustedQuantity.toFixed(precision);

    // 只在有调整时输出详细信息
    if (!silent && hasAdjustment) {
        UtilRecord.log(
            `[精度完成] ${symbol} 数量调整详情 - 原始: ${originalQuantity}, 调整后: ${result}, 最小限制: ${minQty}, 最大限制: ${maxQty}, 精度要求: ${precision}位小数, 调整规则: LOT_SIZE过滤器合规处理`,
        );
    }

    return result;
}

/**
 * 获取数字的小数位数
 * @param {string} numberStr - 数字字符串
 * @returns {number} 小数位数
 */
function getDecimalPlaces(numberStr) {
    if (!numberStr || numberStr === "0") return 8;

    const parts = numberStr.split(".");
    if (parts.length < 2) return 0;

    // 移除尾部的零
    const decimals = parts[1].replace(/0+$/, "");
    return decimals.length || 1;
}

/**
 * 从交易所信息中获取指定交易对的过滤器
 * @param {Object} exchangeInfo - 交易所信息
 * @param {string} symbol - 交易对符号
 * @returns {Array} 过滤器数组
 */
function getSymbolFilters(exchangeInfo, symbol) {
    if (!exchangeInfo || !exchangeInfo.symbols) {
        UtilRecord.warn("交易所信息无效");
        return [];
    }

    const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol);
    if (!symbolInfo) {
        UtilRecord.warn(`未找到交易对 ${symbol} 的信息`);
        return [];
    }

    return symbolInfo.filters || [];
}

/**
 * 获取交易对的数量精度（从 quantityPrecision 字段）
 * @param {Object} exchangeInfo - 交易所信息
 * @param {string} symbol - 交易对符号
 * @returns {number} 数量精度
 */
function getQuantityPrecision(exchangeInfo, symbol) {
    if (!exchangeInfo || !exchangeInfo.symbols) {
        UtilRecord.warn("交易所信息无效，使用默认精度 8");
        return 8;
    }

    const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol);
    if (!symbolInfo) {
        UtilRecord.warn(`未找到交易对 ${symbol} 的信息，使用默认精度 8`);
        return 8;
    }

    return symbolInfo.quantityPrecision || 8;
}

/**
 * 智能调整订单数量，结合过滤器和精度要求
 * @param {Object} exchangeInfo - 交易所信息
 * @param {string} symbol - 交易对符号
 * @param {number|string} quantity - 原始数量
 * @param {Object} options - 选项 { silent: boolean, operationType: string }
 * @returns {string} 调整后的合规数量
 */
function smartAdjustQuantity(exchangeInfo, symbol, quantity, options = {}) {
    const { silent = false, operationType = "" } = options;
    const originalQuantity = quantity;

    if (!silent) {
        const opType = operationType ? `[${operationType}]` : "";
        // 获取精度要求信息
        const filters = getSymbolFilters(exchangeInfo, symbol);
        const lotSizeFilter = filters.find(
            (filter) => filter.filterType === "LOT_SIZE",
        );
        const precision = lotSizeFilter
            ? getDecimalPlaces(lotSizeFilter.stepSize)
            : 8;
        const precisionInfo = lotSizeFilter
            ? `, 精度要求: 最小=${lotSizeFilter.minQty}, 最大=${lotSizeFilter.maxQty}, ${precision}位小数`
            : ", 精度要求: 未知";
        UtilRecord.log(
            `[精度处理${opType}] ${symbol} 开始调整 - 操作类型: ${operationType || "未指定"}, 交易对: ${symbol}, 原始数量: ${quantity}${precisionInfo}`,
        );
    }

    // 获取交易对的过滤器
    const filters = getSymbolFilters(exchangeInfo, symbol);

    // 根据过滤器调整数量
    const adjustedQuantity = adjustQuantityByFilters(
        symbol,
        quantity,
        filters,
        silent,
    );

    // 只在数量有变化或非静默模式时输出结果
    if (!silent || originalQuantity !== adjustedQuantity) {
        const opType = operationType ? `[${operationType}]` : "";
        // 获取精度要求信息用于结果日志
        const filters = getSymbolFilters(exchangeInfo, symbol);
        const lotSizeFilter = filters.find(
            (filter) => filter.filterType === "LOT_SIZE",
        );
        const precision = lotSizeFilter
            ? getDecimalPlaces(lotSizeFilter.stepSize)
            : 8;

        if (originalQuantity === adjustedQuantity) {
            UtilRecord.log(
                `[精度无需调整${opType}] ${symbol} 数量符合规范 - 最终数量: ${adjustedQuantity}, 精度要求: ${precision}位小数, 状态: 原始数量已符合交易所规范，无需调整`,
            );
        } else {
            const adjustmentRatio = (
                (parseFloat(String(adjustedQuantity)) /
                    parseFloat(String(originalQuantity)) -
                    1) *
                100
            ).toFixed(4);
            UtilRecord.log(
                `[精度调整完成${opType}] ${symbol} 调整总结 - 输入: ${originalQuantity}, 输出: ${adjustedQuantity}, 调整幅度: ${adjustmentRatio}%, 精度要求: ${precision}位小数, 处理结果: 已根据交易所规则成功调整`,
            );
        }
    }

    return adjustedQuantity;
}

/**
 * 智能调整订单价格，根据PRICE_FILTER过滤器
 * @param {Object} exchangeInfo - 交易所信息
 * @param {string} symbol - 交易对符号
 * @param {number|string} price - 原始价格
 * @param {Object} options - 选项 { silent: boolean }
 * @returns {string} 调整后的合规价格
 */
function smartAdjustPrice(exchangeInfo, symbol, price, options = {}) {
    const { silent = false } = options;
    const originalPrice = price;

    const filters = getSymbolFilters(exchangeInfo, symbol);
    const priceFilter = filters.find(
        (filter) => filter.filterType === "PRICE_FILTER",
    );

    if (!priceFilter) {
        if (!silent) {
            UtilRecord.log(
                `[价格精度] ${symbol} 缺少PRICE_FILTER过滤器，使用默认精度`,
            );
        }
        return new bigNumber(price).toFixed(8);
    }

    const { minPrice, maxPrice, tickSize } = priceFilter;
    let adjustedPrice = new bigNumber(price);

    if (adjustedPrice.isLessThan(minPrice)) {
        adjustedPrice = new bigNumber(minPrice);
        if (!silent) {
            UtilRecord.log(
                `[价格调整] ${symbol} 价格低于最小值 - 原始: ${price}, 最小限制: ${minPrice}, 调整后: ${adjustedPrice.toString()}`,
            );
        }
    }

    if (adjustedPrice.isGreaterThan(maxPrice)) {
        adjustedPrice = new bigNumber(maxPrice);
        if (!silent) {
            UtilRecord.log(
                `[价格调整] ${symbol} 价格超过最大值 - 原始: ${price}, 最大限制: ${maxPrice}, 调整后: ${adjustedPrice.toString()}`,
            );
        }
    }

    if (tickSize && tickSize !== "0") {
        const precision = getDecimalPlaces(tickSize);
        const result = adjustedPrice.toFixed(precision);

        if (!silent && originalPrice !== result) {
            UtilRecord.log(
                `[价格精度] ${symbol} 价格精度调整 - 原始: ${originalPrice}, 调整后: ${result}, 精度要求: ${precision}位小数`,
            );
        }

        return result;
    }

    return adjustedPrice.toString();
}

module.exports = {
    adjustQuantityByFilters,
    getDecimalPlaces,
    getSymbolFilters,
    getQuantityPrecision,
    smartAdjustQuantity,
    smartAdjustPrice,
};
