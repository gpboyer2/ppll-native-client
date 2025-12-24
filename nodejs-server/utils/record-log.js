/**
 * 记录工具
 * 提供日志记录、文件操作等记录相关的工具函数
 */
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');

// ==================== 常量配置 ====================
const CONFIG = {
  /* 日志目录文件 */
  LOG_DIR: path.join(__dirname, '../logs/record-log'),
  DEBUG_DIR: path.join(__dirname, '../logs/record-debug'),
  ERROR_DIR: path.join(__dirname, '../logs/record-error'),
  TEST_DIR: path.join(__dirname, '../logs/record-test'),
  TRACE_DIR: path.join(__dirname, '../logs/record-trace'),

  /* 项目根目录 */
  PROJECT_ROOT: path.resolve(__dirname, '../'),

  /* 日志栈跟踪限制 */
  STACK_TRACE_LIMIT: 20,

  /* 日志跳过帧数 */
  DEFAULT_SKIP_FRAMES: 3,

  /* 日志对齐宽度 */
  LOG_ALIGNMENT_WIDTH: 80,

  /* 日志排除模式 */
  EXCLUDE_PATTERNS: ['node_modules', 'internal/', '(internal/', 'utils/record-log.js'],

  /* trace 日志是否输出到终端（通过环境变量 LOG_TRACE=true 开启） */
  TRACE_CONSOLE_OUTPUT: process.env.LOG_TRACE === 'true'
};

// 初始化日志目录
(function initializeLogDirectory() {
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.DEBUG_DIR)) {
    fs.mkdirSync(CONFIG.DEBUG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.ERROR_DIR)) {
    fs.mkdirSync(CONFIG.ERROR_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.TEST_DIR)) {
    fs.mkdirSync(CONFIG.TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.TRACE_DIR)) {
    fs.mkdirSync(CONFIG.TRACE_DIR, { recursive: true });
  }
})();

// ==================== 核心工具函数 ====================
/**
 * 获取当前日期的日志文件路径
 * @param {string} logType - 日志类型 'log' 或 'debug'
 * @returns {string} 日志文件路径
 */
function getLogFilePath(logType = 'log') {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const hour = String(today.getHours()).padStart(2, '0');
  const dateString = `${year}-${month}-${day} ${hour}:00:00`;

  let logDir;
  switch (logType) {
    case 'debug':
      logDir = CONFIG.DEBUG_DIR;
      break;
    case 'error':
      logDir = CONFIG.ERROR_DIR;
      break;
    case 'test':
      logDir = CONFIG.TEST_DIR;
      break;
    case 'trace':
      logDir = CONFIG.TRACE_DIR;
      break;
    default:
      logDir = CONFIG.LOG_DIR;
  }
  return path.join(logDir, `${dateString}.log`);
}

/**
 * 将日志写入文件
 * - 将 writeLogToFile 函数改为异步函数，使用 fs.promises.appendFile 代替 fs.appendFileSync，避免阻塞主线程。
 * @param {string} logText 日志文本
 * @param {string} logType - 日志类型 'log' 或 'debug'
 */
async function writeLogToFile(logText, logType = 'log') {
  try {
    const logFilePath = getLogFilePath(logType);
    await fs.promises.appendFile(logFilePath, `${logText}\n`, 'utf8');
  } catch (error) {
    console.error('写入日志文件失败:', error.message);
  }
}

/**
 * 格式化日志消息
 * @param {any} message 日志消息
 * @returns {string} 格式化后的消息
 */
function formatMessage(message) {
  if (typeof message === 'object' && message !== null) {
    try {
      return JSON.stringify(message);
    } catch (error) {
      return '[无法序列化的对象]';
    }
  }
  return String(message);
}

/**
 * 检查栈行是否应该被排除
 * @param {string} stackLine 栈行内容
 * @returns {boolean} 是否应该排除
 */
function shouldExcludeStackLine(stackLine) {
  return CONFIG.EXCLUDE_PATTERNS.some(pattern => stackLine.includes(pattern));
}

/**
 * 从栈行中提取路径信息
 * @param {string} stackLine 栈行内容
 * @returns {string|null} 提取的路径信息
 */
function extractPathFromStackLine(stackLine) {
  const match = stackLine.match(/\(([^)]+)\)/) || stackLine.match(/at\s+([^\s]+)/);
  if (!match || !match[1]) {
    return null;
  }

  let callerLocation = match[1];

  // 转换为相对路径
  if (callerLocation.includes(CONFIG.PROJECT_ROOT)) {
    callerLocation = callerLocation.replace(CONFIG.PROJECT_ROOT, '.');
  }

  return callerLocation;
}

/**
 * 获取调用者文件路径和行号
 * @param {number} skipFrames 跳过的栈帧数
 * @returns {string} 文件路径和行号
 */
function getCallerInfo(skipFrames = CONFIG.DEFAULT_SKIP_FRAMES) {
  const originalStackTraceLimit = Error.stackTraceLimit;

  try {
    Error.stackTraceLimit = CONFIG.STACK_TRACE_LIMIT;
    throw new Error();
  } catch (error) {
    const stackLines = error.stack.split('\n');

    // 寻找有效的调用者信息
    for (let i = 1; i < stackLines.length; i++) {
      const stackLine = stackLines[i];

      if (shouldExcludeStackLine(stackLine)) {
        continue;
      }

      const callerLocation = extractPathFromStackLine(stackLine);
      if (callerLocation) {
        return callerLocation;
      }
    }

    return 'unknown:0:0';
  } finally {
    // 确保恢复原始的栈追踪限制
    if (typeof originalStackTraceLimit !== 'undefined') {
      Error.stackTraceLimit = originalStackTraceLimit;
    }
  }
}

