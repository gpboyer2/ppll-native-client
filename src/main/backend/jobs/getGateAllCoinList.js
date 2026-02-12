/**
 * Gate.io 币种数据获取与缓存任务
 * 每30分钟更新一次24h涨跌幅排序数据
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const UtilRecord = require("../utils/record-log.js");
const CrawlerLog = require("../utils/crawler-log.js");
const { getValidCookies } = require("../utils/cookie-manager.js");
const rateLimitConfig = require("../config/gate-api-rate-limit.config.js");
const proxy = require("../utils/proxy.js");

// 获取代理配置
const httpsAgent = proxy.getHttpsProxyAgent();
const proxyUrl = proxy.getProxyUrlString();

// 启动时打印代理配置状态
if (proxyUrl) {
    console.log(`[Gate Coin Cache] 代理已配置: ${proxyUrl}`);
} else {
    console.log(
        "[Gate Coin Cache] 警告: 未配置代理，在中国大陆可能无法访问 Gate.io",
    );
}

// 创建 Gate.io 爬虫日志记录器
// consoleOutput: false 表示不输出到终端，只写入日志文件
// 如需调试，可设置为 true 或调用 CrawlerLog.setConsoleOutput(true)
const logger = CrawlerLog.createLogger({
    source: "gate",
    consoleOutput: false,
});

global.GATE_COIN_CACHE = {
    gainers: [], // 涨幅榜数据
    losers: [], // 跌幅榜数据
    all: [], // 全部币种数据
    lastUpdate: null, // 最后更新时间
    coinMap: {}, // 币种数据对象缓存
};

/**
 * Gate.io 币种数据持久化对象
 * 提供JSON文件的读取和写入功能
 */
const datum = {
    // 数据文件路径（绝对路径）
    filePath: path.join(__dirname, "../datum/gate-coin-list.json"),

    // 内存中的数据缓存
    json: {},

    /**
     * 将数据写入JSON文件
     * @param {Object} data - 要保存的数据对象
     * @returns {boolean} 写入是否成功
     */
    setFileInfo: function (data) {
        // 暂时禁用写入功能, 因为可以直接读 global 的数据
        return false;
        // try {
        //   // 确保目录存在
        //   const dir = path.dirname(this.filePath);
        //   if (!fs.existsSync(dir)) {
        //     fs.mkdirSync(dir, { recursive: true });
        //   }

        //   // 更新内存缓存
        //   this.json = data;

        //   // 写入文件，使用格式化的JSON
        //   const jsonString = JSON.stringify(data, null, 2);
        //   fs.writeFileSync(this.filePath, jsonString, 'utf8');
        //   return true;

        // } catch (error) {
        //   return false;
        // }
    },

    /**
     * 从文件读取JSON数据
     * @returns {Object} 解析后的JSON对象
     */
    getFileInfo: function () {
        try {
            // 确保目录存在
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 检查文件是否存在
            if (!fs.existsSync(this.filePath)) {
                const defaultData = {
                    gainers: [],
                    losers: [],
                    all: [],
                    lastUpdate: null,
                    stats: {
                        totalRequests: 0,
                        averageResponseTime: 0,
                        updateDuration: 0,
                    },
                };
                this.setFileInfo(defaultData);
                return defaultData;
            }

            // 读取并解析JSON文件
            const fileContent = fs.readFileSync(this.filePath, "utf8");
            const data = JSON.parse(fileContent);
            this.json = data; // 更新内存缓存
            return data;
        } catch (error) {
            // 返回默认数据结构
            const defaultData = {
                gainers: [],
                losers: [],
                all: [],
                lastUpdate: null,
                stats: {
                    totalRequests: 0,
                    averageResponseTime: 0,
                    updateDuration: 0,
                },
            };
            this.json = defaultData;
            return defaultData;
        }
    },

    /**
     * 清空数据文件
     * @returns {boolean} 清空是否成功
     */
    clear: function () {
        const defaultData = {
            gainers: [],
            losers: [],
            all: [],
            lastUpdate: null,
            stats: {
                totalRequests: 0,
                averageResponseTime: 0,
                updateDuration: 0,
            },
        };
        return this.setFileInfo(defaultData);
    },
};

// 请求频率控制配置
const RATE_LIMIT_CONFIG = rateLimitConfig;

