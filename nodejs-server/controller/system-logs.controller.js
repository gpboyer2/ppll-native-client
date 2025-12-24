/**
 * 系统日志控制器
 * 提供 system_logs 的查询、详情、写入与批量写入能力
 */
const catchAsync = require('../utils/catchAsync');
const service = require('../service/system-logs.service.js');

// 分页查询（支持按用户、模块、接口、HTTP方法、状态码、错误码、IP、地点、时间范围过滤）
const list = catchAsync(async (req, res) => {
  const { user_id, module, api_endpoint, http_method, status_code, error_code, ip, location, start, end, page, pageSize } = req.query;
  const data = await service.list(
    { user_id, module, api_endpoint, http_method, status_code, error_code, ip, location, start, end },
    { page, pageSize }
  );
  res.status(200).send({ status: 'success', code: 200, data });
});

// 详情（按主键ID）
const detail = catchAsync(async (req, res) => {
  const { id } = req.query;
  const data = await service.detail(id);
  res.status(200).send({ status: 'success', code: 200, data });
});

// 新增单条系统错误日志
const create = catchAsync(async (req, res) => {
  const data = await service.create(req);
  res.status(201).send({ status: 'success', code: 201, data });
});

// 批量新增系统错误日志
const batchCreate = catchAsync(async (req, res) => {
  const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
  const data = await service.batchCreate(req, logs);
  res.status(201).send({ status: 'success', code: 201, data });
});

// 删除（仅管理员使用）
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  res.status(200).send({ status: 'success', code: 200, data });
});

module.exports = {
  list,
  detail,
  create,
  batchCreate,
  remove,
};
