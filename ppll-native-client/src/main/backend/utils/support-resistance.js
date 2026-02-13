/**
 * 支撑/阻力位识别模块
 *
 * 核心目标：像经验丰富的交易员看盘一样，从历史数据中识别最可能有效的支撑位和阻力位
 *
 * 算法特点：
 * - 100根周期K线 + 30根日线多周期确认
 * - 波段极点识别 + 成交量堡垒 + MA20 + 多周期共振计分
 *
 * 输入要求：
 * - klineList: 100根周期K线数据（用于精细扫描）
 * - dailyKlineList: 30根日K线数据（用于高周期确认）
 * - 每根K线格式: { openTime, open, high, low, close, volume }
 *
 * 输出格式：
 * - 成功: { success: true, support: number, resistance: number, meta: object }
 * - 警告: { success: false, warning: string, fallback: object }
 *
 * ============================================================
 * 配对来源（Pair Source）说明
 * ============================================================
 *
 * 算法会从多个候选支撑位和阻力位中选择最优配对，配对来源标识了最终选择的逻辑：
 *
 * 1. swing_pair（波段配对）
 *    - 含义：支撑位和阻力位都来自波段极点（swing_low 和 swing_high）
 *    - 特点：最可靠的配对，因为波段极点是价格真正发生转折的位置
 *    - 优先级：最高
 *
 * 2. swing_support（波段支撑）
 *    - 含义：支撑位来自波段低点（swing_low），阻力位来自其他来源（如成交量中心、整合区等）
 *    - 特点：支撑位可靠，阻力位次之
 *    - 优先级：次高
 *
 * 3. swing_resistance（波段阻力）
 *    - 含义：阻力位来自波段高点（swing_high），支撑位来自其他来源
 *    - 特点：阻力位可靠，支撑位次之
 *    - 优先级：次高
 *
 * 4. score_based（得分配对）
 *    - 含义：支撑位和阻力位都不是波段极点，而是根据综合得分选择的最高分候选
 *    - 特点：可能来自成交量中心（volume_center）、整合区（consolidation_level）等
 *    - 优先级：中等
 *
 * 5. fallback（兜底方案）
 *    - 含义：无法找到有效的支撑/阻力配对，使用布林带或简单高低点作为兜底
 *    - 特点：可靠性最低，仅在数据不足或市场结构不清晰时使用
 *    - 优先级：最低
 *
 * 候选来源类型（Candidate Source）：
 * - swing_low: 波段低点，价格在此处形成明显的V型反转
 * - swing_high: 波段高点，价格在此处形成明显的倒V型反转
 * - volume_center: 成交量中心，大量交易发生的价格区域
 * - consolidation_level: 整合区水平位，价格多次触及的横盘区域
 * - bollinger_lower/upper: 布林带下轨/上轨
 * - ma20: 20周期移动平均线
 *
 * ============================================================
 */

const BigNumber = require("bignumber.js");
const {
    calculateMA,
    calculateBollingerBands,
} = require("./technical-indicator.js");
const {
    getHistoricalEfficacy,
    analyzeMarketStructure,
} = require("./market-structure.js");

// 算法常量配置
const CONFIG = {
    // 波段极点检测窗口（旧算法备用）
    SWING_WINDOW: 5, // 周期K线左右各5根
    DAILY_SWING_WINDOW: 3, // 日K线左右各3根

    // 针型K线（Pin Bar）识别配置
    PIN_BAR: {
        WICK_BODY_RATIO: 1.5, // 影线/实体比例阈值，超过此值视为针型K线
        EXTREME_WICK_RATIO: 2.0, // 极端针型K线比例阈值，超过此值的影线极端价格将被忽略
        PIN_EXTREME_WEIGHT: 0.0, // 针型K线极端价格权重（设为0完全忽略）
        PIN_BODY_WEIGHT: 1.0, // 针型K线实体部分权重（正常计算）
    },

    // 共识水平位识别配置
    PRICE_LEVEL: {
        BUCKET_COUNT: 150, // 价格档位数量 - 适中粒度，避免过度碎片化
        BODY_TOUCH_WEIGHT: 5, // 实体接触权重 - 强化实体部分的重要性
        NEAR_WICK_WEIGHT: 1.5, // 近影线接触权重（距实体1倍实体高度内）
        FAR_WICK_WEIGHT: 0.0, // 远影线接触权重（针尖）- 完全忽略针尖
        MIN_TOUCH_COUNT: 3, // 最小接触次数阈值（低于此值不作为候选）
        PEAK_DETECTION_WINDOW: 4, // 山峰检测窗口 - 放宽以识别"山脊"而非"尖峰"
    },

    // 成交量分布格子数
    VOLUME_BUCKET_COUNT: 50,

    // 计分规则
    SCORE: {
        BASE: 20, // 基础分
        TIME_DECAY_MAX: 15, // 时间衰减最大扣分 - 降低以保留历史关键位
        TIME_DECAY_RATE: 0.5, // 时间衰减速率 - 每远离1根K线扣0.5分
        VOLUME_CONFIRM: 25, // 成交量验证加分 - 提高成交量话语权
        MULTI_TIMEFRAME: 60, // 多周期共振加分 - 大幅提高以强制日线级别确认
        MA_PROXIMITY: 10, // 均线贴近加分
        CONSENSUS_BONUS: 25, // 共识水平位额外加分
        SWING_POINT_BONUS: 60, // 波段极点加分 - 真正的价格转折点
        EXTREME_PRICE_BONUS: 20, // 极端价格加分 - 接近数据集最高/最低价的候选点（降低权重）
        PROXIMITY_BONUS: 80, // 邻近加分 - 距离当前价格近的候选点（提高权重，更实用）
        HISTORICAL_EFFICACY: 80, // 历史关键位效力加分 - 压倒性权重
    },

    // 阈值配置
    THRESHOLD: {
        MULTI_TIMEFRAME_DEVIATION: 0.003, // 多周期共振偏差阈值 0.3% - 收紧以提高匹配精度
        MA_PROXIMITY_DEVIATION: 0.003, // 均线贴近偏差阈值 0.3%
        MIN_SPREAD_RATIO: 0.02, // 最小支撑阻力间距比例 2% - 降低以支持短周期K线
        MIN_WINNING_SCORE: 50, // 最低获胜分数
        HIGH_TOUCH_WEIGHT_MULTIPLIER: 2, // 高权重阈值倍数（超过平均2倍则减半时间衰减）
    },

    // MA周期
    MA_PERIOD: 20,
};

