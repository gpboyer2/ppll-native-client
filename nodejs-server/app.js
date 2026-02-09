/**
 * 主应用程序入口文件
 * 配置Express服务器，设置中间件、路由和WebSocket连接
 */
// 优先加载环境变量:支持 NODE_ENV 指定,默认 development
const env = process.env.NODE_ENV || 'development';
require("dotenv").config({ path: `.env.${env}` });

const express = require("express");
const app = express();
const routeManager = require("./route/route.manager.js");
const db = require("./models/index");
const cors = require("cors");
const swaggerDocs = require("./swagger.js");
const xss = require("xss-clean");
const ipUtil = require("./utils/ip");
const morgan = require("morgan");
const WebSocketConnectionManager = require("./managers/WebSocketConnectionManager");
const gitInfoMiddleware = require("./middleware/git-info");
const UtilRecord = require("./utils/record-log.js");

// ==================== 全局异常处理 ====================
// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('===== UNHANDLED REJECTION =====');
  console.error('Reason:', reason);
  // 不退出进程，记录错误后继续运行
  // WebSocket 连接错误等不应导致服务退出
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('===== UNCAUGHT EXCEPTION =====');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  // 不退出进程，记录错误后继续运行
  // 某些第三方库可能会抛出非致命异常
});

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

app.use(cors(corsOptions)); // 启用CORS，限定来源、方法、头部

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(xss());

// 统一响应格式中间件（在所有路由之前注册）
const responseFormatMiddleware = require('./utils/api-response');
app.use(responseFormatMiddleware);

// 请求去重合并中间件（1秒窗口内相同请求合并处理）
const requestCoalescingMiddleware = require('./middleware/request-coalescing');
app.use(requestCoalescingMiddleware);


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
// 注意：桌面客户端本地 SQLite 数据库可以安全启用 alter 自动同步表结构
// 先清理所有 backup 表，避免 Sequelize alter 模式下的残留表导致唯一性约束冲突

// 记录 API Keys 表状态的辅助函数
const logApiKeysStatus = async (phase) => {
  try {
    const [result] = await db.sequelize.query("SELECT COUNT(*) as count, SUM(CASE WHEN deleted=1 THEN 1 ELSE 0 END) as deleted_count FROM binance_api_keys");
    const [allResult] = await db.sequelize.query("SELECT id, name, deleted, status, created_at FROM binance_api_keys ORDER BY id");
    const ids = allResult.map(r => r.id).join(',');
    const names = allResult.map(r => r.name).join(',');
    const deletedFlags = allResult.map(r => `${r.id}:${r.deleted}`).join(',');
    console.log(`[API-KEY-DEBUG] ${phase} total=${result[0].count} deleted=${result[0].deleted_count}`);
    console.log(`[API-KEY-DEBUG] ${phase} ids=${ids}`);
    console.log(`[API-KEY-DEBUG] ${phase} names=${names}`);
    console.log(`[API-KEY-DEBUG] ${phase} deleted_flags=${deletedFlags}`);
  } catch (e) {
    console.log(`[API-KEY-DEBUG] ${phase}_ERROR ${e.message}`);
  }
};

const cleanBackupTables = async () => {
  // 在清理 backup 表之前记录 API Keys 状态
  await logApiKeysStatus('BEFORE_CLEAN_BACKUP');

  const [backups] = await db.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'"
  );
  console.log(`[API-KEY-DEBUG] BACKUP_TABLES_COUNT=${backups.length} names=${backups.map(b => b.name).join(',')}`);

  for (const { name } of backups) {
    await db.sequelize.query(`DROP TABLE IF EXISTS ${name}`);
    console.log(`[数据库同步] 清理 backup 表: ${name}`);
  }
};

const dbSyncPromise = logApiKeysStatus('BEFORE_SYNC')
  .then(() => cleanBackupTables())
  .then(() => logApiKeysStatus('AFTER_CLEAN_BEFORE_SYNC'))
  .then(() => db.sequelize.sync({ alter: true }))
  .then(() => logApiKeysStatus('AFTER_SYNC'))
  .then(() => {
    console.log("数据库同步成功，表结构已创建/更新");
  })
  .catch((err) => {
    console.log("数据库同步失败:", JSON.stringify(err, null, 2), err.stack);
  });

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
const { execSync } = require("child_process");

/**
 * 清理占用指定端口的进程
 * @param {number} port - 要清理的端口号
 */
