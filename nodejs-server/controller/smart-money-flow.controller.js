const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const smartMoneyFlowService = require("../service/smart-money-flow.service.js");


/**
 * 获取KOL/VC链上持仓分布数据
 * 对应路由：GET /v1/smart-money-flow/kol-vc-holdings
 * 数据来源: https://www.gate.com/zh/crypto-market-data/onchain/kol-vc
 */
const getKolVcHoldings = catchAsync(async (req, res) => {
  const data = await smartMoneyFlowService.getKolVcHoldings();
  res.status(httpStatus.OK).send({
    status: 'success',
    data
  });
});

/**
 * 获取推特聪明钱共振信号
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const getTwitterResonanceSignal = catchAsync(async (req, res) => {
  const { chain_name } = req.query;
  const data = await smartMoneyFlowService.getTwitterResonanceSignal(chain_name);
  res.status(httpStatus.OK).send({
    status: 'success',
    data
  });
});


/**
 * 获取KOL/VC盈亏排行榜
 * 对应路由：GET /v1/smart-money-flow/kol-vc-top-list
 */
const getKolVcTopList = catchAsync(async (req, res) => {
  const { chain_name } = req.query;
  const data = await smartMoneyFlowService.getKolVcTopList(chain_name);
  res.status(httpStatus.OK).send({
    status: 'success',
    data
  });
});


/**
 * 获取24小时KOL/VC买卖量数据
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const get24hTradeVolume = catchAsync(async (req, res) => {
  const { chain_name = 'all' } = req.query;
  const data = await smartMoneyFlowService.get24hTradeVolume(chain_name);
  res.status(httpStatus.OK).send({
    status: 'success',
    data
  });
});


/**
 * 获取KOL/VC 30日盈亏分布数据
 * 对应路由：GET /v1/smart-money-flow/30d-profit-distribution
 * 数据来源: https://www.gate.com/zh/crypto-market-data/onchain/kol-vc
 */
const get30DayProfitDistribution = catchAsync(async (req, res) => {
  const { chain_name } = req.query;
  const data = await smartMoneyFlowService.get30DayProfitDistribution(chain_name);
  res.status(httpStatus.OK).send({
    status: 'success',
    data
  });
});


module.exports = {
  getKolVcHoldings,
  getTwitterResonanceSignal,
  getKolVcTopList,
  get24hTradeVolume,
  get30DayProfitDistribution,
};
