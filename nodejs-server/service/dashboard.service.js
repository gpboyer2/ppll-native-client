/**
 * 仪表盘服务层
 * 提供仪表盘相关的业务逻辑，包括账户信息查询等
 */
const { USDMClient } = require('binance');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require("../utils/record-log.js");
const db = require('../models');


/**
 * 账户信息缓存配置
 * 结构: { [api_key]: { data: account_info, timestamp: Date.now(), secret_key: string } }
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
 * 获取合约账户详情（单用户系统）
 * @param {string} api_key - 币安API密钥
 * @param {string} secret_key - 币安API密钥Secret
 * @returns {Promise<Object>} 账户信息结果
 */
const getAccount = async (api_key, secret_key) => {
  UtilRecord.log('😄 查询账户信息:');
  UtilRecord.log('api_key:', api_key);
  UtilRecord.log('secret_key:', secret_key);

  // 检查缓存
  const currentTime = Date.now();
  const cachedInfo = accountInfoCache.get(api_key);
  const cacheValid = cachedInfo && cachedInfo.apiSecret === secret_key;
  const cacheExpired = cacheValid && (currentTime - cachedInfo.timestamp) >= CACHE_EXPIRY_TIME;

  // 缓存有效且未过期，直接返回
  if (cacheValid && !cacheExpired) {
    UtilRecord.log('😄 使用缓存的账户信息, 缓存时间:', new Date(cachedInfo.timestamp));
    accountInfoCache.delete(api_key);
    return {
      status: 'success',
      code: 200,
      data: cachedInfo.data,
      fromCache: true
    };
  }

  // 缓存不存在或已过期，重新请求接口
  UtilRecord.log('😄 account 缓存不存在或已过期，重新请求接口 USDMClient.getAccountInformation ...');

  let error_msg = null;

  // 创建币安客户端
  const options = {
    api_key: api_key,
    api_secret: secret_key,
    beautify: true,
  };

  const requestOptions = {
    timeout: 10000,
  };

  if (process.env.NODE_ENV !== "production") {
    const proxyConfig = getProxyConfig();
    if (proxyConfig) {
      requestOptions.proxy = proxyConfig;
    }
  }

  const client = new USDMClient(options, requestOptions);

  // 检查账户信息
  var account_info = await client.getAccountInformation().catch(error => {
    if (typeof error === 'string') {
      error_msg = JSON.parse(error);
    }
    if (typeof error === 'object') {
      error_msg = error;
    }
    UtilRecord.log('😔 查询账户信息出现异常:', error);
  });

  if (process.env.NODE_ENV !== 'production') {
    // debugger
    // UtilRecord.log('😄 查询账户信息结果(account_info):', account_info && JSON.parse(account_info));
  }

  // 请求失败，返回错误
  if (error_msg) {
    return {
      status: 'error',
      code: 400,
      message: error_msg.msg
    };
  }

  // 返回数据已经是对象格式
  const accountData = account_info;

  // 更新缓存（使用当前时间，而非请求开始时间，避免异步耗时导致缓存时间戳不准确）
  const cacheTime = Date.now();
  accountInfoCache.set(api_key, {
    data: accountData,
    timestamp: cacheTime,
    secret_key: secret_key
  });

  UtilRecord.log('😄 账户信息已缓存, 缓存时间:', new Date(cacheTime));

  // 单用户系统：无需保存账户数据到数据库

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
