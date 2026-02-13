const db = require("../models/index.js");
const GridTradeHistory = db["grid_trade_history"]; // 模型名与 models/grid-trade-history.js 的 modelName 一致
const ApiError = require("../utils/api-error");

/**
 * 过滤参数函数: 仅保留模型中存在的字段
 * @param {Object} params
 * @param {Object} model
 * @returns {Object}
 */
const filterParams = (params, model) => {
    const allowed_fields = Object.keys(model.rawAttributes || {});
    return Object.keys(params || {}).reduce((acc, key) => {
        if (allowed_fields.includes(key)) acc[key] = params[key];
        return acc;
    }, {});
};

/**
 * 创建一条交易历史
 * @param {Object} body
 * @returns {Promise<Object>}
 */
const createTradeHistory = async (body) => {
    try {
        console.log("[grid-trade-history] 准备写入交易历史:", {
            grid_id: body.grid_id,
            trading_pair: body.trading_pair,
            position_side: body.position_side,
            trade_direction: body.trade_direction,
            remark: body.remark,
            entry_time: body.entry_time,
            exit_time: body.exit_time,
        });

        // 仅保留模型字段，避免非法字段写入
        const instance = GridTradeHistory.build(body);
        const valid_params = instance.get();

        // 验证数据
        await instance.validate();

        // 写入数据库
        const row = await GridTradeHistory.create(valid_params);

        console.log("[grid-trade-history] 交易历史写入成功, id:", row.id);
        return row;
    } catch (error) {
        console.error("[grid-trade-history] 创建交易历史失败:", {
            error: error.message,
            grid_id: body.grid_id,
            trading_pair: body.trading_pair,
            position_side: body.position_side,
            trade_direction: body.trade_direction,
            remark: body.remark,
        });
        throw error;
    }
};

/**
 * 分页查询交易历史
 * @param {Object} filter 过滤条件（必须是模型字段）
 * @param {{currentPage?: number, pageSize?: number}} options 分页参数
 * @returns {Promise<{list:any[], pagination:{currentPage:number, pageSize:number, total:number}}>}
 */
const getAllTradeHistories = async (
    filter = {},
    options = { currentPage: 1, pageSize: 10 },
) => {
    try {
        const { currentPage = 1, pageSize = 10 } = options;
        const offset = currentPage ? (currentPage - 1) * pageSize : 0;

        // 过滤出模型允许的 where 字段
        const where = filterParams(filter, GridTradeHistory);

        const { count, rows } = await GridTradeHistory.findAndCountAll({
            where,
            limit: pageSize,
            offset,
            order: [["id", "DESC"]],
        });

        return {
            list: rows,
            pagination: {
                total: count,
                currentPage,
                pageSize,
            },
        };
    } catch (error) {
        console.error("⚠️ 获取交易历史失败:", error);
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        return {
            list: [],
            pagination: { total: 0, currentPage: 1, pageSize: 10 },
        };
    }
};

/** 根据ID获取交易历史 */
const getTradeHistoryById = async (id) => {
    return GridTradeHistory.findByPk(id);
};

/**
 * 更新交易历史（按 id + api_key + 可选 id（网格策略ID） 进行约束更安全）
 * @param {Object} body 必须包含 id
 */
const updateTradeHistoryById = async (body) => {
    const instance = GridTradeHistory.build(body);
    const params = instance.get();
    const { id, api_key } = params;
    if (!id) throw new Error("缺少参数: id");

    const where = { id };
    if (api_key) where.api_key = api_key; // 保护性约束

    const row = await GridTradeHistory.update(
        filterParams(params, GridTradeHistory),
        { where },
    );

    if (row?.length && Number(row[0]) > 0) {
        const updated = await GridTradeHistory.findByPk(id);
        return { affected: row[0], data: updated };
    }
    return { affected: 0, data: null };
};

/**
 * 批量删除交易历史
 * @param {{ ids: number[]; api_key?: string }} body
 */
const deleteTradeHistoriesByIds = async (body) => {
    const { ids = [], api_key } = body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("缺少参数: ids");
    }
    const where = { id: ids };
    if (api_key) where.api_key = api_key; // 保护性约束
    const affected = await GridTradeHistory.destroy({ where });
    return { affected };
};

module.exports = {
    createTradeHistory,
    getAllTradeHistories,
    getTradeHistoryById,
    updateTradeHistoryById,
    deleteTradeHistoriesByIds,
};
