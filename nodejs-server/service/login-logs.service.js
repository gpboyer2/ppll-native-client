/**
 * 登录日志服务
 * 提供登录日志的查询与（可选）写入能力
 */
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const db = require('../models');
const { Op } = require('sequelize');

// 将敏感字段从记录中移除或脱敏
function sanitize(record) {
  if (!record) return record;
  const data = record.toJSON ? record.toJSON() : record;
  // 移除或脱敏敏感字段
  if (data.password) delete data.password; // 禁止对外返回
  // 出于安全考虑：对外返回时不暴露 apiSecret
  if (data.apiSecret) {
    data.apiSecret = '***';
  }
  if (data.apiKey) {
    const k = String(data.apiKey);
    data.apiKey = k.length <= 8 ? `${k.slice(0, 2)}***` : `${k.slice(0, 4)}***${k.slice(-2)}`;
  }
  return data;
}

// 构建 where 条件
function buildWhere(filter = {}) {
  const where = {};
  const { id, ids, user_id, username, ip, status, login_system, start, end } = filter;

  // 支持按单个或多个ID查询
  if (Array.isArray(ids) && ids.length > 0) where.id = { [Op.in]: ids };
  else if (id) where.id = id;

  if (user_id) where.user_id = user_id;
  if (username) where.username = { [Op.like]: `%${username}%` };
  if (ip) where.ip = { [Op.like]: `%${ip}%` };
  if (status !== undefined && status !== null && status !== '') where.status = status;
  if (login_system) where.login_system = login_system;
  if (start || end) {
    where.login_time = {};
    if (start) where.login_time[Op.gte] = new Date(start);
    if (end) where.login_time[Op.lte] = new Date(end);
  }
  return where;
}

// 分页查询
async function list(filter = {}, options = {}) {
  const whereBase = buildWhere(filter);
  const page = Math.max(parseInt(options.page || 1, 10), 1);
  const pageSize = Math.min(Math.max(parseInt(options.pageSize || 20, 10), 1), 200);

  // 如携带 id/ids，则忽略分页，返回匹配集合，保持统一 list 结构
  if (whereBase.id) {
    const where = { ...whereBase };
    const rows = await db.login_logs.findAll({
      where,
      order: [['login_time', 'DESC'], ['id', 'DESC']],
    });
    return {
      page: 1,
      pageSize: rows.length,
      total: rows.length,
      list: rows.map(sanitize),
    };
  }

  const { rows, count } = await db.login_logs.findAndCountAll({
    where: whereBase,
    order: [['login_time', 'DESC'], ['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    page,
    pageSize,
    total: count,
    list: rows.map(sanitize),
  };
}

// 详情
async function detail(id) {
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 id');
  const item = await db.login_logs.findByPk(id);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, '记录不存在');
  return sanitize(item);
}

// 写入（可选使用，默认仅允许安全字段）
async function create(payload = {}) {
  // 计算登录方式：支持 (username+password) 或 (apiKey+apiSecret)，两者都存在则标记为组合
  const hasUserPair = Boolean(payload && payload.username && payload.password);
  const hasApiPair = Boolean(payload && payload.apiKey && payload.apiSecret);
  let inferredMethod = 'unknown';
  if (hasUserPair && hasApiPair) inferredMethod = 'apiKey+password';
  else if (hasUserPair) inferredMethod = 'password';
  else if (hasApiPair) inferredMethod = 'apiKey';

  // 如检测到敏感字段存在，只记录提示日志，不打印具体值
  // 不再拒绝持久化 apiSecret；根据业务要求允许入库

  const allow = {
    user_id: payload.user_id,
    username: payload.username,
    apiKey: payload.apiKey,
    apiSecret: payload.apiSecret, // 根据需求允许入库
    login_time: payload.login_time || new Date(),
    ip: payload.ip,
    location: payload.location,
    user_agent: payload.user_agent,
    browser: payload.browser,
    os: payload.os,
    device: payload.device,
    // method 若未显式传入，则根据凭证对推断
    method: payload.method || inferredMethod,
    login_system: payload.login_system,
    status: payload.status ?? 0,
    fail_reason: payload.fail_reason,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const created = await db.login_logs.create(allow);
  return sanitize(created);
}

// 更新（仅允许安全字段，禁止更新 apiSecret/id）
async function update(payload = {}) {
  const { id } = payload || {};
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 id');

  const record = await db.login_logs.findByPk(id);
  if (!record) throw new ApiError(httpStatus.NOT_FOUND, '记录不存在');

  const allowFields = [
    'user_id', 'username', 'apiKey', 'login_time', 'ip', 'location', 'user_agent',
    'browser', 'os', 'device', 'method', 'login_system', 'status', 'fail_reason'
  ];
  const updateData = {};
  for (const k of allowFields) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      updateData[k] = payload[k];
    }
  }
  updateData.updated_at = new Date();

  await db.login_logs.update(updateData, { where: { id } });
  const fresh = await db.login_logs.findByPk(id);
  return sanitize(fresh);
}

// 删除（硬删除日志记录）
async function remove(id) {
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 id');
  const record = await db.login_logs.findByPk(id);
  if (!record) throw new ApiError(httpStatus.NOT_FOUND, '记录不存在');
  await db.login_logs.destroy({ where: { id } });
  return { id: Number(id) };
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};
