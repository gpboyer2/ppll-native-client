/**
 * 策略日志工具
 * 专门用于量化策略（网格、天地针、MACD等）的日志记录
 * 按 交易对/账户/市场类型/方向 分目录存储，方便排查策略执行情况
 */
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');

// ==================== 常量配置 ====================
const CONFIG = {
  /* 策略日志根目录 */
  STRATEGY_LOG_DIR: path.join(__dirname, '../logs/strategy-log'),

  /* 项目根目录 */
  PROJECT_ROOT: path.resolve(__dirname, '../'),

  /* 日志栈跟踪限制 */
  STACK_TRACE_LIMIT: 20,

  /* 日志对齐宽度 */
  LOG_ALIGNMENT_WIDTH: 80,

  /* 日志排除模式 */
  EXCLUDE_PATTERNS: ['node_modules', 'internal/', '(internal/', 'utils/strategy-log.js'],

  /* trace 日志是否输出到终端（通过环境变量 LOG_TRACE=true 开启） */
  TRACE_CONSOLE_OUTPUT: process.env.LOG_TRACE === 'true'
};

// 初始化策略日志根目录
(function initializeLogDirectory() {
  if (!fs.existsSync(CONFIG.STRATEGY_LOG_DIR)) {
    fs.mkdirSync(CONFIG.STRATEGY_LOG_DIR, { recursive: true });
  }
})();

// ==================== 核心工具函数 ====================

/**
 * 获取策略日志文件路径
 * @param {Object} context - 策略上下文
 * @param {string} context.symbol - 交易对，如 ALLUSDT
 * @param {string} context.apiKey - API Key（完整的，用于区分账户）
 * @param {string} context.market - 市场类型，如 um（U本位）、cm（币本位）、spot（现货）
 * @param {string} context.direction - 方向，如 long、short
 * @returns {string} 日志文件路径
 */
function getStrategyLogFilePath(context) {
  const { symbol, apiKey, market, direction } = context;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const hour = String(today.getHours()).padStart(2, '0');
  const dateString = `${year}-${month}-${day} ${hour}:00:00`;

  // 构建目录路径: logs/strategy-log/{symbol}/{apiKey}/{market}/{direction}/
  const logDir = path.join(
    CONFIG.STRATEGY_LOG_DIR,
    symbol || 'unknown',
    apiKey || 'unknown',
    market || 'unknown',
    direction || 'unknown'
  );

  // 确保目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return path.join(logDir, `${dateString}.log`);
}

/**
 * 将日志写入文件
 * @param {string} logText - 日志文本
 * @param {Object} context - 策略上下文
 */
async function writeLogToFile(logText, context) {
  try {
    const logFilePath = getStrategyLogFilePath(context);
    await fs.promises.appendFile(logFilePath, `${logText}\n`, 'utf8');
  } catch (error) {
    console.error('写入策略日志文件失败:', error.message);
  }
}

/**
 * 格式化日志消息
 * @param {any} message - 日志消息
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
 * @param {string} stackLine - 栈行内容
 * @returns {boolean} 是否应该排除
 */
function shouldExcludeStackLine(stackLine) {
  return CONFIG.EXCLUDE_PATTERNS.some(pattern => stackLine.includes(pattern));
}

/**
 * 从栈行中提取路径信息
 * @param {string} stackLine - 栈行内容
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
 * @returns {string} 文件路径和行号
 */
