/**
 * 币安账户信息服务
 * 提供获取币安各类账户信息的业务逻辑处理，包括U本位合约、现货、币本位合约账户
 */
const { MainClient, USDMClient, CoinMClient } = require("binance");
const proxy = require("../utils/proxy.js");
const { BINANCE_CONFIG: config } = proxy;
const path = require("path");
const { readJsonSafe, writeJsonSafe } = require("../utils/file.js");
const UtilRecord = require('../utils/record-log.js');
const rateLimiter = require('../utils/binance-rate-limiter.js');
const db = require('../models');

// 缓存有效期（毫秒）
const CACHE_TTL_MS = 20 * 1000;

// 市场类型与客户端类的映射
const CLIENT_MAP = {
  spot: MainClient,
  usdm: USDMClient,
  coinm: CoinMClient
};

// 市场类型与数据库模型的映射
const DB_MODEL_MAP = {
  spot: 'spot_account',
  usdm: 'usd_m_futures_account',
  coinm: 'coin_m_futures_account'
};

/**
 * 创建币安客户端（通用工厂函数）
 * binance v3.1.3 已内置正确端点，无需手动设置 baseUrl
 * @param {string} marketType - 市场类型：spot | usdm | coinm
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {MainClient|USDMClient|CoinMClient} 币安客户端实例
 */
const createClient = (marketType, apiKey, apiSecret) => {
  const ClientClass = CLIENT_MAP[marketType];
  if (!ClientClass) {
    throw new Error(`不支持的市场类型: ${marketType}`);
  }

  // 记录客户端创建日志
  UtilRecord.debug(`创建${marketType}客户端`, `apiKey: ${apiKey ? apiKey.substring(0, 8) + '...' : 'undefined'}`);

  const options = {
    api_key: apiKey,
    api_secret: apiSecret,
    beautify: true,
  };

  const requestOptions = {
    timeout: 10000,
  };

  // 从环境变量读取代理配置
  const proxyConfig = proxy.getProxyConfig();
  if (proxyConfig) {
    requestOptions.proxy = proxyConfig;
  }

  return new ClientClass(options, requestOptions);
};

// 保留原有函数名以兼容现有调用
const createSpotClient = (apiKey, apiSecret) => createClient('spot', apiKey, apiSecret);
const createUSDMClient = (apiKey, apiSecret) => createClient('usdm', apiKey, apiSecret);
const createCoinMClient = (apiKey, apiSecret) => createClient('coinm', apiKey, apiSecret);

/**
 * 通用账户信息获取函数（内部使用）
 * 统一处理缓存逻辑，减少重复代码
 * 使用三层缓存策略: 内存缓存(20秒) -> 数据库缓存(20秒) -> API调用
 * @param {string} marketType - 市场类型：spot | usdm | coinm
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @param {number} userId - 用户ID，用于数据库缓存
 * @param {Object} filterOptions - 过滤选项
 * @param {boolean} filterOptions.includePositions - 是否包含持仓信息（usdm/coinm）
 * @param {boolean} filterOptions.includeEmptyBalances - 是否包含空余额币种（spot）
 * @returns {Promise<Object>} 账户信息
 */
const getAccountInfo = async (marketType, apiKey, apiSecret, userId, filterOptions = {}) => {
  const modelName = DB_MODEL_MAP[marketType];
  const marketLabel = { spot: '现货', usdm: 'U本位合约', coinm: '币本位合约' }[marketType];

  try {
    // 1. 先查询数据库缓存
    if (userId && db[modelName]) {
      const cached = await db[modelName].findOne({ where: { user_id: userId } });
      if (cached) {
        const updated_at = new Date(cached.updated_at).getTime();
        // 缓存未过期，直接返回
        if (Date.now() - updated_at < CACHE_TTL_MS) {
          const accountInfo = JSON.parse(cached.account_json);
          UtilRecord.debug(`[账户服务] 数据库缓存命中: ${marketLabel} (userId: ${userId})`);
          return applyAccountFilter(accountInfo, marketType, filterOptions);
        }
      }
    }

    // 2. 缓存过期或不存在，使用限流管理器调用API
    const client = createClient(marketType, apiKey, apiSecret);

    const accountInfo = await rateLimiter.execute(
      () => client.getAccountInformation(),
      {
        apiKey,
        method: `getAccountInformation_${marketType}`,
        params: {},
        useCache: true,
        retries: 3
      }
    );

    // 3. 更新数据库缓存
    if (userId && db[modelName]) {
      await db[modelName].upsert({
        user_id: userId,
        account_json: JSON.stringify(accountInfo)
      });
      UtilRecord.debug(`[账户服务] 已更新数据库缓存: ${marketLabel} (userId: ${userId})`);
    }

    return applyAccountFilter(accountInfo, marketType, filterOptions);
  } catch (error) {
    UtilRecord.log(`获取${marketLabel}账户信息失败:`, error);
    throw error;
  }
};

