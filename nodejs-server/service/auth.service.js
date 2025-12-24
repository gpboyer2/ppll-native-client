/**
 * 认证服务层
 * 提供用户认证、登录验证、密码验证等业务逻辑
 */
const httpStatus = require('http-status');
const tokenService = require('./token.service.js');
const userService = require('./user.service.js');
const captchaService = require('./captcha.service.js');
const db = require("../models");
const Token = db.tokens;
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/token');
const bcrypt = require('bcryptjs');


/**
 * 后台管理员用户名密码登录
 * @param {string} username - 用户名或API Key
 * @param {string} password - 密码或API Secret
 * @returns {Promise<User>}
 */
const loginAdminWithUsernameAndPassword = async (username, password) => {
    // 先尝试通过用户名查找
    let user = await userService.getOneBy({ username });

    // 如果通过用户名找不到，尝试通过API Key查找
    if (!user) {
        user = await userService.getOneBy({ apiKey: username });
    }

    if (!user) {
        return null;
    }

    // 验证用户状态
    if (user.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, '账户已被禁用');
    }

    // 验证密码或API Secret
    let isPasswordMatch = false;
    if (user.password) {
        // 使用传统密码验证
        isPasswordMatch = await bcrypt.compare(password, user.password);
    } else if (user.apiSecret) {
        // 使用API Secret验证
        isPasswordMatch = user.apiSecret === password;
    }

    if (!isPasswordMatch) {
        return null;
    }

    // 验证用户角色权限（确保是管理员角色）
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, '无管理员权限');
    }

    return user;
};

/**
 * App端用户登录（支持用户名或apiKey）
 * @param {string} account - 账号（用户名或apiKey）
 * @param {string} password - 密码（当使用apiKey时，可以是apiSecret）
 * @returns {Promise<User>}
 */
const loginAppUser = async (account, password) => {
    // 尝试用用户名登录
    let user = await userService.getOneBy({ username: account });

    // 如果用户名没找到，尝试用apiKey登录
    if (!user) {
        user = await userService.getOneBy({ apiKey: account });
        if (user) {
            // 使用apiKey登录时，验证apiSecret作为密码
            if (!user.apiSecret || user.apiSecret !== password) {
                return null;
            }
        }
    } else {
        // 使用用户名登录时，验证密码
        if (!user.password) {
            return null;
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return null;
        }
    }

    if (!user) {
        return null;
    }

    // 验证用户状态
    if (user.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, '账户已被禁用');
    }

    // App端允许所有角色登录（包括user, operator等）
    return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
    const refreshTokenDoc = await Token.findOne({
        where: {
            token: refreshToken,
            type: tokenTypes.REFRESH,
            black_listed: false
        }
    });
    if (!refreshTokenDoc) {
        return null;
    }
    await refreshTokenDoc.destroy();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
    try {
        const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
        const user = await userService.getOneBy({ id: refreshTokenDoc.user_id });
        if (!user) {
            throw new Error();
        }
        await refreshTokenDoc.destroy();
        return tokenService.generateAuthTokens(user);
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
};


/**
 * 获取用户详细信息
 * @param {number} userId - 用户ID
 * @returns {Promise<User>}
 */
const getUserProfile = async (userId) => {
    const user = await userService.getOneBy({ id: userId });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, '用户不存在');
    }

    return user;
};

/**
 * 生成验证码
 * @returns {Promise<Object>} 验证码信息
 */
const generateCaptcha = async () => {
    return await captchaService.generateCaptcha();
};

/**
 * 验证验证码
 * @param {string} captchaId - 验证码ID
 * @param {string} captchaCode - 验证码
 * @returns {boolean} 验证结果
 */
const verifyCaptcha = (captchaId, captchaCode) => {
    return captchaService.verifyCaptcha(captchaId, captchaCode);
};

/**
 * 后台管理员apiKey登录
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @returns {Promise<User>}
 */
const loginAdminWithApiKey = async (apiKey, apiSecret) => {
    const user = await userService.getOneBy({ apiKey });

    if (!user) {
        return null;
    }

    // 验证用户状态
    if (user.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, '账户已被禁用');
    }

    // 验证API Secret
    if (!user.apiSecret || user.apiSecret !== apiSecret) {
        return null;
    }

    // 验证用户角色权限（确保是管理员角色）
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, '无管理员权限');
    }

    return user;
};

/**
 * App端用户apiKey登录
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @returns {Promise<User>}
 */
const loginAppUserWithApiKey = async (apiKey, apiSecret) => {
    const user = await userService.getOneBy({ apiKey });

    if (!user) {
        return null;
    }

    // 验证用户状态
    if (user.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, '账户已被禁用');
    }

    // 验证API Secret
    if (!user.apiSecret || user.apiSecret !== apiSecret) {
        return null;
    }

    return user;
};

module.exports = {
    loginAdminWithUsernameAndPassword,
    loginAdminWithApiKey,
    loginAppUser,
    loginAppUserWithApiKey,
    logout,
    refreshAuth,
    getUserProfile,
    generateCaptcha,
    verifyCaptcha,
};
