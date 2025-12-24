/**
 * 币安账户操作类
 * 提供币安账户信息查询、交易执行等功能
 */
const request = require("../middleware/request");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");

const BinanceTools = require("./tools");
const Config = require("./config");
const UtilRecord = require("../utils/record-log.js");
const bigNumber = require('bignumber.js');
const ApiError = require("../utils/ApiError");

const proxy = Config.proxy;

// 常量定义
const MIN_BALANCE_REQUIRED = 10; // 最小余额要求

// IP封禁状态缓存
// 当币安API返回 -1003 错误（请求过于频繁）时，保存封禁错误信息
// 在封禁期间，直接返回缓存的错误信息，避免继续发起真实请求触发封禁
let ipBanStatus = {
  isBanned: false,           // 是否被封禁
  bannedUntil: 0,            // 封禁截止时间戳（毫秒）
  cachedError: null,         // 缓存的错误信息对象
  bannedIP: ''               // 被封禁的IP地址
};

/**
 * 解析 -1003 错误信息，提取封禁时间戳和IP地址
 * @param {string|object} errorBody - 错误响应体
 * @returns {object|null} 返回 { bannedUntil, ip, message } 或 null
 */
function parseBanError(errorBody) {
  try {
    let errorObj = errorBody;
    if (typeof errorBody === 'string') {
      errorObj = JSON.parse(errorBody);
    }

    if (errorObj.code === -1003) {
      // 示例: "Way too many requests; IP(188.253.116.56) banned until 1762525051409. Please use the websocket for live updates to avoid bans."
      const msg = errorObj.msg || '';
      const ipMatch = msg.match(/IP\(([^)]+)\)/);
      const timeMatch = msg.match(/banned until (\d+)/);

      return {
        bannedUntil: timeMatch ? parseInt(timeMatch[1]) : 0,
        ip: ipMatch ? ipMatch[1] : '',
        message: msg
      };
    }
  } catch (e) {
    UtilRecord.log('[parseBanError] 解析错误信息失败:', e);
  }
  return null;
}

/**
 * 检查是否在封禁期间
 * @returns {boolean} true-在封禁期间，false-不在封禁期间
 */
function isInBanPeriod() {
  if (!ipBanStatus.isBanned) return false;

  const now = Date.now();
  if (now >= ipBanStatus.bannedUntil) {
    // 封禁期已过，重置状态
    UtilRecord.log(`[IP封禁] 封禁期已结束，恢复正常请求。封禁IP: ${ipBanStatus.bannedIP}`);
    ipBanStatus.isBanned = false;
    ipBanStatus.bannedUntil = 0;
    ipBanStatus.cachedError = null;
    ipBanStatus.bannedIP = '';
    return false;
  }

  return true;
}

/**
 * 获取账户信息
 * @param {number} params.recvWindow  与币安api服务端的最大差额时间
 * @param {number} params.timestamp   时间戳
 * @returns
 *
 */
async function getAccount(params) {
  var { recvWindow, timestamp, apiKey, apiSecret } = params;
  if (!recvWindow) recvWindow = 5000;
  if (!timestamp) timestamp = Date.now();

  // 检查是否在封禁期间
  if (isInBanPeriod()) {
    const remainingTime = Math.ceil((ipBanStatus.bannedUntil - Date.now()) / 1000);
    const remainingMinutes = Math.ceil(remainingTime / 60);

    UtilRecord.log(`[IP封禁] 当前IP(${ipBanStatus.bannedIP})被封禁，还剩 ${remainingMinutes} 分钟解封`);
    UtilRecord.log(`[IP封禁] 返回缓存的错误信息，避免继续发起请求`);

    // 返回缓存的错误信息（假装请求了，但返回的是缓存的错误）
    return Promise.reject(ipBanStatus.cachedError);
  }

  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v2/account",
      method: "GET",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
      qs: BinanceTools.getParams({ recvWindow, timestamp }, apiSecret),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // 请求成功
        resolve(body);
      } else {
        // 检查是否是 -1003 错误
        const banInfo = parseBanError(body || error);
        if (banInfo && banInfo.bannedUntil > 0) {
          // 触发了IP封禁，缓存错误信息
          ipBanStatus.isBanned = true;
          ipBanStatus.bannedUntil = banInfo.bannedUntil;
          ipBanStatus.bannedIP = banInfo.ip;
          ipBanStatus.cachedError = body || error; // 缓存原始错误信息

          const banDate = new Date(banInfo.bannedUntil);

          UtilRecord.log(`[IP封禁] 解封时间: ${banDate.toLocaleString()}`);
          UtilRecord.log(`[IP封禁] 错误信息: ${banInfo.message}`);
        }

        // 返回错误
        UtilRecord.log(error, body);
        reject(body || error);
      }
    });
  });
}

// 交易所信息缓存
let exchangeInfoCache = {
  data: null,
  timestamp: 0,
  expireTime: 24 * 60 * 60 * 1000 // 24小时过期
};

/**
 * 获取交易规则和交易对信息（带缓存）
 * 缓存24小时，避免频繁请求
 */
