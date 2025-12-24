/**
 * 认证控制器
 * 处理用户登录、注册、退出等认证相关的HTTP请求
 */
const authService = require("../service/auth.service");
const tokenService = require("../service/token.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const userService = require("../service/user.service");
// 引入日志服务
const LoginLogsService = require("../service/login-logs.service");
const SystemLogsService = require("../service/system-logs.service");
const AnalyticsService = require("../service/analytics.service.js");
// 统一使用工具方法解析 UA 与 IP
const { parseUa, detectDevice } = require("../utils/ua-parser");
const ipUtil = require("../utils/ip");

/**
 * 获取登录系统来源（admin/app）
 * @param {import('express').Request} req 
 */
function getLoginSystem(req) {
    const url = String(req.originalUrl || req.url || "");
    if (url.includes("/admin/")) return "admin";
    if (url.includes("/app/")) return "app";
    return "unknown";
}

/**
 * 推断登录方式
 * @param {object} body 请求体
 */
function inferLoginMethod(body = {}) {
    const { username, password, apiKey, apiSecret } = body || {};
    const hasUserPair = Boolean(username && password);
    const hasApiPair = Boolean(apiKey && apiSecret);
    if (hasUserPair && hasApiPair) return "apiKey+password";
    if (hasUserPair) return "password";
    if (hasApiPair) return "apiKey";
    return "unknown";
}

/**
 * 构造系统日志的请求对象（避免污染原始 req）
 * 仅包含系统日志所需字段，严格避免敏感信息外泄
 */
function buildSysLogReq(req, payload) {
    return {
        method: req.method,
        headers: req.headers,
        ip: req.ip,
        user: req.user,
        body: payload || {},
    };
}

// 位置归类改由 utils/ip.js 提供（classifyLocation）

/**
 * 记录登录尝试（成功或失败）
 * - login_logs：记录登录成功/失败
 * - operation_logs：记录操作行为（login/login_failed）
 * - system_logs：记录系统接口调用信息
 */
async function logLoginAttempt(req, { user, success, failReason, statusCode }) {
    // 登录上下文
    const loginSystem = getLoginSystem(req);
    const method = inferLoginMethod(req.body);
    const endpoint = String(req.originalUrl || "/v1/auth/login");
    const ua = req.headers["user-agent"] || "";

    // 登录日志（去敏处理由 service 内部完成）
    try {
        // 解析 UA，补充浏览器/系统/设备信息
        const uaInfo = parseUa(ua);
        const device = detectDevice(ua);
        const ip = ipUtil.getClientIp(req) || null;
        const location = ipUtil.classifyLocation(ip || "");
        const submittedSecret = req.body?.apiSecret || req.body?.password || null;
        await LoginLogsService.create({
            user_id: user?.id || null,
            username: user?.username || req.body?.username || null,
            apiKey: req.body?.apiKey || user?.apiKey || null,
            apiSecret: submittedSecret,
            // apiSecret 不入库
            login_time: new Date(),
            ip,
            location,
            user_agent: ua,
            browser: uaInfo?.browser || null,
            os: uaInfo?.os || null,
            device,
            method,
            login_system: loginSystem,
            status: success ? 1 : 0,
            fail_reason: success ? null : (failReason || "认证失败"),
        });
    } catch (e) {
        // 日志失败不影响主流程
        console.error("[auth] 写入登录日志失败:", e && e.stack || e);
    }

    // 操作日志（login / login_failed）
    try {
        const action = success ? "login" : "login_failed";
        const description = success ? `用户在${loginSystem}系统登录成功` : `用户在${loginSystem}系统登录失败：${failReason || "未知原因"}`;
        const summary = success ? "登录成功" : "登录失败";
        await AnalyticsService.logUserAction(
            user?.id || null,
            action,
            description,
            endpoint,
            req.ip || req.headers["x-forwarded-for"] || null,
            ua,
            { login_system: loginSystem, method, reason: failReason || undefined },
            { operator: user?.username || null, module: "auth", summary, status: success ? 1 : 0, operationTime: new Date() }
        );
    } catch (e) {
        console.error("[auth] 写入操作日志失败:", e && e.stack || e);
    }

    // 系统日志（接口维度）
    try {
        const safeRequest = {
            api_endpoint: endpoint,
            http_method: req.method || "POST",
            status_code: statusCode || (success ? 200 : 401),
            error_code: success ? null : "AUTH-FAILED",
            error_message: success ? null : (failReason || "认证失败"),
            request_data: {
                // 仅保留必要字段，严禁记录密码/密钥
                login_system: loginSystem,
                method,
                username: req.body?.username || undefined,
                apiKey: req.body?.apiKey || undefined,
            },
            response_data: success ? { code: 200 } : { code: statusCode || 401, message: failReason || "认证失败" },
            extra_data: { event: "login", success: !!success, user_id: user?.id || null },
        };
        await SystemLogsService.create(buildSysLogReq(req, safeRequest));
    } catch (e) {
        console.error("[auth] 写入系统日志失败:", e && e.stack || e);
    }
}

/**
 * 记录登出行为
 */
async function logLogout(req) {
    const loginSystem = getLoginSystem(req);
    const endpoint = String(req.originalUrl || "/v1/auth/logout");
    const ua = req.headers["user-agent"] || "";

    // 写入登录日志（logout 事件也纳入 login_logs）
    try {
        const user = req.user || null;
        const uaInfo = parseUa(ua);
        const device = detectDevice(ua);
        const ip = ipUtil.getClientIp(req) || null;
        const location = ipUtil.classifyLocation(ip || "");
        await LoginLogsService.create({
            user_id: user?.id || null,
            username: user?.username || null,
            apiKey: user?.apiKey || null,
            login_time: new Date(),
            ip,
            location,
            user_agent: ua,
            browser: uaInfo?.browser || null,
            os: uaInfo?.os || null,
            device,
            method: "logout", // 将登出也统一记录到登录日志表
            login_system: loginSystem,
            status: 1,
            fail_reason: null,
        });
    } catch (e) {
        console.error("[auth] 写入登出登录日志失败:", e && e.stack || e);
    }

    try {
        await AnalyticsService.logUserAction(
            req.user?.id || null,
            "logout",
            `用户在${loginSystem}系统退出登录`,
            endpoint,
            req.ip || req.headers["x-forwarded-for"] || null,
            ua,
            { login_system: loginSystem },
            { operator: req.user?.username || null, module: "auth", summary: "退出登录", status: 1, operationTime: new Date() }
        );
    } catch (e) {
        console.error("[auth] 写入登出操作日志失败:", e && e.stack || e);
    }

    try {
        const safeRequest = {
            api_endpoint: endpoint,
            http_method: req.method || "POST",
            status_code: 204,
            request_data: { login_system: loginSystem },
            response_data: { code: 204 },
            extra_data: { event: "logout", success: true, user_id: req.user?.id || null },
        };
        await SystemLogsService.create(buildSysLogReq(req, safeRequest));
    } catch (e) {
        console.error("[auth] 写入登出系统日志失败:", e && e.stack || e);
    }
}


// 后台管理员登录
const adminLogin = catchAsync(async (req, res) => {
    const { username, password, apiKey, apiSecret, captchaId, captchaCode } = req.body;

    // 验证验证码（仅当提供验证码参数时才校验）
    if (captchaId || captchaCode) {
        // 如果提供了任一验证码参数，则两个都必须提供
        if (!captchaId || !captchaCode) {
            const code = httpStatus.BAD_REQUEST;
            res.status(code).send({
                code,
                message: "验证码ID和验证码必须同时提供",
            });
            return;
        }

        const isCaptchaValid = authService.verifyCaptcha(captchaId, captchaCode);
        if (!isCaptchaValid) {
            const code = httpStatus.BAD_REQUEST;
            // 记录登录失败日志（验证码失败）
            await logLoginAttempt(req, { user: null, success: false, failReason: "验证码错误或已过期", statusCode: code });
            res.status(code).send({
                code,
                message: "验证码错误或已过期",
            });
            return;
        }
    }

    let user;
    // 根据提供的认证方式进行登录
    try {
        if (username && password) {
            user = await authService.loginAdminWithUsernameAndPassword(username, password);
        } else if (apiKey && apiSecret) {
            user = await authService.loginAdminWithApiKey(apiKey, apiSecret);
        }
    } catch (err) {
        // 记录登录失败（如账户被禁用、无管理员权限）
        const code = err?.statusCode || httpStatus.FORBIDDEN;
        await logLoginAttempt(req, { user: null, success: false, failReason: err?.message || "登录失败", statusCode: code });
        throw err; // 交由全局错误处理
    }

    if (!user) {
        const code = httpStatus.UNAUTHORIZED;
        // 记录登录失败（账号或密码/apiSecret错误）
        await logLoginAttempt(req, { user: null, success: false, failReason: username ? "用户名或密码错误" : "apiKey或apiSecret错误", statusCode: code });
        res.status(code).send({
            code,
            message: username ? "用户名或密码错误" : "apiKey或apiSecret错误",
        });
        return;
    }

    const tokens = await tokenService.generateAuthTokens(user);

    // 返回用户信息时排除敏感信息
    const userResult = user.toJSON();
    delete userResult.password;
    delete userResult.apiKey;
    delete userResult.apiSecret;

    const code = 200;
    // 记录登录成功
    await logLoginAttempt(req, { user, success: true, statusCode: code });
    res.send({
        code,
        user: userResult,
        tokens: {
            accessToken: tokens.access.token,
            refreshToken: tokens.refresh.token,
            accessTokenExpires: tokens.access.expires.toISOString(),
            refreshTokenExpires: tokens.refresh.expires.toISOString()
        }
    });
});

// App端用户登录
const appLogin = catchAsync(async (req, res) => {
    const { username, password, apiKey, apiSecret } = req.body;

    let user;
    // 根据提供的认证方式进行登录
    try {
        if (username && password) {
            user = await authService.loginAppUser(username, password);
        } else if (apiKey && apiSecret) {
            user = await authService.loginAppUserWithApiKey(apiKey, apiSecret);
        }
    } catch (err) {
        const code = err?.statusCode || httpStatus.FORBIDDEN;
        await logLoginAttempt(req, { user: null, success: false, failReason: err?.message || "登录失败", statusCode: code });
        throw err;
    }

    if (!user) {
        const code = httpStatus.UNAUTHORIZED;
        await logLoginAttempt(req, { user: null, success: false, failReason: "账号或密码错误", statusCode: code });
        res.status(code).send({
            code,
            message: "账号或密码错误",
        });
        return;
    }

    const tokens = await tokenService.generateAuthTokens(user);

    // 返回用户信息时排除敏感信息
    const userResult = user.toJSON();
    delete userResult.password;
    delete userResult.apiSecret; // 保留apiKey用于后续API调用识别

    const code = 200;
    await logLoginAttempt(req, { user, success: true, statusCode: code });
    res.send({
        code,
        user: userResult,
        tokens: {
            accessToken: tokens.access.token,
            refreshToken: tokens.refresh.token,
            accessTokenExpires: tokens.access.expires.toISOString(),
            refreshTokenExpires: tokens.refresh.expires.toISOString()
        }
    });
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
    // 调用业务登出逻辑（refreshToken 可选）
    const refreshToken = req.body && req.body.refreshToken;
    if (refreshToken) {
        await authService.logout(refreshToken);
    }
    // 记录登出日志（不依赖于 refreshToken 是否存在）
    await logLogout(req);
    res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
    const tokens = await authService.refreshAuth(req.body.refreshToken);
    const code = 200;
    res.send({ code, ...tokens });
});



// 获取用户详细信息
const getUserProfile = catchAsync(async (req, res) => {
    const userId = req.user.id; // 从认证中间件获取用户ID
    const user = await authService.getUserProfile(userId);

    // 返回用户信息时排除敏感信息
    const userResult = user.toJSON();
    delete userResult.password;
    delete userResult.apiSecret;

    const code = 200;
    res.send({
        code,
        user: userResult
    });
});

// 生成验证码
const getCaptcha = catchAsync(async (req, res) => {
    const captcha = await authService.generateCaptcha();

    const code = 200;
    res.send({
        code,
        data: captcha
    });
});

module.exports = {
    adminLogin,
    appLogin,
    register,
    logout,
    refreshTokens,
    getUserProfile,
    getCaptcha,
}
