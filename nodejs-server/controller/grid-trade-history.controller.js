/**
 * 网格交易历史控制器
 * 处理网格交易历史相关的业务逻辑，提供交易记录查询和统计功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const userService = require("../service/user.service");
const service = require("../service/grid-trade-history.service");

/**
 * 创建交易历史
 */
const create = catchAsync(async (req, res) => {
  const body = req.body || {};
  const { apiKey, apiSecret } = body;

  try {
    const row = await service.createTradeHistory(body);
    res.send({ code: 200, data: row, message: "创建成功" });
  } catch (e) {
    res.status(400).send({ code: 400, message: e.message || "参数校验失败" });
  }
});

/**
 * 查询交易历史（分页）
 */
const query = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, page, limit, ...filters } = req.query || {};

  // 强制把 apiKey 放入过滤，避免越权
  const resp = await service.getAllTradeHistories({ ...filters, apiKey }, { page: Number(page) || 1, limit: Number(limit) || 10 });
  res.send({ code: 200, data: resp });
});

/**
 * 获取详情（需提供 apiKey/apiSecret，且只能查看自己的记录）
 */
const detail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { apiKey, apiSecret } = req.query || {};
  if (!id) return res.status(400).send({ code: 400, message: "缺少参数: id" });

  const row = await service.getTradeHistoryById(Number(id));
  if (!row || row.apiKey !== apiKey) {
    return res.status(404).send({ code: 404, message: "未找到该记录或无权限访问" });
  }
  res.send({ code: 200, data: row });
});

/**
 * 更新交易历史
 */
const update = catchAsync(async (req, res) => {
  const body = req.body || {};
  const { id, apiKey, apiSecret } = body;
  if (!id) return res.status(400).send({ code: 400, message: "缺少参数: id" });

  try {
    const result = await service.updateTradeHistoryById(body);
    if (result.affected > 0) {
      res.send({ code: 200, data: result.data, message: "更新成功" });
    } else {
      res.status(400).send({ code: 400, message: "未找到或无权限更新该记录" });
    }
  } catch (e) {
    res.status(400).send({ code: 400, message: e.message || "更新失败" });
  }
});

/**
 * 批量删除
 */
const deletes = catchAsync(async (req, res) => {
  const { ids, apiKey, apiSecret } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send({ code: 400, message: "缺少参数: ids" });
  }

  const result = await service.deleteTradeHistoriesByIds({ ids, apiKey });
  res.send({ code: 200, data: { affected: result.affected }, message: "删除完成" });
});

module.exports = {
  create,
  query,
  detail,
  update,
  deletes,
};
