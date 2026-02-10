/**
 * 操作日志控制器
 * 基于 operation_logs 表，提供用户操作日志的查询、详情、写入与批量写入能力
 */
const catchAsync = require('../utils/catch-async');
const service = require('../service/operation-logs.service.js');

// 分页查询（单用户系统）
const list = catchAsync(async (req, res) => {
  // 注意：为避免与分页参数 page 冲突，页面路径过滤参数命名为 page_path
  const { currentPage, pageSize, ...filters } = req.query;
  const data = await service.list(filters, { currentPage, pageSize });
  return res.apiSuccess(data, '获取操作日志列表成功');
});

// 详情（按主键ID）
const detail = catchAsync(async (req, res) => {
  const { id } = req.query;
  const data = await service.detail(id);
  return res.apiSuccess(data, '获取操作日志详情成功');
});

// 新增单条操作日志（复用 analytics.service 写入逻辑）
const create = catchAsync(async (req, res) => {
  const data = await service.create(req);
  return res.apiSuccess(data, '创建操作日志成功');
});

// 批量新增操作日志（复用 analytics.service 写入逻辑）
const batchCreate = catchAsync(async (req, res) => {
  const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
  const data = await service.batchCreate(req, logs);
  return res.apiSuccess(data, '批量创建操作日志成功');
});

// 删除（仅管理员使用）
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  return res.apiSuccess(data, '删除操作日志成功');
});

module.exports = {
  list,
  detail,
  create,
  batchCreate,
  remove,
};
