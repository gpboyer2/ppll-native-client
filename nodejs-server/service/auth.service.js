/**
 * 认证服务层
 * 单用户系统：简化认证逻辑，无需复杂用户管理
 */
const httpStatus = require('http-status');
const captchaService = require('./captcha.service.js');
const ApiError = require('../utils/ApiError');
const db = require("../models");
const BinanceApiKey = db.binance_api_keys;


/**
 * 后台管理员用户名密码登录（单用户系统，移除）
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<User>}
 */
const loginAdminWithUsernameAndPassword = async (username, password) => {
    // 单用户系统不再支持用户名密码登录
    return null;
};

/**
 * App端用户登录（单用户系统，移除）
 * @param {string} account - 账号
 * @param {string} password - 密码
 * @returns {Promise<User>}
 */
const loginAppUser = async (account, password) => {
    // 单用户系统不再支持账号密码登录
    return null;
};

/**
 * Logout（单用户系统，保留空实现）
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
    // 单用户系统无需登出逻辑
    return null;
};

/**
 * Refresh auth tokens（单用户系统，移除）
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
};


/**
 * 获取用户详细信息（单用户系统，返回固定用户）
 * @param {number} userId - 用户ID
 * @returns {Promise<User>}
 */
const getUserProfile = async (userId) => {
    // 单用户系统返回固定的用户信息
    return {
        id: 1,
        username: 'admin',
        role: 'admin',
        status: 2,
    };
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
 * 后台管理员apiKey登录（单用户系统，验证 binance_api_key 表）
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @returns {Promise<User>}
 */
const loginAdminWithApiKey = async (apiKey, apiSecret) => {
    const keyRecord = await BinanceApiKey.findOne({
        where: {
            api_key: apiKey,
            deleted: 0,
        }
    });

    if (!keyRecord) {
        return null;
    }

    // 验证API Secret
    if (keyRecord.secret_key !== apiSecret) {
        return null;
    }

    // 验证状态
    if (keyRecord.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, 'API Key 已被禁用');
    }

    // 返回用户对象
    return {
        id: keyRecord.id,
        username: keyRecord.name || 'admin',
        apiKey: apiKey,
        role: 'admin',
        status: 2,
        vipExpireAt: keyRecord.vip_expire_at,
    };
};

/**
 * App端用户apiKey登录
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @returns {Promise<User>}
 */
const loginAppUserWithApiKey = async (apiKey, apiSecret) => {
    const keyRecord = await BinanceApiKey.findOne({
        where: {
            api_key: apiKey,
            deleted: 0,
        }
    });

    if (!keyRecord) {
        return null;
    }

    // 验证API Secret
    if (keyRecord.secret_key !== apiSecret) {
        return null;
    }

    // 验证状态
    if (keyRecord.status !== 2) {
        throw new ApiError(httpStatus.FORBIDDEN, 'API Key 已被禁用');
    }

    return {
        id: keyRecord.id,
        username: keyRecord.name || 'admin',
        apiKey: apiKey,
        role: 'admin',
        status: 2,
        vipExpireAt: keyRecord.vip_expire_at,
    };
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