// 全局请求状态追踪
let requestStats = {
    consecutiveErrors: 0,
    totalRequests: 0,
    lastRequestTime: 0,
    averageResponseTime: 0,
};

/**
 * 智能延时计算函数
 * @param {number} pageNumber - 当前页数
 * @param {number} dataLength - 返回数据长度
 * @returns {number} 延时毫秒数
 */
function calculateSmartDelay(pageNumber, dataLength = 50) {
    const config = RATE_LIMIT_CONFIG;

    // 基础延时
    let delay = config.baseDelay;

    // 根据页数递增延时（模拟用户越往后翻页越慢的行为）
    const progressiveDelay = pageNumber * config.progressiveMultiplier * 1000;
    delay += progressiveDelay;

    // 根据连续错误次数进行退避
    if (requestStats.consecutiveErrors >= config.consecutiveErrorThreshold) {
        delay *= Math.pow(
            config.errorBackoffMultiplier,
            requestStats.consecutiveErrors -
                config.consecutiveErrorThreshold +
                1,
        );
    }

    // 如果返回数据较少，可能接近结尾，稍微减少延时
    if (dataLength < 50) {
        delay *= 0.8;
    }

    // 添加随机波动，让请求更自然
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * config.randomFactor;
    delay *= randomFactor;

    // 确保延时在合理范围内
    delay = Math.max(config.baseDelay, Math.min(delay, config.maxDelay));

    return Math.round(delay);
}

/**
 * 记录请求统计信息
 * @param {boolean} isSuccess - 请求是否成功
 * @param {number} responseTime - 响应时间
 */
function recordRequestStats(isSuccess, responseTime = 0) {
    requestStats.totalRequests++;
    requestStats.lastRequestTime = Date.now();

    if (isSuccess) {
        requestStats.consecutiveErrors = 0;
        // 更新平均响应时间
        if (responseTime > 0) {
            requestStats.averageResponseTime =
                (requestStats.averageResponseTime + responseTime) / 2;
        }
    } else {
        requestStats.consecutiveErrors++;
    }
}

/**
 * 计算错误退避延时
 * @returns {number} 退避延时毫秒数
 */