// ============================================================
// 规则A：共识水平位识别（升级版波段极点识别）
// ============================================================

/**
 * 计算K线的实体高度
 * @param {Object} kline - K线数据
 * @returns {number} 实体高度（绝对值）
 */
const getBodyHeight = (kline) => {
    return Math.abs(kline.close - kline.open);
};

/**
 * 获取K线的实体范围
 * @param {Object} kline - K线数据
 * @returns {Object} { bodyHigh, bodyLow }
 */
const getBodyRange = (kline) => {
    return {
        bodyHigh: Math.max(kline.open, kline.close),
        bodyLow: Math.min(kline.open, kline.close),
    };
};

/**
 * 识别针型K线（Pin Bar）
 *
 * 针型K线特征：影线长度远超实体高度
 * - 下针：下影线长度 > 实体高度 * WICK_BODY_RATIO
 * - 上针：上影线长度 > 实体高度 * WICK_BODY_RATIO
 *
 * @param {Object} kline - K线数据
 * @returns {Object} { isPinBar, pinType, upperWickRatio, lowerWickRatio }
 */
const identifyPinBar = (kline) => {
    const bodyHeight = getBodyHeight(kline);
    const { bodyHigh, bodyLow } = getBodyRange(kline);

    // 计算上下影线长度
    const upperWick = kline.high - bodyHigh;
    const lowerWick = bodyLow - kline.low;

    // 实体高度为0时（十字星），使用K线高低差的10%作为参考
    const effectiveBodyHeight =
        bodyHeight > 0 ? bodyHeight : (kline.high - kline.low) * 0.1;

    // 计算影线/实体比例
    const upperWickRatio = upperWick / effectiveBodyHeight;
    const lowerWickRatio = lowerWick / effectiveBodyHeight;

    const wickBodyRatio = CONFIG.PIN_BAR.WICK_BODY_RATIO;

    // 判断是否为针型K线
    const isUpperPin = upperWickRatio >= wickBodyRatio;
    const isLowerPin = lowerWickRatio >= wickBodyRatio;
    const isPinBar = isUpperPin || isLowerPin;

    let pinType = "none";
    if (isUpperPin && isLowerPin) {
        pinType = "both"; // 双向针
    } else if (isUpperPin) {
        pinType = "upper"; // 上针（倒锤子）
    } else if (isLowerPin) {
        pinType = "lower"; // 下针（锤子线）
    }

    return {
        isPinBar,
        pinType,
        upperWickRatio,
        lowerWickRatio,
        bodyHeight,
        upperWick,
        lowerWick,
    };
};

/**
 * 判断价格档位与K线的接触类型
 *
 * 升级版：考虑针型K线的情况
 * - 如果是针型K线，针尖部分返回 'pin_extreme'（将被完全忽略）
 * - 普通K线的远影线仍然返回 'far_wick'
 *
 * @param {number} bucketCenter - 档位中心价格
 * @param {Object} kline - K线数据
 * @returns {string} 接触类型: 'body' | 'near_wick' | 'far_wick' | 'pin_extreme' | 'none'
 */
const getTouchType = (bucketCenter, kline) => {
    const { bodyHigh, bodyLow } = getBodyRange(kline);
    const bodyHeight = getBodyHeight(kline);

    // 实体高度为0时（十字星），使用K线高低差的10%作为参考
    const effectiveBodyHeight =
        bodyHeight > 0 ? bodyHeight : (kline.high - kline.low) * 0.1;

    // 检查是否在实体范围内
    if (bucketCenter >= bodyLow && bucketCenter <= bodyHigh) {
        return "body";
    }

    // 检查是否在近影线范围（距实体1倍实体高度内）
    const nearWickUpper = bodyHigh + effectiveBodyHeight;
    const nearWickLower = bodyLow - effectiveBodyHeight;

    if (
        (bucketCenter > bodyHigh &&
            bucketCenter <= Math.min(nearWickUpper, kline.high)) ||
        (bucketCenter < bodyLow &&
            bucketCenter >= Math.max(nearWickLower, kline.low))
    ) {
        return "near_wick";
    }

    // 检查是否在远影线范围（针尖部分）
    if (bucketCenter >= kline.low && bucketCenter <= kline.high) {
        // 识别是否为针型K线的极端价格
        const pinInfo = identifyPinBar(kline);

        if (pinInfo.isPinBar) {
            // 检查是否在针尖区域
            // 下针：价格在下影线的下半部分
            // 上针：价格在上影线的上半部分
            const lowerWickMid = kline.low + (bodyLow - kline.low) / 2;
            const upperWickMid = bodyHigh + (kline.high - bodyHigh) / 2;

            if (pinInfo.pinType === "lower" || pinInfo.pinType === "both") {
                if (bucketCenter < lowerWickMid) {
                    return "pin_extreme"; // 下针的针尖，完全忽略
                }
            }
            if (pinInfo.pinType === "upper" || pinInfo.pinType === "both") {
                if (bucketCenter > upperWickMid) {
                    return "pin_extreme"; // 上针的针尖，完全忽略
                }
            }
        }

        return "far_wick";
    }

    return "none";
};

/**
 * 规则A：识别共识水平位
 *
 * 核心思想：从"找极点"升级为"找共识水平位"
 * - 将价格范围按固定粒度划分为档位
 * - 统计每个档位被K线接触的次数和权重
 * - 找出"山峰"（接触权重高的档位）作为候选点
 *
 * @param {Array} klineList - K线数据列表
 * @returns {Object} { supportCandidateList, resistanceCandidateList, priceLevelMap }
 */
