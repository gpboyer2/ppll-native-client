const httpStatus = require('http-status');
const ApiError = require('../utils/api-error');
const db = require('../models');
const { Op } = require('sequelize');
const { parseUa } = require('../utils/ua-parser');

// 从 models 中引用模型（注意模型名为 operation_logs）
const OperationLogModel = db.operation_logs;

/**
 * 服务层 - 提供埋点日志相关功能
 * 
 * @description 用户行为数据分析埋点服务
 * @author guipeng
 * @since 2025-07-18
 */

/**
 * 记录用户事件日志（单用户系统）
 *
 * @example
 *  const AnalyticsService = require('../service/analytics.service.js');
 *  await AnalyticsService.logUserEvent('login', 'homepage');
 *
 * @param {string} action - 用户操作
 * @param {string} page - 访问页面
 * @param {string} errorCode - 报错码(可选)
 * @param {string} error_message - 报错信息(可选)
 * @returns {Promise<void>}
 */
async function logUserEvent(action, page, errorCode, error_message) {
  try {
    await OperationLogModel.create({
      action: action,
      description: `${action} on ${page}`,
      page: page,
      // 映射到扩展数据中
      extra_data: (errorCode || error_message) ? { error_code: errorCode, error_message: error_message } : null,
      status: (errorCode || error_message) ? 0 : 1,
      operation_time: new Date(),
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to log user event:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to log user event');
  }
}

/**
 * 记录用户操作日志（单用户系统）
 *
 * @example
 *  const AnalyticsService = require('../service/analytics.service.js');
 *  await AnalyticsService.logUserAction('update_profile', 'Updated profile picture', 'settings');
 *
 * @param {string} action - 操作类型
 * @param {string} description - 操作描述
 * @param {string} page - 所在页面
 * @param {string} ipAddress - IP地址(可选)
 * @param {string} userAgent - 设备/浏览器信息(可选)
 * @param {object} extraData - 扩展信息(可选)
 * @returns {Promise<void>}
 */
async function logUserAction(action, description, page, ipAddress, userAgent, extraData, options = {}) {
  try {
    const operator = options.operator || null;
    const module_name = options.module || (page ? String(page).replace(/^\//, '').split('/')[0] : null);
    const summary = options.summary || description || action || null;
    const status = typeof options.status === 'number' ? (options.status === 1 ? 1 : 0) : ((extraData && (extraData.error || extraData.error_message)) ? 0 : 1);
    const operation_time = options.operationTime ? new Date(options.operationTime) : new Date();

    // 使用 ua-parser 解析 UA 获得 OS/浏览器
    const { os: osName, browser: browserName } = parseUa(userAgent);

    await OperationLogModel.create({
      operator,
      module: module_name,
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
      operation_time: operation_time,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to log user action:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to log user action');
  }
}

/**
 * 批量记录用户操作日志（单用户系统）
 *
 * @param {Array<object>} logs - 日志对象数组
 * @returns {Promise<void>}
 */
async function batchLogUserActions(logs) {
  try {
    const formatted_logs = logs.map(log => ({
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

    await OperationLogModel.bulkCreate(formatted_logs, {
      // 日志由 Go 端统一控制：默认不打印
      logging: false
    });
  } catch (err) {
    console.error('Failed to batch log user actions:', err);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Failed to batch log user actions');
  }
}

/**
 * 获取用户行为统计（单用户系统）
 *
 * @param {object} options - 查询选项
 * @param {string} options.startDate - 开始日期
 * @param {string} options.endDate - 结束日期
 * @param {string} options.action - 操作类型(可选)
 * @returns {Promise<object>} 统计数据
 */
async function getUserActionStats(options = {}) {
  try {
    const { startDate, endDate, action } = options;
    const where = {};

    // 兼容不同模型的时间字段：优先 operation_time
    const time_field = OperationLogModel?.rawAttributes?.operation_time ? 'operation_time' : 'created_at';
    if (startDate || endDate) {
      where[time_field] = {};
      if (startDate) where[time_field][Op.gte] = startDate;
      if (endDate) where[time_field][Op.lte] = endDate;
    }
    if (action) where.action = action;

    return await OperationLogModel.findAndCountAll({
      where,
      order: [[time_field, 'DESC']],
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
  batchLogUserActions,
  getUserActionStats
};
