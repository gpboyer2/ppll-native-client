/**
 * 网格策略专用日志记录器
 * 独立实现，专门为网格策略设计，使用队列异步写入数据库
 * event_type 由调用方显式传入，不在内部维护
 * 支持所有市场类型（um、spot 等）
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

    // 缓存上一次的日志内容，用于链式调用
    this._lastMessage = null;

    // 数据库写入队列
    this._writeQueue = [];
    this._isProcessingQueue = false;

    // 错误统计
    this._errorCount = 0;
    this._lastErrorTime = null;
    this._lastErrorMessage = null;

    // 错误告警阈值：5分钟内超过10次错误
    this._errorAlertThreshold = 10;
    this._errorAlertWindow = 5 * 60 * 1000; // 5分钟

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
   * 处理数据库写入错误
   * @param {Error} error - 错误对象
   * @param {string} message - 日志消息
   * @param {string} event_type - 事件类型
   */
  _handleWriteError(error, message, event_type) {
    const now = Date.now();

    // 更新错误统计
    this._errorCount++;
    this._lastErrorTime = now;
    this._lastErrorMessage = error?.message || String(error);

    // 检查是否需要告警（5分钟内超过阈值）
    if (this._errorCount >= this._errorAlertThreshold) {
      const timeSinceLastError = this._lastErrorTime ? (now - this._lastErrorTime) : Infinity;

      if (timeSinceLastError <= this._errorAlertWindow) {
        // 输出告警到控制台（避免循环调用 logger）
        const prefix = this.generateLogPrefix('ERROR');
        console.error(`${prefix} [数据库写入告警] 5分钟内已发生${this._errorCount}次写入失败，最近错误: ${this._lastErrorMessage}`);

        // 重置计数器，避免频繁告警
        this._errorCount = 0;
      }
    }

    // 每10次错误输出一次详细错误信息
    if (this._errorCount % 10 === 0) {
      const prefix = this.generateLogPrefix('ERROR');
      console.error(`${prefix} [数据库写入失败] 第${this._errorCount}次失败 | 事件类型: ${event_type} | 消息: ${message} | 错误: ${this._lastErrorMessage}`);
    }
  }

  /**
   * 处理写入队列（保证顺序执行）
   */
  async _processWriteQueue() {
    // 如果已经在处理队列，直接返回
    if (this._isProcessingQueue) {
      if (this.symbol === 'UNIUSDT') {
        console.log(`[GridStrategyLogger] 队列正在处理中，跳过`);
      }
      return;
    }

    this._isProcessingQueue = true;

    if (this.symbol === 'UNIUSDT') {
      console.log(`[GridStrategyLogger] 开始处理队列，队列长度: ${this._writeQueue.length}`);
    }

    try {
      while (this._writeQueue.length > 0) {
        const task = this._writeQueue.shift();

        if (this.symbol === 'UNIUSDT') {
          console.log(`[GridStrategyLogger] 处理任务:`, task);
        }

        try {
          // strategy_id 是必填字段，如果没有则跳过
          if (!this.strategyId) {
            if (this.symbol === 'UNIUSDT') {
              console.log(`[GridStrategyLogger] 缺少 strategyId，跳过写入数据库`);
            }
            continue;
          }

          if (this.symbol === 'UNIUSDT') {
            console.log(`[GridStrategyLogger] strategyId 验证通过: ${this.strategyId}`);
          }

          // 构建数据库记录
          const dbRecord = {
            strategy_id: this.strategyId,
            trading_pair: this.symbol || null,
            event_type: task.event_type,
            message: task.message,
            details: task.details,
            created_at: new Date()
          };

          if (this.symbol === 'UNIUSDT') {
            console.log(`[GridStrategyLogger] 准备写入数据库记录:`, dbRecord);
          }

          // 异步写入数据库
          await db.usd_m_futures_infinite_grid_logs.create(dbRecord);

          if (this.symbol === 'UNIUSDT') {
            console.log(`[GridStrategyLogger] ✅ 数据库写入成功`);
          }

          // 写入成功，重置错误计数
          if (this._errorCount > 0) {
            this._errorCount = 0;
          }
        } catch (error) {
          if (this.symbol === 'UNIUSDT') {
            console.log(`[GridStrategyLogger] ❌ 数据库写入失败:`, error.message);
          }
          this._handleWriteError(error, task.message, task.event_type);
        }
      }
    } finally {
      this._isProcessingQueue = false;
      if (this.symbol === 'UNIUSDT') {
        console.log(`[GridStrategyLogger] 队列处理完成`);
      }
    }
  }

  /**
   * 将日志写入数据库（内部方法，加入队列）
   * @param {string} message - 日志消息
   * @param {string} event_type - 事件类型（由调用方显式传入）
   * @param {Object} details - 详细信息
   */
  writeToDatabase(message, event_type, details = null) {
    // 添加调试日志
    if (this.symbol === 'UNIUSDT') {
      console.log(`[GridStrategyLogger] writeToDatabase 被调用: strategyId=${this.strategyId}, symbol=${this.symbol}, eventType=${event_type}, message=${message}`);
    }

    // 将写入任务加入队列
    this._writeQueue.push({
      message,
      event_type,
      details
    });

    if (this.symbol === 'UNIUSDT') {
      console.log(`[GridStrategyLogger] 队列长度: ${this._writeQueue.length}`);
    }

    // 触发队列处理（异步，不阻塞）
    this._processWriteQueue().catch(error => {
      // 队列处理本身出错（非常罕见）
      const prefix = this.generateLogPrefix('ERROR');
      console.error(`${prefix} [队列处理异常] ${error.message}`);
    });
  }

  /**
   * 记录普通日志（仅输出到终端）
   * @param {...any} messageList - 要记录的消息（可选）
   * @returns {GridStrategyLogger} 返回 this
   */
  log(...messageList) {
    const message = messageList.length > 0 ? this.formatMessageList(messageList) : this._lastMessage;
    if (message) {
      const prefix = this.generateLogPrefix('');
      console.log(`${prefix} ${message}`);
    }
    return this;
  }

  /**
   * 记录调试日志（仅输出到终端）
   * @param {...any} messageList - 要记录的消息（可选）
   * @returns {GridStrategyLogger} 返回 this
   */
  debug(...messageList) {
    const message = messageList.length > 0 ? this.formatMessageList(messageList) : this._lastMessage;
    if (message) {
      const prefix = this.generateLogPrefix('DEBUG');
      console.log(`${prefix} ${message}`);
    }
    return this;
  }

  /**
   * 记录错误日志（仅输出到终端）
   * @param {...any} messageList - 要记录的消息（可选）
   * @returns {GridStrategyLogger} 返回 this
   */
  error(...messageList) {
    const message = messageList.length > 0 ? this.formatMessageList(messageList) : this._lastMessage;
    if (message) {
      const prefix = this.generateLogPrefix('ERROR');
      console.error(`${prefix} ${message}`);
    }
    return this;
  }

  /**
   * 记录警告日志（仅输出到终端）
   * @param {...any} messageList - 要记录的消息（可选）
   * @returns {GridStrategyLogger} 返回 this
   */
  warn(...messageList) {
    const message = messageList.length > 0 ? this.formatMessageList(messageList) : this._lastMessage;
    if (message) {
      const prefix = this.generateLogPrefix('WARN');
      console.warn(`${prefix} ${message}`);
    }
    return this;
  }

  /**
   * 写入数据库并缓存日志内容用于链式调用
   * @param {string} event_type - 事件类型
   * @param {string} message - 日志消息
   * @param {Object} details - 详细信息
   * @returns {GridStrategyLogger} 返回 this 支持链式调用
   */
  sql(event_type, message, details = null) {
    // 缓存日志内容
    this._lastMessage = message;
    // 写入数据库
    this.writeToDatabase(message, event_type, details);
    return this;
  }

  /**
   * 销毁日志记录器，清理资源
   * 确保队列中的日志都已写入数据库
   */
  async destroy() {
    // 等待队列处理完成
    while (this._writeQueue.length > 0 || this._isProcessingQueue) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 获取错误统计信息（用于监控）
   * @returns {Object} 错误统计信息
   */
  getErrorStats() {
    return {
      errorCount: this._errorCount,
      lastErrorTime: this._lastErrorTime,
      lastErrorMessage: this._lastErrorMessage,
      queueLength: this._writeQueue.length
    };
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
