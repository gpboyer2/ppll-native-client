
/**
 * 工具函数集合
 * 提供各种通用的工具函数，包括延时、数据处理等
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/**
 * 生成一个指定范围内的随机延迟时间，并返回一个Promise对象。
 *
 * @param {number} s - 延迟时间的最小值（包含）,毫秒数。
 * @param {number} e - 延迟时间的最大值（包含）,毫秒数。
 * @returns {Promise} - 一个在指定范围内随机延迟的Promise对象。
 */
const randomDelay = (s, e) => delay(Math.floor(Math.random() * (e - s + 1)) + s);


/**
 * 在时间(ms)500~1000之间随机一个值用作for循环中的延迟时间;
 * @use await randomDelay(500, 1000); 
 * 
 */


/**
 * 通用API凭证提取函数
 * 从请求对象中提取API密钥和密钥Secret，支持从query参数或body参数中获取
 * @param {Object} req - Express请求对象
 * @returns {Object} 包含apiKey、apiSecret以及其他query和body参数的对象
 */
const extractApiCredentials = (req) => {
  return {
    apiKey: req.query.apiKey || req.body.apiKey,
    apiSecret: req.query.apiSecret || req.body.apiSecret,
    ...req.query,
    ...req.body,
  };
};


module.exports = {
  randomDelay,
  extractApiCredentials,
  ApiResponse: require('./api-response')
};