async function getExchangeInfo() {
  const now = Date.now();

  // 检查缓存是否有效
  if (exchangeInfoCache.data && (now - exchangeInfoCache.timestamp) < exchangeInfoCache.expireTime) {
    UtilRecord.log('使用 exchangeInfo 缓存数据');
    return Promise.resolve(exchangeInfoCache.data);
  }

  UtilRecord.log('获取新的 exchangeInfo 数据...');
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/exchangeInfo",
      method: "GET",
      proxy,
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // 更新缓存
        exchangeInfoCache.data = body;
        exchangeInfoCache.timestamp = now;
        UtilRecord.log('exchangeInfo 数据已更新并缓存');
        resolve(body);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 返回合约交易对及其最新价格
 * @param {string} symbol 币种
 * @returns
 *
 */
async function getTickerPrice(symbol) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v2/ticker/price",
      method: "GET",
      proxy,
    };
    if (symbol) options.url += `?symbol=${symbol}`;

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 当前币安用户的账户信息，包括API速率限制，杠杠倍数，最新标记价格和资金费率等等
 * @param {string} symbol 币种
 * @returns
 */
async function getPremiumIndex(symbol) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/premiumIndex",
      method: "GET",
      proxy,
    };
    if (symbol) options.url += `?symbol=${symbol}`;

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * Setp 1
 * 指定币种下单
 *
 * @param {object} params
 * @param {string} params.symbol        币种
 * @param {number} params.quantity      数量
 * @param {number} params.price         价格
 * @param {string} params.side          买卖方向
 * @param {string} params.positionSide  持仓方向
 * @param {string} params.type          订单类型
 * @param {number} params.timeInForce   有效时间
 * @param {number} params.timestamp     时间戳
 *
 * @param {string} apiSecret
 *
 * @returns
 *
 */
async function order(params, apiKey, apiSecret) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/order",
      method: "POST",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
      form: BinanceTools.getParams(params, apiSecret),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        UtilRecord.log(`apiKey: `, apiKey);
        UtilRecord.log(`apiSecret: `, apiSecret);
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 查询订单
 *
 * @param {*object} params
 * @param {*string} params.symbol             币种
 * @param {*number} params.orderId            系统订单号
 * @param {number} params.origClientOrderId             用户自定义的订单号
 * @param {number} params.timestamp           时间戳
 * @param {string} apiKey
 * @param {string} apiSecret
 *
 * @returns
 *
 */
async function queryOrder(params, apiKey, apiSecret) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/order",
      method: "GET",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
      form: BinanceTools.getParams(params, apiSecret),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 查询订单 - 账户成交历史
 * TODO 没有调试成功/2024年12月29日
 * @param {string} params.symbol      交易对
 * @param {number} params.orderId     必须要和参数symbol一起使用
 * @param {number} params.startTime   起始时间
 * @param {number} params.endTime     结束时间
 * @param {number} params.fromId      返回该fromId及之后的成交，缺省返回最近的成交
 * @param {number} params.limit       返回的结果集数量 默认值:500 最大值:1000
 * @param {number} params.timestamp   时间戳
 * @param {string} apiKey
 * @param {string} apiSecret
 *
 * @returns
 *
 */
async function queryOrders(params, apiKey, apiSecret) {
  return new Promise((resolve, reject) => {
    var { timestamp } = params;
    if (!timestamp) timestamp = Date.now();
    var options = {
      url: Config.baseUrl + "/fapi/v1/userTrades",
      method: "GET",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
      form: BinanceTools.getParams(params, apiSecret),
      qs: BinanceTools.getParams(params, apiSecret),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 检查账户余额是否充足
 * @param {string} apiKey - API密钥
 * @param {string} apiSecret - API密钥Secret
 * @returns {Promise<Object>} 账户信息
 */
async function checkAccountBalance(apiKey, apiSecret) {
  try {
    const accountInfo = await getAccount({ apiKey, apiSecret });
    const parsedAccountInfo = JSON.parse(accountInfo);

    if (new bigNumber(parsedAccountInfo.availableBalance).isLessThan(MIN_BALANCE_REQUIRED)) {
      throw new Error(`当前合约账户余额${parsedAccountInfo.availableBalance}, 不足${MIN_BALANCE_REQUIRED}u, 请充值`);
    }

    return parsedAccountInfo;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw new Error(`获取账户信息失败: ${error.message}`);
  }
}

/**
 * 生成 ListenKey (用于 User Data Stream)
 * POST /fapi/v1/listenKey
 * @param {string} apiKey
 * @returns {Promise<string>} listenKey
 */
async function getListenKey(apiKey) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/listenKey",
      method: "POST",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          const data = JSON.parse(body);
          resolve(data.listenKey);
        } catch (e) {
          reject(e);
        }
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

/**
 * 延长 ListenKey 有效期
 * PUT /fapi/v1/listenKey
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
async function keepAliveListenKey(apiKey) {
  return new Promise((resolve, reject) => {
    var options = {
      url: Config.baseUrl + "/fapi/v1/listenKey",
      method: "PUT",
      proxy,
      headers: BinanceTools.getHeaders(apiKey),
    };

    if (process.env.NODE_ENV === "production") delete options.proxy;
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(true);
      } else {
        UtilRecord.log(error, body);
        reject(error || body);
      }
    });
  });
}

module.exports = {
  getAccount,
  getExchangeInfo,
  getTickerPrice,
  getPremiumIndex,
  order,
  queryOrder,
  queryOrders,
  checkAccountBalance,
  getListenKey,
  keepAliveListenKey,
};
