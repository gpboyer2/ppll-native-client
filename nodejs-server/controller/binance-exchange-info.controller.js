/**
 * 币安交易所信息控制器
 * 处理币安交易所信息相关的业务逻辑，提供交易对信息和市场数据管理功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const binanceExchangeInfoService = require("../service/binance-exchange-info.service");
const userService = require("../service/user.service");
const { extractApiCredentials } = require("../utils");

/**
 * 通用错误处理函数
 * @param {Error} error - 错误对象
 * @param {Object} res - Express响应对象
 * @param {string} operation - 操作描述
 */
const handleError = (error, res, operation) => {
  console.error(`${operation}出错:`, error);
  res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
    status: "error",
    code: httpStatus.INTERNAL_SERVER_ERROR,
    message: error.message || `${operation}失败`,
  });
};


/**
 * 获取交易所信息
 */
const getExchangeInfo = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = extractApiCredentials(req);

  try {
    // 检查是否需要更新
    if (await binanceExchangeInfoService.needsUpdate()) {
      const exchangeInfo = await binanceExchangeInfoService.fetchExchangeInfo(
        apiKey,
        apiSecret
      );
      await binanceExchangeInfoService.updateExchangeInfo(exchangeInfo);
    }

    // 获取最新记录
    const latestInfo = await binanceExchangeInfoService.getLatestExchangeInfo();

    if (!latestInfo) {
      return res.status(httpStatus.NOT_FOUND).send({
        status: "error",
        code: httpStatus.NOT_FOUND,
        message: "未找到交易所信息",
      });
    }

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: latestInfo,
    });
  } catch (error) {
    handleError(error, res, "获取交易所信息");
  }
});

/**
 * 强制更新交易所信息
 */
const forceUpdate = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = extractApiCredentials(req);

  try {
    const exchangeInfo =
      await binanceExchangeInfoService.forceUpdateExchangeInfo(
        apiKey,
        apiSecret
      );

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: exchangeInfo,
      message: "交易所信息已强制更新",
    });
  } catch (error) {
    handleError(error, res, "强制更新交易所信息");
  }
});

/**
 * 获取交易所信息状态
 */
const getStatus = catchAsync(async (req, res) => {
  try {
    const status = await binanceExchangeInfoService.getExchangeInfoStatus();
    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: status,
    });
  } catch (error) {
    handleError(error, res, "获取交易所信息状态");
  }
});

/**
 * 获取最新标记价格和资金费率
 */
const getPremiumIndex = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = extractApiCredentials(req);

  try {
    const premiumIndex = await binanceExchangeInfoService.fetchPremiumIndex(
      apiKey,
      apiSecret
    );

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: premiumIndex,
    });
  } catch (error) {
    handleError(error, res, "获取标记价格和资金费率");
  }
});

/**
 * 获取即将下架的U本位永续合约
 */
const getDelistingPerpetualContracts = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = extractApiCredentials(req);
  const daysAhead = parseInt(req.query.daysAhead) || 30;

  try {
    const delistingContracts = await binanceExchangeInfoService.getDelistingPerpetualContractsInfo(
      apiKey,
      apiSecret,
      daysAhead
    );

    // 按下架时间排序，最近下架的在前
    delistingContracts.sort((a, b) => a.deliveryDate - b.deliveryDate);

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: {
        contracts: delistingContracts,
        totalCount: delistingContracts.length,
        daysAhead: daysAhead,
        checkTime: new Date().toISOString()
      },
      message: delistingContracts.length > 0 ? `发现${delistingContracts.length}个即将下架的永续合约` : "当前没有即将下架的永续合约",
    });
  } catch (error) {
    handleError(error, res, "获取即将下架的永续合约");
  }
});

/**
 * 测试获取下架计划原始数据
 */
const getDelistScheduleTest = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = extractApiCredentials(req);

  try {
    const delistSchedule = await binanceExchangeInfoService.fetchDelistSchedule(
      apiKey,
      apiSecret
    );

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: {
        delistSchedule,
        totalCount: delistSchedule.length,
        checkTime: new Date().toISOString()
      },
      message: `获取到${delistSchedule.length}条下架计划数据`,
    });
  } catch (error) {
    handleError(error, res, "获取下架计划数据");
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
