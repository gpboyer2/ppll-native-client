/**
 * 币安账户数据缓存管理器
 * 用于缓存账户数据，减少对 HTTP API 的调用
 * 支持 WebSocket 增量更新，实现数据降级策略
 */
const UtilRecord = require("../utils/record-log.js");

/**
 * 缓存数据结构
 * {
 *   api_key: {
 *     usdm: { data, timestamp },
 *     spot: { data, timestamp },
 *     coinm: { data, timestamp }
 *   }
 * }
 */
const account_cache = new Map();

/**
 * 默认缓存过期时间（毫秒）
 * WebSocket 实时更新时设置为 60 秒，纯 HTTP 模式设置为 20 秒
 */
const DEFAULT_CACHE_TTL_MS = 60 * 1000;
const HTTP_ONLY_CACHE_TTL_MS = 20 * 1000;

/**
 * 获取缓存数据
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 * @returns {object|null} 缓存的账户数据，如果不存在返回 null
 */
const get = (api_key, marketType) => {
    const user_cache = account_cache.get(api_key);
    if (!user_cache) {
        return null;
    }

    const market_cache = user_cache[marketType];
    if (!market_cache) {
        return null;
    }

    return market_cache.data || null;
};

/**
 * 更新缓存数据
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 * @param {object} accountData - 账户数据
 */
const set = (api_key, marketType, accountData) => {
    if (!account_cache.has(api_key)) {
        account_cache.set(api_key, {
            usdm: null,
            spot: null,
            coinm: null,
        });
    }

    const user_cache = account_cache.get(api_key);
    user_cache[marketType] = {
        data: accountData,
        timestamp: Date.now(),
    };

    UtilRecord.debug(
        `[缓存管理器] 更新缓存 - api_key: ${api_key.substring(0, 8)}..., market: ${marketType}`,
    );
};

/**
 * 检查缓存是否过期
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 * @param {number} maxAge - 最大缓存时间（毫秒），默认使用 DEFAULT_CACHE_TTL_MS
 * @returns {boolean} 如果缓存不存在或已过期返回 true
 */
const isExpired = (api_key, marketType, maxAge = DEFAULT_CACHE_TTL_MS) => {
    const user_cache = account_cache.get(api_key);
    if (!user_cache) {
        return true;
    }

    const market_cache = user_cache[marketType];
    if (!market_cache || !market_cache.timestamp) {
        return true;
    }

    const elapsed = Date.now() - market_cache.timestamp;
    return elapsed > maxAge;
};

/**
 * 获取缓存时间戳
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 * @returns {number|null} 缓存时间戳，如果不存在返回 null
 */
const getTimestamp = (api_key, marketType) => {
    const user_cache = account_cache.get(api_key);
    if (!user_cache) {
        return null;
    }

    const market_cache = user_cache[marketType];
    if (!market_cache || !market_cache.timestamp) {
        return null;
    }

    return market_cache.timestamp;
};

/**
 * 从 WebSocket 增量数据更新缓存
 * WebSocket 推送的是增量数据（如 updatedBalances），需要合并到完整账户数据中
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 * @param {object} eventData - WebSocket 事件数据
 * @returns {boolean} 是否成功更新缓存
 */
