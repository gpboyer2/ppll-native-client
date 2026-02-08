/**
 * Binance ApiKey 控制器
 * 单用户系统：处理 Binance ApiKey 管理相关的业务逻辑
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const binanceApiKeyService = require("../service/binance-api-key.service");

/**
 * 创建 ApiKey
 * POST /v1/binance-api-key/create
 */
const createApiKey = catchAsync(async (req, res) => {
  const result = await binanceApiKeyService.createApiKey(Object.assign({}, req.body));
  return res.apiSuccess(result, '创建 ApiKey 成功');
});

/**
 * 删除 ApiKey
 * POST /v1/binance-api-key/delete
 */
const deleteApiKey = catchAsync(async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '-';
  console.log(`[API-KEY-DEBUG] DELETE_REQUEST id=${req.body.id} ip=${clientIp} user-agent=${req.get('user-agent')?.substring(0, 50)}...`);
  const deleted = await binanceApiKeyService.deleteApiKeyById(req.body.id);
  return res.apiSuccess(deleted, '删除 ApiKey 成功');
});

/**
 * 更新 ApiKey
 * POST /v1/binance-api-key/update
 */
const updateApiKey = catchAsync(async (req, res) => {
  const { id } = req.body;
  const updateBody = Object.assign({}, req.body);
  delete updateBody.id;

  const result = await binanceApiKeyService.updateApiKeyById(id, updateBody);

  return res.apiSuccess(result, '更新 ApiKey 成功');
});

/**
 * 查询 ApiKey 列表
 * GET /v1/binance-api-key/query
 */
const queryApiKey = catchAsync(async (req, res) => {
  let { id, ids, name, status, pageSize = 10, currentPage = 1 } = req.query;

  // 解析 id/ids 支持：id=1 或 id=1,2,3 或 ids=1,2,3
  const parseIds = (idVal, idsVal) => {
    const out = [];
    if (Array.isArray(idsVal)) {
      for (const v of idsVal) {
        const n = Number(v);
        if (!Number.isNaN(n)) out.push(n);
      }
    } else if (typeof idsVal === 'string') {
      for (const v of idsVal.split(',')) {
        const n = Number(v.trim());
        if (!Number.isNaN(n)) out.push(n);
      }
    }
    if (idVal !== undefined && idVal !== null && idVal !== '') {
      const idStr = String(idVal);
      for (const v of idStr.split(',')) {
        const n = Number(v.trim());
        if (!Number.isNaN(n)) out.push(n);
      }
    }
    return Array.from(new Set(out));
  };

  const idList = parseIds(id, ids);

  const filter = {};
  const options = {};

  if (idList.length === 1) {
    filter.id = idList[0];
  } else if (idList.length > 1) {
    filter.ids = idList;
  }

  if (name) filter.name = name;
  if (status !== undefined && status !== null && status !== '' && Number(status) !== 1) {
    filter.status = Number(status);
  }

  if (idList.length > 0) {
    options.limit = idList.length;
    options.offset = 0;
  } else {
    if (pageSize) options.limit = Number(pageSize);
    if (currentPage > 1) options.offset = (Number(currentPage) - 1) * Number(pageSize);
  }

  let api_key_list = await binanceApiKeyService.getAllApiKeys(filter, options);

  // 计算总数
  let total = 0;
  if (idList.length > 0) {
    total = api_key_list.length;
  } else {
    total = await binanceApiKeyService.countApiKeys(filter);
  }

  return res.apiSuccess({
    list: api_key_list,
    pagination: {
      currentPage: idList.length > 0 ? 1 : Number(currentPage),
      pageSize: idList.length > 0 ? api_key_list.length : Number(pageSize),
      total: total
    }
  }, '查询 ApiKey 成功');
});

module.exports = {
  createApiKey,
  deleteApiKey,
  updateApiKey,
  queryApiKey
};
