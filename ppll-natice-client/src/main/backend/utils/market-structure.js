/**
 * 市场结构识别模块
 *
 * 核心目标：从"找触点"升级为"找结构"
 * - 识别真正的波段转折点（Swing High/Low）
 * - 识别密集博弈平台（高成交量整理区）
 * - 维护历史关键位效力记忆库
 *
 * 与 support-resistance.js 的关系：
 * - 本模块提供更高级的"结构视角"
 * - support-resistance.js 负责最终的候选点竞选
 */

const fs = require("fs");
const path = require("path");

// 配置常量
const CONFIG = {
    // 波段转折点识别
    SWING: {
        CONFIRM_BARS: 5, // 确认转折需要的K线数量
        MIN_RETRACE_RATIO: 0.3, // 最小回调比例（相对于前一波段）
        MIN_SWING_SIZE_ATR: 0.5, // 最小波段幅度（ATR倍数）
    },

    // 密集博弈平台识别
    PLATFORM: {
        MIN_BARS: 8, // 平台最少K线数
        MAX_BARS: 30, // 平台最多K线数
        BODY_OVERLAP_RATIO: 0.6, // 实体重叠比例阈值
        VOLUME_MULTIPLIER: 1.2, // 成交量放大倍数阈值
    },

    // 历史关键位效力
    EFFICACY: {
        INITIAL_SCORE: 50, // 初始效力分
        TEST_BOUNCE_BONUS: 30, // 测试后反弹加分
        TIME_DECAY_RATE: 0.02, // 每天衰减率（2%）
        MIN_BOUNCE_ATR: 0.5, // 有效反弹的最小ATR倍数
        MATCH_DEVIATION: 0.005, // 价格匹配偏差阈值（0.5%）
        MAX_SCORE: 150, // 最大效力分
    },

    // 缓存路径
    CACHE_DIR: path.join(__dirname, "..", "cache", "market-structure"),
};

// ============================================================
// 波段转折点识别
// ============================================================

/**
 * 识别真正的波段高点（Swing High）
 *
 * 规则：价格创出局部新高后，出现N根K线的连续回调，确认上涨动能衰竭
 *
 * @param {Array} klineList - K线数据
 * @param {number} atr - ATR值（用于判断有效波段幅度）
 * @returns {Array} 波段高点列表
 */
const findSwingHighList = (klineList, atr) => {
    const swingHighList = [];
    const confirmBars = CONFIG.SWING.CONFIRM_BARS;

    for (let i = confirmBars; i < klineList.length - confirmBars; i++) {
        const current = klineList[i];

        // 检查是否为局部最高点
        let isLocalHigh = true;
        for (let j = i - confirmBars; j <= i + confirmBars; j++) {
            if (j === i) continue;
            if (klineList[j].high >= current.high) {
                isLocalHigh = false;
                break;
            }
        }

        if (!isLocalHigh) continue;

        // 检查转折确认：之后是否有连续回调
        let hasRetrace = true;
        let retraceDepth = 0;

        for (let j = 1; j <= confirmBars && i + j < klineList.length; j++) {
            const nextBar = klineList[i + j];
            // 连续回调：每根K线的高点都低于前一根
            if (j > 1 && nextBar.high >= klineList[i + j - 1].high) {
                hasRetrace = false;
                break;
            }
            retraceDepth = Math.max(retraceDepth, current.high - nextBar.low);
        }

        // 验证回调深度（至少0.5个ATR）
        if (
            hasRetrace &&
            retraceDepth >= atr * CONFIG.SWING.MIN_SWING_SIZE_ATR
        ) {
            swingHighList.push({
                price: current.high,
                index: i,
                openTime: current.openTime,
                volume: current.volume,
                retraceDepth,
                type: "swing_high",
                strength: retraceDepth / atr, // 强度：回调深度/ATR
            });
        }
    }

    return swingHighList;
};

/**
 * 识别真正的波段低点（Swing Low）
 *
 * 规则：价格创出局部新低后，出现N根K线的连续反弹，确认下跌动能衰竭
 *
 * @param {Array} klineList - K线数据
 * @param {number} atr - ATR值
 * @returns {Array} 波段低点列表
 */
