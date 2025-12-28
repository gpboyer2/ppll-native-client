// API 认证中间件
// 验证请求中是否包含 apiKey 和 apiSecret
// 这两个字段由前端拦截器自动注入
const { sendError } = require('../utils/api-response');

const apiAuth = (req, res, next) => {
  // 从 query、params 或 body 中提取 apiKey 和 apiSecret
  const apiKey = req.query?.apiKey || req.params?.apiKey || req.body?.apiKey;
  const apiSecret = req.query?.apiSecret || req.params?.apiSecret || req.body?.apiSecret;

  // 验证是否存在
  if (!apiKey || !apiSecret) {
    return sendError(res, '缺少必要参数: apiKey 和 apiSecret', 400);
  }

  // 将凭证附加到 request 对象，供后续使用
  req.apiCredentials = { apiKey, apiSecret };
  next();
};

module.exports = { apiAuth };
