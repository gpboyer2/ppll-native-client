/**
 * 币安账户信息控制器
 * 处理币安账户信息相关的业务逻辑，提供现货、U本位合约、币本位合约账户信息查询功能
 */
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const binanceAccountService = require("../service/binance-account.service");
const { extractApiCredentials } = require("../utils");
const { convertToBoolean } = require("../utils/binance-account");
const UtilRecord = require('../utils/record-log.js');

/**
 * 通用错误处理函数
 * @param {Error & {body?: string|{code?: number; msg?: string}, code?: number}} error - 错误对象
 * @param {Object} res - Express响应对象
 * @param {string} operation - 操作描述
 */
const handleError = (error, res, operation) => {
  console.error(`${operation}出错:`, error);

  // 解析错误信息
  let errorCode = null;
  let errorMessage = error.message || `${operation}失败`;

  // 尝试从 error.body 中提取错误代码
  if (error.body) {
    try {
      const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
      errorCode = body.code;
      errorMessage = body.msg || errorMessage;
    } catch (e) {
      // 无法解析 body
    }
  }

  // 检查 error.code
  if (!errorCode && error.code) {
    errorCode = error.code;
  }

  // 针对签名错误提供详细的用户引导
  if (errorCode === -1022 || errorMessage.includes('Signature for this request is not valid')) {
    return res.apiError(
      null,
      `API Key 配置错误，请检查以下项：

1. 检查 API Key 是否正确复制
   • 确保没有多余的空格
   • 确保复制了完整的内容

2. 检查 Secret Key 是否正确复制
   • 确保没有多余的空格
   • 确保复制了完整的内容

3. 检查币安后台权限设置
   • 访问：https://www.binance.com/zh-CN/my/settings/api-management
   • 确保启用了「U本位合约交易」权限
   • 如果设置了 IP 白名单，请删除限制或添加服务器 IP

4. 重新生成 API Key
   • 如果以上都正确，建议删除当前 API Key
   • 重新生成新的 API Key 和 Secret Key
   • 然后在系统中更新

💡 提示：签名错误通常是因为 Secret Key 输入错误或权限设置不正确。`
    );
  }

  // 针对无效 API Key 错误
  if (errorCode === -2015) {
    // 检查是否是 IP 白名单限制
    if (errorMessage.includes('IP, or permissions')) {
      // 提取 IP 地址
      const ip_match = errorMessage.match(/request ip:\s*([\d.]+)/);
      const ip_address = ip_match ? ip_match[1] : null;
      return res.apiError({
        error_type: 'ip_restricted',
        ip_address: ip_address
      }, 'IP 白名单限制');
    }
    // 其他 -2015 错误（真正的 API Key 无效）
    return res.apiError(null, 'API Key 无效');
  }

  // 其他包含 Invalid API-key 的错误
  if (errorMessage.includes('Invalid API-key')) {
    return res.apiError(null, 'API Key 无效');
  }

  // 默认错误消息
  return res.apiError(null, errorMessage);
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
  let { api_key, secret_key, includePositions } = extractApiCredentials(req);
  includePositions = convertToBoolean(includePositions);

  // 记录API调用日志
  UtilRecord.debug('获取U本位合约账户信息', `api_key: ${api_key ? api_key.substring(0, 8) + '...' : 'undefined'}`);

  // 验证必需参数
  if (!api_key || !secret_key) {
    return res.apiError("缺少必要的API凭证参数");
  }

  try {
    const account_info = await binanceAccountService.getUSDMFuturesAccount(
      api_key,
      secret_key,
      includePositions
    );

    const message = includePositions
      ? "获取U本位合约账户信息成功"
      : "获取U本位合约账户信息成功（不包含持仓数据）";

    return res.apiSuccess(account_info, message);
  } catch (error) {
    return handleError(error, res, "获取U本位合约账户信息");
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
  let { api_key, secret_key, includeEmptyBalances } = extractApiCredentials(req);
  includeEmptyBalances = convertToBoolean(includeEmptyBalances);

  // 验证必需参数
  if (!api_key || !secret_key) {
    return res.apiError("缺少必要的API凭证参数");
  }

  try {
    const account_info = await binanceAccountService.getSpotAccount(
      api_key,
      secret_key,
      includeEmptyBalances
    );

    const message = includeEmptyBalances
      ? "获取现货账户信息成功"
      : "获取现货账户信息成功（已过滤空余额币种）";

    return res.apiSuccess(account_info, message);
  } catch (error) {
    return handleError(error, res, "获取现货账户信息");
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
  let { api_key, secret_key, includePositions } = extractApiCredentials(req);
  includePositions = convertToBoolean(includePositions);

  // 验证必需参数
  if (!api_key || !secret_key) {
    return res.apiError("缺少必要的API凭证参数");
  }

  try {
    const account_info = await binanceAccountService.getCoinMFuturesAccount(
      api_key,
      secret_key,
      includePositions
    );

    const message = includePositions
      ? "获取币本位合约账户信息成功"
      : "获取币本位合约账户信息成功（不包含持仓数据）";

    return res.apiSuccess(account_info, message);
  } catch (error) {
    return handleError(error, res, "获取币本位合约账户信息");
  }
});

/**
 * 设置U本位合约杠杆倍数（支持批量）
 * 调整U本位合约交易对的杠杆倍数，支持单个或多个交易对
 */
const setLeverage = catchAsync(async (req, res) => {
  let { api_key, secret_key, leverageList, delay } = extractApiCredentials(req);

  // 验证必需参数
  if (!api_key || !secret_key) {
    return res.apiError("缺少API凭证");
  }

  if (!leverageList || !Array.isArray(leverageList)) {
    return res.apiError("leverageList 必须是一个数组，格式为 [{symbol: 'BTCUSDT', leverage: 20}, {symbol: 'ETHUSDT', leverage: 10}]");
  }

  if (leverageList.length === 0) {
    return res.apiError("leverageList 不能为空数组");
  }

  // 验证每个交易对的杠杆倍数
  for (const item of leverageList) {
    if (!item || typeof item !== 'object') {
      return res.apiError("数组中的每个元素必须是包含 symbol 和 leverage 属性的对象");
    }

    if (!item.symbol || typeof item.symbol !== 'string') {
      return res.apiError("交易对符号必须是非空字符串");
    }

    if (!Number.isInteger(item.leverage) || item.leverage < 1 || item.leverage > 125) {
      return res.apiError(`${item.symbol} 的杠杆倍数必须是 1-125 之间的整数`);
    }
  }

  try {
    const is_small_batch = leverageList.length <= 5;
    // 立即开始执行批量设置，返回 Promise
    const leverage_promise = binanceAccountService.batchSetLeverage(
      api_key,
      secret_key,
      leverageList,
      delay
    );

    // 如果请求数量较大（>5），异步执行，立即返回等待消息
    if (!is_small_batch) {
      leverage_promise.catch(error => {
        console.error("批量设置杠杆异步执行失败:", error);
      });

      return res.apiSuccess({
        results: [],
        summary: {
          total: leverageList.length,
        },
      }, `已提交 ${leverageList.length} 个交易对的杠杆设置任务，请稍后查看账户信息确认结果`);
    }

    // 如果请求数量较少（<=5），等待结果再返回
    const results = await leverage_promise;

    // 统计结果
    const success_count = results.filter(r => r.success).length;
    const failed_count = results.filter(r => !r.success).length;

    return res.apiSuccess({
      results,
      summary: {
        total: results.length,
        success: success_count,
        failed: failed_count,
        successRate: `${((success_count / results.length) * 100).toFixed(2)}%`
      }
    }, `批量设置杠杆完成：成功 ${success_count} 个，失败 ${failed_count} 个`);
  } catch (error) {
    return handleError(error, res, "批量设置杠杆");
  }
});

/**
 * 生成 ListenKey (U本位合约)
 * 用于前端建立 User Data Stream WebSocket 连接
 */
const generateListenKey = catchAsync(async (req, res) => {
  const { api_key } = extractApiCredentials(req);

  if (!api_key) {
    return res.apiError("缺少 API Key");
  }

  try {
    const listen_key = await binanceAccountService.generateListenKey(api_key);

    return res.apiSuccess({ listen_key }, "ListenKey 生成成功");
  } catch (error) {
    return handleError(error, res, "生成 ListenKey");
  }
});

/**
 * 延长 ListenKey 有效期
 */
const keepAliveListenKey = catchAsync(async (req, res) => {
  const { api_key } = extractApiCredentials(req);

  if (!api_key) {
    return res.apiError("缺少 API Key");
  }

  try {
    await binanceAccountService.keepAliveListenKey(api_key);

    return res.apiSuccess({}, "ListenKey 延期成功");
  } catch (error) {
    return handleError(error, res, "延长 ListenKey");
  }
});

/**
 * 获取指定交易对的当前杠杆倍数
 * 获取币安U本位合约中指定交易对的当前杠杆倍数
 */
const getPositionRisk = catchAsync(async (req, res) => {
  let { api_key, secret_key, symbol } = extractApiCredentials(req);

  // 验证必需参数
  if (!api_key || !secret_key) {
    return res.apiError("缺少必要的API凭证参数");
  }

  if (!symbol) {
    return res.apiError("缺少交易对符号参数");
  }

  try {
    const position_risk = await binanceAccountService.getPositionRisk(
      api_key,
      secret_key,
      symbol
    );

    return res.apiSuccess(position_risk, "获取杠杆倍数成功");
  } catch (error) {
    return handleError(error, res, "获取杠杆倍数");
  }
});

module.exports = {
  getUSDMFuturesAccount,
  getSpotAccount,
  getCoinMFuturesAccount,
  setLeverage,
  generateListenKey,
  keepAliveListenKey,
  getPositionRisk,
};