/**
 * 币安API限流管理器
 * 统一管理所有币安API调用的频率控制和缓存
 *
 * 功能特性:
 * 1. 全局请求队列,确保同一时间只有一个请求在执行
 * 2. 请求间强制延迟(默认2秒),避免触发币安限流
 * 3. 内存缓存层(默认20秒),减少重复API调用
 * 4. 支持按API Key + 接口类型独立缓存
 */

const UtilRecord = require("./record-log.js");

class BinanceRateLimiter {
    constructor() {
        // 请求队列
        this.requestQueue = [];
        // 是否正在处理请求
        this.isProcessing = false;
        // 上次请求完成时间
        this.lastRequestTime = 0;
        // 请求间最小延迟(毫秒)
        this.minDelayMs = 2000;
        // 内存缓存: { cacheKey: { data, timestamp } }
        this.memoryCache = new Map();
        // 缓存有效期(毫秒)
        this.cacheTTL = 20 * 1000;

        // 统计信息
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            apiCalls: 0,
            rateLimitErrors: 0,
        };
    }

    /**
     * 生成缓存键
     * @param {string} apiKey - API Key(取前8位)
     * @param {string} method - 方法名(如: getAccountInformation)
     * @param {Object} params - 请求参数
     * @returns {string} 缓存键
     */
    generateCacheKey(apiKey, method, params = {}) {
        const keyPrefix = apiKey ? apiKey.substring(0, 8) : "anonymous";
        const paramsStr =
            Object.keys(params).length > 0 ? JSON.stringify(params) : "";
        return `${keyPrefix}:${method}:${paramsStr}`;
    }

    /**
     * 从内存缓存获取数据
     * @param {string} cacheKey - 缓存键
     * @returns {Object|null} 缓存的数据,如果不存在或已过期返回null
     */
    getFromCache(cacheKey) {
        const cached = this.memoryCache.get(cacheKey);
        if (!cached) {
            return null;
        }

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTTL) {
            this.memoryCache.delete(cacheKey);
            return null;
        }

        this.stats.cacheHits++;
        return cached.data;
    }

    /**
     * 保存数据到内存缓存
     * @param {string} cacheKey - 缓存键
     * @param {Object} data - 要缓存的数据
     */
    setCache(cacheKey, data) {
        this.memoryCache.set(cacheKey, {
            data: JSON.parse(JSON.stringify(data)), // 深拷贝避免引用问题
            timestamp: Date.now(),
        });
    }

    /**
     * 清除指定API Key的所有缓存
     * @param {string} apiKey - API Key
     */
    clearCacheByApiKey(apiKey) {
        const keyPrefix = apiKey ? apiKey.substring(0, 8) : "anonymous";
        let cleared = 0;
        for (const [key] of this.memoryCache) {
            if (key.startsWith(keyPrefix)) {
                this.memoryCache.delete(key);
                cleared++;
            }
        }
        if (cleared > 0) {
            UtilRecord.debug(
                `[RateLimiter] 清除了 ${cleared} 个缓存项 (apiKey: ${keyPrefix}...)`,
            );
        }
    }

    /**
     * 清除所有缓存
     */
    clearAllCache() {
        const size = this.memoryCache.size;
        this.memoryCache.clear();
        UtilRecord.debug(`[RateLimiter] 清除了所有缓存 (${size} 个项)`);
    }

    /**
     * 执行带限流保护的API请求
     * @param {Function} apiCall - API调用函数
     * @param {Object} options - 选项
     * @param {string} [options.apiKey] - API Key
     * @param {string} [options.method] - 方法名
     * @param {Object} [options.params] - 请求参数
     * @param {boolean} [options.useCache] - 是否使用缓存,默认true
     * @param {number} [options.retries] - 重试次数,默认3
     * @returns {Promise<Object>} API响应数据
     */
    async execute(apiCall, options = {}) {
        const {
            apiKey = "",
            method = "unknown",
            params = {},
            useCache = true,
            retries = 3,
        } = options;

        this.stats.totalRequests++;

        // 1. 尝试从缓存获取
        if (useCache) {
            const cacheKey = this.generateCacheKey(apiKey, method, params);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                UtilRecord.debug(
                    `[RateLimiter] 缓存命中: ${method} (${apiKey.substring(0, 8)}...)`,
                );
                return cached;
            }
        }

        // 2. 加入请求队列
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                apiCall,
                options,
                resolve,
                reject,
                retries,
                attempt: 0,
            });

            this.processQueue();
        });
    }

    /**
     * 处理请求队列
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            console.log(
                "[BinanceRateLimiter] 正在处理或队列为空，跳过本次处理",
            );
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const task = this.requestQueue.shift();

            try {
                // 确保请求间隔
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                if (timeSinceLastRequest < this.minDelayMs) {
                    const delay = this.minDelayMs - timeSinceLastRequest;
                    UtilRecord.debug(
                        `[RateLimiter] 等待 ${delay}ms 后执行下一个请求...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }

                // 执行API调用
                task.attempt++;
                UtilRecord.debug(
                    `[RateLimiter] 执行API请求: ${task.options.method} (尝试 ${task.attempt}/${task.retries})`,
                );

                const result = await task.apiCall();
                this.lastRequestTime = Date.now();
                this.stats.apiCalls++;

                // 保存到缓存
                if (task.options.useCache) {
                    const cacheKey = this.generateCacheKey(
                        task.options.apiKey,
                        task.options.method,
                        task.options.params,
                    );
                    this.setCache(cacheKey, result);
                }

                task.resolve(result);
            } catch (error) {
                this.lastRequestTime = Date.now();

                // 检查是否是限流错误
                const isRateLimitError = this.isRateLimitError(error);
                if (isRateLimitError) {
                    this.stats.rateLimitErrors++;
                    UtilRecord.log(
                        `[RateLimiter] 检测到限流错误: ${task.options.method}`,
                    );

                    // 构造友好的限流错误对象，立即返回，不重试
                    const rateLimitError = new Error(
                        "请求过于频繁，请稍后再试（通常2分钟后恢复）",
                    );
                    rateLimitError.code = "RATE_LIMIT_EXCEEDED";
                    rateLimitError.retryAfter = 120;
                    rateLimitError.originalError = error;
                    task.reject(rateLimitError);
                    return;
                }

                // 其他错误直接拒绝
                task.reject(error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * 判断是否是限流错误
     * @param {any} error - 错误对象
     * @returns {boolean} 是否是限流错误
     */
    isRateLimitError(error) {
        if (!error) return false;

        // 检查响应头
        if (error.headers) {
            const connection =
                error.headers.connection || error.headers.Connection;
            const contentLength =
                error.headers["content-length"] ||
                error.headers["Content-Length"];

            if (connection === "close" && contentLength === "0") {
                return true;
            }
        }

        // 检查错误码（支持多种格式）
        const errorCode = error.code || error.body?.code || error.error?.code;
        if (errorCode === -1003 || errorCode === 429 || errorCode === -1021) {
            return true;
        }

        // 检查错误消息（从多个可能的来源）
        const message = error.message || error.body?.message || error.msg || "";
        const lowerMessage = message.toLowerCase();

        if (
            lowerMessage.includes("rate limit") ||
            lowerMessage.includes("too many requests") ||
            lowerMessage.includes("ip banned") ||
            lowerMessage.includes("banned") ||
            lowerMessage.includes("限流")
        ) {
            return true;
        }

        return false;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.memoryCache.size,
            queueLength: this.requestQueue.length,
            cacheHitRate:
                this.stats.totalRequests > 0
                    ? (
                          (this.stats.cacheHits / this.stats.totalRequests) *
                          100
                      ).toFixed(2) + "%"
                    : "0%",
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            apiCalls: 0,
            rateLimitErrors: 0,
        };
    }
}

// 导出单例
const rateLimiter = new BinanceRateLimiter();

module.exports = rateLimiter;
