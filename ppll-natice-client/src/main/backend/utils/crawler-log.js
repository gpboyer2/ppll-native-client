/**
 * 爬虫日志工具
 * 专门用于网站数据抓取（如 Gate.io、CoinGecko 等）的日志记录
 * 支持配置是否输出到终端，避免影响主程序调试
 */
const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");

// ==================== 常量配置 ====================
const CONFIG = {
    /* 爬虫日志根目录 */
    CRAWLER_LOG_DIR: path.join(__dirname, "../logs/crawler-log"),

    /* 项目根目录 */
    PROJECT_ROOT: path.resolve(__dirname, "../"),

    /* 日志栈跟踪限制 */
    STACK_TRACE_LIMIT: 20,

    /* 日志对齐宽度 */
    LOG_ALIGNMENT_WIDTH: 80,

    /* 日志排除模式 */
    EXCLUDE_PATTERNS: [
        "node_modules",
        "internal/",
        "(internal/",
        "utils/crawler-log.js",
    ],

    /* 是否输出到终端（可通过 setConsoleOutput 修改） */
    CONSOLE_OUTPUT: false,

    /* trace 日志是否输出到终端（通过环境变量 LOG_TRACE=true 开启） */
    TRACE_CONSOLE_OUTPUT: process.env.LOG_TRACE === "true",
};

// 初始化爬虫日志根目录
(function initializeLogDirectory() {
    if (!fs.existsSync(CONFIG.CRAWLER_LOG_DIR)) {
        fs.mkdirSync(CONFIG.CRAWLER_LOG_DIR, { recursive: true });
    }
})();

// ==================== 核心工具函数 ====================

/**
 * 设置是否输出到终端
 * @param {boolean} enabled - 是否启用终端输出
 */
function setConsoleOutput(enabled) {
    CONFIG.CONSOLE_OUTPUT = enabled;
}

/**
 * 获取是否输出到终端的配置
 * @returns {boolean} 是否启用终端输出
 */
function isConsoleOutputEnabled() {
    return CONFIG.CONSOLE_OUTPUT;
}

/**
 * 获取爬虫日志文件路径
 * @param {string} source - 爬虫来源，如 gate、coingecko
 * @returns {string} 日志文件路径
 */
function getCrawlerLogFilePath(source) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const hour = String(today.getHours()).padStart(2, "0");
    const dateString = `${year}-${month}-${day} ${hour}:00:00`;

    // 构建目录路径: logs/crawler-log/{source}/
    const logDir = path.join(CONFIG.CRAWLER_LOG_DIR, source || "unknown");

    // 确保目录存在
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    return path.join(logDir, `${dateString}.log`);
}

/**
 * 将日志写入文件
 * @param {string} logText - 日志文本
 * @param {string} source - 爬虫来源
 */
async function writeLogToFile(logText, source) {
    try {
        const logFilePath = getCrawlerLogFilePath(source);
        await fs.promises.appendFile(logFilePath, `${logText}\n`, "utf8");
    } catch (error) {
        console.error("写入爬虫日志文件失败:", error.message);
    }
}

/**
 * 格式化日志消息
 * @param {any} message - 日志消息
 * @returns {string} 格式化后的消息
 */
function formatMessage(message) {
    if (typeof message === "object" && message !== null) {
        try {
            return JSON.stringify(message);
        } catch (error) {
            return "[无法序列化的对象]";
        }
    }
    return String(message);
}

/**
 * 检查栈行是否应该被排除
 * @param {string} stackLine - 栈行内容
 * @returns {boolean} 是否应该排除
 */
function shouldExcludeStackLine(stackLine) {
    return CONFIG.EXCLUDE_PATTERNS.some((pattern) =>
        stackLine.includes(pattern),
    );
}

/**
 * 从栈行中提取路径信息
 * @param {string} stackLine - 栈行内容
 * @returns {string|null} 提取的路径信息
 */
function extractPathFromStackLine(stackLine) {
    const match =
        stackLine.match(/\(([^)]+)\)/) || stackLine.match(/at\s+([^\s]+)/);
    if (!match || !match[1]) {
        return null;
    }

    let callerLocation = match[1];

    // 转换为相对路径
    if (callerLocation.includes(CONFIG.PROJECT_ROOT)) {
        callerLocation = callerLocation.replace(CONFIG.PROJECT_ROOT, ".");
    }

    return callerLocation;
}

/**
 * 获取调用者文件路径和行号
 * @returns {string} 文件路径和行号
 */
function getCallerInfo() {
    const originalStackTraceLimit = Error.stackTraceLimit;

    try {
        Error.stackTraceLimit = CONFIG.STACK_TRACE_LIMIT;
        throw new Error();
    } catch (error) {
        const stackLineList = error.stack.split("\n");

        // 寻找有效的调用者信息
        for (let i = 1; i < stackLineList.length; i++) {
            const stackLine = stackLineList[i];

            if (shouldExcludeStackLine(stackLine)) {
                continue;
            }

            const callerLocation = extractPathFromStackLine(stackLine);
            if (callerLocation) {
                return callerLocation;
            }
        }

        return "unknown:0:0";
    } finally {
        // 确保恢复原始的栈追踪限制
        if (typeof originalStackTraceLimit !== "undefined") {
            Error.stackTraceLimit = originalStackTraceLimit;
        }
    }
}

