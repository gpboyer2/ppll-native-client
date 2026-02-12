/**
 * Gate.io API 限流配置
 * 可根据实际情况调整这些参数
 */

module.exports = {
    // 基础配置
    baseDelay: 2000, // 基础延时2秒
    maxDelay: 15000, // 最大延时15秒
    randomFactor: 0.3, // 随机波动30%

    // 递进策略
    progressiveMultiplier: 0.1, // 递增因子 - 每页增加100ms

    // 错误处理
    errorBackoffMultiplier: 2, // 错误退避倍数
    consecutiveErrorThreshold: 3, // 连续错误阈值
    maxRetries: 5, // 最大重试次数

    // 不同API端点的配置
    endpoints: {
        "crypto-gainers": {
            baseDelay: 2000,
            maxPages: 50, // 预估最大页数
            priority: "high", // 优先级
        },
        "crypto-losers": {
            baseDelay: 2000,
            maxPages: 50,
            priority: "high",
        },
        trade: {
            baseDelay: 2500, // 全部数据延时稍长
            maxPages: 200, // 预估页数更多
            priority: "normal",
        },
    },

    // 时间段策略（可选）
    timeBasedStrategy: {
        enabled: false, // 是否启用时间段策略
        patterns: {
            // 工作时间（UTC+8 9:00-18:00）延时更长
            workHours: {
                start: 9,
                end: 18,
                delayMultiplier: 1.5,
            },
            // 休息时间延时较短
            offHours: {
                delayMultiplier: 0.8,
            },
        },
    },

    // 缓存更新策略
    updateStrategy: {
        bufferBetweenTypes: 3000, // 不同数据类型间的请求接口的缓冲时间
        fullUpdateInterval: 1800, // 完整更新间隔（秒）
        enableSmartScheduling: true, // 智能调度
    },
};
