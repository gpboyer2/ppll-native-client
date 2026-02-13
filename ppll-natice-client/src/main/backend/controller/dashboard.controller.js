/**
 * 仪表盘控制器
 * 处理仪表盘相关的请求和响应
 */
const dashboardService = require("../service/dashboard.service.js");
const catchAsync = require("../utils/catch-async");

/**
 * 获取仪表盘概览数据
 */
const dashboard = catchAsync(async (req, res) => {
    const data = dashboardService.getDashboard();
    return res.apiSuccess(data, "获取仪表盘数据成功");
});

/**
 * 获取合约账户详情（单用户系统）
 */
const account = catchAsync(async (req, res) => {
    const result = await dashboardService.getAccount(req.body);
    return res.apiSuccess(result, "获取账户信息成功");
});

module.exports = {
    dashboard,
    account,
};
