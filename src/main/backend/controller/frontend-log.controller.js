const catchAsync = require("../utils/catch-async");
const db = require("../models");
const { add_frontend_log } = require("../service/frontend-logs.service");

const FrontendLog = db.frontend_log;

/**
 * 创建前端日志
 * @route POST /api/frontend-logs/create
 */
const create = catchAsync(async (req, res) => {
    // 使用公共函数添加日志（自动清理旧数据）
    const logs = await add_frontend_log([Object.assign({}, req.body)]);
    return res.apiSuccess(logs, "日志记录成功");
});

/**
 * 获取前端日志列表
 * @route GET /api/frontend-logs/list
 */
const list = catchAsync(async (req, res) => {
    const { current_page = 1, page_size = 20, log_level } = req.query;
    const offset = (current_page - 1) * page_size;

    const where_clause = {};
    if (log_level) {
        where_clause.log_level = log_level;
    }

    const { count, rows } = await FrontendLog.findAndCountAll({
        where: where_clause,
        // 按前端时间戳倒序排序（最新的在前），如果时间戳相同则按数据库创建时间倒序
        order: [
            ["log_timestamp", "DESC"],
            ["created_at", "DESC"],
        ],
        limit: parseInt(page_size),
        offset: offset,
        // 排除不需要的字段（log_timestamp 只用于排序，不需要返回给前端）
        attributes: {
            exclude: [
                "id",
                "created_at",
                "user_agent",
                "page_url",
                "log_timestamp",
            ],
        },
    });

    return res.apiSuccess({
        list: rows,
        pagination: {
            current_page: parseInt(current_page),
            page_size: parseInt(page_size),
            total: count,
        },
    });
});

/**
 * 删除前端日志
 * @route POST /api/frontend-logs/delete
 */
const delete_logs = catchAsync(async (req, res) => {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.apiError(null, "删除ID列表不能为空");
    }

    await FrontendLog.destroy({
        where: {
            id: data,
        },
    });

    return res.apiSuccess(null, "删除成功");
});

module.exports = {
    create,
    list,
    delete_logs,
};
