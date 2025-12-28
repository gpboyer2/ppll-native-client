/**
 * 仪表盘控制器
 * 处理仪表盘相关的请求和响应
 */
const dashboardService = require('../service/dashboard.service.js');
const catchAsync = require('../utils/catch-async');
const { sendSuccess } = require('../utils/api-response');


/**
 * 获取仪表盘概览数据
 */
const dashboard = catchAsync(async (req, res) => {
  const data = dashboardService.getDashboard();
  return sendSuccess(res, data, '获取仪表盘数据成功');
});


/**
 * 获取合约账户详情（单用户系统）
 */
const account = catchAsync(async (req, res) => {
  const { api_key, secret_key } = req.body;
  const result = await dashboardService.getAccount(api_key, secret_key);
  return sendSuccess(res, result, '获取账户信息成功');
});


module.exports = {
  dashboard,
  account
};