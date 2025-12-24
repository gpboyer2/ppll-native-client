/**
 * 认证相关的数据验证规则
 * 使用Joi库定义登录、注册等请求的验证模式
 */
const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
    username: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};


// 后台管理员登录验证
const adminLogin = {
  body: Joi.object()
    .keys({
      username: Joi.string(),
      password: Joi.string(),
      apiKey: Joi.string(),
      apiSecret: Joi.string(),
      captchaId: Joi.string().optional(),
      captchaCode: Joi.string().optional(),
    })
    .custom((value, helpers) => {
      const { username, password, apiKey, apiSecret, captchaId, captchaCode } = value;

      if (!((username && password) || (apiKey && apiSecret))) {
        return helpers.error('custom.loginCredentials');
      }

      if ((captchaId && !captchaCode) || (!captchaId && captchaCode)) {
        return helpers.error('custom.captchaRequired');
      }
      return value;
    })
    .messages({
      'custom.loginCredentials': '请提供用户名和密码，或apiKey和apiSecret',
      'custom.captchaRequired': '验证码ID和验证码必须同时提供',
    }),
};

// App端用户登录验证
const appLogin = {
  body: Joi.object()
    .keys({
      username: Joi.string().optional(),
      password: Joi.string().optional(),
      apiKey: Joi.string().optional(),
      apiSecret: Joi.string().optional(),
    })
    .custom((value, helpers) => {
      const { username, password, apiKey, apiSecret } = value;

      // 检查是否同时提供了两种认证方式
      if ((username || password) && (apiKey || apiSecret)) {
        return helpers.error('custom.conflictCredentials');
      }

      // 检查是否提供了完整的认证信息
      if (!((username && password) || (apiKey && apiSecret))) {
        return helpers.error('custom.loginCredentials');
      }

      return value;
    })
    .messages({
      'custom.loginCredentials': '请提供用户名和密码，或apiKey和apiSecret',
      'custom.conflictCredentials': '账号与apiKey只能任选一种方式登录',
    }),
};

// 退出登录：接入 JWT 鉴权后，refreshToken 可选（多数客户端不会再传递该信息）
const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().optional().allow(null, ''),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};


module.exports = {
  register,
  adminLogin,
  appLogin,
  logout,
  refreshTokens,
};