const findSwingPoints = (klineList) => {
    const supportCandidateList = [];
    const resistanceCandidateList = [];

    if (!klineList || klineList.length === 0) {
        return {
            supportCandidateList,
            resistanceCandidateList,
            priceLevelMap: [],
        };
    }

    // 获取价格范围（排除针型K线的极端价格）
    // 对于针型K线，只使用实体边界；对于普通K线，使用high/low
    const effectivePriceList = [];

    for (const kline of klineList) {
        const pinInfo = identifyPinBar(kline);
        const { bodyHigh, bodyLow } = getBodyRange(kline);

        if (pinInfo.isPinBar) {
            // 针型K线：只使用实体范围，完全忽略针尖
            effectivePriceList.push(bodyHigh, bodyLow);
        } else {
            // 普通K线：使用完整high/low范围
            effectivePriceList.push(kline.high, kline.low);
        }
    }

    const maxPrice = Math.max(...effectivePriceList);
    const minPrice = Math.min(...effectivePriceList);
    const priceRange = maxPrice - minPrice;

    if (priceRange <= 0) {
        return {
            supportCandidateList,
            resistanceCandidateList,
            priceLevelMap: [],
        };
    }

    // 获取当前价格
    const currentPrice = klineList[klineList.length - 1].close;

    // 第一步：创建价格档位
    const bucketCount = CONFIG.PRICE_LEVEL.BUCKET_COUNT;
    const bucketSize = priceRange / bucketCount;
    const priceLevelMap = [];

    for (let i = 0; i < bucketCount; i++) {
        priceLevelMap.push({
            index: i,
            lowerBound: minPrice + i * bucketSize,
            upperBound: minPrice + (i + 1) * bucketSize,
            centerPrice: minPrice + (i + 0.5) * bucketSize,
            touchCount: 0, // 接触次数
            touchWeight: 0, // 接触权重
            totalVolume: 0, // 累计成交量
            lastTouchIndex: -1, // 最后一次接触的K线索引
        });
    }

    // 第二步：遍历每根K线，统计接触情况
    for (let klineIdx = 0; klineIdx < klineList.length; klineIdx++) {
        const kline = klineList[klineIdx];

        for (let bucketIdx = 0; bucketIdx < bucketCount; bucketIdx++) {
            const bucket = priceLevelMap[bucketIdx];
            const touchType = getTouchType(bucket.centerPrice, kline);

            // 忽略无接触和针型K线的极端价格
            if (touchType === "none" || touchType === "pin_extreme") continue;

            // 根据接触类型分配权重
            let weight = 0;
            switch (touchType) {
                case "body":
                    weight = CONFIG.PRICE_LEVEL.BODY_TOUCH_WEIGHT;
                    break;
                case "near_wick":
                    weight = CONFIG.PRICE_LEVEL.NEAR_WICK_WEIGHT;
                    break;
                case "far_wick":
                    weight = CONFIG.PRICE_LEVEL.FAR_WICK_WEIGHT;
                    break;
            }

            // 权重为0时不计入统计
            if (weight <= 0) continue;

            bucket.touchCount++;
            bucket.touchWeight += weight;
            bucket.totalVolume += kline.volume * weight;
            bucket.lastTouchIndex = klineIdx;
        }
    }

    // 第三步：识别山峰（局部最大值）
    const peakWindow = CONFIG.PRICE_LEVEL.PEAK_DETECTION_WINDOW;
    const peakList = [];

    for (let i = peakWindow; i < bucketCount - peakWindow; i++) {
        const current = priceLevelMap[i];

        // 跳过接触次数过少的档位
        if (current.touchCount < CONFIG.PRICE_LEVEL.MIN_TOUCH_COUNT) continue;

        // 检查是否为局部山峰（权重最高）
        let isPeak = true;
        for (let j = i - peakWindow; j <= i + peakWindow; j++) {
            if (j === i) continue;
            if (priceLevelMap[j].touchWeight >= current.touchWeight) {
                isPeak = false;
                break;
            }
        }

        if (isPeak) {
            peakList.push({
                ...current,
                isPeak: true,
            });
        }
    }

    // 计算所有山峰的平均接触权重（用于后续判断高权重候选点）
    const avgTouchWeight =
        peakList.length > 0
            ? peakList.reduce((sum, p) => sum + p.touchWeight, 0) /
              peakList.length
            : 0;

    // 第四步：根据当前价格将山峰分为支撑和阻力候选
    for (const peak of peakList) {
        const candidate = {
            price: peak.centerPrice,
            klineIndex: peak.lastTouchIndex,
            openTime: klineList[peak.lastTouchIndex]?.openTime || 0,
            volume: peak.totalVolume,
            source: "consolidation_level", // 盘整水平位
            touchCount: peak.touchCount,
            touchWeight: peak.touchWeight,
            avgTouchWeight, // 附加平均权重，供计分时判断是否为高权重候选点
        };

        if (peak.centerPrice < currentPrice) {
            // 低于当前价格 → 支撑候选
            supportCandidateList.push(candidate);
        } else {
            // 高于当前价格 → 阻力候选
            resistanceCandidateList.push(candidate);
        }
    }

    // 第五步：识别波段极点（Swing Point）作为额外候选点
    // 波段极点是真正的价格转折点，可能不在成交量密集区
    const swingWindow = 5; // 左右各5根K线

    for (let i = swingWindow; i < klineList.length - swingWindow; i++) {
        const current = klineList[i];
        const pinInfo = identifyPinBar(current);
        const { bodyHigh, bodyLow } = getBodyRange(current);

        // 检查是否为波段低点（使用实体低点，避免针尖影响）
        let isSwingLow = true;
        const effectiveLow = pinInfo.isPinBar ? bodyLow : current.low;
        for (let j = i - swingWindow; j <= i + swingWindow; j++) {
            if (j === i) continue;
            const otherKline = klineList[j];
            const otherPinInfo = identifyPinBar(otherKline);
            const otherEffectiveLow = otherPinInfo.isPinBar
                ? Math.min(otherKline.open, otherKline.close)
                : otherKline.low;
            if (otherEffectiveLow <= effectiveLow) {
                isSwingLow = false;
                break;
            }
        }

        if (isSwingLow && effectiveLow < currentPrice) {
            // 检查是否已有相近的候选点
            const existingNear = supportCandidateList.find(
                (c) => Math.abs(c.price - effectiveLow) / effectiveLow < 0.005,
            );
            if (!existingNear) {
                supportCandidateList.push({
                    price: effectiveLow,
                    klineIndex: i,
                    openTime: current.openTime,
                    volume: current.volume,
                    source: "swing_low", // 波段低点
                    touchCount: 1,
                    touchWeight: 20, // 给波段极点一个基础权重
                    avgTouchWeight,
                });
            }
        }

        // 检查是否为波段高点（使用实体高点，避免针尖影响）
        let isSwingHigh = true;
        const effectiveHigh = pinInfo.isPinBar ? bodyHigh : current.high;
        for (let j = i - swingWindow; j <= i + swingWindow; j++) {
            if (j === i) continue;
            const otherKline = klineList[j];
            const otherPinInfo = identifyPinBar(otherKline);
            const otherEffectiveHigh = otherPinInfo.isPinBar
                ? Math.max(otherKline.open, otherKline.close)
                : otherKline.high;
            if (otherEffectiveHigh >= effectiveHigh) {
                isSwingHigh = false;
                break;
            }
        }

        if (isSwingHigh && effectiveHigh > currentPrice) {
            // 检查是否已有相近的候选点
            const existingNear = resistanceCandidateList.find(
                (c) =>
                    Math.abs(c.price - effectiveHigh) / effectiveHigh < 0.005,
            );
            if (!existingNear) {
                resistanceCandidateList.push({
                    price: effectiveHigh,
                    klineIndex: i,
                    openTime: current.openTime,
                    volume: current.volume,
                    source: "swing_high", // 波段高点
                    touchCount: 1,
                    touchWeight: 20, // 给波段极点一个基础权重
                    avgTouchWeight,
                });
            }
        }
    }

    // 按权重降序排序
    supportCandidateList.sort((a, b) => b.touchWeight - a.touchWeight);
    resistanceCandidateList.sort((a, b) => b.touchWeight - a.touchWeight);

    return {
        supportCandidateList,
        resistanceCandidateList,
        priceLevelMap, // 返回完整档位数据，供调试使用
        avgTouchWeight, // 返回平均权重
        priceRange: { minPrice, maxPrice }, // 返回价格范围，用于极端价格加分
    };
};

