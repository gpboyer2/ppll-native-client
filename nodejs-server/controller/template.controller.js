/**
 * 模板控制器
 * 单用户系统：处理模板相关的业务逻辑，提供模板管理功能
 */
const orderService = require("../service/template.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const { sendSuccess, sendError } = require("../utils/api-response");

const createOrder = catchAsync(async (req, res) => {
    let errorMsg = null;
    const { apiKey, apiSecret } = req.body;

    const result = await orderService.createOrder(req.body).catch(err => {
        if (typeof err === 'string') {
            errorMsg = JSON.parse(err);
        }
        if (typeof err === 'object') {
            errorMsg = err;
        }
    });

    if (errorMsg) {
        return sendError(res, errorMsg.msg || errorMsg.message, 400);
    }

    return sendSuccess(res, result, '创建订单成功', 201);
});

const updateOrder = catchAsync(async (req, res) => {
    const { id, apiKey, apiSecret, ...updateBody } = req.body;

    // 检查必需参数
    if (!id) {
        return sendError(res, '订单ID不能为空', 400);
    }

    // 检查订单是否存在
    const existingOrder = await orderService.getOrderById(id);
    if (!existingOrder) {
        return sendError(res, '订单不存在', 404);
    }

    try {
        const result = await orderService.updateOrderById(id, updateBody);
        return sendSuccess(res, { affectedRows: result[0] }, '订单更新成功');
    } catch (err) {
        return sendError(res, err.message || '服务器内部错误', 500);
    }
});

const deleteOrder = catchAsync(async (req, res) => {
    const deleted = await orderService.deleteOrderById(req.body.id);
    if (!deleted) {
        return sendError(res, '订单不存在', 404);
    }
    return sendSuccess(res, null, '删除订单成功', 204);
});

// 列表查询（分页 + 过滤）
const queryOrders = catchAsync(async (req, res) => {
    // 获取查询参数
    const { id, ids, currentPage = 1, pageSize = 10 } = req.query;

    // 构建查询条件（单用户系统，移除 user_id）
    const filter = {};
    if (id) filter.id = id;
    if (ids) filter.ids = ids;

    const options = { page: parseInt(currentPage, 10) || 1, pageSize: parseInt(pageSize, 10) || 10 };

    const data = await orderService.queryOrders(filter, options);
    return sendSuccess(res, data, '获取订单列表成功');
});


module.exports = {
    createOrder,
    updateOrder,
    deleteOrder,
    queryOrders,
}