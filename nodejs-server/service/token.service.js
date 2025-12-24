const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const userService = require('./user.service.js');
const db = require("../models");
const Token = db.tokens;
const { tokenTypes } = require('../config/token');
const ApiError = require('../utils/ApiError');


const generateToken = (userId, expires, type, secret = process.env.JWT_SECRET) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};


const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    const tokenDoc = await Token.create({
        token,
        user_id: userId,
        expire_at: expires.toDate(),
        type,
        black_listed: blacklisted,
    });

    return tokenDoc;
};


const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const tokenDoc = await Token.findOne({
        where: {
            token,
            type,
            user_id: payload.sub,
            black_listed: false
        }
    });
    if (!tokenDoc) return null;
    return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {

    const accessTokenExpires = moment().add(process.env.JWT_ACCESS_EXPIRATION_MINUTES, 'minutes');
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    const refreshTokenExpires = moment().add(process.env.JWT_REFRESH_EXPIRATION_DAYS, 'days');
    const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
    await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};





module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthTokens,
};
