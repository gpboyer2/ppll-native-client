/**
 * 认证中间件
 * 基于Passport实现的JWT认证和权限验证中间件
 */
const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleValues, roleKeys } = require('../config/roles');
const roleService = require('../service/role.service');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
    if (err || info || !user) {
        return reject(new ApiError(httpStatus.UNAUTHORIZED, '权限不足或未登录'));
    }

    // 检查用户状态，只有启用状态的用户才能通过认证
    if (user.status !== 2) {
        return reject(new ApiError(httpStatus.FORBIDDEN, '账户已被禁用'));
    }

    req.user = user;

    if (requiredRights.length) {
        try {
            // 检查是否为角色数组验证：所有元素都是已知角色名
            const isRoleArrayCheck = requiredRights.length > 0 &&
                requiredRights.every(right => typeof right === 'string' && roleKeys.includes(right));

            let hasRequiredRights = false;

            if (isRoleArrayCheck) {
                // 角色验证：用户角色必须在允许的角色列表中
                hasRequiredRights = requiredRights.includes(user.role);
            } else {
                // 权限验证：简化的权限检查逻辑
                // 管理员拥有所有权限
                if (user.role === 'admin' || user.role === 'super_admin') {
                    hasRequiredRights = true;
                } else {
                    // 非管理员检查配置文件权限
                    const userRights = roleValues.get(user.role) || [];
                    hasRequiredRights = userRights.includes('*') ||
                        requiredRights.every((requiredRight) => userRights.includes(requiredRight));
                }
            }

            // 简单直接的权限验证：只要没有对应权限就拒绝
            if (!hasRequiredRights) {
                return reject(new ApiError(httpStatus.FORBIDDEN, '权限不足'));
            }
        } catch (error) {
            console.error('权限验证错误:', error);
            return reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, '权限验证失败'));
        }
    }

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