const findSwingLowList = (klineList, atr) => {
    const swingLowList = [];
    const confirmBars = CONFIG.SWING.CONFIRM_BARS;

    for (let i = confirmBars; i < klineList.length - confirmBars; i++) {
        const current = klineList[i];

        // 检查是否为局部最低点
        let isLocalLow = true;
        for (let j = i - confirmBars; j <= i + confirmBars; j++) {
            if (j === i) continue;
            if (klineList[j].low <= current.low) {
                isLocalLow = false;
                break;
            }
        }

        if (!isLocalLow) continue;

        // 检查转折确认：之后是否有连续反弹
        let hasBounce = true;
        let bounceHeight = 0;

        for (let j = 1; j <= confirmBars && i + j < klineList.length; j++) {
            const nextBar = klineList[i + j];
            // 连续反弹：每根K线的低点都高于前一根
            if (j > 1 && nextBar.low <= klineList[i + j - 1].low) {
                hasBounce = false;
                break;
            }
            bounceHeight = Math.max(bounceHeight, nextBar.high - current.low);
        }

        // 验证反弹高度（至少0.5个ATR）
        if (
            hasBounce &&
            bounceHeight >= atr * CONFIG.SWING.MIN_SWING_SIZE_ATR
        ) {
            swingLowList.push({
                price: current.low,
                index: i,
                openTime: current.openTime,
                volume: current.volume,
                bounceHeight,
                type: "swing_low",
                strength: bounceHeight / atr, // 强度：反弹高度/ATR
            });
        }
    }

    return swingLowList;
};

// ============================================================
// 密集博弈平台识别
// ============================================================

/**
 * 获取K线实体范围
 */
const getBodyRange = (kline) => ({
    high: Math.max(kline.open, kline.close),
    low: Math.min(kline.open, kline.close),
});

/**
 * 计算两个区间的重叠比例
 */
const calcOverlapRatio = (range1, range2) => {
    const overlapHigh = Math.min(range1.high, range2.high);
    const overlapLow = Math.max(range1.low, range2.low);

    if (overlapHigh <= overlapLow) return 0;

    const overlapSize = overlapHigh - overlapLow;
    const minRangeSize = Math.min(
        range1.high - range1.low,
        range2.high - range2.low,
    );

    return minRangeSize > 0 ? overlapSize / minRangeSize : 0;
};

/**
 * 识别密集博弈平台
 *
 * 规则：连续M根K线实体高度重叠，且成交量显著放大
 *
 * @param {Array} klineList - K线数据
 * @param {number} avgVolume - 平均成交量
 * @returns {Array} 平台列表
 */
const findConsolidationPlatformList = (klineList, avgVolume) => {
    const platformList = [];
    const minBars = CONFIG.PLATFORM.MIN_BARS;
    const maxBars = CONFIG.PLATFORM.MAX_BARS;

    for (let start = 0; start < klineList.length - minBars; start++) {
        // 尝试扩展平台
        let platformEnd = start;
        let platformVolume = klineList[start].volume;

        // 计算起始K线的实体范围
        const startBody = getBodyRange(klineList[start]);
        let platformHigh = startBody.high;
        let platformLow = startBody.low;

        for (
            let end = start + 1;
            end < Math.min(start + maxBars, klineList.length);
            end++
        ) {
            const currentBody = getBodyRange(klineList[end]);

            // 检查实体重叠
            const overlapRatio = calcOverlapRatio(
                { high: platformHigh, low: platformLow },
                currentBody,
            );

            if (overlapRatio < CONFIG.PLATFORM.BODY_OVERLAP_RATIO) {
                break;
            }

            // 扩展平台
            platformEnd = end;
            platformVolume += klineList[end].volume;
            platformHigh = Math.max(platformHigh, currentBody.high);
            platformLow = Math.min(platformLow, currentBody.low);
        }

        const platformBars = platformEnd - start + 1;

        // 验证平台有效性
        if (platformBars >= minBars) {
            const platformAvgVolume = platformVolume / platformBars;
            const volumeRatio = platformAvgVolume / avgVolume;

            // 成交量需要放大
            if (volumeRatio >= CONFIG.PLATFORM.VOLUME_MULTIPLIER) {
                platformList.push({
                    startIndex: start,
                    endIndex: platformEnd,
                    bars: platformBars,
                    upperBound: platformHigh,
                    lowerBound: platformLow,
                    centerPrice: (platformHigh + platformLow) / 2,
                    totalVolume: platformVolume,
                    volumeRatio,
                    type: "consolidation_platform",
                    strength: volumeRatio * (platformBars / minBars), // 强度：成交量放大倍数 × 持续时间
                });

                // 跳过已识别的平台区域
                start = platformEnd;
            }
        }
    }

    return platformList;
};

// ============================================================
// 历史关键位效力记忆库
// ============================================================

/**
 * 历史关键位存储器
 */
class KeyLevelMemory {
    constructor(symbol) {
        this.symbol = symbol;
        this.levelList = [];
        this.cacheFile = path.join(
            CONFIG.CACHE_DIR,
            `${symbol}-key-levels.json`,
        );
        this.load();
    }