// ============================================================
// 规则B：成交量堡垒识别
// ============================================================

/**
 * 规则B：识别成交量堡垒（市场成本区）
 * 将价格范围切成格子，统计成交量分布，找出成交量中心
 *
 * @param {Array} klineList - K线数据列表
 * @returns {Object} { volumeCenterPrice, volumeBucketList }
 */
const findVolumeFortress = (klineList) => {
    // 获取价格范围
    const highList = klineList.map((k) => k.high);
    const lowList = klineList.map((k) => k.low);
    const maxPrice = Math.max(...highList);
    const minPrice = Math.min(...lowList);
    const priceRange = maxPrice - minPrice;

    if (priceRange <= 0) {
        return { volumeCenterPrice: undefined, volumeBucketList: [] };
    }

    // 创建价格格子
    const bucketSize = priceRange / CONFIG.VOLUME_BUCKET_COUNT;
    const bucketList = [];
    for (let i = 0; i < CONFIG.VOLUME_BUCKET_COUNT; i++) {
        bucketList.push({
            index: i,
            lowerBound: minPrice + i * bucketSize,
            upperBound: minPrice + (i + 1) * bucketSize,
            volume: 0,
        });
    }

    // 遍历每根K线，分配成交量
    for (const kline of klineList) {
        const bodyHigh = Math.max(kline.open, kline.close);
        const bodyLow = Math.min(kline.open, kline.close);
        const volume = kline.volume;

        // 70%成交量分配到实体部分，30%分配到影线部分
        const bodyVolume = volume * 0.7;
        const wickVolume = volume * 0.3;

        // 计算实体覆盖的格子
        const bodyBucketList = [];
        const wickBucketList = [];

        for (let i = 0; i < bucketList.length; i++) {
            const bucket = bucketList[i];
            // 实体部分覆盖的格子
            if (bucket.upperBound > bodyLow && bucket.lowerBound < bodyHigh) {
                bodyBucketList.push(i);
            }
            // 影线部分覆盖的格子（排除实体部分）
            const inUpperWick =
                bucket.upperBound > bodyHigh && bucket.lowerBound < kline.high;
            const inLowerWick =
                bucket.upperBound > kline.low && bucket.lowerBound < bodyLow;
            if (inUpperWick || inLowerWick) {
                wickBucketList.push(i);
            }
        }

        // 分配成交量
        if (bodyBucketList.length > 0) {
            const volumePerBodyBucket = bodyVolume / bodyBucketList.length;
            for (const idx of bodyBucketList) {
                bucketList[idx].volume += volumePerBodyBucket;
            }
        }
        if (wickBucketList.length > 0) {
            const volumePerWickBucket = wickVolume / wickBucketList.length;
            for (const idx of wickBucketList) {
                bucketList[idx].volume += volumePerWickBucket;
            }
        }
    }

    // 按成交量排序，找出最高的3个格子
    const sortedBucketList = [...bucketList].sort(
        (a, b) => b.volume - a.volume,
    );
    const top3BucketList = sortedBucketList.slice(0, 3);

    // 取成交量最大格子的中间价作为成交量中心
    const topBucket = top3BucketList[0];
    const volumeCenterPrice = (topBucket.lowerBound + topBucket.upperBound) / 2;

    return {
        volumeCenterPrice,
        volumeBucketList: top3BucketList.map((b) => ({
            lowerBound: b.lowerBound,
            upperBound: b.upperBound,
            centerPrice: (b.lowerBound + b.upperBound) / 2,
            volume: b.volume,
        })),
    };
};

