/**
 * 仪表盘控制器
 * 处理仪表盘相关的请求和响应
 */
const dashboardService = require('../service/dashboard.service.js');
const catchAsync = require('../utils/catch-async');
const { success } = require('../utils/api-response');


/**
 * 获取仪表盘概览数据
 */
const dashboard = catchAsync(async (req, res) => {
    const data = dashboardService.getDashboard();
    return sendSuccess(res, data, '获取仪表盘数据成功');
});


/**
 * 获取合约账户详情
 */
const account = catchAsync(async (req, res) => {
    const { apiKey, apiSecret } = req.body;
    const userId = req.vipUser?.id;
    const result = await dashboardService.getAccount(apiKey, apiSecret, userId);
    return sendSuccess(res, result, '获取账户信息成功');
});


module.exports = {
    dashboard,
    account
};