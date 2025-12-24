/**
 * 仪表盘服务层
 * 提供仪表盘相关的业务逻辑，包括账户信息查询等
 */
const { USDMClient } = require('binance');
const { proxy_obj } = require('../binance/config.js');
const UtilRecord = require("../utils/record-log.js");
const db = require('../models');


/**
 * 账户信息缓存配置
 * 结构: { [apiKey]: { data: accountInfo, timestamp: Date.now(), apiSecret: string } }
 */
const accountInfoCache = new Map();

/** 缓存有效期（毫秒） */
const CACHE_EXPIRY_TIME = 20 * 1000;


/**
 * 获取仪表盘概览数据
 * @returns {Object} 仪表盘数据
 */
const getDashboard = () => {
  return {
    message: 'You are here now...'
  };
};


/**
 * 获取合约账户详情
 * @param {string} apiKey - 币安API密钥
 * @param {string} apiSecret - 币安API密钥Secret
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 账户信息结果
 */
const getAccount = async (apiKey, apiSecret, userId) => {
  UtilRecord.log('😄 查询账户信息:');
  UtilRecord.log('apiKey:', apiKey);
  UtilRecord.log('apiSecret:', apiSecret);

  // 检查缓存
  const currentTime = Date.now();
  const cachedInfo = accountInfoCache.get(apiKey);
  const cacheValid = cachedInfo && cachedInfo.apiSecret === apiSecret;
  const cacheExpired = cacheValid && (currentTime - cachedInfo.timestamp) >= CACHE_EXPIRY_TIME;

  // 缓存有效且未过期，直接返回
  if (cacheValid && !cacheExpired) {
    UtilRecord.log('😄 使用缓存的账户信息, 缓存时间:', new Date(cachedInfo.timestamp));
    accountInfoCache.delete(apiKey);
    return {
      status: 'success',
      code: 200,
      data: cachedInfo.data,
      fromCache: true
    };
  }

  // 缓存不存在或已过期，重新请求接口
  UtilRecord.log('😄 account 缓存不存在或已过期，重新请求接口 USDMClient.getAccountInformation ...');

  let errorMsg = null;

  // 创建币安客户端
  const options = {
    api_key: apiKey,
    api_secret: apiSecret,
    beautify: true,
  };

  const requestOptions = {
    timeout: 10000,
  };

  if (process.env.NODE_ENV !== "production") {
    requestOptions.proxy = proxy_obj;
  }

  const client = new USDMClient(options, requestOptions);

  // 检查账户信息
  var accountInfo = await client.getAccountInformation().catch(error => {
    if (typeof error === 'string') {
      errorMsg = JSON.parse(error);
    }
    if (typeof error === 'object') {
      errorMsg = error;
    }
    UtilRecord.log('😔 查询账户信息出现异常:', error);
  });

  if (process.env.NODE_ENV !== 'production') {
    // debugger
    // UtilRecord.log('😄 查询账户信息结果(accountInfo):', accountInfo && JSON.parse(accountInfo));
  }

  // 请求失败，返回错误
  if (errorMsg) {
    return {
      status: 'error',
      code: 400,
      message: errorMsg.msg
    };
  }

  // 返回数据已经是对象格式
  const accountData = accountInfo;

  // 更新缓存（使用当前时间，而非请求开始时间，避免异步耗时导致缓存时间戳不准确）
  const cacheTime = Date.now();
  accountInfoCache.set(apiKey, {
    data: accountData,
    timestamp: cacheTime,
    apiSecret: apiSecret
  });

  UtilRecord.log('😄 账户信息已缓存, 缓存时间:', new Date(cacheTime));

  // 保存账户数据到数据库
  if (userId) {
    try {
      await db.usd_m_futures_account.upsert({
        user_id: userId,
        account_json: JSON.stringify(accountData)
      });
      UtilRecord.log('账户信息已保存到数据库, user_id:', userId);
    } catch (dbError) {
      UtilRecord.log('保存账户信息到数据库失败:', dbError);
    }
  }

  return {
    status: 'success',
    code: 200,
    data: accountData,
    fromCache: false
  };
};


module.exports = {
  getDashboard,
  getAccount
};