    /**
     * 从缓存加载
     */
    load() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const data = JSON.parse(
                    fs.readFileSync(this.cacheFile, "utf-8"),
                );
                this.levelList = data.levelList || [];
                console.log(
                    `[记忆库] 加载 ${this.symbol} 历史关键位: ${this.levelList.length} 个`,
                );
            }
        } catch (error) {
            console.error(`[记忆库] 加载失败: ${error.message}`);
            this.levelList = [];
        }
    }

    /**
     * 保存到缓存
     */
    save() {
        try {
            if (!fs.existsSync(CONFIG.CACHE_DIR)) {
                fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
            }
            fs.writeFileSync(
                this.cacheFile,
                JSON.stringify(
                    {
                        symbol: this.symbol,
                        updated_at: Date.now(),
                        levelList: this.levelList,
                    },
                    null,
                    2,
                ),
            );
        } catch (error) {
            console.error(`[记忆库] 保存失败: ${error.message}`);
        }
    }

    /**
     * 添加或更新关键位
     */
    addLevel(level) {
        // 检查是否已存在相近的关键位
        const matchDeviation = CONFIG.EFFICACY.MATCH_DEVIATION;
        const existingIndex = this.levelList.findIndex((existing) => {
            const deviation =
                Math.abs(existing.price - level.price) / level.price;
            return deviation <= matchDeviation;
        });

        if (existingIndex >= 0) {
            // 更新已存在的关键位
            const existing = this.levelList[existingIndex];
            existing.testCount = (existing.testCount || 1) + 1;
            existing.efficacy = Math.min(
                existing.efficacy + CONFIG.EFFICACY.TEST_BOUNCE_BONUS,
                CONFIG.EFFICACY.MAX_SCORE,
            );
            existing.lastTestTime = Date.now();
            existing.strength = Math.max(
                existing.strength,
                level.strength || 1,
            );
            // 静默更新，不输出日志
        } else {
            // 添加新的关键位
            this.levelList.push({
                price: level.price,
                type: level.type,
                source: level.source || "algorithm",
                efficacy: CONFIG.EFFICACY.INITIAL_SCORE,
                strength: level.strength || 1,
                testCount: 1,
                created_at: Date.now(),
                lastTestTime: Date.now(),
            });
            // 静默新增，不输出日志
        }

        this.save();
    }

    /**
     * 应用时间衰减
     */
    applyTimeDecay() {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        this.levelList = this.levelList.filter((level) => {
            const daysSinceLastTest = (now - level.lastTestTime) / dayMs;
            const decay =
                daysSinceLastTest *
                CONFIG.EFFICACY.TIME_DECAY_RATE *
                level.efficacy;
            level.efficacy = Math.max(level.efficacy - decay, 10); // 最低保留10分

            // 效力过低且长时间未测试则移除
            return level.efficacy > 10 || daysSinceLastTest < 30;
        });

        this.save();
    }

    /**
     * 查询匹配的历史关键位
     */
    findMatch(price) {
        const matchDeviation = CONFIG.EFFICACY.MATCH_DEVIATION;

        for (const level of this.levelList) {
            const deviation = Math.abs(level.price - price) / price;
            if (deviation <= matchDeviation) {
                return level;
            }
        }

        return undefined;
    }

    /**
     * 获取所有有效关键位（按效力排序）
     */
    getEffectiveLevelList(currentPrice) {
        return this.levelList
            .filter((level) => level.efficacy >= 30) // 效力至少30分
            .sort((a, b) => b.efficacy - a.efficacy);
    }

    /**
     * 获取支撑位列表（低于当前价格）
     */
    getSupportLevelList(currentPrice) {
        return this.getEffectiveLevelList(currentPrice).filter(
            (level) => level.price < currentPrice,
        );
    }

    /**
     * 获取阻力位列表（高于当前价格）
     */
    getResistanceLevelList(currentPrice) {
        return this.getEffectiveLevelList(currentPrice).filter(
            (level) => level.price > currentPrice,
        );
    }
}

// 记忆库缓存（按交易对）
const memoryCache = {};

/**
 * 获取或创建记忆库实例
 */
const getMemory = (symbol) => {
    if (!memoryCache[symbol]) {
        memoryCache[symbol] = new KeyLevelMemory(symbol);
    }
    return memoryCache[symbol];
};

// ============================================================
// 主函数：分析市场结构
// ============================================================

/**
 * 分析市场结构，识别关键位
 *
 * @param {Object} options - 配置参数
 * @param {string} options.symbol - 交易对
 * @param {Array} options.klineList - K线数据
 * @param {Array} options.dailyKlineList - 日K线数据（可选，用于更长周期分析）
 * @param {number} options.atr - ATR值
 * @returns {Object} 结构分析结果
 */