/**
 * 应用账户数据过滤（内部使用）
 * @param {Object} accountInfo - 原始账户信息
 * @param {string} marketType - 市场类型
 * @param {Object} filterOptions - 过滤选项
 * @returns {Object} 过滤后的账户信息
 */
const applyAccountFilter = (accountInfo, marketType, filterOptions) => {
  const { includePositions = true, includeEmptyBalances = true } = filterOptions;

  if (marketType === 'spot') {
    // 现货：过滤空余额币种
    if (!includeEmptyBalances && accountInfo.balances?.length) {
      accountInfo.balances = accountInfo.balances.filter(balance => {
        return parseFloat(balance.free) !== 0 || parseFloat(balance.locked);
      });
    }
  } else {
    // 合约：移除持仓信息
    if (!includePositions && accountInfo.positions) {
      delete accountInfo.positions;
    }
  }

  return accountInfo;
};

/**
 * 获取U本位合约账户信息
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @param {number} userId - 用户ID，用于数据库缓存
 * @param {boolean} includePositions - 是否包含持仓信息，默认true
 * @returns {Promise<Object>} U本位合约账户信息
 */
const getUSDMFuturesAccount = async (apiKey, apiSecret, userId, includePositions = true) => {
  return getAccountInfo('usdm', apiKey, apiSecret, userId, { includePositions });
};

/**
 * 获取现货账户信息
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @param {number} userId - 用户ID，用于数据库缓存
 * @param {boolean} includeEmptyBalances - 是否包含空余额币种，默认true
 * @returns {Promise<Object>} 现货账户信息
 */
const getSpotAccount = async (apiKey, apiSecret, userId, includeEmptyBalances = true) => {
  return getAccountInfo('spot', apiKey, apiSecret, userId, { includeEmptyBalances });
};

/**
 * 获取币本位合约账户信息
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @param {number} userId - 用户ID，用于数据库缓存
 * @param {boolean} includePositions - 是否包含持仓信息，默认true
 * @returns {Promise<Object>} 币本位合约账户信息
 */
const getCoinMFuturesAccount = async (apiKey, apiSecret, userId, includePositions = true) => {
  return getAccountInfo('coinm', apiKey, apiSecret, userId, { includePositions });
};

/**
 * 获取交易对的最大支持杠杆倍数
 * @param {USDMClient} client - 币安U本位合约客户端
 * @param {string} symbol - 交易对符号
 * @returns {Promise<number|null>} 最大杠杆倍数，如果获取失败返回null
 */
