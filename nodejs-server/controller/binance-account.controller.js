/**
 * 币安账户信息控制器
 * 处理币安账户信息相关的业务逻辑，提供现货、U本位合约、币本位合约账户信息查询功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const binanceAccountService = require("../service/binance-account.service");
const { extractApiCredentials } = require("../utils");
const { convertToBoolean } = require("../utils/binance-account");
const UtilRecord = require('../utils/record-log.js');

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
 * 获取U本位合约账户信息
 * 获取币安U本位合约账户的详细信息，包括资产余额、持仓信息、保证金状态等
 *
 * 返回信息包括：
 * - feeTier: 手续费等级
 * - canTrade: 是否可以交易
 * - canDeposit: 是否可以充值
 * - canWithdraw: 是否可以提现
 * - updateTime: 更新时间
 * - totalInitialMargin: 总初始保证金
 * - totalMaintMargin: 总维持保证金
 * - totalWalletBalance: 总钱包余额
 * - totalUnrealizedProfit: 总未实现盈亏
 * - totalMarginBalance: 总保证金余额
 * - totalPositionInitialMargin: 总持仓初始保证金
 * - totalOpenOrderInitialMargin: 总挂单初始保证金
 * - totalCrossWalletBalance: 全仓钱包余额
 * - totalCrossUnPnl: 全仓未实现盈亏
 * - availableBalance: 可用余额
 * - maxWithdrawAmount: 最大可提现金额
 * - assets: 资产详情数组
 * - positions: 持仓详情数组（可选，通过includePositions参数控制）
 */
const getUSDMFuturesAccount = catchAsync(async (req, res) => {
  let { apiKey, apiSecret, includePositions } = extractApiCredentials(req);
  includePositions = convertToBoolean(includePositions);
  // 从 VIP 中间件获取用户ID
  const userId = req.vipUser?.id;

  // 记录API调用日志
  UtilRecord.debug('获取U本位合约账户信息', `userId: ${userId}, apiKey: ${apiKey ? apiKey.substring(0, 8) + '...' : 'undefined'}`);

  // 验证必需参数
  if (!apiKey || !apiSecret) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少必要的API凭证参数",
    });
  }

  try {
    const accountInfo = await binanceAccountService.getUSDMFuturesAccount(
      apiKey,
      apiSecret,
      userId,
      includePositions
    );

    const message = includePositions
      ? "获取U本位合约账户信息成功"
      : "获取U本位合约账户信息成功（不包含持仓数据）";

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: accountInfo,
      message,
    });
  } catch (error) {
    handleError(error, res, "获取U本位合约账户信息");
  }
});

/**
 * 获取现货账户信息
 * 获取币安现货账户的详细信息，包括各币种余额、交易权限、账户状态等
 *
 * 返回信息包括：
 * - makerCommission: Maker手续费率
 * - takerCommission: Taker手续费率
 * - buyerCommission: 买方手续费率
 * - sellerCommission: 卖方手续费率
 * - canTrade: 是否可以交易
 * - canWithdraw: 是否可以提现
 * - canDeposit: 是否可以充值
 * - updateTime: 更新时间
 * - accountType: 账户类型
 * - balances: 资产余额详情数组（可过滤空余额币种，包含free和locked余额）
 * - permissions: 权限数组
 */
const getSpotAccount = catchAsync(async (req, res) => {
  let { apiKey, apiSecret, includeEmptyBalances } = extractApiCredentials(req);
  includeEmptyBalances = convertToBoolean(includeEmptyBalances);
  // 从 VIP 中间件获取用户ID
  const userId = req.vipUser?.id;

  // 验证必需参数
  if (!apiKey || !apiSecret) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少必要的API凭证参数",
    });
  }

  try {
    const accountInfo = await binanceAccountService.getSpotAccount(
      apiKey,
      apiSecret,
      userId,
      includeEmptyBalances
    );

    const message = includeEmptyBalances
      ? "获取现货账户信息成功"
      : "获取现货账户信息成功（已过滤空余额币种）";

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: accountInfo,
      message,
    });
  } catch (error) {
    handleError(error, res, "获取现货账户信息");
  }
});

/**
 * 获取币本位合约账户信息
 * 获取币安币本位合约账户的详细信息，包括各币种保证金余额、持仓信息、账户状态等
 *
 * 返回信息包括：
 * - feeTier: 手续费等级
 * - canTrade: 是否可以交易
 * - canDeposit: 是否可以充值
 * - canWithdraw: 是否可以提现
 * - updateTime: 更新时间
 * - totalInitialMargin: 总初始保证金
 * - totalMaintMargin: 总维持保证金
 * - totalWalletBalance: 总钱包余额
 * - totalUnrealizedProfit: 总未实现盈亏
 * - totalMarginBalance: 总保证金余额
 * - totalPositionInitialMargin: 总持仓初始保证金
 * - totalOpenOrderInitialMargin: 总挂单初始保证金
 * - totalCrossWalletBalance: 全仓钱包余额
 * - totalCrossUnPnl: 全仓未实现盈亏
 * - availableBalance: 可用余额
 * - maxWithdrawAmount: 最大可提现金额
 * - assets: 资产详情数组
 * - positions: 持仓详情数组（可选，通过includePositions参数控制）
 */
