/**
 * 系统控制器
 * 处理系统相关的请求和响应
 */
const systemService = require('../service/system.service.js');
const catchAsync = require('../utils/catch-async');
const { sendSuccess, sendError } = require('../utils/api-response');


/**
 * 获取本机 IPv4 地址列表
 */
const getIPv4List = catchAsync((req, res) => {
  const ipList = systemService.getIPv4List();
  return sendSuccess(res, ipList, '获取 IPv4 地址列表成功');
});


/**
 * 获取数据库路径
 */
const getDatabasePath = catchAsync((req, res) => {
  const dbPath = systemService.getDatabasePath();
  return sendSuccess(res, dbPath, '获取数据库路径成功');
});


/**
 * 获取 Git 信息
 */
const getGitInfo = catchAsync((req, res) => {
  const gitInfo = systemService.getGitInfo();
  if (!gitInfo) {
    return sendError(res, 'Git 信息未初始化', 500);
  }
  return sendSuccess(res, gitInfo, '获取 Git 信息成功');
});


/**
 * 获取系统健康状态
 */
const getHealth = catchAsync(async (req, res) => {
  const healthData = await systemService.getHealth();
  return sendSuccess(res, healthData, '获取健康状态成功');
});


module.exports = {
  getIPv4List,
  getDatabasePath,
  getGitInfo,
  getHealth
};
