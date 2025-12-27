/**
 * 标记价格控制器
 * 处理标记价格相关的业务逻辑，提供价格数据管理和查询功能
 */
const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const ApiError = require('../utils/api-error');
const catchAsync = require('../utils/catch-async');
const { sendSuccess } = require('../utils/api-response');
const markPriceService = require("../service/mark-price.service.js");


/**
 * 创建一条标记价格
 */
const createMarkPrice = catchAsync(async (req, res) => {
  const markPrice = await markPriceService.createMarkPrice(req.body);
  return sendSuccess(res, markPrice, '创建成功');
});

/**
 * 查询标记价格列表
 */
const getMarkPrices = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['symbol']);
  const options = pick(req.query, ['sortBy', 'limit', 'currentPage']);
  const result = await markPriceService.queryMarkPrices(filter, options);
  return sendSuccess(res, result, '查询成功');
});

/**
 * 更新一条标记价格
 */
const updateMarkPrice = catchAsync(async (req, res) => {
  const markPrice = await markPriceService.updateMarkPriceById(req.body.id, req.body);
  return sendSuccess(res, markPrice, '更新成功');
});

/**
 * 删除一条标记价格
 */
const deleteMarkPrice = catchAsync(async (req, res) => {
  await markPriceService.deleteMarkPriceById(req.body.id);
  return sendSuccess(res, null, '删除成功');
});

module.exports = {
  createMarkPrice,
  getMarkPrices,
  updateMarkPrice,
  deleteMarkPrice,
};