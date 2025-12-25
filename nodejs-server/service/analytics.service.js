const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const db = require('../models');
const { Op } = require('sequelize');
const { parseUa } = require('../utils/ua-parser');

// 从 models 中引用模型（注意模型名为 operation_logs）
const OperationLogModel = db.operation_logs;
const PageViewLog = db.page_view_log;

/**
 * 服务层 - 提供埋点日志相关功能
 * 
 * @description 用户行为数据分析埋点服务
 * @author guipeng
 * @since 2025-07-18
 */

/**
 * 记录用户事件日志
 * 
 * @example
 *  const AnalyticsService = require('../service/analytics.service.js');
 *  await AnalyticsService.logUserEvent(userId, 'login', 'homepage');
 *  
 * @param {number} userId - 用户ID
 * @param {string} action - 用户操作
 * @param {string} page - 访问页面
 * @param {string} errorCode - 报错码(可选)
 * @param {string} errorMessage - 报错信息(可选)
 * @returns {Promise<void>}
 */
async function logUserEvent(userId, action, page, errorCode, errorMessage) {
  try {
    // 注意：user_event_log 模型在当前代码中不存在，
    // 使用 OperationLogModel 代替，或后续创建对应模型
    await OperationLogModel.create({
      user_id: userId,
      action: action,
      description: `${action} on ${page}`,
      page: page,
      // 映射到扩展数据中
      extra_data: (errorCode || errorMessage) ? { error_code: errorCode, error_message: errorMessage } : null,
      status: (errorCode || errorMessage) ? 0 : 1,
      operation_time: new Date(),
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to log user event:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to log user event');
  }
}

/**
 * 记录用户操作日志
 * 
 * @example
 *  const AnalyticsService = require('../service/analytics.service.js');
 *  await AnalyticsService.logUserAction(userId, 'update_profile', 'Updated profile picture', 'settings');
 * 
 * @param {number} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {string} description - 操作描述
 * @param {string} page - 所在页面
 * @param {string} ipAddress - IP地址(可选)
 * @param {string} userAgent - 设备/浏览器信息(可选)
 * @param {object} extraData - 扩展信息(可选)
 * @returns {Promise<void>}
 */
async function logUserAction(userId, action, description, page, ipAddress, userAgent, extraData, options = {}) {
  try {
    const operator = options.operator || null;
    const moduleName = options.module || (page ? String(page).replace(/^\//, '').split('/')[0] : null);
    const summary = options.summary || description || action || null;
    const status = typeof options.status === 'number' ? (options.status === 1 ? 1 : 0) : ((extraData && (extraData.error || extraData.error_message)) ? 0 : 1);
    const operationTime = options.operationTime ? new Date(options.operationTime) : new Date();

    // 使用 ua-parser 解析 UA 获得 OS/浏览器
    const { os: osName, browser: browserName } = parseUa(userAgent);

    await OperationLogModel.create({
      user_id: userId,
      operator,
      module: moduleName,
      action,
      summary,
      description,
      page,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      os: osName,
      browser: browserName,
      extra_data: extraData || null,
      status,
      operation_time: operationTime,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to log user action:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to log user action');
  }
}

/**
 * 记录页面访问日志
 * 
 * @example
 *  const AnalyticsService = require('../service/analytics.service.js');
 *  await AnalyticsService.logPageView(userId, '/dashboard', '/home', '192.168.1.1', 'Mozilla/5.0', 30);
 * 
 * @param {number} userId - 用户ID
 * @param {string} page - 页面路径
 * @param {string} referrer - 来源页面(可选)
 * @param {string} ipAddress - IP地址(可选)
 * @param {string} userAgent - 设备/浏览器信息(可选)
 * @param {number} duration - 停留时长(秒, 可选)
 * @param {object} extraData - 扩展信息(可选)
 * @returns {Promise<void>}
 */
async function logPageView(userId, page, referrer, ipAddress, userAgent, duration, extraData) {
  try {
    await PageViewLog.create({
      user_id: userId,
      page,
      referrer: referrer || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      duration: duration || null,
      extra_data: extraData || null,
      created_at: new Date()
    });
  } catch (err) {
    console.error('Failed to log page view:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to log page view');
  }
}

/**
 * 批量记录用户操作日志
 * 
 * @param {Array<object>} logs - 日志对象数组
 * @returns {Promise<void>}
 */
async function batchLogUserActions(logs) {
  try {
    const formattedLogs = logs.map(log => ({
      user_id: log.userId,
      operator: log.operator || null,
      module: log.module || (log.page ? String(log.page).replace(/^\//, '').split('/')[0] : null),
      action: log.action,
      summary: log.summary || log.description || log.action || null,
      description: log.description,
      page: log.page,
      ip_address: log.ipAddress || null,
      user_agent: log.userAgent || null,
      ...parseUa(log.userAgent),
      extra_data: log.extraData || null,
      status: typeof log.status === 'number' ? (log.status === 1 ? 1 : 0) : ((log.extraData && (log.extraData.error || log.extraData.error_message)) ? 0 : 1),
      operation_time: log.operationTime ? new Date(log.operationTime) : (log.created_at || new Date()),
      created_at: log.created_at || new Date(),
    }));

    await OperationLogModel.bulkCreate(formattedLogs, {
      // 日志由 Go 端统一控制：默认不打印
      logging: false
    });
  } catch (err) {
    console.error('Failed to batch log user actions:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to batch log user actions');
  }
}

/**
 * 获取用户行为统计
 * 
 * @param {number} userId - 用户ID
 * @param {object} options - 查询选项
 * @param {string} options.startDate - 开始日期
 * @param {string} options.endDate - 结束日期
 * @param {string} options.action - 操作类型(可选)
 * @returns {Promise<object>} 统计数据
 */
async function getUserActionStats(userId, options = {}) {
  try {
    const { startDate, endDate, action } = options;
    const where = { user_id: userId };

    // 兼容不同模型的时间字段：优先 operation_time
    const timeField = OperationLogModel?.rawAttributes?.operation_time ? 'operation_time' : 'created_at';
    if (startDate || endDate) {
      where[timeField] = {};
      if (startDate) where[timeField][Op.gte] = startDate;
      if (endDate) where[timeField][Op.lte] = endDate;
    }
    if (action) where.action = action;

    return await OperationLogModel.findAndCountAll({
      where,
      order: [[timeField, 'DESC']],
      limit: 1000
    });
  } catch (err) {
    console.error('Failed to get user action stats:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to get user action stats');
  }
}

module.exports = {
  logUserEvent,
  logUserAction,
  logPageView,
  batchLogUserActions,
  getUserActionStats
};