const analyzeMarketStructure = (options) => {
    const { symbol, klineList, dailyKlineList, atr } = options;

    if (!klineList || klineList.length < 20) {
        return {
            success: false,
            warning: "K线数据不足",
        };
    }

    // 计算平均成交量
    const avgVolume =
        klineList.reduce((sum, k) => sum + k.volume, 0) / klineList.length;
    const currentPrice = klineList[klineList.length - 1].close;

    // 获取记忆库
    const memory = getMemory(symbol);
    memory.applyTimeDecay();

    // 步骤一：识别波段转折点
    const swingHighList = findSwingHighList(klineList, atr);
    const swingLowList = findSwingLowList(klineList, atr);

    // 步骤二：识别密集博弈平台
    const platformList = findConsolidationPlatformList(klineList, avgVolume);

    // 步骤三：将识别到的结构点添加到记忆库
    for (const swingHigh of swingHighList) {
        memory.addLevel({
            price: swingHigh.price,
            type: "resistance",
            source: "swing_high",
            strength: swingHigh.strength,
        });
    }

    for (const swingLow of swingLowList) {
        memory.addLevel({
            price: swingLow.price,
            type: "support",
            source: "swing_low",
            strength: swingLow.strength,
        });
    }

    for (const platform of platformList) {
        // 平台上沿 → 阻力
        memory.addLevel({
            price: platform.upperBound,
            type: "resistance",
            source: "platform_upper",
            strength: platform.strength,
        });
        // 平台下沿 → 支撑
        memory.addLevel({
            price: platform.lowerBound,
            type: "support",
            source: "platform_lower",
            strength: platform.strength,
        });
    }

    // 步骤四：如果有日K线，分析更长周期结构
    if (dailyKlineList && dailyKlineList.length >= 20) {
        const dailyAvgVolume =
            dailyKlineList.reduce((sum, k) => sum + k.volume, 0) /
            dailyKlineList.length;
        const dailyAtr = atr * 6; // 日线ATR约为4小时ATR的6倍

        const dailySwingHighList = findSwingHighList(dailyKlineList, dailyAtr);
        const dailySwingLowList = findSwingLowList(dailyKlineList, dailyAtr);
        const dailyPlatformList = findConsolidationPlatformList(
            dailyKlineList,
            dailyAvgVolume,
        );

        // 日线级别的结构点，赋予更高强度
        for (const swingHigh of dailySwingHighList) {
            memory.addLevel({
                price: swingHigh.price,
                type: "resistance",
                source: "daily_swing_high",
                strength: swingHigh.strength * 2, // 日线级别强度翻倍
            });
        }

        for (const swingLow of dailySwingLowList) {
            memory.addLevel({
                price: swingLow.price,
                type: "support",
                source: "daily_swing_low",
                strength: swingLow.strength * 2,
            });
        }

        for (const platform of dailyPlatformList) {
            memory.addLevel({
                price: platform.upperBound,
                type: "resistance",
                source: "daily_platform_upper",
                strength: platform.strength * 2,
            });
            memory.addLevel({
                price: platform.lowerBound,
                type: "support",
                source: "daily_platform_lower",
                strength: platform.strength * 2,
            });
        }
    }

    // 步骤五：返回分析结果
    return {
        success: true,
        currentPrice,
        structure: {
            swingHighList,
            swingLowList,
            platformList,
        },
        historicalLevelList: {
            support: memory.getSupportLevelList(currentPrice),
            resistance: memory.getResistanceLevelList(currentPrice),
        },
        meta: {
            avgVolume,
            atr,
            totalHistoricalLevelCount: memory.levelList.length,
        },
    };
};

/**
 * 查询历史关键位效力
 *
 * @param {string} symbol - 交易对
 * @param {number} price - 价格
 * @returns {Object|undefined} 匹配的历史关键位
 */
const queryHistoricalLevel = (symbol, price) => {
    const memory = getMemory(symbol);
    return memory.findMatch(price);
};

/**
 * 获取历史关键位效力分数
 *
 * @param {string} symbol - 交易对
 * @param {number} price - 价格
 * @returns {number} 效力分数（0表示无匹配）
 */
const getHistoricalEfficacy = (symbol, price) => {
    const level = queryHistoricalLevel(symbol, price);
    return level ? level.efficacy : 0;
};

module.exports = {
    // 主函数
    analyzeMarketStructure,
    queryHistoricalLevel,
    getHistoricalEfficacy,

    // 内部函数（供测试使用）
    findSwingHighList,
    findSwingLowList,
    findConsolidationPlatformList,
    getMemory,

    // 配置
    CONFIG,
};
