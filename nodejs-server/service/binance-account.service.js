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
 * @param {string} api_key - 用户API Key
 * @param {string} secret_key - 用户API Secret
 * @returns {MainClient|USDMClient|CoinMClient} 币安客户端实例
 */
const createClient = (marketType, api_key, secret_key) => {
  const ClientClass = CLIENT_MAP[marketType];
  if (!ClientClass) {
    throw new Error(`不支持的市场类型: ${marketType}`);
  }

  // 记录客户端创建日志
  UtilRecord.debug(`创建${marketType}客户端`, `api_key: ${api_key ? api_key.substring(0, 8) + '...' : 'undefined'}`);

  const options = {
    api_key: api_key,
    api_secret: secret_key,
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

/**
 * 创建现货客户端
 * @param {string} api_key - 用户API Key
 * @param {string} secret_key - 用户API Secret
 * @returns {MainClient} 现货客户端实例
 */
const createSpotClient = (api_key, secret_key) => /** @type {MainClient} */ (createClient('spot', api_key, secret_key));

/**
 * 创建U本位合约客户端
 * @param {string} api_key - 用户API Key
 * @param {string} secret_key - 用户API Secret
 * @returns {USDMClient} U本位合约客户端实例
 */
const createUSDMClient = (api_key, secret_key) => /** @type {USDMClient} */ (createClient('usdm', api_key, secret_key));

/**
 * 创建币本位合约客户端
 * @param {string} api_key - 用户API Key
 * @param {string} secret_key - 用户API Secret
 * @returns {CoinMClient} 币本位合约客户端实例
 */
const createCoinMClient = (api_key, secret_key) => /** @type {CoinMClient} */ (createClient('coinm', api_key, secret_key));

/**
 * 通用账户信息获取函数（内部使用）
 * 单用户系统：通过 api_key 实现数据隔离和缓存
 * 统一处理缓存逻辑，减少重复代码
 * 使用三层缓存策略: 内存缓存(20秒) -> 数据库缓存(20秒) -> API调用
 * @param {string} marketType - 市场类型：spot | usdm | coinm
 * @param {string} api_key - 用户API Key（用于数据隔离）
 * @param {string} secret_key - 用户API Secret
 * @param {Object} filterOptions - 过滤选项
 * @param {boolean} filterOptions.includePositions - 是否包含持仓信息（usdm/coinm）
 * @param {boolean} filterOptions.includeEmptyBalances - 是否包含空余额币种（spot）
 * @returns {Promise<Object>} 账户信息
 */
const getAccountInfo = async (marketType, api_key, secret_key, filterOptions = {}) => {
  const modelName = DB_MODEL_MAP[marketType];
  const marketLabel = { spot: '现货', usdm: 'U本位合约', coinm: '币本位合约' }[marketType];

  try {
    // 1. 先查询数据库缓存（通过 api_key）
    if (api_key && db[modelName]) {
      const cached = await db[modelName].findOne({ where: { api_key: api_key } });
      if (cached) {
        const updated_at = new Date(cached.updated_at).getTime();
        // 缓存未过期，直接返回
        if (Date.now() - updated_at < CACHE_TTL_MS) {
          const account_info = JSON.parse(cached.account_json);
          UtilRecord.debug(`[账户服务] 数据库缓存命中: ${marketLabel} (api_key: ${api_key.substring(0, 8)}...)`);
          return applyAccountFilter(account_info, marketType, filterOptions);
        }
      }
    }

    // 2. 缓存过期或不存在，使用限流管理器调用API
    const client = createClient(marketType, api_key, secret_key);

    const account_info = await rateLimiter.execute(
      () => client.getAccountInformation(),
      {
        api_key,
        method: `getAccountInformation_${marketType}`,
        params: {},
        useCache: true,
        retries: 3
      }
    );

    // 3. 更新数据库缓存（通过 api_key）
    if (api_key && db[modelName]) {
      await db[modelName].upsert({
        api_key: api_key,
        account_json: JSON.stringify(account_info)
      });
      UtilRecord.debug(`[账户服务] 已更新数据库缓存: ${marketLabel} (api_key: ${api_key.substring(0, 8)}...)`);
    }

    return applyAccountFilter(account_info, marketType, filterOptions);
  } catch (error) {
    UtilRecord.log(`获取${marketLabel}账户信息失败:`, error);
    throw error;
  }
};

/**
 * 应用账户数据过滤（内部使用）
 * @param {Object} account_info - 原始账户信息
 * @param {string} marketType - 市场类型
 * @param {Object} filterOptions - 过滤选项
 * @returns {Object} 过滤后的账户信息
 */
const applyAccountFilter = (account_info, marketType, filterOptions) => {
  const { includePositions = true, includeEmptyBalances = true } = filterOptions;

  if (marketType === 'spot') {
    // 现货：过滤空余额币种
    if (!includeEmptyBalances && account_info.balances?.length) {
      account_info.balances = account_info.balances.filter(balance => {
        return parseFloat(balance.free) !== 0 || parseFloat(balance.locked);
      });
    }
  } else {
    // 合约：移除持仓信息
    if (!includePositions && account_info.positions) {
      delete account_info.positions;
    }
  }

  return account_info;
};

/**
 * 获取U本位合约账户信息
 * 单用户系统：通过 api_key 实现数据隔离
 * @param {string} api_key - 用户API Key（用于数据隔离）
 * @param {string} secret_key - 用户API Secret
 * @param {boolean} includePositions - 是否包含持仓信息，默认true
 * @returns {Promise<Object>} U本位合约账户信息
 */
const getUSDMFuturesAccount = async (api_key, secret_key, includePositions = true) => {
  return getAccountInfo('usdm', api_key, secret_key, { includePositions });
};

/**
 * 获取现货账户信息
 * 单用户系统：通过 api_key 实现数据隔离
 * @param {string} api_key - 用户API Key（用于数据隔离）
 * @param {string} secret_key - 用户API Secret
 * @param {boolean} includeEmptyBalances - 是否包含空余额币种，默认true
 * @returns {Promise<Object>} 现货账户信息
 */
const getSpotAccount = async (api_key, secret_key, includeEmptyBalances = true) => {
  return getAccountInfo('spot', api_key, secret_key, { includeEmptyBalances });
};

/**
 * 获取币本位合约账户信息
 * 单用户系统：通过 api_key 实现数据隔离
 * @param {string} api_key - 用户API Key（用于数据隔离）
 * @param {string} secret_key - 用户API Secret
 * @param {boolean} includePositions - 是否包含持仓信息，默认true
 * @returns {Promise<Object>} 币本位合约账户信息
 */
const getCoinMFuturesAccount = async (api_key, secret_key, includePositions = true) => {
  return getAccountInfo('coinm', api_key, secret_key, { includePositions, includeEmptyBalances: false });
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
    /** @type {any[]} */
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
 * @param {string} api_key - 用户API Key
 * @param {string} secret_key - 用户API Secret
 * @param {Array} leverageList - 杠杆设置数组，格式为 [{symbol: 'BTCUSDT', leverage: 20}, {symbol: 'ETHUSDT', leverage: 10}]
 * @param {number} delay - 每次请求之间的延迟（毫秒），默认100ms，防止触发API频率限制
 * @returns {Promise<Array>} 返回每个交易对设置结果的数组
 */
const batchSetLeverage = async (api_key, secret_key, leverageList, delay = 100) => {
  // 创建U本位合约客户端
  const client = createUSDMClient(api_key, secret_key);
  const results = [];

  // 遍历所有需要设置的交易对
  for (let i = 0; i < leverageList.length; i++) {
    const { symbol, leverage: requestedLeverage } = leverageList[i];
    let actual_leverage = requestedLeverage;
    let adjusted = false; // 是否已自动调整杠杆倍数

    try {
      // 先获取交易对的最大支持杠杆倍数
      const maxLeverage = await getMaxLeverage(/** @type {import('binance').USDMClient} */ (client), symbol);

      // 如果获取到最大杠杆倍数，且用户设置的倍数超过最大值，则自动调整为最大值
      if (maxLeverage && requestedLeverage > maxLeverage) {
        actual_leverage = maxLeverage;
        adjusted = true;
      }

      // 调用 binance 包的 setLeverage 方法
      const result = await (/** @type {import('binance').USDMClient} */ (client)).setLeverage({
        symbol: symbol,
        leverage: actual_leverage
      });

      results.push({
        symbol,
        leverage: actual_leverage,
        requestedLeverage: adjusted ? requestedLeverage : undefined,
        adjusted,
        success: true,
        result: result,
        message: adjusted
          ? `成功设置 ${symbol} 杠杆为 ${actual_leverage}x（已从 ${requestedLeverage}x 自动调整为最大支持倍数）`
          : `成功设置 ${symbol} 杠杆为 ${actual_leverage}x`
      });

      UtilRecord.log(`[杠杆设置] ${symbol}: ${actual_leverage}x - 成功${adjusted ? ` (已从 ${requestedLeverage}x 调整为最大支持倍数)` : ''}`);
    } catch (error) {
      UtilRecord.log(`[杠杆设置] ${symbol}: ${actual_leverage}x - 失败`, error);

      // -4300: 新账户30天内最高20倍杠杆限制，自动降级重试
      if (error?.code === -4300 && actual_leverage > 20) {
        try {
          const result = await (/** @type {import('binance').USDMClient} */ (client)).setLeverage({ symbol, leverage: 20 });
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
 * @param {string} api_key
 * @returns {Promise<string>}
 */
const generateListenKey = async (api_key) => {
  try {
    // 创建客户端实例 (不需要 secret_key 也能生成 listen_key，但为了统一这里传入)
    // 注意：getFuturesUserDataListenKey 不需要参数
    const client = createUSDMClient(api_key, '');
    const response = await client.getFuturesUserDataListenKey();

    if (response && response.listenKey) {
      return response.listenKey;
    }
    throw new Error('响应中未包含 listen_key');
  } catch (error) {
    UtilRecord.log("生成 ListenKey 失败:", error);
    throw error;
  }
};

/**
 * 延长 ListenKey 有效期 (U本位合约)
 * @param {string} api_key
 * @returns {Promise<boolean>}
 */
const keepAliveListenKey = async (api_key) => {
  try {
    const client = createUSDMClient(api_key, '');
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