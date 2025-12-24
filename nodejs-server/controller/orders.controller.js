const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const ordersService = require("../service/orders.service.js");
const bigNumber = require('bignumber.js');
const UtilRecord = require("../utils/record-log.js");


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
      return res.send({
        status: 'error',
        code: 400,
        message: `${missingParams.join(', ')} is not defined`,
        data: null
      });
    }

    next();
  };
};

/**
 * 模板接口
 */
const template = async (req, res) => {
  res.send({
    status: 'success',
    code: 200,
    message: 'You are here now...',
    data: {
      message: 'You are here now...'
    }
  });
};

/**
 * 批量建仓（对冲单）
 */
const batchBuildPosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, longAmount, shortAmount, positions } = req.body;

  try {
    const result = await ordersService.batchBuildPosition(apiKey, apiSecret, longAmount, shortAmount, positions);

    res.send({
      status: 'success',
      code: 200,
      message: `序列总长 ${result.totalPairs}，建仓完成`,
      data: result
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 自定义建仓（对冲单）
 */
const customBuildPosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.customBuildPosition(apiKey, apiSecret, positions);

    res.send({
      status: 'success',
      code: 200,
      message: `请等待约 ${positions.length * 1.5} 秒后，在APP查看建仓结果`,
      data: result
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 自定义平多单，空单不做任何操作；（看空）
 */
const customCloseMultiplePosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.customCloseMultiplePositions(apiKey, apiSecret, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `请等待约 ${result.totalPositions * 10} 秒后，在APP查看平仓结果`,
      data: result
    });

    // 这里可以异步执行一些后续操作或日志记录
    UtilRecord.log('[自定义平多单] 接口响应 - 已提交后台执行', {
      totalPositions: result.totalPositions,
      processedCount: result.processedCount
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 批量平仓
 */
const batchClosePosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.batchClosePositions(apiKey, apiSecret, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `请等待约 ${result.totalPositions * 1.5} 秒后，在APP查看平仓结果`,
      data: result
    });

    UtilRecord.log('[批量平仓] 接口响应 - 已提交后台执行', {
      totalPositions: result.totalPositions,
      processedCount: result.processedCount
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 自定义平仓
 */
const customClosePosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    // 先打印接口请求信息，确保接口日志在业务日志之前输出
    const totalRequestPositions = Array.isArray(positions) ? positions.length : 0;
    UtilRecord.log(
      `[自定义平仓] 接口请求 - 收到平仓参数，总数: ${totalRequestPositions}`
    );

    const result = await ordersService.customClosePositions(apiKey, apiSecret, positions);

    // 再打印接口响应信息
    UtilRecord.log(
      `[自定义平仓] 接口响应 - 总仓位: ${result.totalPositions}, 有效: ${result.validPositions}, 跳过: ${result.skippedPositions}`
    );

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `请等待约 ${result.totalPositions * 1.5} 秒后，在APP查看平仓结果`,
      data: result
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 400,
      message: error.message,
      data: null
    });
  }
});

/**
 * 指定平仓
 */
const appointClosePosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.appointClosePosition(apiKey, apiSecret, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: result.error || `请等待约 ${positions.length * 1.5} 秒后，在APP查看平仓结果`,
      data: result
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});


/**
 * 批量检查对冲单持仓
 */
const batchInspect = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.body;

  try {
    // 获取账户信息
    const accountInfo = await binanceAccount.checkAccountBalance(apiKey, apiSecret);
    const positions = accountInfo.positions;

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
      res.send({
        status: 'success',
        code: 200,
        message: 'ok',
        data: missingPositions
      });
    } else {
      res.send({
        status: 'success',
        code: 200,
        message: '没有发现仅有单边持仓的交易对！',
        data: null
      });
    }
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});


/**
 * 简化批量建仓（按价值下单）- 新增优化版本
 */
const simpleBatchBuildPosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, longAmount, shortAmount, positions } = req.body;

  try {
    const result = await ordersService.simpleBatchBuildPosition(apiKey, apiSecret, longAmount, shortAmount, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `简化批量建仓完成，总交易对 ${result.totalPairs}，成功 ${result.summary.successCount} 个订单`,
      data: {
        ...result,
        performance: {
          method: '简化按价值下单',
          advantages: [
            '无需复杂精度计算',
            '自动重试机制',
            '代码更简洁',
            '性能更好'
          ]
        }
      }
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 简化自定义建仓（按价值下单）- 新增优化版本
 */
const simpleCustomBuildPosition = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.simpleCustomBuildPosition(apiKey, apiSecret, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `简化自定义建仓完成，成功 ${result.summary.successCount} 个订单`,
      data: {
        ...result,
        performance: {
          method: '简化按价值下单',
          advantages: [
            '直接按价值下单',
            '自动处理精度错误',
            '代码量减少70%',
            '维护成本更低'
          ]
        }
      }
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 为空单设置原价止盈
 */
const setShortTakeProfit = catchAsync(async (req, res) => {
  const { apiKey, apiSecret, positions } = req.body;

  try {
    const result = await ordersService.setShortTakeProfit(apiKey, apiSecret, positions);

    res.send({
      status: result.success ? 'success' : 'error',
      code: result.success ? 200 : 500,
      message: `请等待约 ${positions.length * 0.5} 秒后，在APP查看止盈设置结果`,
      data: result
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
});

module.exports = {
  template,
  batchBuildPosition,
  customBuildPosition,
  customCloseMultiplePosition,
  batchClosePosition,
  customClosePosition,
  appointClosePosition,
  batchInspect,
  // 新增的简化接口
  simpleBatchBuildPosition,
  simpleCustomBuildPosition,
  setShortTakeProfit,
  validateParams
};