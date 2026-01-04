/**
 * 登录日志控制器
 * 仅提供安全的查询接口；写入接口仅供内部或管理员使用
 */
const httpStatus = require('http-status');
const catchAsync = require('../utils/catch-async');
const service = require('../service/login-logs.service.js');

// 列表查询（分页 + 过滤）（单用户系统）
const list = catchAsync(async (req, res) => {
  const { username, ip, status, login_system, start, end, currentPage, pageSize } = req.query;
  const data = await service.list(
    { username, ip, status, login_system, start, end },
    { currentPage, pageSize }
  );
  return res.apiSuccess(data, '获取登录日志列表成功');
});

// 详情
const detail = catchAsync(async (req, res) => {
  // 按规范不使用路径参数，从查询参数中读取 id
  const { id } = req.query;
  const data = await service.detail(id);
  return res.apiSuccess(data, '获取登录日志详情成功');
});

// 新增（可选：仅管理员）
const create = catchAsync(async (req, res) => {
  const data = await service.create(req.body || {});
  return res.apiSuccess(data, '创建登录日志成功');
});

// 更新
const update = catchAsync(async (req, res) => {
  const data = await service.update(req.body || {});
  return res.apiSuccess(data, '更新登录日志成功');
});

// 删除
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  return res.apiSuccess(data, '删除登录日志成功');
});

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};