function getCallerInfo() {
  const originalStackTraceLimit = Error.stackTraceLimit;

  try {
    Error.stackTraceLimit = CONFIG.STACK_TRACE_LIMIT;
    throw new Error();
  } catch (error) {
    const stackLineList = error.stack.split('\n');

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

    return 'unknown:0:0';
  } finally {
    // 确保恢复原始的栈追踪限制
    if (typeof originalStackTraceLimit !== 'undefined') {
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
    return '';
  }

  return messageList.map(message => formatMessage(message)).join(' ');
}

// ==================== 日志输出函数 ====================

/**
 * 创建策略日志记录器
 * @param {Object} context - 策略上下文
 * @param {string} context.symbol - 交易对
 * @param {string} context.apiKey - API Key
 * @param {string} context.market - 市场类型 (um/cm/spot)
 * @param {string} context.direction - 方向 (long/short)
 * @returns {Object} 日志记录器对象
 * 
 * @example
 * const StrategyLog = require('./utils/strategy-log.js');
 * const logger = StrategyLog.createLogger({
 *   symbol: 'BTCUSDT',
 *   apiKey: 'MmsE6fb2HmWWm74dwxRtqrN2iBufutcoJN9oCmyt8q2m2y60QSg4PpsM1MpW5Luz',
 *   market: 'um',
 *   direction: 'long'
 * });
 * logger.log('订单已提交', { orderId: 123456 });
 * logger.error('订单失败', error);
 */
function createLogger(context) {
  const { symbol, apiKey, market, direction } = context;

  // 验证必要参数
  if (!symbol || !apiKey || !market || !direction) {
    console.warn('[StrategyLog] 创建日志记录器时缺少必要参数:', { symbol, apiKey: apiKey ? '***' : undefined, market, direction });
  }

  /**
   * 生成日志前缀
   * @param {string} level - 日志级别
   * @returns {string} 日志前缀
   */
  function generateLogPrefix(level) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const callerInfo = getCallerInfo();
    const baseInfo = `[${timestamp}] ${callerInfo}`;
    const paddedInfo = baseInfo.padEnd(CONFIG.LOG_ALIGNMENT_WIDTH, ' ');
    return level ? `[${level}] ${paddedInfo}` : paddedInfo;
  }

  return {
    /**
     * 记录普通日志
     * @param {...any} messageList - 要记录的消息
     */
    async log(...messageList) {
      const prefix = generateLogPrefix();
      const formattedMessage = formatMessageList(messageList);
      const finalMessage = `${prefix}${formattedMessage}`;
      console.log(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录调试日志
     * @param {...any} messageList - 要记录的消息
     */
    async debug(...messageList) {
      const prefix = generateLogPrefix('DEBUG');
      const formattedMessage = formatMessageList(messageList);
      const finalMessage = `${prefix}${formattedMessage}`;
      console.log(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录错误日志
     * @param {...any} messageList - 要记录的消息
     */
    async error(...messageList) {
      const prefix = generateLogPrefix('ERROR');
      const formattedMessage = formatMessageList(messageList);
      const finalMessage = `${prefix}${formattedMessage}`;
      console.error(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录警告日志
     * @param {...any} messageList - 要记录的消息
     */
    async warn(...messageList) {
      const prefix = generateLogPrefix('WARN');
      const formattedMessage = formatMessageList(messageList);
      const finalMessage = `${prefix}${formattedMessage}`;
      console.warn(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录交易所返回的原始数据
     * @param {string} action - 操作名称，如 submitOrder, getAccount
     * @param {any} data - 交易所返回的数据
     */
    async exchange(action, data) {
      const prefix = generateLogPrefix('EXCHANGE');
      const formattedData = formatMessage(data);
      const finalMessage = `${prefix}[${action}] ${formattedData}`;
      console.log(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录订单相关日志
     * @param {string} action - 操作名称，如 create, cancel, filled
     * @param {any} orderData - 订单数据
     */
    async order(action, orderData) {
      const prefix = generateLogPrefix('ORDER');
      const formattedData = formatMessage(orderData);
      const finalMessage = `${prefix}[${action}] ${formattedData}`;
      console.log(finalMessage);
      await writeLogToFile(finalMessage, context);
    },

    /**
     * 记录 trace 级别日志（频繁但大部分时间无意义的日志）
     * 特点：始终写入文件，默认不输出到终端（通过 LOG_TRACE=true 环境变量开启）
     * @param {...any} messageList - 要记录的消息
     */
    async trace(...messageList) {
      const prefix = generateLogPrefix('TRACE');
      const formattedMessage = formatMessageList(messageList);
      const finalMessage = `${prefix}${formattedMessage}`;
      // 只有开启了 LOG_TRACE 环境变量才输出到终端
      if (CONFIG.TRACE_CONSOLE_OUTPUT) {
        console.log(finalMessage);
      }
      await writeLogToFile(finalMessage, context);
    }
  };
}

// ==================== 模块导出 ====================
module.exports = {
  createLogger
};
