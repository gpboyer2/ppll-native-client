/**
 * 认证中间件
 * 单用户系统：简化认证逻辑，默认用户为本人
 */
const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
    // 单用户系统：默认通过认证
    if (!user) {
        user = {
            id: 1,
            username: 'admin',
            role: 'admin',
            status: 2,
        };
    }

    // 检查用户状态，只有启用状态的用户才能通过认证
    if (user.status !== 2) {
        return reject(new ApiError(httpStatus.FORBIDDEN, '账户已被禁用'));
    }

    req.user = user;

    // 单用户系统：所有权限检查都通过
    resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
    return new Promise((resolve, reject) => {
        passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
    })
        .then(() => next())
        .catch((err) => next(err));
};

module.exports = auth;