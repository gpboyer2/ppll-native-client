const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const ordersService = require("../service/orders.service.js");
const bigNumber = require('bignumber.js');
const UtilRecord = require("../utils/record-log.js");
const { USDMClient } = require("binance");
const proxy = require("../utils/proxy.js");
const db = require("../models");
const Order = db.orders;

// 最小余额要求
const MIN_BALANCE_REQUIRED = 10;

/**
 * 检查账户余额是否充足
 * @param {string} api_key - API密钥
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<Object>} 账户信息
 */
async function checkAccountBalance(api_key, api_secret) {
  try {
    const requestOptions = {
      timeout: 10000,
    };

    // 从环境变量读取代理配置
    const proxyConfig = proxy.getProxyConfig();
    if (proxyConfig) {
      requestOptions.proxy = proxyConfig;
    }

    const client = new USDMClient({
      api_key: api_key,
      api_secret: api_secret,
      beautify: true,
    }, requestOptions);

    const accountInfo = await client.getAccountInformation();

    if (new bigNumber(accountInfo.availableBalance).isLessThan(MIN_BALANCE_REQUIRED)) {
      throw new Error(`当前合约账户余额${accountInfo.availableBalance}, 不足${MIN_BALANCE_REQUIRED}u, 请充值`);
    }

    return accountInfo;
  } catch (error) {
    throw new Error(`获取账户信息失败: ${error.message}`);
  }
}

/**
 * 参数验证中间件
 * @param {Array} requiredParams - 必需参数列表
 * @returns {Function} 中间件函数
 */
const validateParams = (requiredParams) => {
  return (req, res, next) => {
    const missingParams = [];

    requiredParams.forEach(param => {
      if (!req.body[param] && !req.query[param]) {
        missingParams.push(param);
      }
    });

    if (missingParams.length > 0) {
      return res.apiError(null, `${missingParams.join(', ')} is not defined`);
    }

    next();
  };
};

/**
 * 模板接口
 */
const template = catchAsync(async (req, res) => {
  return res.apiSuccess({ message: 'You are here now...' }, '订单服务正常');
});

/**
 * U本位合约开仓
 */
const umOpenPosition = catchAsync(async (req, res) => {
  const result = await ordersService.umOpenPosition(req.body);
  return res.apiSuccess(result);
});

/**
 * U本位合约平仓
 */
const umClosePosition = catchAsync(async (req, res) => {
  const { positions } = req.body;

  // 先打印接口请求信息，确保接口日志在业务日志之前输出
  const totalRequestPositions = Array.isArray(positions) ? positions.length : 0;
  UtilRecord.log(
    `[U本位平仓] 接口请求 - 收到平仓参数，总数: ${totalRequestPositions}`
  );

  const result = await ordersService.umClosePosition(req.body);

  // 再打印接口响应信息
  UtilRecord.log(
    `[U本位平仓] 接口响应 - 总仓位: ${result.totalPositions}, 有效: ${result.validPositions || 0}, 跳过: ${result.skippedPositions || 0}`
  );

  // 判断实际是否有仓位被平掉
  if (result.validPositions === 0 || (result.processedCount === 0 && result.skippedPositions > 0)) {
    return res.apiError(result, result.message || `没有可平仓的仓位，共跳过 ${result.skippedPositions} 个`);
  }

  return res.apiSuccess(result);
});


/**
 * 批量检查对冲单持仓
 */
const batchInspect = catchAsync(async (req, res) => {
  const { api_key, api_secret } = req.body;

  // 获取账户信息
  const account_info = await checkAccountBalance(api_key, api_secret);
  const positions = account_info.positions;

  const missingPositions = {}; // 缺少对冲仓交易对
  const recordPositions = []; // 下了单的对冲仓交易对

  positions.forEach(position => {
    if (!position.symbol.endsWith('USDT')) return;
    if (Number(position.positionAmt)) {
      recordPositions.push(position);
    }
  });

  recordPositions.forEach(position => {
    const symbol = position.symbol;
    if (!missingPositions[symbol]) {
      missingPositions[symbol] = position;
      return;
    }
    if (missingPositions[symbol]) {
      delete missingPositions[symbol];
      return;
    }
  });

  if (Object.keys(missingPositions).length) {
    return res.apiSuccess(missingPositions, 'ok');
  } else {
    return res.apiSuccess(null, '没有发现仅有单边持仓的交易对！');
  }
});

/**
 * 为空单设置原价止盈
 */
const setShortTakeProfit = catchAsync(async (req, res) => {
  const { positions } = req.body;
  const result = await ordersService.setShortTakeProfit(req.body);
  return res.apiSuccess(result, `请等待约 ${positions.length * 0.5} 秒后，在APP查看止盈设置结果`);
});

/**
 * 查询快捷订单记录
 */
const queryQuickOrderRecords = catchAsync(async (req, res) => {
  const { api_key, api_secret } = req.query;

  if (!api_key) {
    return res.apiError(null, 'api_key is not defined');
  }

  const { count, rows } = await Order.findAndCountAll({
    where: {
      api_key,
      source: 'QUICK_ORDER',
      status: 'FILLED'
    },
    order: [['created_at', 'DESC']]
  });

  // 补充杠杆和预计手续费信息
  let enriched_rows = rows;
  if (api_secret && rows.length > 0) {
    try {
      enriched_rows = await ordersService.enrichQuickOrderRecords(rows, api_key, api_secret);
    } catch (error) {
      UtilRecord.error('补充快捷订单记录信息失败:', error);
      enriched_rows = rows;
    }
  }

  return res.apiSuccess({
    list: enriched_rows,
    pagination: {
      total: count,
      currentPage: 1,
      pageSize: count
    }
  }, '操作成功');
});

/**
 * 获取近一个月开仓均价
 */
const getAvgEntryPrice = catchAsync(async (req, res) => {
  const { api_key, api_secret, symbol, position_side } = req.query;

  if (!api_key || !api_secret || !symbol || !position_side) {
    return res.apiError(null, '参数不完整');
  }

  if (!['LONG', 'SHORT'].includes(position_side)) {
    return res.apiError(null, 'position_side 必须是 LONG 或 SHORT');
  }

  const avg_price = await ordersService.getAvgEntryPrice(api_key, api_secret, symbol, position_side);
  return res.apiSuccess({ avg_price }, '操作成功');
});

module.exports = {
  template,
  umOpenPosition,
  umClosePosition,
  batchInspect,
  setShortTakeProfit,
  queryQuickOrderRecords,
  getAvgEntryPrice,
  validateParams
};