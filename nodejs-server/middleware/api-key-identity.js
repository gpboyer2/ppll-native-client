// API Key 用户标识中间件
// 从请求中提取 apiKey 和 apiSecret，作为用户标识用于数据隔离
// 这两个字段由前端拦截器自动注入
const { sendError } = require('../utils/api-response');

const apiKeyIdentity = (req, res, next) => {
  // 从 query、params 或 body 中提取 apiKey 和 apiSecret
  const apiKey = req.query?.apiKey || req.params?.apiKey || req.body?.apiKey;
  const apiSecret = req.query?.apiSecret || req.params?.apiSecret || req.body?.apiSecret;

  // 验证是否存在
  if (!apiKey || !apiSecret) {
    return sendError(res, '缺少必要参数: apiKey 和 apiSecret', 400);
  }

  // 将 API Key 标识附加到 request 对象，供后续使用
  req.apiCredentials = { apiKey, apiSecret };
  next();
};

module.exports = { apiKeyIdentity };