// ==================== 日志格式化函数 ====================
/**
 * 生成基础日志信息（时间戳 + 调用者信息）
 * @param {number} skipFrames 跳过的栈帧数
 * @returns {Object} 包含时间戳和调用者信息的对象
 */
function generateBaseLogInfo(skipFrames = CONFIG.DEFAULT_SKIP_FRAMES) {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const callerInfo = getCallerInfo(skipFrames);

  return {
    timestamp,
    callerInfo,
    logInfo: `[${timestamp}] ${callerInfo}`
  };
}

/**
 * 格式化并连接多个消息
 * @param {Array} messages 消息数组
 * @returns {string} 格式化后的消息字符串
 */
function formatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  return messages.map(message => formatMessage(message)).join(' ');
}

// ==================== 日志输出函数 ====================
/**
 * 工具函数 - 以特定格式输出调试日志
 * 
 * @example
 *  const UtilRecord = require('./utils/record-log.js');
 *  UtilRecord.debug('hello world');
 * @param {...any} messages - 要记录的消息
 */
async function debug(...messages) {
  const { logInfo } = generateBaseLogInfo();
  const formattedMessages = formatMessages(messages);

  if (formattedMessages) {
    // 对齐输出：时间戳和调用者信息 + 消息内容
    const paddedLogInfo = logInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    const finalLogMessage = `[DEBUG] ${paddedLogInfo}${formattedMessages}`;
    console.log(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'debug');
  } else {
    // 仅输出时间戳和调用者信息
    const finalLogMessage = `[DEBUG] ${logInfo}`;
    console.log(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'debug');
  }
}

/**
 * 工具函数 - 以特定格式输出普通日志
 * 
 * @example
 *  const UtilRecord = require('./utils/record-log.js');
 *  UtilRecord.log('hello world');
 * @param {...any} messages - 要记录的消息
 */
async function log(...messages) {
  const { logInfo } = generateBaseLogInfo();
  const formattedMessages = formatMessages(messages);

  if (formattedMessages) {
    // 对齐输出：时间戳和调用者信息 + 消息内容
    const paddedLogInfo = logInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    const finalLogMessage = `${paddedLogInfo}${formattedMessages}`;
    console.log(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'log');
  } else {
    // 仅输出时间戳和调用者信息
    console.log(logInfo);
    await writeLogToFile(logInfo, 'log');
  }
}

/**
 * 工具函数 - 以特定格式输出错误日志
 * 
 * @example
 *  const UtilRecord = require('./utils/record-log.js');
 *  UtilRecord.error('发生错误', err);
 * @param {...any} messages - 要记录的消息
 */
async function error(...messages) {
  const { logInfo } = generateBaseLogInfo();
  const formattedMessages = formatMessages(messages);

  if (formattedMessages) {
    // 对齐输出：时间戳和调用者信息 + 消息内容
    const paddedLogInfo = logInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    const finalLogMessage = `[ERROR] ${paddedLogInfo}${formattedMessages}`;
    console.error(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'error');
  } else {
    // 仅输出时间戳和调用者信息
    const finalLogMessage = `[ERROR] ${logInfo}`;
    console.error(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'error');
  }
}

/**
 * 工具函数 - 以特定格式输出测试日志
 * 
 * @example
 *  const UtilRecord = require('./utils/record-log.js');
 *  UtilRecord.test('测试信息');
 * @param {...any} messages - 要记录的消息
 */
async function test(...messages) {
  const { logInfo } = generateBaseLogInfo();
  const formattedMessages = formatMessages(messages);

  if (formattedMessages) {
    // 对齐输出：时间戳和调用者信息 + 消息内容
    const paddedLogInfo = logInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    const finalLogMessage = `[TEST] ${paddedLogInfo}${formattedMessages}`;
    console.log(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'test');
  } else {
    // 仅输出时间戳和调用者信息
    const finalLogMessage = `[TEST] ${logInfo}`;
    console.log(finalLogMessage);
    await writeLogToFile(finalLogMessage, 'test');
  }
}

/**
 * 工具函数 - 输出 trace 级别日志（频繁但大部分时间无意义的日志）
 * 特点：始终写入文件，默认不输出到终端（通过 LOG_TRACE=true 环境变量开启）
 * 
 * @example
 *  const UtilRecord = require('./utils/record-log.js');
 *  UtilRecord.trace('数据更新逻辑正在节流中，跳过本次更新');
 * @param {...any} messages - 要记录的消息
 */
async function trace(...messages) {
  const { logInfo } = generateBaseLogInfo();
  const formattedMessages = formatMessages(messages);

  if (formattedMessages) {
    // 对齐输出：时间戳和调用者信息 + 消息内容
    const paddedLogInfo = logInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    const finalLogMessage = `[TRACE] ${paddedLogInfo}${formattedMessages}`;
    // 只有开启了 LOG_TRACE 环境变量才输出到终端
    if (CONFIG.TRACE_CONSOLE_OUTPUT) {
      console.log(finalLogMessage);
    }
    await writeLogToFile(finalLogMessage, 'trace');
  } else {
    // 仅输出时间戳和调用者信息
    const finalLogMessage = `[TRACE] ${logInfo}`;
    if (CONFIG.TRACE_CONSOLE_OUTPUT) {
      console.log(finalLogMessage);
    }
    await writeLogToFile(finalLogMessage, 'trace');
  }
}

// ==================== 模块导出 ====================
module.exports = {
  debug,
  log,
  error,
  test,
  trace
};