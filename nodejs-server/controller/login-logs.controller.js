/**
 * 登录日志控制器
 * 仅提供安全的查询接口；写入接口仅供内部或管理员使用
 */
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const service = require('../service/login-logs.service.js');

// 列表查询（分页 + 过滤）
const list = catchAsync(async (req, res) => {
  const { user_id, username, ip, status, login_system, start, end, page, pageSize } = req.query;
  const data = await service.list(
    { user_id, username, ip, status, login_system, start, end },
    { page, pageSize }
  );
  res.status(200).send({ status: 'success', code: 200, data });
});

// 详情
const detail = catchAsync(async (req, res) => {
  // 按规范不使用路径参数，从查询参数中读取 id
  const { id } = req.query;
  const data = await service.detail(id);
  res.status(200).send({ status: 'success', code: 200, data });
});

// 新增（可选：仅管理员）
const create = catchAsync(async (req, res) => {
  const data = await service.create(req.body || {});
  res.status(201).send({ status: 'success', code: 201, data });
});

// 更新
const update = catchAsync(async (req, res) => {
  const data = await service.update(req.body || {});
  res.status(200).send({ status: 'success', code: 200, data });
});

// 删除
const remove = catchAsync(async (req, res) => {
  const { id } = req.body || {};
  const data = await service.remove(id);
  res.status(200).send({ status: 'success', code: 200, data });
});

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};
