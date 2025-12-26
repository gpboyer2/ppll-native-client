/**
 * Binance ApiKey 控制器
 * 处理 Binance ApiKey 管理相关的业务逻辑，提供增删改查功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const binanceApiKeyService = require("../service/binance-api-key.service");

/**
 * 创建 ApiKey
 * POST /v1/binance-api-key/create
 */
const createApiKey = catchAsync(async (req, res) => {
  try {
    const { name, apiKey, secretKey, status, remark } = req.body;
    const userId = req.user?.id;

    const result = await binanceApiKeyService.createApiKey({
      userId,
      name,
      apiKey,
      secretKey,
      status,
      remark
    });

    res.send({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
      status: 'error',
      code: error.statusCode || httpStatus.BAD_REQUEST,
      message: error.message || '创建 ApiKey 失败'
    });
  }
});

/**
 * 删除 ApiKey
 * POST /v1/binance-api-key/delete
 */
const deleteApiKey = catchAsync(async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).send({
        status: 'error',
        code: httpStatus.UNAUTHORIZED,
        message: '用户未登录'
      });
    }

    const deleted = await binanceApiKeyService.deleteApiKeyById(id, userId);
    res.send({
      status: 'success',
      data: deleted
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
      status: 'error',
      code: error.statusCode || httpStatus.BAD_REQUEST,
      message: error.message || '删除 ApiKey 失败'
    });
  }
});

/**
 * 更新 ApiKey
 * POST /v1/binance-api-key/update
 */
const updateApiKey = catchAsync(async (req, res) => {
  try {
    const { id, name, apiKey, secretKey, status, remark } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).send({
        status: 'error',
        code: httpStatus.UNAUTHORIZED,
        message: '用户未登录'
      });
    }

    const result = await binanceApiKeyService.updateApiKeyById(id, req.body, userId);

    res.send({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
      status: 'error',
      code: error.statusCode || httpStatus.BAD_REQUEST,
      message: error.message || '更新 ApiKey 失败'
    });
  }
});

/**
 * 查询 ApiKey 列表
 * GET /v1/binance-api-key/query
 */
const queryApiKey = catchAsync(async (req, res) => {
  try {
    let { id, ids, name, status, pageSize = 10, currentPage = 1 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).send({
        status: 'error',
        code: httpStatus.UNAUTHORIZED,
        message: '用户未登录'
      });
    }

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

    const filter = { userId };
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

    let apiKeyList = await binanceApiKeyService.getAllApiKeys(filter, options);

    // 计算总数
    let total = 0;
    if (idList.length > 0) {
      total = apiKeyList.length;
    } else {
      total = await binanceApiKeyService.countApiKeys(filter);
    }

    res.send({
      status: 'success',
      data: {
        list: apiKeyList,
        total: total,
        pageSize: idList.length > 0 ? apiKeyList.length : Number(pageSize),
        currentPage: idList.length > 0 ? 1 : Number(currentPage)
      }
    });
  } catch (error) {
    res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
      status: 'error',
      code: error.statusCode || httpStatus.BAD_REQUEST,
      message: error.message || '查询 ApiKey 失败'
    });
  }
});

module.exports = {
  createApiKey,
  deleteApiKey,
  updateApiKey,
  queryApiKey
};