const getCoinMFuturesAccount = catchAsync(async (req, res) => {
  let { apiKey, apiSecret, includePositions } = extractApiCredentials(req);
  includePositions = convertToBoolean(includePositions);
  // 从 VIP 中间件获取用户ID
  const userId = req.vipUser?.id;

  // 验证必需参数
  if (!apiKey || !apiSecret) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少必要的API凭证参数",
    });
  }

  try {
    const accountInfo = await binanceAccountService.getCoinMFuturesAccount(
      apiKey,
      apiSecret,
      userId,
      includePositions
    );

    const message = includePositions
      ? "获取币本位合约账户信息成功"
      : "获取币本位合约账户信息成功（不包含持仓数据）";

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: accountInfo,
      message,
    });
  } catch (error) {
    handleError(error, res, "获取币本位合约账户信息");
  }
});

/**
 * 设置U本位合约杠杆倍数（支持批量）
 * 调整U本位合约交易对的杠杆倍数，支持单个或多个交易对
 */
const setLeverage = catchAsync(async (req, res) => {
  let { apiKey, apiSecret, leverageList, delay } = extractApiCredentials(req);

  // 验证必需参数
  if (!apiKey || !apiSecret) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少API凭证",
    });
  }

  if (!leverageList || !Array.isArray(leverageList)) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "leverageList 必须是一个数组，格式为 [{symbol: 'BTCUSDT', leverage: 20}, {symbol: 'ETHUSDT', leverage: 10}]",
    });
  }

  if (leverageList.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "leverageList 不能为空数组",
    });
  }

  // 验证每个交易对的杠杆倍数
  for (const item of leverageList) {
    if (!item || typeof item !== 'object') {
      return res.status(httpStatus.BAD_REQUEST).send({
        status: "error",
        code: httpStatus.BAD_REQUEST,
        message: "数组中的每个元素必须是包含 symbol 和 leverage 属性的对象",
      });
    }

    if (!item.symbol || typeof item.symbol !== 'string') {
      return res.status(httpStatus.BAD_REQUEST).send({
        status: "error",
        code: httpStatus.BAD_REQUEST,
        message: "交易对符号必须是非空字符串",
      });
    }

    if (!Number.isInteger(item.leverage) || item.leverage < 1 || item.leverage > 125) {
      return res.status(httpStatus.BAD_REQUEST).send({
        status: "error",
        code: httpStatus.BAD_REQUEST,
        message: `${item.symbol} 的杠杆倍数必须是 1-125 之间的整数`,
      });
    }
  }

  try {
    const isSmallBatch = leverageList.length <= 5;
    // 立即开始执行批量设置，返回 Promise
    const leveragePromise = binanceAccountService.batchSetLeverage(
      apiKey,
      apiSecret,
      leverageList,
      delay
    );

    // 如果请求数量较大（>5），异步执行，立即返回等待消息
    if (!isSmallBatch) {
      leveragePromise.catch(error => {
        console.error("批量设置杠杆异步执行失败:", error);
      });

      res.status(httpStatus.OK).send({
        status: "success",
        code: httpStatus.OK,
        data: {
          results: [],
          summary: {
            total: leverageList.length,
          },
        },
        message: `已提交 ${leverageList.length} 个交易对的杠杆设置任务，请稍后查看账户信息确认结果`,
      });

      return;
    }

    // 如果请求数量较少（<=5），等待结果再返回
    const results = await leveragePromise;

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount,
          successRate: `${((successCount / results.length) * 100).toFixed(2)}%`
        }
      },
      message: `批量设置杠杆完成：成功 ${successCount} 个，失败 ${failedCount} 个`,
    });
  } catch (error) {
    handleError(error, res, "批量设置杠杆");
  }
});

/**
 * 生成 ListenKey (U本位合约)
 * 用于前端建立 User Data Stream WebSocket 连接
 */
const generateListenKey = catchAsync(async (req, res) => {
  const { apiKey } = extractApiCredentials(req);

  if (!apiKey) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少 API Key",
    });
  }

  try {
    const listenKey = await binanceAccountService.generateListenKey(apiKey);

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      data: { listenKey },
      message: "ListenKey 生成成功",
    });
  } catch (error) {
    handleError(error, res, "生成 ListenKey");
  }
});

/**
 * 延长 ListenKey 有效期
 */
const keepAliveListenKey = catchAsync(async (req, res) => {
  const { apiKey } = extractApiCredentials(req);

  if (!apiKey) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: "error",
      code: httpStatus.BAD_REQUEST,
      message: "缺少 API Key",
    });
  }

  try {
    await binanceAccountService.keepAliveListenKey(apiKey);

    res.status(httpStatus.OK).send({
      status: "success",
      code: httpStatus.OK,
      message: "ListenKey 延期成功",
    });
  } catch (error) {
    handleError(error, res, "延长 ListenKey");
  }
});

module.exports = {
  getUSDMFuturesAccount,
  getSpotAccount,
  getCoinMFuturesAccount,
  setLeverage,
  generateListenKey,
  keepAliveListenKey,
};