/**
 * 模板控制器
 * 本地客户端系统：处理模板相关的业务逻辑，提供模板管理功能
 */
const orderService = require("../service/template.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");

const createOrder = catchAsync(async (req, res) => {
    /** @type {{msg?: string} | null} */
    let error_msg = null;

    const result = await orderService.createOrder(req.body).catch((err) => {
        if (typeof err === "string") {
            error_msg = JSON.parse(err);
        }
        if (typeof err === "object") {
            error_msg = err;
        }
    });

    if (error_msg) {
        return res.apiError(null, error_msg.msg);
    }

    return res.apiSuccess(result, "创建订单成功");
});

const updateOrder = catchAsync(async (req, res) => {
    const { id } = req.body;

    // 检查必需参数
    if (!id) {
        return res.apiError(null, "订单ID不能为空");
    }

    // 检查订单是否存在
    const existingOrder = await orderService.getOrderById(id);
    if (!existingOrder) {
        return res.apiError(null, "订单不存在");
    }

    const updateBody = Object.assign({}, req.body);
    delete updateBody.id;

    try {
        const result = await orderService.updateOrderById(id, updateBody);
        return res.apiSuccess({ affectedRows: result[0] }, "订单更新成功");
    } catch (err) {
        return res.apiError(null, err.message || "服务器内部错误");
    }
});

const deleteOrder = catchAsync(async (req, res) => {
    const deleted = await orderService.deleteOrderById(req.body.id);
    if (!deleted) {
        return res.apiError(null, "订单不存在");
    }
    return res.apiSuccess(null, "删除订单成功");
});

// 列表查询（分页 + 过滤）
const queryOrders = catchAsync(async (req, res) => {
    // 获取查询参数
    const { id, ids, currentPage = 1, pageSize = 10 } = req.query;

    // 构建查询条件（本地客户端系统，无需 user_id）
    const filter = {};
    if (id) filter.id = id;
    if (ids) filter.ids = ids;

    const options = {
        page: parseInt(currentPage, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 10,
    };

    const data = await orderService.queryOrders(filter, options);
    return res.apiSuccess(data, "获取订单列表成功");
});

module.exports = {
    createOrder,
    updateOrder,
    deleteOrder,
    queryOrders,
};