const updateFromWebSocket = (api_key, marketType, eventData) => {
    try {
        const user_cache = account_cache.get(api_key);
        if (!user_cache || !user_cache[marketType]) {
            // 缓存不存在，无法增量更新
            UtilRecord.debug(
                `[缓存管理器] 缓存不存在，跳过 WebSocket 增量更新 - api_key: ${api_key.substring(0, 8)}..., market: ${marketType}`,
            );
            return false;
        }

        const cached_data = user_cache[marketType].data;
        if (!cached_data) {
            return false;
        }

        const updateData = eventData.updateData || {};
        let updated = false;

        // 更新余额信息
        if (
            updateData.updatedBalances &&
            Array.isArray(updateData.updatedBalances)
        ) {
            // 确保 balances 数组存在
            if (!cached_data.balances || !Array.isArray(cached_data.balances)) {
                cached_data.balances = [];
            }

            // 创建余额映射表，便于快速查找和更新
            const balances_map = new Map();
            for (const balance of cached_data.balances) {
                balances_map.set(balance.asset, balance);
            }

            // 合并增量更新
            for (const updatedBalance of updateData.updatedBalances) {
                const existing = balances_map.get(updatedBalance.asset);
                if (existing) {
                    // 更新现有余额
                    existing.free = updatedBalance.free;
                    existing.locked = updatedBalance.locked;
                } else {
                    // 添加新余额
                    cached_data.balances.push(updatedBalance);
                }
            }

            // 更新总资产余额字段（如果存在）
            if (updateData.totalWalletBalance !== undefined) {
                cached_data.totalWalletBalance = updateData.totalWalletBalance;
            }
            if (updateData.availableBalance !== undefined) {
                cached_data.availableBalance = updateData.availableBalance;
            }

            updated = true;
        }

        // 更新持仓信息（合约市场）
        if (
            updateData.updatedPositions &&
            Array.isArray(updateData.updatedPositions)
        ) {
            // 确保 positions 数组存在
            if (
                !cached_data.positions ||
                !Array.isArray(cached_data.positions)
            ) {
                cached_data.positions = [];
            }

            // 创建持仓映射表，使用 symbol_positionSide 作为键
            const positions_map = new Map();
            for (const position of cached_data.positions) {
                const key = `${position.symbol}_${position.positionSide}`;
                positions_map.set(key, position);
            }

            // 合并增量更新
            for (const updatedPosition of updateData.updatedPositions) {
                const key = `${updatedPosition.symbol}_${updatedPosition.positionSide}`;
                const existing = positions_map.get(key);
                if (existing) {
                    // 更新现有持仓
                    existing.positionAmt = updatedPosition.positionAmt;
                    existing.entryPrice = updatedPosition.entryPrice;
                    existing.unRealizedProfit =
                        updatedPosition.unRealizedProfit;
                    existing.leverage = updatedPosition.leverage;
                    existing.notional = updatedPosition.notional;
                    existing.isolated = updatedPosition.isolated;
                } else {
                    // 添加新持仓
                    cached_data.positions.push(updatedPosition);
                }
            }

            updated = true;
        }

        if (updated) {
            // 更新时间戳
            user_cache[marketType].timestamp = Date.now();
            UtilRecord.debug(
                `[缓存管理器] WebSocket 增量更新成功 - api_key: ${api_key.substring(0, 8)}..., market: ${marketType}`,
            );
        }

        return updated;
    } catch (error) {
        // 缓存更新失败不应影响原有事件处理逻辑
        UtilRecord.log(
            `[缓存管理器] WebSocket 增量更新失败 - ${error.message}`,
        );
        return false;
    }
};

/**
 * 清除指定用户的缓存
 * @param {string} api_key - 用户 API Key
 */
const clear = (api_key) => {
    account_cache.delete(api_key);
    UtilRecord.debug(
        `[缓存管理器] 清除缓存 - api_key: ${api_key.substring(0, 8)}...`,
    );
};

/**
 * 清除指定用户指定市场的缓存
 * @param {string} api_key - 用户 API Key
 * @param {string} marketType - 市场类型：usdm | spot | coinm
 */
const clearMarket = (api_key, marketType) => {
    const user_cache = account_cache.get(api_key);
    if (user_cache) {
        user_cache[marketType] = null;
        UtilRecord.debug(
            `[缓存管理器] 清除市场缓存 - api_key: ${api_key.substring(0, 8)}..., market: ${marketType}`,
        );
    }
};

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计
 */
const getStats = () => {
    const stats = {
        totalUsers: account_cache.size,
        markets: { usdm: 0, spot: 0, coinm: 0 },
        details: [],
    };

    for (const [api_key, user_cache] of account_cache.entries()) {
        for (const marketType of ["usdm", "spot", "coinm"]) {
            if (user_cache[marketType] && user_cache[marketType].data) {
                stats.markets[marketType]++;
                stats.details.push({
                    api_key_prefix: api_key.substring(0, 8) + "...",
                    market: marketType,
                    timestamp: user_cache[marketType].timestamp,
                    age: Date.now() - user_cache[marketType].timestamp,
                });
            }
        }
    }

    return stats;
};

module.exports = {
    get,
    set,
    isExpired,
    getTimestamp,
    updateFromWebSocket,
    clear,
    clearMarket,
    getStats,
    DEFAULT_CACHE_TTL_MS,
    HTTP_ONLY_CACHE_TTL_MS,
};
