/**
 * 网格交易历史控制器
 * 单用户系统：处理网格交易历史相关的业务逻辑，提供交易记录查询和统计功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const service = require("../service/grid-trade-history.service");

/**
 * 创建交易历史
 */
const create = catchAsync(async (req, res) => {
  const body = req.body || {};
  const { api_key, secret_key } = body;

  try {
    const row = await service.createTradeHistory(body);
    return res.apiSuccess(row, "创建成功");
  } catch (e) {
    return res.apiError(e.message || "参数校验失败");
  }
});

/**
 * 查询交易历史（分页）
 */
const query = catchAsync(async (req, res) => {
  const { api_key, secret_key, currentPage, pageSize, ...filters } = req.query || {};

  // 强制把 api_key 放入过滤，避免越权
  const resp = await service.getAllTradeHistories({ ...filters, api_key }, { currentPage: Number(currentPage) || 1, pageSize: Number(pageSize) || 10 });
  return res.apiSuccess(resp, "查询交易历史成功");
});

/**
 * 获取详情（需提供 api_key/secret_key，且只能查看自己的记录）
 */
const detail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { api_key, secret_key } = req.query || {};
  if (!id) return res.apiError("缺少参数: id");

  const row = await service.getTradeHistoryById(Number(id));
  if (!row || row.api_key !== api_key) {
    return res.apiError("未找到该记录或无权限访问");
  }
  return res.apiSuccess(row, "获取交易历史详情成功");
});

/**
 * 更新交易历史
 */
const update = catchAsync(async (req, res) => {
  const body = req.body || {};
  const { id, api_key, secret_key } = body;
  if (!id) return res.apiError("缺少参数: id");

  try {
    const result = await service.updateTradeHistoryById(body);
    if (result.affected > 0) {
      return res.apiSuccess(result.data, "更新成功");
    } else {
      return res.apiError("未找到或无权限更新该记录");
    }
  } catch (e) {
    return res.apiError(e.message || "更新失败");
  }
});

/**
 * 批量删除
 */
const deletes = catchAsync(async (req, res) => {
  const { ids, api_key, secret_key } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.apiError("缺少参数: ids");
  }

  const result = await service.deleteTradeHistoriesByIds({ ids, api_key });
  return res.apiSuccess({ affected: result.affected }, "删除完成");
});

module.exports = {
  create,
  query,
  detail,
  update,
  deletes,
};
