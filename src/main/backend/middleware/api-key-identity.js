// API Key 用户标识中间件
// 从请求中提取 api_key 和 api_secret，作为用户标识用于数据隔离
// 这两个字段由前端拦截器自动注入

const apiKeyIdentity = (req, res, next) => {
    // 从 query、params 或 body 中提取 api_key 和 api_secret
    const api_key =
        req.query?.api_key || req.params?.api_key || req.body?.api_key;
    const api_secret =
        req.query?.api_secret || req.params?.api_secret || req.body?.api_secret;

    // 验证是否存在
    if (!api_key || !api_secret) {
        return res.apiError(null, "缺少必要参数: api_key 和 api_secret");
    }

    // 将 API Key 标识附加到 request 对象，供后续使用
    req.apiCredentials = { api_key, api_secret };
    next();
};

module.exports = { apiKeyIdentity };
