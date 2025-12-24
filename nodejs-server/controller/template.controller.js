/**
 * 模板控制器
 * 处理模板相关的业务逻辑，提供模板管理功能
 */
const orderService = require("../service/template.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const userService = require("../service/user.service");

const createOrder = catchAsync(async (req, res) => {
    let errorMsg = null;
    const { apiKey, apiSecret } = req.body;

    const result = await orderService.createOrder(req.body).catch(error => {
        if (typeof error === 'string') {
            errorMsg = JSON.parse(error);
        }
        if (typeof error === 'object') {
            errorMsg = error;
        }
    });

    if (errorMsg) {
        res.send({
            status: 'error',
            code: 400,
            message: errorMsg.msg || errorMsg.message
        })
        return;
    }

    res.send({
        status: 1,
        data: result
    })
});

const updateOrder = catchAsync(async (req, res) => {
    const { id, apiKey, apiSecret, ...updateBody } = req.body;

    // 检查必需参数
    if (!id) {
        res.send({
            status: 'error',
            code: 400,
            message: '订单ID不能为空'
        });
        return;
    }

    // 检查订单是否存在
    const existingOrder = await orderService.getOrderById(id);
    if (!existingOrder) {
        res.send({
            status: 'error',
            code: 404,
            message: '订单不存在'
        });
        return;
    }

    try {
        const result = await orderService.updateOrderById(id, updateBody);

        res.send({
            status: 'success',
            code: 200,
            message: '订单更新成功',
            data: {
                affectedRows: result[0] // Sequelize update 返回数组，第一个元素是受影响的行数
            }
        });
    } catch (error) {
        res.send({
            status: 'error',
            code: 500,
            message: error.message || '服务器内部错误'
        });
    }
});

const deleteOrder = catchAsync(async (req, res) => {
    const deleted = await orderService.deleteOrderById(req.body.id);
    if (!deleted) {
        res.send({
            "message": "Order not found",
        })
    }
    res.status(httpStatus.NO_CONTENT).send();
});

// 列表查询（分页 + 过滤）
const queryOrders = catchAsync(async (req, res) => {
    // 获取查询参数
    const { id, ids, user_id, currentPage = 1, pageSize = 10 } = req.query;
    
    // 构建查询条件
    const filter = {};
    if (id) filter.id = id;
    if (ids) filter.ids = ids;
    if (user_id) filter.user_id = user_id;
    
    const options = { page: parseInt(currentPage, 10) || 1, pageSize: parseInt(pageSize, 10) || 10 };
    
    const data = await orderService.queryOrders(filter, options);
    res.status(200).send({ status: 'success', code: 200, data });
});


module.exports = {
    createOrder,
    updateOrder,
    deleteOrder,
    queryOrders,
}