// ============================================================
// 规则D：日线级别波段极点
// ============================================================

/**
 * 规则D：日线级别共识水平位
 *
 * 使用与周期K线相同的共识水平位算法识别日线级别的关键价位
 *
 * @param {Array} dailyKlineList - 日K线数据列表
 * @returns {Object} { dailySupportList, dailyResistanceList }
 */
const findDailySwingPoints = (dailyKlineList) => {
    if (!dailyKlineList || dailyKlineList.length < 7) {
        return { dailySupportList: [], dailyResistanceList: [] };
    }

    // 使用共识水平位算法
    const { supportCandidateList, resistanceCandidateList } =
        findSwingPoints(dailyKlineList);

    return {
        dailySupportList: supportCandidateList.map((c) => c.price),
        dailyResistanceList: resistanceCandidateList.map((c) => c.price),
    };
};

// ============================================================
// 计分系统
// ============================================================

/**
 * 计算候选点的平均成交量（用于成交量验证）
 *
 * @param {Array} klineList - K线数据列表
 * @param {number} klineIndex - 候选点所在K线索引
 * @param {number} lookback - 回看根数
 * @returns {number} 平均成交量
 */
const getAverageVolume = (klineList, klineIndex, lookback = 10) => {
    const startIdx = Math.max(0, klineIndex - lookback);
    const endIdx = klineIndex;
    if (startIdx >= endIdx) return 0;

    let totalVolume = 0;
    for (let i = startIdx; i < endIdx; i++) {
        totalVolume += klineList[i].volume;
    }
    return totalVolume / (endIdx - startIdx);
};

/**
 * 为候选点计分
 *
 * @param {Object} candidate - 候选点
 * @param {Array} klineList - K线数据列表
 * @param {number} ma20 - MA20值
 * @param {Array} dailyLevelPriceList - 日线级别的价格点列表
 * @param {string} symbol - 交易对（用于查询历史关键位）
 * @param {Object} priceRange - 价格范围 { minPrice, maxPrice }
 * @param {number} currentPrice - 当前价格
 * @returns {Object} 带分数的候选点
 */
