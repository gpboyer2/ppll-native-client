/**
 * 工具控制器
 * 提供各种实用工具功能的控制器，包括文件操作、数据处理等
 */
const authService = require("../service/auth.service");
const tokenService = require("../service/token.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const userService = require("../service/user.service");
const emailService = require("../service/email.service");


const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    let code = 200;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    if (!user) {
        code = httpStatus.REQUESTED_RANGE_NOT_SATISFIABLE;
        res.status(code).send({
            code,
            message: "用户名或密码错误",
        });
        return;
    }
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({ code, user, tokens });
});

const register = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    let code = 200;
    if (user) {
        const tokens = await tokenService.generateAuthTokens(user);
        res.send({ code, user, tokens });
        return;
    }
    code = httpStatus.CONFLICT;
    res.status(200).send({
        code,
        message: "用户已存在",
    })
});

const logout = catchAsync(async (req, res) => {
    await authService.logout(req.body.refreshToken);

    let code = httpStatus.NO_CONTENT;
    let message;
    res.status(code).send(code, message);
});

const refreshTokens = catchAsync(async (req, res) => {
    const tokens = await authService.refreshAuth(req.body.refreshToken);
    res.send({ ...tokens });
});


const forgotPassword = catchAsync(async (req, res) => {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
    await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
    res.status(httpStatus.NO_CONTENT).send();
});


const resetPassword = catchAsync(async (req, res) => {
    await authService.resetPassword(req.query.token, req.body.password);
    res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
    await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
    res.status(httpStatus.NO_CONTENT).send();
});


const verifyEmail = catchAsync(async (req, res) => {
    await authService.verifyEmail(req.query.token);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    login,
    register,
    logout,
    refreshTokens,
    forgotPassword,
    resetPassword,
    sendVerificationEmail,
    verifyEmail,
}