/**
 * 格式化并连接多个消息
 * @param {Array} messageList - 消息数组
 * @returns {string} 格式化后的消息字符串
 */
function formatMessageList(messageList) {
    if (!Array.isArray(messageList) || messageList.length === 0) {
        return "";
    }

    return messageList.map((message) => formatMessage(message)).join(" ");
}

// ==================== 日志输出函数 ====================

/**
 * 创建爬虫日志记录器
 * @param {Object} options - 配置选项
 * @param {string} options.source - 爬虫来源，如 gate、coingecko、binance-web
 * @param {boolean} [options.consoleOutput] - 是否输出到终端（可选，默认使用全局配置）
 * @returns {Object} 日志记录器对象
 *
 * @example
 * const CrawlerLog = require('./utils/crawler-log.js');
 * const logger = CrawlerLog.createLogger({ source: 'gate' });
 * logger.log('开始抓取数据...');
 * logger.error('抓取失败', error);
 */
function createLogger(options) {
    const { source, consoleOutput } = options;

    // 验证必要参数
    if (!source) {
        console.warn("[CrawlerLog] 创建日志记录器时缺少 source 参数");
    }

    // 是否输出到终端：优先使用实例配置，否则使用全局配置
    const shouldOutputToConsole = () => {
        return consoleOutput !== undefined
            ? consoleOutput
            : CONFIG.CONSOLE_OUTPUT;
    };

    /**
     * 生成日志前缀
     * @param {string} level - 日志级别
     * @returns {string} 日志前缀
     */
    function generateLogPrefix(level) {
        const timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");
        const callerInfo = getCallerInfo();
        const baseInfo = `[${timestamp}] ${callerInfo}`;
        const paddedInfo = baseInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, " ");
        return level ? `[${level}] ${paddedInfo}` : paddedInfo;
    }

    return {
        /**
         * 记录普通日志
         * @param {...any} messageList - 要记录的消息
         */
        async log(...messageList) {
            const prefix = generateLogPrefix("");
            const formattedMessage = formatMessageList(messageList);
            const finalMessage = `${prefix}${formattedMessage}`;
            if (shouldOutputToConsole()) {
                console.log(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录调试日志
         * @param {...any} messageList - 要记录的消息
         */
        async debug(...messageList) {
            const prefix = generateLogPrefix("DEBUG");
            const formattedMessage = formatMessageList(messageList);
            const finalMessage = `${prefix}${formattedMessage}`;
            if (shouldOutputToConsole()) {
                console.log(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录错误日志（错误日志始终输出到终端）
         * @param {...any} messageList - 要记录的消息
         */
        async error(...messageList) {
            const prefix = generateLogPrefix("ERROR");
            const formattedMessage = formatMessageList(messageList);
            const finalMessage = `${prefix}${formattedMessage}`;
            // 错误日志始终输出到终端
            console.error(finalMessage);
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录警告日志
         * @param {...any} messageList - 要记录的消息
         */
        async warn(...messageList) {
            const prefix = generateLogPrefix("WARN");
            const formattedMessage = formatMessageList(messageList);
            const finalMessage = `${prefix}${formattedMessage}`;
            if (shouldOutputToConsole()) {
                console.warn(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录请求日志
         * @param {string} action - 操作名称，如 fetch、request
         * @param {any} data - 请求相关数据
         */
        async request(action, data) {
            const prefix = generateLogPrefix("REQUEST");
            const formattedData = formatMessage(data);
            const finalMessage = `${prefix}[${action}] ${formattedData}`;
            if (shouldOutputToConsole()) {
                console.log(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录响应日志
         * @param {string} action - 操作名称
         * @param {any} data - 响应数据
         */
        async response(action, data) {
            const prefix = generateLogPrefix("RESPONSE");
            const formattedData = formatMessage(data);
            const finalMessage = `${prefix}[${action}] ${formattedData}`;
            if (shouldOutputToConsole()) {
                console.log(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },

        /**
         * 记录 trace 级别日志（频繁但大部分时间无意义的日志）
         * 特点：始终写入文件，默认不输出到终端（通过 LOG_TRACE=true 环境变量开启）
         * @param {...any} messageList - 要记录的消息
         */
        async trace(...messageList) {
            const prefix = generateLogPrefix("TRACE");
            const formattedMessage = formatMessageList(messageList);
            const finalMessage = `${prefix}${formattedMessage}`;
            // 只有开启了 LOG_TRACE 环境变量才输出到终端
            if (CONFIG.TRACE_CONSOLE_OUTPUT) {
                console.log(finalMessage);
            }
            await writeLogToFile(finalMessage, source);
        },
    };
}

// ==================== 模块导出 ====================
module.exports = {
    createLogger,
    setConsoleOutput,
    isConsoleOutputEnabled,
};
