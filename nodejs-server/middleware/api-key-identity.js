// API Key 用户标识中间件
// 从请求中提取 api_key 和 secret_key，作为用户标识用于数据隔离
// 这两个字段由前端拦截器自动注入
const { sendError } = require('../utils/api-response');

const apiKeyIdentity = (req, res, next) => {
  // 从 query、params 或 body 中提取 api_key 和 secret_key
  const api_key = req.query?.api_key || req.params?.api_key || req.body?.api_key;
  const secret_key = req.query?.secret_key || req.params?.secret_key || req.body?.secret_key;

  // 验证是否存在
  if (!api_key || !secret_key) {
    return sendError(res, '缺少必要参数: api_key 和 secret_key', 400);
  }

  // 将 API Key 标识附加到 request 对象，供后续使用
  req.apiCredentials = { api_key, secret_key };
  next();
};

module.exports = { apiKeyIdentity };