const scoreCandidate = (
    candidate,
    klineList,
    ma20,
    dailyLevelPriceList,
    symbol,
    priceRange,
    currentPrice,
) => {
    let score = 0;
    const scoreBreakdown = {};
    const totalKlineCount = klineList.length;

    // 1. 基础分
    score += CONFIG.SCORE.BASE;
    scoreBreakdown.base = CONFIG.SCORE.BASE;

    // 2. 时间远近（扣分制）- 使用衰减速率，减缓对历史关键位的惩罚
    const distanceFromNow = totalKlineCount - 1 - candidate.klineIndex;
    let rawDecay = distanceFromNow * CONFIG.SCORE.TIME_DECAY_RATE;

    // 高权重候选点（接触权重超过平均2倍）减半时间衰减
    if (candidate.touchWeight && candidate.avgTouchWeight) {
        const threshold =
            candidate.avgTouchWeight *
            CONFIG.THRESHOLD.HIGH_TOUCH_WEIGHT_MULTIPLIER;
        if (candidate.touchWeight >= threshold) {
            rawDecay = rawDecay * 0.5;
            scoreBreakdown.highWeightBonus = "时间衰减减半";
        }
    }

    const timeDecay = Math.min(rawDecay, CONFIG.SCORE.TIME_DECAY_MAX);
    score -= timeDecay;
    scoreBreakdown.timeDecay = -timeDecay;

    // 3. 成交量验证
    const avgVolume = getAverageVolume(klineList, candidate.klineIndex);
    if (avgVolume > 0 && candidate.volume > avgVolume) {
        score += CONFIG.SCORE.VOLUME_CONFIRM;
        scoreBreakdown.volumeConfirm = CONFIG.SCORE.VOLUME_CONFIRM;
    } else {
        scoreBreakdown.volumeConfirm = 0;
    }

    // 4. 多周期共振
    let hasMultiTimeframeConfirm = false;
    for (const dailyPrice of dailyLevelPriceList) {
        const deviation = Math.abs(candidate.price - dailyPrice) / dailyPrice;
        if (deviation <= CONFIG.THRESHOLD.MULTI_TIMEFRAME_DEVIATION) {
            hasMultiTimeframeConfirm = true;
            break;
        }
    }
    if (hasMultiTimeframeConfirm) {
        score += CONFIG.SCORE.MULTI_TIMEFRAME;
        scoreBreakdown.multiTimeframe = CONFIG.SCORE.MULTI_TIMEFRAME;
    } else {
        scoreBreakdown.multiTimeframe = 0;
    }

    // 5. 均线贴近
    const maDeviation = Math.abs(candidate.price - ma20) / ma20;
    if (maDeviation <= CONFIG.THRESHOLD.MA_PROXIMITY_DEVIATION) {
        score += CONFIG.SCORE.MA_PROXIMITY;
        scoreBreakdown.maProximity = CONFIG.SCORE.MA_PROXIMITY;
    } else {
        scoreBreakdown.maProximity = 0;
    }

    // 6. 共识水平位加分（来源为 consolidation_level 的候选点）
    if (candidate.source === "consolidation_level" && candidate.touchCount) {
        // 基础加分
        score += CONFIG.SCORE.CONSENSUS_BONUS;
        scoreBreakdown.consensusBonus = CONFIG.SCORE.CONSENSUS_BONUS;

        // 接触次数越多，额外加分越多（最多额外10分）
        const touchBonus = Math.min(
            candidate.touchCount - CONFIG.PRICE_LEVEL.MIN_TOUCH_COUNT,
            10,
        );
        score += touchBonus;
        scoreBreakdown.touchBonus = touchBonus;
    } else {
        scoreBreakdown.consensusBonus = 0;
        scoreBreakdown.touchBonus = 0;
    }

    // 6.5. 波段极点加分（来源为 swing_high/swing_low 的候选点）
    if (candidate.source === "swing_high" || candidate.source === "swing_low") {
        score += CONFIG.SCORE.SWING_POINT_BONUS;
        scoreBreakdown.swingPointBonus = CONFIG.SCORE.SWING_POINT_BONUS;
    } else {
        scoreBreakdown.swingPointBonus = 0;
    }

    // 6.6. 极端价格加分（接近数据集最高/最低价的候选点）
    if (priceRange && priceRange.minPrice && priceRange.maxPrice) {
        const range = priceRange.maxPrice - priceRange.minPrice;
        const distanceFromMin = candidate.price - priceRange.minPrice;
        const distanceFromMax = priceRange.maxPrice - candidate.price;

        // 如果候选价格在数据集价格范围的底部10%或顶部10%，给予加分
        const extremeThreshold = range * 0.1;

        if (
            distanceFromMin <= extremeThreshold ||
            distanceFromMax <= extremeThreshold
        ) {
            score += CONFIG.SCORE.EXTREME_PRICE_BONUS;
            scoreBreakdown.extremePriceBonus = CONFIG.SCORE.EXTREME_PRICE_BONUS;
        } else {
            scoreBreakdown.extremePriceBonus = 0;
        }
    } else {
        scoreBreakdown.extremePriceBonus = 0;
    }

    // 6.7. 邻近加分（距离当前价格适中的候选点更实用）
    // 注意：太近的候选点（<2%）不是有效的支撑/阻力位，不应加分
    if (
        currentPrice &&
        priceRange &&
        priceRange.minPrice &&
        priceRange.maxPrice
    ) {
        const range = priceRange.maxPrice - priceRange.minPrice;
        const distanceFromCurrent = Math.abs(candidate.price - currentPrice);
        const distanceRatio = distanceFromCurrent / range;

        // 如果距离在2%-20%范围内，给予加分（距离2%时加满分，距离20%时加0分）
        const minDistanceRatio = 0.02; // 最小距离2%
        const maxDistanceRatio = 0.2; // 最大距离20%

        if (
            distanceRatio >= minDistanceRatio &&
            distanceRatio <= maxDistanceRatio
        ) {
            // 线性递减：距离2%时加满分，距离20%时加0分
            const effectiveRange = maxDistanceRatio - minDistanceRatio;
            const positionInRange =
                (distanceRatio - minDistanceRatio) / effectiveRange;
            const proximityBonus = Math.round(
                CONFIG.SCORE.PROXIMITY_BONUS * (1 - positionInRange),
            );
            score += proximityBonus;
            scoreBreakdown.proximityBonus = proximityBonus;
        } else {
            scoreBreakdown.proximityBonus = 0;
        }
    } else {
        scoreBreakdown.proximityBonus = 0;
    }

    // 7. 历史关键位效力加分（压倒性权重）
    if (symbol) {
        const historicalEfficacy = getHistoricalEfficacy(
            symbol,
            candidate.price,
        );
        if (historicalEfficacy > 0) {
            // 效力分数按比例转换为加分（最高80分）
            const efficacyBonus = Math.min(
                Math.round(
                    (historicalEfficacy * CONFIG.SCORE.HISTORICAL_EFFICACY) /
                        100,
                ),
                CONFIG.SCORE.HISTORICAL_EFFICACY,
            );
            score += efficacyBonus;
            scoreBreakdown.historicalEfficacy = efficacyBonus;
            scoreBreakdown.historicalEfficacyRaw = historicalEfficacy;
        } else {
            scoreBreakdown.historicalEfficacy = 0;
        }
    } else {
        scoreBreakdown.historicalEfficacy = 0;
    }

    return {
        ...candidate,
        score,
        scoreBreakdown,
    };
};

/**
 * 从候选列表中选出获胜者
 *
 * @param {Array} candidateList - 候选点列表（已计分）
 * @returns {Object|undefined} 获胜的候选点
 */
const selectWinner = (candidateList) => {
    if (!candidateList || candidateList.length === 0) {
        return undefined;
    }

    // 按分数降序排序
    const sortedList = [...candidateList].sort((a, b) => {
        // 分数相同时，选择距离当前更近的
        if (b.score === a.score) {
            return b.klineIndex - a.klineIndex;
        }
        return b.score - a.score;
    });

    return sortedList[0];
};

// ============================================================
// 主函数
// ============================================================

/**
 * 主函数：识别支撑位和阻力位
 *
 * @param {Object} options - 配置参数
 * @param {string} options.symbol - 交易对（用于历史关键位记忆库）
 * @param {Array} options.klineList - 100根周期K线数据
 * @param {Array} options.dailyKlineList - 30根日K线数据（可选，用于多周期共振验证）
 * @param {number} options.atr - ATR值（用于市场结构分析）
 * @returns {Object} 识别结果
 */
