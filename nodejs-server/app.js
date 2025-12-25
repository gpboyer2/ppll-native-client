/**
 * 主应用程序入口文件
 * 配置Express服务器，设置中间件、路由和WebSocket连接
 */
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const express = require("express");
const app = express();
const routeManager = require("./route/route.manager.js");
const db = require("./models/index");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerDocs = require("./swagger.js");
const passport = require("passport");
const { jwtStrategy } = require("./config/passport");
const xss = require("xss-clean");
const ipUtil = require("./utils/ip");
const morgan = require("morgan");
const WebSocketConnectionManager = require("./managers/WebSocketConnectionManager");
const gitInfoMiddleware = require("./middleware/git-info");

const corsOptions = {
    origin: function (origin, callback) {
        // 无 origin 头（直接请求、Postman、curl 等）直接允许
        if (!origin) {
            return callback(null, true);
        }

        // 允许 localhost 和 127.0.0.1 的任意端口（桌面客户端本地访问）
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // 开发环境：允许任何本机请求
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        // 生产环境白名单
        const whitelist = ["http://156.245.200.31"];
        if (whitelist.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('CORS 不允许的来源'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true, // 允许携带凭证
    optionsSuccessStatus: 200 // 兼容老版本浏览器
};

app.use(xss());

app.use(express.json({ limit: "1mb" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors(corsOptions)); // 启用CORS，限定来源、方法、头部


// 日志中间件
// 用户访问接口时，记录请求日志, 即: 记录 HTTP 请求的详细信息，并将日志信息通过 logger 对象输出。
// morgan 是一个用于记录 HTTP 请求的中间件, 'combined' 参数指定了日志的格式，这种格式包括请求方法、响应状态码、响应时间、以及客户端 IP 地址等信息。
app.use(
    morgan("combined", {
        // immediate: true 表示在请求一进来时就记录日志，而不是等响应结束后
        immediate: true,
        stream: {
            write: (message) => console.log(message.trim()),
        },
    })
);


// 应用IP访问频率限制中间件
app.set("trust proxy", 1); // 信任 first proxy

// 短期限制：每个IP对同一个API接口3秒内限制1次请求（防止接口滥用）
// 开发环境可以通过环境变量DISABLE_RATE_LIMIT=true关闭频率限制
const limiter = require("./middleware/request").limiter;
if (process.env.DISABLE_RATE_LIMIT === 'true') {
    console.log(':::::::::::::::: [Rate Limit] 频率限制已在开发环境中禁用');
} else {
    app.use(limiter);
}

// 长期保护：每个IP 1分钟内最多100次请求，超过则封禁24小时（防止恶意攻击）
// 开发环境可以通过环境变量DISABLE_RATE_LIMIT=true关闭频率限制
const { rateLimitMiddleware } = require("./middleware/ip-rate-limit");
if (process.env.DISABLE_RATE_LIMIT === 'true') {
    console.log(':::::::::::::::: [Rate Limit] 频率限制已在开发环境中禁用');
} else {
    app.use(rateLimitMiddleware());
}

// 在所有路由之前注入 gitInfo 字段（仅对 JSON 对象注入）
app.use(gitInfoMiddleware());

// 启动时同步模型与数据库
// 注意：桌面客户端本地 SQLite 数据库可以安全启用自动同步
db.sequelize.sync()
    .then(() => {
        console.log("数据库同步成功，表结构已创建/更新");
    })
    .catch((err) => {
        console.log("数据库同步失败: " + err.message);
    });

// jwt authentication
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

// 配置和启动一个基于Express的Node.js应用程序，并使用Swagger来生成API文档
routeManager(app);
swaggerDocs(app, process.env.PORT);

// error handler
app.use(function (err, req, res, next) {
    console.error('===== API ERROR =====');
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('Stack:', err.stack);

    // 处理 ApiError
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            status: "error",
            code: err.statusCode,
            message: err.message,
            data: null
        });
    }

    // 处理其他错误
    res.status(500).json({
        status: "error",
        code: 500,
        message: "服务器异常，请稍后再试",
        data: null
    });
});

// 404 handler
app.use(function (req, res, next) {
    res.status(404).json({
        status: "error",
        code: 404,
        error: `Can't find ${req.originalUrl}`,
    });
});

const SocketIOManager = require("./managers/SocketIOManager");

// start server
const port = process.env.PORT || 54321;
const server = app.listen(port, () => {
    ipUtil.ipinfo();

    // 初始化 WebSocket 连接管理器（共享连接池）
    try {
        global.wsManager = new WebSocketConnectionManager();
        global.wsManager.init();

        // 监听 WebSocket 连接管理器的错误事件，防止未处理的错误导致服务崩溃
        // WebSocket 连接错误是正常现象，binance 客户端会自动重连
        // 在Nodejs中, error 事件：没有监听器时，emit 会抛出异常，导致程序崩溃
        global.wsManager.on('error', (errorData) => { });

        // 初始化 Socket.IO，传入 wsManager 实例
        SocketIOManager.init(server, global.wsManager);
    } catch (e) {
        console.error('WSManager/SocketIO init error:', e && e.stack || e);
    }

    ipUtil.getIp().forEach((ip) => {
        console.log(`:::::::::::::::: SERVER RUNNING ON http://${ip}:${port}`);
    });
});

// 全市场最新标记价格 监听
require("./jobs/markPriceStream.js");

// 在应用启动时执行一次用户表备份
require("./jobs/backupUsers.js");

// 服务启动或重启时恢复策略
require("./jobs/restoreStrategiesOnStartup.js");

// 服务启动或重启时 去读git分支与版本信息
require("./jobs/git.js");

// 在app.js中获取git信息并存储到global.gitInfo
// 确保git.js模块已经执行完成
if (global.GIT_INFO) {
    global.gitInfo = global.GIT_INFO;
    console.log('Git信息已存储到global.gitInfo，可在service目录下的所有文件中访问');
} else {
    console.warn('未能获取到Git信息，请检查git.js模块');
}

// 服务启动或重启时, 每隔一段时间更新一次 24h涨跌幅排序 数据
require("./jobs/getGateAllCoinList.js");

// 定时清理 record-debug 和 record-log 目录中超过一个月的文件
require("./jobs/cleanOldLogs.js");
