/**
 * 系统日志服务
 * 负责 system_logs 的查询、详情、写入与批量写入
 */
const httpStatus = require('http-status');
const ApiError = require('../utils/api-error');
const db = require('../models');
const { Op } = require('sequelize');
const { parseUa } = require('../utils/ua-parser');
const SystemLog = db.system_logs;


/**
 * 对象脱敏（仅处理常见敏感键，避免在日志中泄露密钥）
 * @param {object} obj 任意对象
 * @returns {object}
 */
function maskObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'apiSecret', 'secret', 'api_secret', 'privateKey', 'token', 'accessToken', 'apiKey', 'auth'];
  const cloned = { ...obj };
  for (const k of sensitiveKeys) {
    if (Object.prototype.hasOwnProperty.call(cloned, k)) cloned[k] = '***';
  }
  return cloned;
}

/**
 * 将记录转换为可安全返回的对象
 * @param {object} record Sequelize 实例或普通对象
 */
function sanitize(record) {
  if (!record) return record;
  const data = record.toJSON ? record.toJSON() : record;
  // extra_data 为 JSON，确保输出安全
  if (data && typeof data.extra_data === 'object' && data.extra_data !== null) {
    data.extra_data = maskObject(data.extra_data);
  }
  return data;
}

/**
 * 从 UA 文本解析操作系统与浏览器类型
 * @param {string} ua
 */
function parseUaInfo(ua = '') {
  return parseUa(ua);
}

/**
 * 推断所属模块（从接口路径推断）
 */
function deriveModule(apiEndpoint) {
  if (!apiEndpoint) return 'unknown';
  const p = String(apiEndpoint);
  const seg = p.startsWith('/') ? p.slice(1) : p;
  const first = seg.split('/')[1] || seg.split('/')[0]; // 例如 /v1/orders/create → orders
  return first || 'unknown';
}

/**
 * 推断请求耗时（毫秒）
 */
function deriveDuration(extra) {
  if (!extra || typeof extra !== 'object') return null;
  if (typeof extra.response_time === 'number') return extra.response_time;
  if (typeof extra.duration === 'number') return extra.duration;
  if (typeof extra.elapsed === 'number') return extra.elapsed;
  if (typeof extra.cost === 'number') return extra.cost;
  if (extra.start_time && extra.end_time) {
    const s = new Date(extra.start_time).getTime();
    const e = new Date(extra.end_time).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && e >= s) return e - s;
  }
  return null;
}

/**
 * 组合含展示字段的视图对象
 */
function toViewObject(data) {
  const extra = (data && data.extra_data) || {};
  const { os: os_name, browser: browser_name } = parseUaInfo(data.user_agent);
  const moduleName = data.module || deriveModule(data.api_endpoint);
  const location = data.location || extra.location || '';
  const response_time = data.response_time || deriveDuration(extra);
  const operation = extra.operation || (data.http_method && data.api_endpoint ? `${data.http_method} ${data.api_endpoint}` : '未知操作');

  return {
    ...data,
    module: moduleName,
    location,
    os_name,
    browser_name,
    response_time,
    operation,
  };
}

/**
 * 构建 where 条件（单用户系统）
 */
function buildWhere(filter = {}) {
  const where = {};
  const { id, ids, module, api_endpoint, http_method, status_code, error_code, ip, location, start, end } = filter;
  // 支持按单个或多个ID查询
  if (Array.isArray(ids) && ids.length > 0) where.id = { [Op.in]: ids };
  else if (id) where.id = id;
  if (module) where.module = { [Op.like]: `%${module}%` };
  if (api_endpoint) where.api_endpoint = { [Op.like]: `%${api_endpoint}%` };
  if (http_method) where.http_method = http_method;
  if (status_code) where.status_code = status_code;
  if (error_code) where.error_code = { [Op.like]: `%${error_code}%` };
  if (ip) where.ip_address = { [Op.like]: `%${ip}%` };
  if (location) where.location = { [Op.like]: `%${location}%` };
  if (start || end) {
    where.created_at = {};
    if (start) where.created_at[Op.gte] = new Date(start);
    if (end) where.created_at[Op.lte] = new Date(end);
  }
  return where;
}

/**
 * 分页查询系统日志
 */
async function list(filter = {}, options = {}) {
  const where = buildWhere(filter);
  const currentPage = Math.max(parseInt(options.currentPage || 1, 10), 1);
  const pageSize = Math.min(Math.max(parseInt(options.pageSize || 20, 10), 1), 200);

  // 如包含 ID 条件，则忽略分页，直接返回匹配集合
  if (where.id) {
    const rows = await SystemLog.findAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
    });
    const plain = rows.map(sanitize);
    return {
      list: plain.map(toViewObject),
      pagination: {
        currentPage: 1,
        pageSize: plain.length,
        total: plain.length
      }
    };
  }

  const { rows, count } = await SystemLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const plain = rows.map(sanitize);
  return {
    list: plain.map(toViewObject),
    pagination: {
      currentPage,
      pageSize,
      total: count
    }
  };
}

