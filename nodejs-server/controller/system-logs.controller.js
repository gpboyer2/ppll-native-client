/**
 * 系统日志控制器
 * 提供 system_logs 的查询、详情、写入与批量写入能力
 */
const catchAsync = require('../utils/catch-async');
const service = require('../service/system-logs.service.js');

// 分页查询（单用户系统）
const list = catchAsync(async (req, res) => {
  const { currentPage, pageSize, ...filters } = req.query;
  const result = await service.list(filters, { currentPage, pageSize });
  return res.apiSuccess({
    list: result.list,
    pagination: result.pagination
  }, '获取系统日志成功');
});

// 详情（按主键ID）
const detail = catchAsync(async (req, res) => {
  const { id } = req.query;
  const data = await service.detail(id);
  return res.apiSuccess(data, '获取日志详情成功');
});

// 新增单条系统错误日志
const create = catchAsync(async (req, res) => {
  const data = await service.create(req);
  return res.apiSuccess(data, '创建日志成功');
});

// 批量新增系统错误日志
const batchCreate = catchAsync(async (req, res) => {
  const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
  const data = await service.batchCreate(req, logs);
  return res.apiSuccess(data, '批量创建日志成功');
});

// 删除（仅管理员使用）
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  return res.apiSuccess(data, '删除日志成功');
});

module.exports = {
  list,
  detail,
  create,
  batchCreate,
  remove,
};