const identifySupportResistance = (options) => {
    const { symbol, klineList, dailyKlineList, atr } = options;

    // 参数校验
    if (!klineList || klineList.length < CONFIG.SWING_WINDOW * 2 + 1) {
        return {
            success: false,
            warning: `K线数据不足，需要至少${CONFIG.SWING_WINDOW * 2 + 1}根K线`,
            fallback: undefined,
        };
    }

    // 获取当前价格
    const currentPrice = klineList[klineList.length - 1].close;

    // 步骤零：分析市场结构，更新历史关键位记忆库
    if (symbol && atr) {
        try {
            const structureResult = analyzeMarketStructure({
                symbol,
                klineList,
                dailyKlineList,
                atr,
            });
            if (structureResult.success) {
                console.log(
                    `[结构分析] ${symbol} 历史关键位: 支撑${structureResult.historicalLevelList.support.length}个, 阻力${structureResult.historicalLevelList.resistance.length}个`,
                );
            }
        } catch (error) {
            console.error(`[结构分析] 失败: ${error.message}`);
        }
    }

    // 步骤一：收集所有候选点

    // 规则A：波段极点
    const {
        supportCandidateList: swingSupportList,
        resistanceCandidateList: swingResistanceList,
        priceRange,
    } = findSwingPoints(klineList);

    // 规则B：成交量堡垒
    const { volumeCenterPrice, volumeBucketList } =
        findVolumeFortress(klineList);

    // 规则C：MA20均线
    const ma20 = calculateMA(klineList, CONFIG.MA_PERIOD);

    // 规则D：日线级别波段极点
    const { dailySupportList, dailyResistanceList } =
        findDailySwingPoints(dailyKlineList);

    // 将成交量中心添加到候选列表（根据与当前价格的关系判断是支撑还是阻力）
    if (volumeCenterPrice !== undefined) {
        const volumeCandidate = {
            price: volumeCenterPrice,
            klineIndex: klineList.length - 1, // 视为最新
            openTime: klineList[klineList.length - 1].openTime,
            volume: volumeBucketList[0]?.volume || 0,
            source: "volume_center",
        };

        if (volumeCenterPrice < currentPrice) {
            swingSupportList.push(volumeCandidate);
        } else {
            swingResistanceList.push(volumeCandidate);
        }
    }

    // 步骤二：计分竞选

    // 为支撑候选点计分
    const scoredSupportList = swingSupportList
        .filter((c) => c.price < currentPrice) // 支撑位必须低于当前价格
        .map((c) =>
            scoreCandidate(
                c,
                klineList,
                ma20,
                dailySupportList,
                symbol,
                priceRange,
                currentPrice,
            ),
        );

    // 为阻力候选点计分
    const scoredResistanceList = swingResistanceList
        .filter((c) => c.price > currentPrice) // 阻力位必须高于当前价格
        .map((c) =>
            scoreCandidate(
                c,
                klineList,
                ma20,
                dailyResistanceList,
                symbol,
                priceRange,
                currentPrice,
            ),
        );

    // 选出获胜者（优先选择波段极点配对）
    // 策略：优先选择价格最极端的波段极点（最低支撑 + 最高阻力）
    const findBestPair = () => {
        // 按得分排序
        const sortedSupport = [...scoredSupportList].sort(
            (a, b) => b.score - a.score,
        );
        const sortedResistance = [...scoredResistanceList].sort(
            (a, b) => b.score - a.score,
        );

        // 分离波段极点
        // 支撑：按价格从低到高（优先选择历史低点）
        // 阻力：按得分从高到低（优先选择有技术意义的阻力位）
        const swingSupport = scoredSupportList
            .filter((c) => c.source === "swing_low")
            .sort((a, b) => a.price - b.price); // 价格最低的优先
        const swingResistance = scoredResistanceList
            .filter((c) => c.source === "swing_high")
            .sort((a, b) => b.score - a.score); // 得分最高的优先

        // 尝试波段支撑（最低价）+ 波段阻力（得分最高的swing_high）
        for (const s of swingSupport) {
            for (const r of swingResistance) {
                const spread = (r.price - s.price) / currentPrice;
                if (spread >= CONFIG.THRESHOLD.MIN_SPREAD_RATIO) {
                    return { support: s, resistance: r, source: "swing_pair" };
                }
            }
        }

        // 如果没有合适的swing_high，尝试波段支撑 + 得分最高的阻力
        for (const s of swingSupport) {
            for (const r of sortedResistance) {
                const spread = (r.price - s.price) / currentPrice;
                if (spread >= CONFIG.THRESHOLD.MIN_SPREAD_RATIO) {
                    return {
                        support: s,
                        resistance: r,
                        source: "swing_support",
                    };
                }
            }
        }

        // 尝试其他支撑（得分最高的）+ 波段阻力（价格最高的）
        for (const s of sortedSupport) {
            for (const r of swingResistance) {
                const spread = (r.price - s.price) / currentPrice;
                if (spread >= CONFIG.THRESHOLD.MIN_SPREAD_RATIO) {
                    return {
                        support: s,
                        resistance: r,
                        source: "swing_resistance",
                    };
                }
            }
        }

        // 最后尝试任意满足间距的配对（按得分）
        for (const s of sortedSupport) {
            for (const r of sortedResistance) {
                const spread = (r.price - s.price) / currentPrice;
                if (spread >= CONFIG.THRESHOLD.MIN_SPREAD_RATIO) {
                    return { support: s, resistance: r, source: "score_based" };
                }
            }
        }

        // 没有满足间距的配对，返回得分最高的
        return {
            support: sortedSupport[0],
            resistance: sortedResistance[0],
            source: "fallback",
        };
    };

    const bestPair = findBestPair();
    const supportWinner = bestPair.support;
    const resistanceWinner = bestPair.resistance;

    // 步骤三：异常处理

    // 计算布林带作为备选
    const bollingerBand = calculateBollingerBands(klineList);

    // 检查是否有有效的支撑/阻力位
    if (!supportWinner && !resistanceWinner) {
        return {
            success: false,
            warning: "无法识别有效的支撑位和阻力位，市场可能处于极端状态",
            fallback: {
                support: bollingerBand.lower,
                resistance: bollingerBand.upper,
                source: "bollinger_band",
            },
            meta: {
                currentPrice,
                ma20,
                bollingerBand,
                candidateCount: {
                    support: swingSupportList.length,
                    resistance: swingResistanceList.length,
                },
            },
        };
    }

    // 使用布林带填补缺失的一方
    let support = supportWinner?.price || bollingerBand.lower;
    let resistance = resistanceWinner?.price || bollingerBand.upper;
    let supportSource = supportWinner ? "algorithm" : "bollinger_fallback";
    let resistanceSource = resistanceWinner
        ? "algorithm"
        : "bollinger_fallback";

    // 检查分数是否过低
    const supportScore = supportWinner?.score || 0;
    const resistanceScore = resistanceWinner?.score || 0;
    const maxScore = Math.max(supportScore, resistanceScore);

    if (maxScore < CONFIG.THRESHOLD.MIN_WINNING_SCORE) {
        return {
            success: false,
            warning: `市场结构不清晰，最高得分仅${maxScore}分（阈值${CONFIG.THRESHOLD.MIN_WINNING_SCORE}分），建议观望`,
            fallback: {
                support: bollingerBand.lower,
                resistance: bollingerBand.upper,
                source: "bollinger_band",
            },
            meta: {
                currentPrice,
                ma20,
                bollingerBand,
                supportWinner,
                resistanceWinner,
            },
        };
    }

    // 计算间距
    const spread = resistance - support;
    const spreadRatio = spread / currentPrice;

    // 计算间距字符串（供外部日志使用）
    const spreadStr = spread >= 1 ? spread.toFixed(2) : spread.toFixed(6);

    // 构建多级支撑/阻力位列表（按距离当前价格远近排序，取前3个）
    // 支撑位：价格从高到低（最接近当前价的在前）
    const supportLevelList = scoredSupportList
        .sort((a, b) => b.price - a.price)
        .slice(0, 3)
        .map((c, idx) => ({
            level: idx + 1, // S1, S2, S3
            price: parseFloat(new BigNumber(c.price).toFixed(8)),
            score: c.score,
            source: c.source,
        }));

    // 阻力位：价格从低到高（最接近当前价的在前）
    const resistanceLevelList = scoredResistanceList
        .sort((a, b) => a.price - b.price)
        .slice(0, 3)
        .map((c, idx) => ({
            level: idx + 1, // R1, R2, R3
            price: parseFloat(new BigNumber(c.price).toFixed(8)),
            score: c.score,
            source: c.source,
        }));

    // 成功返回
    return {
        success: true,
        support: parseFloat(new BigNumber(support).toFixed(8)),
        resistance: parseFloat(new BigNumber(resistance).toFixed(8)),
        // 多级支撑/阻力位
        supportLevelList,
        resistanceLevelList,
        meta: {
            currentPrice,
            ma20: parseFloat(new BigNumber(ma20).toFixed(8)),
            spread: parseFloat(new BigNumber(spread).toFixed(8)),
            spreadStr: spreadStr + "U", // 间距的格式化字符串，供日志使用
            spreadRatio: (spreadRatio * 100).toFixed(2) + "%",
            supportDetail: supportWinner
                ? {
                      price: supportWinner.price,
                      score: supportWinner.score,
                      scoreBreakdown: supportWinner.scoreBreakdown,
                      source: supportWinner.source,
                      sourceType: supportSource,
                  }
                : undefined,
            resistanceDetail: resistanceWinner
                ? {
                      price: resistanceWinner.price,
                      score: resistanceWinner.score,
                      scoreBreakdown: resistanceWinner.scoreBreakdown,
                      source: resistanceWinner.source,
                      sourceType: resistanceSource,
                  }
                : undefined,
            bollingerBand,
            volumeCenter: volumeCenterPrice,
            pairSource: bestPair.source, // 配对来源：swing_pair/swing_support/swing_resistance/score_based/fallback
            dailyLevelCount: {
                support: dailySupportList.length,
                resistance: dailyResistanceList.length,
            },
            candidateCount: {
                support: scoredSupportList.length,
                resistance: scoredResistanceList.length,
            },
        },
    };
};

