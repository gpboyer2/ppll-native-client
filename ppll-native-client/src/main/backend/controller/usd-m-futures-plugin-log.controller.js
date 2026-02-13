/**
 * U本位合约无限网格策略日志控制器
 * 处理插件日志相关的API请求
 */
const { pick } = require("../utils/pick");
const catchAsync = require("../utils/catch-async");
const usd_m_futures_infinite_grid_event_manager = require("../managers/usd-m-futures-infinite-grid-event-manager");
const db = require("../models");

/**
 * 查询插件日志列表
 */
const list = catchAsync(async (req, res) => {
    const filter = pick(req.query, [
        "strategy_id",
        "trading_pair",
        "event_type",
        "start_time",
        "end_time",
    ]);
    const options = pick(req.query, ["sortBy", "page_size", "current_page"]);

    const result = await usd_m_futures_infinite_grid_event_manager.getLogs(
        filter,
        options,
    );
    return res.apiSuccess(result, "查询成功");
});

/**
 * 获取插件日志统计
 */
const getStatistics = catchAsync(async (req, res) => {
    const { strategy_id } = req.query;

    const statistics =
        await usd_m_futures_infinite_grid_event_manager.getStatistics(
            strategy_id,
        );
    return res.apiSuccess(statistics, "获取统计成功");
});

/**
 * 创建插件日志
 */
const create = catchAsync(async (req, res) => {
    const log = await usd_m_futures_infinite_grid_event_manager.logEvent({
        strategyId: req.body.strategy_id,
        tradingPair: req.body.trading_pair,
        eventType: req.body.event_type,
        message: req.body.message,
        details: req.body.details,
    });

    return res.apiSuccess(log, "创建成功");
});

/**
 * 更新插件日志
 * 注意：日志通常不允许更新，此接口仅供特殊情况下使用
 */
const update = catchAsync(async (req, res) => {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.apiError(null, "请提供要更新的日志ID列表");
    }

    const [id] = data;
    const { message, details } = req.body;

    const log = await db.usd_m_futures_infinite_grid_logs.findByPk(id);
    if (!log) {
        return res.apiError(null, "日志不存在");
    }

    if (message !== undefined) log.message = message;
    if (details !== undefined) log.details = details;

    await log.save();

    return res.apiSuccess(log, "更新成功");
});

/**
 * 删除插件日志
 */
const deleteLog = catchAsync(async (req, res) => {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.apiError(null, "请提供要删除的日志ID列表");
    }

    const deleted = await db.usd_m_futures_infinite_grid_logs.destroy({
        where: {
            id: data,
        },
    });

    return res.apiSuccess({ deleted }, `删除了 ${deleted} 条日志`);
});

/**
 * 清理旧日志（按时间）
 */
const cleanOldLogs = catchAsync(async (req, res) => {
    const { days = 30 } = req.body;

    const deleted =
        await usd_m_futures_infinite_grid_event_manager.cleanOldLogs(days);
    return res.apiSuccess({ deleted }, `清理了 ${deleted} 条旧日志`);
});

module.exports = {
    list,
    getStatistics,
    create,
    update,
    delete: deleteLog,
    cleanOldLogs,
};
