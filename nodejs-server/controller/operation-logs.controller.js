/**
 * 操作日志控制器
 * 基于 operation_logs 表，提供用户操作日志的查询、详情、写入与批量写入能力
 */
const catchAsync = require('../utils/catch-async');
const { sendSuccess } = require('../utils/api-response');
const service = require('../service/operation-logs.service.js');

// 分页查询（支持按用户、动作、页面、IP、时间范围过滤）
const list = catchAsync(async (req, res) => {
  // 注意：为避免与分页参数 page 冲突，页面路径过滤参数命名为 page_path
  const { user_id, action, description, page_path, ip, start, end, module, operator, status, currentPage, pageSize } = req.query;
  const data = await service.list(
    { user_id, action, description, page_path, ip, start, end, module, operator, status },
    { currentPage, pageSize }
  );
  return sendSuccess(res, data, '获取操作日志列表成功');
});

// 详情（按主键ID）
const detail = catchAsync(async (req, res) => {
  const { id } = req.query;
  const data = await service.detail(id);
  return sendSuccess(res, data, '获取操作日志详情成功');
});

// 新增单条操作日志（复用 analytics.service 写入逻辑）
const create = catchAsync(async (req, res) => {
  const data = await service.create(req);
  return sendSuccess(res, data, '创建操作日志成功', 201);
});

// 批量新增操作日志（复用 analytics.service 写入逻辑）
const batchCreate = catchAsync(async (req, res) => {
  const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
  const data = await service.batchCreate(req, logs);
  return sendSuccess(res, data, '批量创建操作日志成功', 201);
});

// 删除（仅管理员使用）
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  return sendSuccess(res, data, '删除操作日志成功');
});

module.exports = {
  list,
  detail,
  create,
  batchCreate,
  remove,
};