function killProcessOnPort(port) {
  try {
    const platform = process.platform;
    let pids = [];

    if (platform === 'darwin' || platform === 'linux') {
      // macOS / Linux: 使用 lsof 查找占用端口的进程
      const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf8' });
      pids = result.trim().split('\n').filter(pid => pid);
    } else if (platform === 'win32') {
      // Windows: 使用 netstat 查找占用端口的进程
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.trim().split('\n');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = String(parts[parts.length - 1]);
        if (pid && !isNaN(Number(pid)) && !pids.includes(pid)) {
          pids.push(pid);
        }
      });
    }

    if (pids.length > 0) {
      console.log(`[端口清理] 发现端口 ${port} 被占用，正在清理进程: ${pids.join(', ')}`);
      pids.forEach(pid => {
        try {
          if (platform === 'win32') {
            execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
          } else {
            execSync(`kill -9 ${pid}`, { encoding: 'utf8' });
          }
          console.log(`[端口清理] 已终止进程 ${pid}`);
        } catch (e) {
          // 进程可能已经退出，忽略错误
        }
      });
      // 等待端口释放
      execSync('sleep 1');
    }
  } catch (error) {
    // 没有进程占用端口或命令执行失败，忽略
  }
}

// start server
const port = process.env.PORT || 54321;

// 启动前清理占用端口的进程
killProcessOnPort(Number(port));

const server = app.listen(port, () => {
  ipUtil.ipinfo();

  // 初始化 WebSocket 连接管理器（共享连接池）
  try {
    global.wsManager = new WebSocketConnectionManager();
    global.wsManager.init();

    // 监听 WebSocket 连接管理器的错误事件，防止未处理的错误导致服务崩溃
    // WebSocket 连接错误是正常现象，binance 客户端会自动重连
    // 在Nodejs中, error 事件：没有监听器时，emit 会抛出异常，导致程序崩溃
    global.wsManager.on('error', (errorData) => {
      // 记录全局 WebSocket 错误，帮助诊断断线重连原因
      const errorInfo = {
        wsKey: errorData?.key || 'N/A',
        timestamp: new Date().toISOString(),
        rawMessage: errorData?.data?.raw?.message || 'N/A',
        rawCode: errorData?.data?.raw?.code || 'N/A',
        eventType: errorData?.data?.eventType || 'N/A',
        fullData: JSON.stringify(errorData, null, 2)
      };
      UtilRecord.log(`[WSManager Global] WebSocket 错误事件:`, JSON.stringify(errorInfo, null, 2));
    });

    // 初始化 Socket.IO，传入 wsManager 实例
    SocketIOManager.init(server, global.wsManager);
  } catch (e) {
    console.error('WSManager/SocketIO init error:', e && e.stack || e);
  }

  ipUtil.getIp().forEach((ip) => {
    console.log(`:::::::::::::::: SERVER RUNNING ON http://${ip}:${port}`);
  });
});

// 安全地加载模块，避免单个模块错误导致整个服务崩溃
const safeRequire = (modulePath, moduleName) => {
  try {
    require(modulePath);
    console.log(`✅ ${moduleName} 模块加载成功`);
  } catch (error) {
    console.error(`❌ ${moduleName} 模块加载失败:`, error.message);
  }
};

// 全市场最新标记价格 监听
safeRequire("./jobs/markPriceStream.js", "标记价格流");

// 单用户系统：已移除用户备份功能

// 服务启动或重启时恢复策略 - 需等待数据库同步完成
dbSyncPromise.then(() => {
  safeRequire("./jobs/restoreStrategiesOnStartup.js", "策略恢复");
});

// 服务启动或重启时 去读git分支与版本信息
safeRequire("./jobs/git.js", "Git信息");

// 在app.js中获取git信息并存储到global.gitInfo
// 确保git.js模块已经执行完成
if (global.GIT_INFO) {
  global.gitInfo = global.GIT_INFO;
  console.log('Git信息已存储到global.gitInfo，可在service目录下的所有文件中访问');
} else {
  console.warn('未能获取到Git信息，请检查git.js模块');
}

// 服务启动或重启时, 每隔一段时间更新一次 24h涨跌幅排序 数据
safeRequire("./jobs/getGateAllCoinList.js", "币种列表更新");

// 定时清理 record-debug 和 record-log 目录中超过一个月的文件
safeRequire("./jobs/cleanOldLogs.js", "日志清理");
