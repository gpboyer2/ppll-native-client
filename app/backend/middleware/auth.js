/**
 * 认证中间件
 * 本地客户端系统：无需认证，直接通过
 */
const auth = () => async (req, res, next) => {
  // 本地客户端无需认证，直接通过
  next();
};

module.exports = auth;