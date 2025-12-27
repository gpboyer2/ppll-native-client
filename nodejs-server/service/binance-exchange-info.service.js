/**
 * 币安交易所信息服务
 * 提供币安交易所信息相关的业务逻辑处理，包括交易对信息和市场数据管理
 */
const db = require("../models");
const BinanceExchangeInfo = db.binance_exchange_info;
const {
  MainClient,
  USDMClient,
  CoinMClient,
  WebsocketClient,
  DefaultLogger,
} = require("binance");
const proxy = require("../utils/proxy.js");
const { BINANCE_CONFIG: config } = proxy;
const request = require("../middleware/request.js");
const ApiError = require("../utils/api-error");

const BinanceTools = require("../binance/tools.js");

/**
 * 创建币安USDM合约客户端
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {USDMClient} 币安USDM合约客户端实例
 */
const createUsdmClient = (apiKey, apiSecret) => {
  const options = {
    api_key: apiKey,
    api_secret: apiSecret,
    baseUrl: config.baseUrl,
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

  return new USDMClient(options, requestOptions);
};

/**
 * 从币安API获取交易所信息
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {Promise<Object>} 交易所信息
 */
const fetchExchangeInfo = async (apiKey, apiSecret) => {
  try {
    const client = createUsdmClient(apiKey, apiSecret);
    return await client.getExchangeInfo();
  } catch (error) {
    console.error("使用官方API获取交易所信息失败，尝试备用方案:", error);
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息

    // 备用方案：使用自定义request调用REST API
    try {
      const requestOptions = {
        url: `${config.baseUrl}/fapi/v1/exchangeInfo`,
        timeout: 5000,
        json: true,
      };

      // 从环境变量读取代理配置
      proxy.applyProxyToRequestOptions(requestOptions);

      return await new Promise((resolve, reject) => {
        request(requestOptions, (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        });
      });
    } catch (fallbackError) {
      console.error("备用方案获取交易所信息也失败:", fallbackError);
      throw new Error("获取币安交易所信息失败");
    }
  }
};

/**
 * 检查数据是否需要更新
 * @returns {Promise<boolean>} true表示需要更新
 */
const needsUpdate = async () => {
  const latestRecord = await BinanceExchangeInfo.findOne({
    order: [["updated_at", "DESC"]],
  });

  if (!latestRecord) return true;

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  return latestRecord.updated_at < oneDayAgo;
};

/**
 * 获取最新交易所信息
 * @returns {Promise<Object|null>} 最新交易所信息
 */
const getLatestExchangeInfo = async () => {
  const record = await BinanceExchangeInfo.findOne({
    order: [["updated_at", "DESC"]],
  });

  return record ? ensureJsonObject(record.exchange_info) : null;
};

/**
 * 更新交易所信息
 * @param {Object} exchangeInfo - 交易所信息
 * @returns {Promise<Object>} 创建的记录
 */
const updateExchangeInfo = async (exchangeInfo) => {
  return await BinanceExchangeInfo.create({
    exchange_info: ensureJsonString(exchangeInfo),
  });
};

/**
 * 强制更新交易所信息
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {Promise<Object>} 更新后的交易所信息
 */
const forceUpdateExchangeInfo = async (apiKey, apiSecret) => {
  const exchangeInfo = await fetchExchangeInfo(apiKey, apiSecret);
  const record = await updateExchangeInfo(exchangeInfo);
  return ensureJsonObject(record.exchange_info);
};

/**
 * 获取交易所信息状态
 * @returns {Promise<Object>} 包含isUpToDate和lastUpdated的状态对象
 */
const getExchangeInfoStatus = async () => {
  const latestRecord = await BinanceExchangeInfo.findOne({
    order: [["updated_at", "DESC"]],
  });

  if (!latestRecord) {
    return {
      isUpToDate: false,
      lastUpdated: null,
      message: "无可用数据",
    };
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const isUpToDate = latestRecord.updated_at > oneDayAgo;

  return {
    isUpToDate,
    lastUpdated: latestRecord.updated_at,
    message: isUpToDate ? "数据是最新的" : "数据需要更新",
  };
};

/**
 * 确保输入数据转换为有效的JSON字符串格式, 该函数会检查输入数据的类型，并进行相应处理：
 * - 如果是字符串，尝试解析为JSON，成功则返回原字符串，失败则序列化为JSON字符串
 * - 如果不是字符串，直接序列化为JSON字符串
 *
 * @param {*} data - 需要处理的输入数据，可以是任何JavaScript支持的类型
 * @returns {string} 返回处理后的JSON格式字符串
 */
function ensureJsonString(data) {
  if (typeof data === "string") {
    try {
      JSON.parse(data); // 验证是否为有效JSON字符串
      return data;
    } catch (e) {
      return JSON.stringify(data);
    }
  }
  return JSON.stringify(data);
}

/**
 * 确保输入的数据是一个有效的JSON对象。
 *
 * @param {any} data - 需要验证的数据。
 * @returns {Promise<any>} - 如果数据是有效的JSON对象，则返回该对象；
 *                         如果数据不是有效的JSON对象或无法解析为JSON对象，则返回null。
 * @throws 不会抛出异常。
 */
function ensureJsonObject(data) {
  if (!data) return null;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("JSON解析失败:", e);
    return null;
  }
}

/**
 * 从币安API获取标记价格和资金费率数据
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {Promise<Array>} 标记价格和资金费率数据数组
 */
const fetchPremiumIndex = async (apiKey, apiSecret) => {
  try {
    // 使用自定义request调用REST API
    const requestOptions = {
      url: `${config.baseUrl}/fapi/v1/premiumIndex`,
      timeout: 5000,
      json: true,
    };

    // 从环境变量读取代理配置
    proxy.applyProxyToRequestOptions(requestOptions);

    return await new Promise((resolve, reject) => {
      request(requestOptions, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${body}`));
        } else {
          resolve(body);
        }
      });
    });
  } catch (error) {
    console.error("获取标记价格和资金费率失败:", error);
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw new Error("获取标记价格和资金费率失败");
  }
};

/**
 * 从币安API获取保证金交易下架计划
 * @param {string} apiKey - 用户API Key
 * @param {string} apiSecret - 用户API Secret
 * @returns {Promise<Array>} 下架计划数组
 */
const fetchDelistSchedule = async (apiKey, apiSecret) => {
  try {
    const timestamp = Date.now();
    const params = {
      timestamp,
      recvWindow: 10000
    };

    // 使用BinanceTools生成签名参数
    const signedParams = BinanceTools.getParams(params, apiSecret);
    const headers = BinanceTools.getHeaders(apiKey);

    const baseUrl = config.baseUrl.replace('/fapi', '');
    const requestOptions = {
      url: `${baseUrl}/sapi/v1/margin/delist-schedule`,
      method: 'GET',
      headers,
      qs: signedParams,
      timeout: 10000,
      json: true,
    };

    // 从环境变量读取代理配置
    proxy.applyProxyToRequestOptions(requestOptions);

    return await new Promise((resolve, reject) => {
      request(requestOptions, (error, response, body) => {
        if (error) {
          console.warn("获取下架计划失败:", error?.message || error);
          resolve([]); // 失败时返回空数组
        } else if (response.statusCode !== 200) {
          console.warn(`下架计划API返回错误: HTTP ${response.statusCode}:`, body);
          resolve([]); // 失败时返回空数组
        } else {
          console.log("成功获取下架计划:", Array.isArray(body) ? `${body.length}条记录` : typeof body);
          resolve(Array.isArray(body) ? body : []);
        }
      });
    });
  } catch (error) {
    console.error("获取下架计划异常:", error);
    // 如果获取下架计划失败，返回空数组而不是抛出错误
    return [];
  }
};

/**
 * 验证时间戳是否合理（在合理的时间范围内）
 * @param {number} timestamp - 时间戳
 * @returns {boolean} 是否合理
 */
const isValidTimestamp = (timestamp) => {
  const now = Date.now();
  const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);

  return timestamp > oneYearAgo && timestamp < oneYearFromNow;
};

/**
 * 筛选即将下架的永续合约
 * @param {Object} exchangeInfo - 交易所信息对象
 * @param {Array} delistSchedule - 下架计划数组
 * @param {number} daysAhead - 提前多少天预警，默认30天
 * @returns {Array} 即将下架的永续合约数组
 */
const getDelistingPerpetualContracts = (exchangeInfo, delistSchedule = [], daysAhead = 30) => {
  if (!exchangeInfo || !exchangeInfo.symbols) {
    return [];
  }

  const currentTime = Date.now();
  const alertTime = currentTime + (daysAhead * 24 * 60 * 60 * 1000);

  // 创建下架时间映射表
  const delistMap = new Map();
  delistSchedule.forEach(item => {
    if (item.delistTime) {
      delistMap.set(item.symbol, item.delistTime);
    }
  });

  return exchangeInfo.symbols.filter(symbol => {
    // 筛选永续合约
    const isPerpetual = symbol.contractType === 'PERPETUAL';
    if (!isPerpetual) return false;

    // 优先使用下架计划中的时间
    let delistTime = delistMap.get(symbol.symbol);

    // 如果下架计划中没有，再检查exchangeInfo中的deliveryDate
    if (!delistTime && symbol.deliveryDate && symbol.deliveryDate > 0) {
      // 验证deliveryDate是否在合理范围内
      if (isValidTimestamp(symbol.deliveryDate)) {
        delistTime = symbol.deliveryDate;
      }
    }

    if (!delistTime) return false;

    // 检查是否在预警时间范围内且未过期
    const isInAlertRange = delistTime <= alertTime && delistTime > currentTime;
    // 确保合约当前处于交易状态
    const isTrading = symbol.status === 'TRADING';

    return isInAlertRange && isTrading;
  }).map(symbol => {
    const delistTime = delistMap.get(symbol.symbol) || symbol.deliveryDate;
    return {
      symbol: symbol.symbol,
      pair: symbol.pair,
      deliveryDate: delistTime,
      deliveryDateFormatted: new Date(delistTime).toISOString(),
      status: symbol.status,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
      onboardDate: symbol.onboardDate,
      onboardDateFormatted: new Date(symbol.onboardDate).toISOString(),
      daysUntilDelisting: Math.ceil((delistTime - currentTime) / (24 * 60 * 60 * 1000)),
      delistSource: delistMap.has(symbol.symbol) ? 'delist-schedule' : 'exchange-info'
    };
  });
};

/**
 * 获取即将下架的永续合约信息
 * @param {string} apiKey - 用户API Key  
 * @param {string} apiSecret - 用户API Secret
 * @param {number} daysAhead - 提前多少天预警，默认30天
 * @returns {Promise<Array>} 即将下架的永续合约数组
 */
const getDelistingPerpetualContractsInfo = async (apiKey, apiSecret, daysAhead = 30) => {
  // 并行获取交易所信息和下架计划
  const [latestInfo, delistSchedule] = await Promise.all([
    (async () => {
      // 先检查是否需要更新数据
      if (await needsUpdate()) {
        const exchangeInfo = await fetchExchangeInfo(apiKey, apiSecret);
        await updateExchangeInfo(exchangeInfo);
      }
      return await getLatestExchangeInfo();
    })(),
    fetchDelistSchedule(apiKey, apiSecret)
  ]);

  if (!latestInfo) {
    throw new Error('未找到交易所信息');
  }

  // 筛选即将下架的永续合约
  return getDelistingPerpetualContracts(latestInfo, delistSchedule, daysAhead);
};

module.exports = {
  fetchExchangeInfo,
  needsUpdate,
  getLatestExchangeInfo,
  updateExchangeInfo,
  forceUpdateExchangeInfo,
  getExchangeInfoStatus,
  fetchPremiumIndex,
  fetchDelistSchedule,
  getDelistingPerpetualContracts,
  getDelistingPerpetualContractsInfo,
};