/**
 * 格式化输出结果（用于日志打印）
 *
 * @param {Object} result - identifySupportResistance的返回结果
 * @returns {string} 格式化的字符串
 */
const formatResult = (result) => {
    if (result.success) {
        const lines = [
            `[市场分析] 识别成功`,
            `  支撑位: ${result.support}`,
            `  阻力位: ${result.resistance}`,
            `  间距: ${result.meta.spread >= 1 ? result.meta.spread.toFixed(2) : result.meta.spread.toFixed(6)}U (${result.meta.spreadRatio})`,
            `  当前价: ${result.meta.currentPrice}`,
            `  MA20: ${result.meta.ma20}`,
        ];

        if (result.meta.supportDetail) {
            lines.push(
                `  支撑位得分: ${result.meta.supportDetail.score} (来源: ${result.meta.supportDetail.source})`,
            );
        }
        if (result.meta.resistanceDetail) {
            lines.push(
                `  阻力位得分: ${result.meta.resistanceDetail.score} (来源: ${result.meta.resistanceDetail.source})`,
            );
        }

        // 显示多级支撑/阻力位
        if (result.supportLevelList && result.supportLevelList.length > 0) {
            lines.push(`  多级支撑位:`);
            result.supportLevelList.forEach((s) => {
                lines.push(
                    `    S${s.level}: ${s.price.toFixed(2)} (${s.source}, 得分${s.score.toFixed(0)})`,
                );
            });
        }
        if (
            result.resistanceLevelList &&
            result.resistanceLevelList.length > 0
        ) {
            lines.push(`  多级阻力位:`);
            result.resistanceLevelList.forEach((r) => {
                lines.push(
                    `    R${r.level}: ${r.price.toFixed(2)} (${r.source}, 得分${r.score.toFixed(0)})`,
                );
            });
        }

        return lines.join("\n");
    } else {
        const lines = [`✗ 识别警告: ${result.warning}`];

        if (result.fallback) {
            lines.push(`  备选支撑位: ${result.fallback.support}`);
            lines.push(`  备选阻力位: ${result.fallback.resistance}`);
            lines.push(`  备选来源: ${result.fallback.source}`);
        }

        return lines.join("\n");
    }
};

module.exports = {
    // 主函数
    identifySupportResistance,
    formatResult,

    // 内部函数（供测试使用）
    findSwingPoints,
    findVolumeFortress,
    findDailySwingPoints,
    scoreCandidate,
    selectWinner,
    getAverageVolume,

    // 共识水平位辅助函数
    getTouchType,
    getBodyHeight,
    getBodyRange,
    identifyPinBar,

    // 配置
    CONFIG,
};
