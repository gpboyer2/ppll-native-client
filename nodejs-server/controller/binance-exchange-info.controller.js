/**
 * 币安交易所信息控制器
 * 单用户系统：处理币安交易所信息相关的业务逻辑，提供交易对信息和市场数据管理功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const { sendSuccess, sendError } = require("../utils/api-response");
const binanceExchangeInfoService = require("../service/binance-exchange-info.service");
const { extractApiCredentials } = require("../utils");
const { filterUsdtPerpetualContracts } = require("../utils/trading-pairs");

/**
 * 获取交易所信息
 */
const getExchangeInfo = catchAsync(async (req, res) => {
  const { api_key, secret_key } = extractApiCredentials(req);

  try {
    // 检查是否需要更新
    if (await binanceExchangeInfoService.needsUpdate()) {
      const exchangeInfo = await binanceExchangeInfoService.fetchExchangeInfo(
        api_key,
        secret_key
      );
      await binanceExchangeInfoService.updateExchangeInfo(exchangeInfo);
    }

    // 获取最新记录
    const latestInfo = await binanceExchangeInfoService.getLatestExchangeInfo();

    if (!latestInfo) {
      return sendError(res, "未找到交易所信息", 404);
    }

    // 过滤交易对：只保留USDT永续合约
    if (latestInfo.symbols && Array.isArray(latestInfo.symbols)) {
      latestInfo.symbols = filterUsdtPerpetualContracts(latestInfo.symbols);
    }

    return sendSuccess(res, latestInfo, '获取交易所信息成功');
  } catch (err) {
    console.error("获取交易所信息出错:", err);
    return sendError(res, err.message || "获取交易所信息失败", 500);
  }
});

/**
 * 强制更新交易所信息
 */
const forceUpdate = catchAsync(async (req, res) => {
  const { api_key, secret_key } = extractApiCredentials(req);

  try {
    const exchangeInfo =
      await binanceExchangeInfoService.forceUpdateExchangeInfo(
        api_key,
        secret_key
      );

    // 过滤交易对：只保留USDT永续合约
    if (exchangeInfo.symbols && Array.isArray(exchangeInfo.symbols)) {
      exchangeInfo.symbols = filterUsdtPerpetualContracts(exchangeInfo.symbols);
    }

    return sendSuccess(res, exchangeInfo, "交易所信息已强制更新");
  } catch (err) {
    console.error("强制更新交易所信息出错:", err);
    return sendError(res, err.message || "强制更新交易所信息失败", 500);
  }
});

/**
 * 获取交易所信息状态
 */
const getStatus = catchAsync(async (req, res) => {
  try {
    const status = await binanceExchangeInfoService.getExchangeInfoStatus();
    return sendSuccess(res, status, '获取交易所信息状态成功');
  } catch (err) {
    console.error("获取交易所信息状态出错:", err);
    return sendError(res, err.message || "获取交易所信息状态失败", 500);
  }
});

/**
 * 获取最新标记价格和资金费率
 */
const getPremiumIndex = catchAsync(async (req, res) => {
  const { api_key, secret_key } = extractApiCredentials(req);

  try {
    const premiumIndex = await binanceExchangeInfoService.fetchPremiumIndex(
      api_key,
      secret_key
    );

    return sendSuccess(res, premiumIndex, '获取标记价格和资金费率成功');
  } catch (err) {
    console.error("获取标记价格和资金费率出错:", err);
    return sendError(res, err.message || "获取标记价格和资金费率失败", 500);
  }
});

/**
 * 获取即将下架的U本位永续合约
 */
const getDelistingPerpetualContracts = catchAsync(async (req, res) => {
  const { api_key, secret_key } = extractApiCredentials(req);
  const daysAhead = parseInt(req.query.daysAhead) || 30;

  try {
    const delistingContracts = await binanceExchangeInfoService.getDelistingPerpetualContractsInfo(
      api_key,
      secret_key,
      daysAhead
    );

    // 按下架时间排序，最近下架的在前
    delistingContracts.sort((a, b) => a.deliveryDate - b.deliveryDate);

    return sendSuccess(res, {
      contracts: delistingContracts,
      totalCount: delistingContracts.length,
      daysAhead: daysAhead,
      checkTime: new Date().toISOString()
    }, delistingContracts.length > 0 ? `发现${delistingContracts.length}个即将下架的永续合约` : "当前没有即将下架的永续合约");
  } catch (err) {
    console.error("获取即将下架的永续合约出错:", err);
    return sendError(res, err.message || "获取即将下架的永续合约失败", 500);
  }
});

/**
 * 测试获取下架计划原始数据
 */
const getDelistScheduleTest = catchAsync(async (req, res) => {
  const { api_key, secret_key } = extractApiCredentials(req);

  try {
    const delistSchedule = await binanceExchangeInfoService.fetchDelistSchedule(
      api_key,
      secret_key
    );

    return sendSuccess(res, {
      delistSchedule,
      totalCount: delistSchedule.length,
      checkTime: new Date().toISOString()
    }, `获取到${delistSchedule.length}条下架计划数据`);
  } catch (err) {
    console.error("获取下架计划数据出错:", err);
    return sendError(res, err.message || "获取下架计划数据失败", 500);
  }
});

module.exports = {
  getExchangeInfo,
  forceUpdate,
  getStatus,
  getPremiumIndex,
  getDelistingPerpetualContracts,
  getDelistScheduleTest,
};