function calculateBackoffDelay() {
    const config = RATE_LIMIT_CONFIG;
    const baseBackoff = 5000; // 基础退避5秒

    // 指数退避算法
    const exponentialDelay =
        baseBackoff *
        Math.pow(
            config.errorBackoffMultiplier,
            Math.min(requestStats.consecutiveErrors, 6), // 最多6次幂，避免延时过长
        );

    // 添加随机抖动，避免多个进程同时重试
    const jitter = exponentialDelay * 0.1 * (Math.random() - 0.5);

    return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * 获取Gate.io全部币种数据（支持自动分页获取所有数据）
 * @param {string} tab - 排序类型 ('trade', 'crypto-gainers', 'crypto-losers')
 * @param {string} sort - 排序字段 ('dimension_24h')
 * @param {string} order - 排序方向 ('desc', 'asc')
 * @param {boolean} enableProgressiveUpdate - 是否启用渐进式更新（每5页保存一次）
 * @returns {Promise<Array>} 币种数据列表
 */
async function fetchGateCoinList(
    tab = "trade",
    sort = "dimension_24h",
    order = "desc",
    enableProgressiveUpdate = false,
) {
    // 获取有效的 cookies（自动更新过期的）
    let cookies = await getValidCookies();

    const pageSize = 50; // Gate API固定每页最多50条

    // 单页数据获取函数
    const fetchPageData = async (currentPage) => {
        const requestStartTime = Date.now();

        const axiosConfig = {
            method: "post",
            url: "https://www.gate.com/api-price/api/inner/v3/price/getAllCoinList",
            headers: {
                accept: "application/json, text/plain, */*",
                "accept-language":
                    "zh,zh-CN;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6",
                "content-type": "application/x-www-form-urlencoded",
                cookie: cookies,
                csrftoken: "1",
                dnt: "1",
                origin: "https://www.gate.com",
                priority: "u=1, i",
                referer: "https://www.gate.com/zh/price",
                "sec-ch-ua":
                    '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            },
            data: `page=${currentPage}&pageSize=${pageSize}&tab=${tab}&is_gate=1000001${sort ? `&sort=${sort}` : ""}${order ? `&order=${order}` : ""}`,
        };

        // 如果有代理配置，添加代理
        if (httpsAgent) {
            axiosConfig.httpsAgent = httpsAgent;
        }

        const response = await axios(axiosConfig);

        return {
            responseTime: Date.now() - requestStartTime,
            data: response.data,
        };
    };

    // 分页获取数据
    for (let page = 1; page <= 1000; page++) {
        // 设置最大页数限制防止无限循环
        try {
            const { responseTime, data } = await fetchPageData(page);

            if (data && data.code === 0 && data.data && data.data.list) {
                const pageData = data.data.list;

                // 记录成功请求的统计信息
                recordRequestStats(true, responseTime);

                // 如果返回空数组，说明已经没有更多数据
                if (pageData.length === 0) {
                    const result = Object.values(
                        global.GATE_COIN_CACHE.coinMap,
                    );
                    logger.log(
                        `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
                    );
                    return result;
                }

                // 将数据添加到对象中，使用symbol作为key避免重复
                pageData.forEach((coin) => {
                    if (coin.coin_short_name) {
                        global.GATE_COIN_CACHE.coinMap[coin.coin_short_name] =
                            coin;
                    }
                });

                logger.log(
                    `[Gate Coin Cache] 获取 ${tab} 第${page}页，本页 ${pageData.length} 条，累计 ${Object.keys(global.GATE_COIN_CACHE.coinMap).length} 个（${responseTime}ms）`,
                );

                // 每页都同步更新内存缓存
                const currentData = Object.values(
                    global.GATE_COIN_CACHE.coinMap,
                );

                // 根据数据类型更新对应字段
                if (tab === "crypto-gainers") {
                    global.GATE_COIN_CACHE.gainers = currentData;
                } else if (tab === "crypto-losers") {
                    global.GATE_COIN_CACHE.losers = currentData;
                } else if (tab === "trade") {
                    global.GATE_COIN_CACHE.all = currentData;
                }

                global.GATE_COIN_CACHE.lastUpdate = new Date().toISOString();
                logger.log(
                    `[Gate Coin Cache] ${tab} 第${page}页已更新到内存缓存 (${currentData.length}条)`,
                );

                // 如果本页数据少于pageSize，说明已经到最后一页
                if (pageData.length < pageSize) {
                    const result = Object.values(
                        global.GATE_COIN_CACHE.coinMap,
                    );
                    logger.log(
                        `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
                    );
                    return result;
                }

                // 智能延迟策略 - 根据页数动态调整延时
                const delay = calculateSmartDelay(page + 1, pageData.length);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                logger.warn(`[Gate Coin Cache] ${tab} API返回数据格式错误`);
                const result = Object.values(global.GATE_COIN_CACHE.coinMap);
                logger.log(
                    `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
                );
                return result;
            }
        } catch (pageError) {
            // 记录失败请求的统计信息
            recordRequestStats(false);

            // 处理单页请求错误
            if (pageError.response && pageError.response.status === 429) {
                // 遇到限流错误，智能退避
                const backoffDelay = calculateBackoffDelay();
                logger.warn(
                    `[Gate Coin Cache] ${tab} 第${page}页遇到限流，等待 ${Math.round(backoffDelay / 1000)} 秒后重试...`,
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffDelay),
                );
                page--; // 重试当前页，所以减一
            } else if (
                pageError.response &&
                pageError.response.status === 403
            ) {
                // 遇到403错误，尝试刷新cookies后重试
                logger.warn(
                    `[Gate Coin Cache] ${tab} 第${page}页遇到403错误，尝试刷新cookies...`,
                );
                try {
                    const freshCookies = await getValidCookies(true);
                    // 更新cookies变量
                    cookies = freshCookies;
                    // 403错误后也要等待一段时间
                    await new Promise((resolve) =>
                        setTimeout(
                            resolve,
                            RATE_LIMIT_CONFIG.updateStrategy
                                ?.bufferBetweenTypes,
                        ),
                    );
                    page--; // 重试当前页，所以减一
                } catch (cookieError) {
                    logger.error(`[Gate Coin Cache] 刷新cookies失败`);
                    const result = Object.values(
                        global.GATE_COIN_CACHE.coinMap,
                    );
                    logger.log(
                        `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
                    );
                    return result;
                }
            } else {
                // 其他错误，根据连续错误次数决定是否继续
                if (requestStats.consecutiveErrors < 5) {
                    const errorDelay = calculateBackoffDelay();
                    logger.warn(
                        `[Gate Coin Cache] ${tab} 第${page}页请求失败，等待 ${Math.round(errorDelay / 1000)} 秒后重试...`,
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, errorDelay),
                    );
                    page--; // 重试当前页，所以减一
                } else {
                    logger.error(
                        `[Gate Coin Cache] ${tab} 连续失败次数过多，停止请求`,
                    );
                    const result = Object.values(
                        global.GATE_COIN_CACHE.coinMap,
                    );
                    logger.log(
                        `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
                    );
                    return result;
                }
            }
        }
    }

    // 将对象转换为数组
    const result = Object.values(global.GATE_COIN_CACHE.coinMap);
    logger.log(
        `[Gate Coin Cache] ${tab} 数据获取完成，总共 ${result.length} 条记录`,
    );
    return result;
}

/**
 * 更新缓存中的币种数据
 */
async function updateGateCoinCache() {
    try {
        logger.log("[Gate Coin Cache] 开始更新币种数据缓存...");

        // 重置请求统计信息
        requestStats = {
            consecutiveErrors: 0,
            totalRequests: 0,
            lastRequestTime: 0,
            averageResponseTime: 0,
        };

        const startTime = Date.now();

        // 串行获取三种数据，避免同时请求造成限流
        logger.log("[Gate Coin Cache] 开始获取涨幅榜数据...");
        const gainersData = await fetchGateCoinList(
            "crypto-gainers",
            "dimension_24h",
            "desc",
        );

        // 立即更新涨幅榜数据到全局缓存
        global.GATE_COIN_CACHE.gainers = gainersData;
        global.GATE_COIN_CACHE.lastUpdate = new Date().toISOString();
        logger.log(
            `[Gate Coin Cache] 涨幅榜数据已更新 (${gainersData.length} 条)`,
        );

        // 在不同数据类型之间添加缓冲时间
        await new Promise((resolve) =>
            setTimeout(
                resolve,
                RATE_LIMIT_CONFIG.updateStrategy?.bufferBetweenTypes,
            ),
        );

        logger.log("[Gate Coin Cache] 开始获取跌幅榜数据...");
        const losersData = await fetchGateCoinList(
            "crypto-losers",
            "dimension_24h",
            "asc",
        );

        // 立即更新跌幅榜数据到全局缓存
        global.GATE_COIN_CACHE.losers = losersData;
        global.GATE_COIN_CACHE.lastUpdate = new Date().toISOString();
        logger.log(
            `[Gate Coin Cache] 跌幅榜数据已更新 (${losersData.length} 条)`,
        );

        // 在不同数据类型之间添加缓冲时间
        await new Promise((resolve) =>
            setTimeout(
                resolve,
                RATE_LIMIT_CONFIG.updateStrategy?.bufferBetweenTypes,
            ),
        );

        logger.log("[Gate Coin Cache] 开始获取全部币种数据...");
        const allData = await fetchGateCoinList("trade", null, null, true); // 启用渐进式更新

        // 最终更新全部数据到全局缓存
        global.GATE_COIN_CACHE.all = allData;
        global.GATE_COIN_CACHE.lastUpdate = new Date().toISOString();

        const duration = Date.now() - startTime;
        logger.log(
            `[Gate Coin Cache] 缓存更新完成，用时 ${Math.round(duration / 1000)}s`,
        );
        logger.log(
            `[Gate Coin Cache] 涨幅榜: ${gainersData.length} 条，跌幅榜: ${losersData.length} 条，全部: ${allData.length} 条`,
        );
    } catch (error) {
        logger.error(`[Gate Coin Cache] 更新缓存失败: ${error.message}`);
    }
}

/**
 * 启动定时任务
 */
function startGateCoinCacheJob() {
    logger.log("[Gate Coin Cache] 启动Gate.io币种数据缓存任务");

    // 立即执行一次
    updateGateCoinCache();

    // 每30分钟执行一次
    const interval = 30 * 60 * 1000; // 30分钟
    setInterval(updateGateCoinCache, interval);

    logger.log(
        `[Gate Coin Cache] 定时任务已启动，每 ${interval / 60000} 分钟更新一次`,
    );
}

// 启动任务
startGateCoinCacheJob();

// 导出函数和对象供其他模块使用
module.exports = {
    updateGateCoinCache,
    fetchGateCoinList,
};
