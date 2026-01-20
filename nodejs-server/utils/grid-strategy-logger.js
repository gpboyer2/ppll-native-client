/**
 * 网格策略专用日志记录器
 * 独立实现，专门为网格策略设计，直接同步写入数据库
 * event_type 由调用方显式传入，不在内部维护
 */
const dayjs = require('dayjs');
const db = require('../models');

/**
 * 网格策略日志记录器类
 */
class GridStrategyLogger {
  /**
   * @param {Object} config - 日志配置
   * @param {string} config.symbol - 交易对
   * @param {string} config.apiKey - API Key
   * @param {string} config.market - 市场类型 (um)
   * @param {string} config.direction - 方向 (long/short)
   * @param {number} config.strategyId - 策略ID
   */
  constructor(config) {
    this.config = config;
    this.strategyId = config.strategyId;
    this.symbol = config.symbol;
    this.apiKey = config.apiKey;
    this.market = config.market;
    this.direction = config.direction;

    // 验证必要参数
    if (!this.symbol || !this.apiKey || !this.market || !this.direction) {
      console.warn('[GridStrategyLogger] 创建日志记录器时缺少必要参数:', {
        symbol: this.symbol,
        apiKey: this.apiKey ? '***' : undefined,
        market: this.market,
        direction: this.direction
      });
    }
  }

  /**
   * 生成日志前缀
   * @param {string} level - 日志级别
   * @returns {string} 日志前缀
   */
  generateLogPrefix(level = '') {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const baseInfo = `[${timestamp}] [${this.symbol}][${this.direction}]`;
    return level ? `[${level}] ${baseInfo}` : baseInfo;
  }

  /**
   * 格式化日志消息
   * @param {Array} messageList - 消息数组
   * @returns {string} 格式化后的消息字符串
   */
  formatMessageList(messageList) {
    if (!Array.isArray(messageList) || messageList.length === 0) {
      return '';
    }

    return messageList.map(message => {
      if (typeof message === 'object' && message !== null) {
        try {
          return JSON.stringify(message);
        } catch (error) {
          return '[无法序列化的对象]';
        }
      }
      return String(message);
    }).join(' ');
  }

  /**
   * 将日志写入数据库（直接同步写入）
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {Object} details - 详细信息
   */
  async writeToDatabase(level, message, event_type, details = null) {
    try {
      // 只对 um 市场（U本位合约）写入数据库
      if (this.market !== 'um') {
        console.log('[GridStrategyLogger] 非 um 市场，跳过写入数据库');
        return;
      }

      // strategy_id 是必填字段，如果没有则不写入数据库
      if (!this.strategyId) {
        console.log('[GridStrategyLogger] 缺少 strategyId，跳过写入数据库');
        return;
      }

      // 构建数据库记录
      const dbRecord = {
        strategy_id: this.strategyId,
        trading_pair: this.symbol || null,
        event_type: event_type,
        level: level,
        message: message,
        details: details,
        created_at: new Date()
      };

      // 直接同步写入数据库
      await db.usd_m_futures_infinite_grid_logs.create(dbRecord);
    } catch (error) {
      console.error('[GridStrategyLogger] 写入数据库失败:', error?.message || error);
    }
  }

  /**
   * 记录普通日志
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {...any} messageList - 要记录的消息
   */
  async log(event_type, ...messageList) {
    const formattedMessage = this.formatMessageList(messageList);
    const prefix = this.generateLogPrefix('');
    const finalMessage = `${prefix} ${formattedMessage}`;
    console.log(finalMessage);
    await this.writeToDatabase('info', formattedMessage, event_type);
  }

  /**
   * 记录调试日志
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {...any} messageList - 要记录的消息
   */
  async debug(event_type, ...messageList) {
    const formattedMessage = this.formatMessageList(messageList);
    const prefix = this.generateLogPrefix('DEBUG');
    const finalMessage = `${prefix} ${formattedMessage}`;
    console.log(finalMessage);
    await this.writeToDatabase('debug', formattedMessage, event_type);
  }

  /**
   * 记录错误日志
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {...any} messageList - 要记录的消息
   */
  async error(event_type, ...messageList) {
    const formattedMessage = this.formatMessageList(messageList);
    const prefix = this.generateLogPrefix('ERROR');
    const finalMessage = `${prefix} ${formattedMessage}`;
    console.error(finalMessage);
    await this.writeToDatabase('error', formattedMessage, event_type);
  }

  /**
   * 记录警告日志
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {...any} messageList - 要记录的消息
   */
  async warn(event_type, ...messageList) {
    const formattedMessage = this.formatMessageList(messageList);
    const prefix = this.generateLogPrefix('WARN');
    const finalMessage = `${prefix} ${formattedMessage}`;
    console.warn(finalMessage);
    await this.writeToDatabase('warn', formattedMessage, event_type);
  }

  /**
   * 记录交易所返回的原始数据（不写入数据库）
   * @param {string} action - 操作名称，如 submitOrder, getAccount
   * @param {any} data - 交易所返回的数据
   */
  async exchange(action, data) {
    const formattedData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const message = `[${action}] ${formattedData}`;
    const prefix = this.generateLogPrefix('EXCHANGE');
    const finalMessage = `${prefix} ${message}`;
    console.log(finalMessage);
    // 交易所数据不写入数据库
  }

  /**
   * 记录订单相关日志
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {string} action - 操作名称，如 create, cancel, filled
   * @param {any} orderData - 订单数据
   */
  async order(event_type, action, orderData) {
    const formattedData = typeof orderData === 'object' ? JSON.stringify(orderData) : String(orderData);
    const message = `[${action}] ${formattedData}`;
    const prefix = this.generateLogPrefix('ORDER');
    const finalMessage = `${prefix} ${message}`;
    console.log(finalMessage);

    // 订单操作写入数据库
    await this.writeToDatabase('info', message, event_type, orderData);
  }

  /**
   * 记录 trace 级别日志（频繁但大部分时间无意义的日志）
   * 特点：始终写入文件，默认不输出到终端（通过 LOG_TRACE=true 环境变量开启）
   * @param {...any} messageList - 要记录的消息
   */
  async trace(...messageList) {
    const formattedMessage = this.formatMessageList(messageList);
    const prefix = this.generateLogPrefix('TRACE');
    const finalMessage = `${prefix} ${formattedMessage}`;

    // 只有开启了 LOG_TRACE 环境变量才输出到终端
    if (process.env.LOG_TRACE === 'true') {
      console.log(finalMessage);
    }

    // trace 日志不写入数据库
  }

  /**
   * 销毁日志记录器，清理资源
   */
  destroy() {
    // 直接同步写入，无需清理队列
  }
}

// 导出类和创建函数
module.exports = {
  GridStrategyLogger,

  /**
   * 创建网格策略日志记录器
   * @param {Object} config - 日志配置
   * @returns {GridStrategyLogger} 日志记录器实例
   */
  createLogger(config) {
    return new GridStrategyLogger(config);
  }
};
