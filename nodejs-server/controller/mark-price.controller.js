/**
 * 标记价格控制器
 * 处理标记价格相关的业务逻辑，提供价格数据管理和查询功能
 */
const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const markPriceService = require("../service/mark-price.service.js");


/**
 * 创建一条标记价格
 */
const createMarkPrice = catchAsync(async (req, res) => {
  const markPrice = await markPriceService.createMarkPrice(req.body);
  res.status(httpStatus.CREATED).send({
    code: httpStatus.CREATED,
    data: markPrice,
    message: '创建成功'
  });
});

/**
 * 查询标记价格列表
 */
const getMarkPrices = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['symbol']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await markPriceService.queryMarkPrices(filter, options);
  res.send({
    code: httpStatus.OK,
    data: result,
    message: '查询成功'
  });
});

/**
 * 更新一条标记价格
 */
const updateMarkPrice = catchAsync(async (req, res) => {
  const markPrice = await markPriceService.updateMarkPriceById(req.body.id, req.body);
  res.send({
    code: httpStatus.OK,
    data: markPrice,
    message: '更新成功'
  });
});

/**
 * 删除一条标记价格
 */
const deleteMarkPrice = catchAsync(async (req, res) => {
  await markPriceService.deleteMarkPriceById(req.body.id);
  res.status(httpStatus.NO_CONTENT).send({
    code: httpStatus.NO_CONTENT,
    message: '删除成功'
  });
});

module.exports = {
  createMarkPrice,
  getMarkPrices,
  updateMarkPrice,
  deleteMarkPrice,
};