/**
 * 详情（按主键ID）
 */
async function detail(id) {
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 id');
  const item = await SystemLog.findByPk(id);
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, '记录不存在');
  return toViewObject(sanitize(item));
}

/**
 * 新增单条系统日志（单用户系统）
 * 注意：该接口通常由服务端内部调用。若对外暴露路由，建议限制管理员角色。
 * @param {import('express').Request} req 请求对象（用于拿 ip/ua）
 */
async function create(req) {
  const body = req.body || {};
  // 基础字段组装
  const module = body.module || deriveModule(body.api_endpoint);
  const api_endpoint = body.api_endpoint; // 必填
  const http_method = body.http_method || req.method || null;
  const status_code = body.status_code || null;
  const error_code = body.error_code || null;
  const error_message = body.error_message || null;

  if (!api_endpoint) throw new ApiError(httpStatus.BAD_REQUEST, '缺少必要参数 api_endpoint');

  // 解析 UA 信息
  const { os: os_name, browser: browser_name } = parseUa(body.user_agent || req.headers['user-agent']);

  // request/response 可能为对象或字符串，统一序列化为字符串存库
  const request_data = typeof body.request_data === 'object' ? JSON.stringify(maskObject(body.request_data)) : (body.request_data || null);
  const response_data = typeof body.response_data === 'object' ? JSON.stringify(maskObject(body.response_data)) : (body.response_data || null);
  const ip_address = body.ip || req.ip || req.headers['x-forwarded-for'] || null;
  const location = body.location || null;
  const user_agent = body.user_agent || req.headers['user-agent'] || null;
  const response_time = body.response_time || deriveDuration(body.extra_data) || null;
  const extra_data = maskObject(body.extra_data || null);

  // 请求时间：允许外部传入 request_time/created_at 字段覆盖默认值
  let created_at = null;
  if (body.request_time) {
    const t = new Date(body.request_time);
    if (!isNaN(t.getTime())) created_at = t;
  } else if (body.created_at) {
    const t = new Date(body.created_at);
    if (!isNaN(t.getTime())) created_at = t;
  }

  const created = await SystemLog.create({
    module,
    api_endpoint,
    http_method,
    status_code,
    error_code,
    error_message,
    request_data,
    response_data,
    ip_address,
    location,
    user_agent,
    os_name,
    browser_name,
    response_time,
    extra_data,
    ...(created_at ? { created_at } : {}),
  });
  return toViewObject(sanitize(created));
}

/**
 * 批量新增（单用户系统）
 */
async function batchCreate(req, logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 logs');
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || null;
  const ua = req.headers['user-agent'] || null;

  const rows = logs.map((l) => {
    // 解析 UA 信息
    const { os: os_name, browser: browser_name } = parseUa(l.user_agent || ua);

    return {
      module: l.module || deriveModule(l.api_endpoint),
      api_endpoint: l.api_endpoint,
      http_method: l.http_method || null,
      status_code: l.status_code || null,
      error_code: l.error_code || null,
      error_message: l.error_message || null,
      request_data: typeof l.request_data === 'object' ? JSON.stringify(maskObject(l.request_data)) : (l.request_data || null),
      response_data: typeof l.response_data === 'object' ? JSON.stringify(maskObject(l.response_data)) : (l.response_data || null),
      ip_address: l.ip || ip,
      location: l.location || null,
      user_agent: l.user_agent || ua,
      os_name,
      browser_name,
      response_time: l.response_time || deriveDuration(l.extra_data) || null,
      extra_data: maskObject(l.extra_data || null),
      created_at: l.request_time ? new Date(l.request_time) : (l.created_at || new Date()),
    };
  });

  // 校验必要字段
  for (const r of rows) {
    if (!r.api_endpoint) throw new ApiError(httpStatus.BAD_REQUEST, 'logs 内缺少 api_endpoint');
  }

  await SystemLog.bulkCreate(rows);
  return { count: rows.length };
}

/**
 * 删除（按主键ID，谨慎使用）
 */
async function remove(id) {
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, '缺少参数 id');
  const record = await SystemLog.findByPk(id);
  if (!record) throw new ApiError(httpStatus.NOT_FOUND, '记录不存在');
  await SystemLog.destroy({ where: { id } });
  return { id: Number(id) };
}

module.exports = {
  list,
  detail,
  create,
  batchCreate,
  remove,
};
