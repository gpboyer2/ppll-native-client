/**
 * U本位合约无限网格策略日志控制器
 * 处理插件日志相关的API请求
 */
const { pick } = require('../utils/pick');
const catchAsync = require('../utils/catch-async');
const usd_m_futures_infinite_grid_event_manager = require('../managers/usd-m-futures-infinite-grid-event-manager');

/**
 * 查询插件日志列表
 */
const getPluginLogList = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['strategy_id', 'trading_pair', 'event_type', 'level', 'start_time', 'end_time']);
  const options = pick(req.query, ['sortBy', 'page_size', 'current_page']);

  const result = await usd_m_futures_infinite_grid_event_manager.getLogs(filter, options);
  return res.apiSuccess(result, '查询成功');
});

/**
 * 获取插件日志统计
 */
const getPluginLogStatistics = catchAsync(async (req, res) => {
  const { strategy_id } = req.query;

  const statistics = await usd_m_futures_infinite_grid_event_manager.getStatistics(strategy_id);
  return res.apiSuccess(statistics, '获取统计成功');
});

/**
 * 清理旧日志
 */
const cleanOldLogs = catchAsync(async (req, res) => {
  const { days = 30 } = req.body;

  const deleted = await usd_m_futures_infinite_grid_event_manager.cleanOldLogs(days);
  return res.apiSuccess({ deleted }, `清理了 ${deleted} 条旧日志`);
});

module.exports = {
  getPluginLogList,
  getPluginLogStatistics,
  cleanOldLogs,
};
