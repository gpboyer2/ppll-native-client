const db = require('../models');
const UtilRecord = require('../utils/record-log.js');

const FrontendLog = db.frontend_log;

// 清理配置
const CLEANUP_INTERVAL = 10 * 1000; // 10秒
const RETENTION_MINUTES = 3; // 保留3分钟

// 最后清理时间
let last_cleanup_time = Date.now();

/**
 * 清理旧日志（3分钟之前的）
 */
async function cleanup_old_logs() {
  const now = Date.now();

  // 检查是否需要清理（每10秒执行一次）
  if (now - last_cleanup_time < CLEANUP_INTERVAL) {
    return;
  }

  last_cleanup_time = now;

  try {
    const cutoff_time = new Date(now - RETENTION_MINUTES * 60 * 1000);

    const deleted_count = await FrontendLog.destroy({
      where: {
        created_at: {
          [db.Sequelize.Op.lt]: cutoff_time
        }
      }
    });

    if (deleted_count > 0) {
      UtilRecord.log(`[FrontendLogService] 清理 ${deleted_count} 条旧日志（${RETENTION_MINUTES}分钟前）`);
    }
  } catch (error) {
    UtilRecord.trace(`[FrontendLogService] 清理旧日志失败: ${error.message}`);
  }
}

/**
 * 添加前端日志（支持单个和批量）
 * @param {Array<object>} log_list - 日志数组
 * @param {any} log_list[].log_data - 日志数据（数组）
 * @param {string} log_list[].page_url - 页面URL
 * @param {string} log_list[].user_agent - 用户代理
 * @returns {Promise<Array<object>>} 创建成功的日志记录列表
 */
async function add_frontend_log(log_list) {
  if (!Array.isArray(log_list) || log_list.length === 0) {
    return [];
  }

  try {
    // 先尝试清理旧日志
    await cleanup_old_logs();

    // 批量创建日志记录
    const log_promises = log_list.map(log =>
      FrontendLog.create({
        log_data: log.log_data,
        page_url: log.page_url,
        user_agent: log.user_agent,
      }).catch(err => {
        // 静默失败，避免日志系统本身产生大量错误
        UtilRecord.trace(`[FrontendLogService] 保存前端日志失败: ${err.message}`);
        return null;
      })
    );

    const results = await Promise.all(log_promises);
    // 过滤掉失败的记录
    return results.filter(result => result !== null);
  } catch (error) {
    UtilRecord.trace(`[FrontendLogService] 保存前端日志失败: ${error.message}`);
    return [];
  }
}

module.exports = {
  add_frontend_log,
};
