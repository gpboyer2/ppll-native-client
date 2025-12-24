
/**
 * 币安工具类
 * 提供币安API相关的工具函数和辅助功能
 */

const fs = require('fs');
const path = require('path');
const request = require('../middleware/request');


/**
 * 使用HMAC SHA256算法.
 * apiKey 所对应的 API-Secret 作为 HMAC SHA256 的密钥，
 * 其他所有参数作为HMAC SHA256的操作对象，得到的输出即为签名.
 * 签名的输出结果需要转换为小写字母.
 * @param {*} params
 * @returns
 * @memberof Binance
 * @example
 * let params = {
 *  symbol: 'LTCBTC',
 *  side: 'BUY',
 *  type: 'LIMIT',
 *  timeInForce: 'GTC',
 *  quantity: 1,
 *  price: 0.1,
 *  recvWindow: 5000,
 *  timestamp: Date.now()
 * }
 * let signature = getSignature(params, apiSecret)
 * console.log(signature)
 *
 */
function getSignature(params, apiSecret) {
  var querystring = require('querystring');
  var crypto = require('crypto');
  var signature = crypto
    .createHmac('sha256', apiSecret)
    .update(querystring.stringify(params))
    .digest('hex');
  return signature;
}


/**
 * 生成请求参数
 * @param {*} params
 * @returns
 */
function getParams(params, apiSecret) {
  var signature = getSignature(params, apiSecret);
  params.signature = signature;
  return params;
}


/**
 * 生成请求头
 * @returns
 */
function getHeaders(apiKey) {
  var headers = {
    'X-MBX-APIKEY': apiKey
  };
  return headers;
}


/**
 * 工具函数
 * 通过get方法请求接口, 获得数据后通过回调函数处理数据
 * @param {*} options 
 * @param {*} callback 
 * 
 */
async function getBinanceData(options) {
  return new Promise((resolve, reject) => {
    request.get(options, function (error, response, body) {
      if (error || JSON.parse(body).msg) {
        reject(error || JSON.parse(body).msg);
      }
      if (!error && response.statusCode === 200) {
        resolve(body);
      }
      reject(error);
    });
  })
}

module.exports = {
  getBinanceData,
  getHeaders,
  getParams,
  getSignature,
};