const getMaxLeverage = async (client, symbol) => {
  // 本地每日缓存文件路径，如：datum/binance/um/leverage/2025-11-11.json
  const getTodayString = () => {
    // 使用本地时间生成日期字符串，格式 YYYY-MM-DD
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getCacheFilePath = () => {
    const dateStr = getTodayString();
    return path.join(
      __dirname,
      "..",
      "datum",
      "binance",
      "um",
      "leverage",
      `${dateStr}.json`
    );
  };

  // 1) 优先从本地当日缓存读取
  const cacheFile = getCacheFilePath();
  let cache = readJsonSafe(cacheFile, {});
  if (cache && typeof cache[symbol] === "number") {
    return cache[symbol];
  }

  // 2) 本地没有则调用接口获取，并回填缓存
  try {
    const response = await client.getNotionalAndLeverageBrackets({ symbol });

    // 处理不同的响应格式
    let brackets = null;
    if (Array.isArray(response)) {
      brackets = response;
    } else if (response && Array.isArray(response.brackets)) {
      brackets = response.brackets;
    } else if (response && response.length > 0 && response[0] && Array.isArray(response[0].brackets)) {
      brackets = response[0].brackets;
    }

    if (brackets && brackets.length > 0) {
      // 获取第一个bracket的杠杆倍数，是最大值
      const maxBracket = brackets[0]?.brackets?.[0];
      if (maxBracket?.initialLeverage && typeof maxBracket.initialLeverage === "number") {
        const leverage = maxBracket.initialLeverage;

        // 合并写回当日缓存
        cache = readJsonSafe(cacheFile, {});
        if (!cache || typeof cache !== "object" || Array.isArray(cache)) {
          cache = {};
        }
        // 写入当前symbol的最大杠杆
        cache[symbol] = leverage;
        writeJsonSafe(cacheFile, cache);
        return leverage;
      }
    }
  } catch (error) {
    UtilRecord.log(`获取 ${symbol} 的最大杠杆倍数失败:`, error?.message || JSON.stringify(error));
  }

  // 3) 接口失败或解析失败时回退
  return null;
};

/**
 * 批量设置U本位合约杠杆倍数
 * 使用 binance npm 包提供的 setLeverage 方法批量调整杠杆
 * 如果设置的倍数超过交易对的最大支持倍数，会自动调整为最大支持倍数
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @param {Array} leverageList - 杠杆设置数组，格式为 [{symbol: 'BTCUSDT', leverage: 20}, {symbol: 'ETHUSDT', leverage: 10}]
 * @param {number} delay - 每次请求之间的延迟（毫秒），默认100ms，防止触发API频率限制
 * @returns {Promise<Array>} 返回每个交易对设置结果的数组
 */
const batchSetLeverage = async (apiKey, apiSecret, leverageList, delay = 100) => {
  // 创建U本位合约客户端
  const client = createUSDMClient(apiKey, apiSecret);
  const results = [];

  // 遍历所有需要设置的交易对
  for (let i = 0; i < leverageList.length; i++) {
    const { symbol, leverage: requestedLeverage } = leverageList[i];
    let actualLeverage = requestedLeverage;
    let adjusted = false; // 是否已自动调整杠杆倍数

    try {
      // 先获取交易对的最大支持杠杆倍数
      const maxLeverage = await getMaxLeverage(client, symbol);

      // 如果获取到最大杠杆倍数，且用户设置的倍数超过最大值，则自动调整为最大值
      if (maxLeverage && requestedLeverage > maxLeverage) {
        actualLeverage = maxLeverage;
        adjusted = true;
      }

      // 调用 binance 包的 setLeverage 方法
      const result = await client.setLeverage({
        symbol: symbol,
        leverage: actualLeverage
      });

      results.push({
        symbol,
        leverage: actualLeverage,
        requestedLeverage: adjusted ? requestedLeverage : undefined,
        adjusted,
        success: true,
        result: result,
        message: adjusted
          ? `成功设置 ${symbol} 杠杆为 ${actualLeverage}x（已从 ${requestedLeverage}x 自动调整为最大支持倍数）`
          : `成功设置 ${symbol} 杠杆为 ${actualLeverage}x`
      });

      UtilRecord.log(`[杠杆设置] ${symbol}: ${actualLeverage}x - 成功${adjusted ? ` (已从 ${requestedLeverage}x 调整为最大支持倍数)` : ''}`);
    } catch (error) {
      UtilRecord.log(`[杠杆设置] ${symbol}: ${actualLeverage}x - 失败`, error);

      // -4300: 新账户30天内最高20倍杠杆限制，自动降级重试
      if (error?.code === -4300 && actualLeverage > 20) {
        try {
          const result = await client.setLeverage({ symbol, leverage: 20 });
          results.push({
            symbol,
            leverage: 20,
            requestedLeverage,
            adjusted: true,
            success: true,
            result,
            message: `成功设置 ${symbol} 杠杆为 20x（新账户30天限制，已从 ${requestedLeverage}x 自动调整）`
          });
          UtilRecord.log(`[杠杆设置] ${symbol}: 20x - 成功 (新账户限制，已从 ${requestedLeverage}x 调整)`);
          continue;
        } catch (retryError) {
          UtilRecord.log(`[杠杆设置] ${symbol}: 20x - 重试失败`, retryError);
        }
      }

      results.push({
        symbol,
        leverage: requestedLeverage,
        success: false,
        error: error?.message || JSON.stringify(error),
        message: `设置 ${symbol} 杠杆失败: ${error?.message || JSON.stringify(error)}`
      });
    }

    // 添加延迟，防止触发API频率限制
    if (delay > 0 && i < leverageList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
};

/**
 * 生成 ListenKey (U本位合约)
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
const generateListenKey = async (apiKey) => {
  try {
    // 创建客户端实例 (不需要 apiSecret 也能生成 listenKey，但为了统一这里传入)
    // 注意：getFuturesUserDataListenKey 不需要参数
    const client = createUSDMClient(apiKey, '');
    const response = await client.getFuturesUserDataListenKey();

    if (response && response.listenKey) {
      return response.listenKey;
    }
    throw new Error('响应中未包含 listenKey');
  } catch (error) {
    UtilRecord.log("生成 ListenKey 失败:", error);
    throw error;
  }
};

/**
 * 延长 ListenKey 有效期 (U本位合约)
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
const keepAliveListenKey = async (apiKey) => {
  try {
    const client = createUSDMClient(apiKey, '');
    await client.keepAliveFuturesUserDataListenKey();
    return true;
  } catch (error) {
    UtilRecord.log("延长 ListenKey 失败:", error);
    throw error;
  }
};

module.exports = {
  getUSDMFuturesAccount,
  getSpotAccount,
  getCoinMFuturesAccount,
  batchSetLeverage,
  generateListenKey,
  keepAliveListenKey,
};