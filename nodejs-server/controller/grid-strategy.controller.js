/**
 * 网格策略控制器
 * 单用户系统：处理网格交易策略相关的业务逻辑，提供策略创建、管理和执行功能
 */
const gridStrategyService = require("../service/grid-strategy.service");
const gridOptimizerService = require("../service/grid-optimizer.service");
const { validateStrategyParams } = require("../middleware/strategy-validator");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");

/**
 * 通用辅助函数：准备包含 API 凭证的数据对象
 * @param {Object} apiCredentials - API 凭证对象
 * @param {Object} data - 额外数据
 * @returns {Object} 包含 api_key 和 api_secret 的对象
 */
const prepareData = (apiCredentials, data = {}) => ({
  api_key: apiCredentials.api_key,
  api_secret: apiCredentials.api_secret,
  ...data,
});

/**
 * 通用辅助函数：准备分页参数
 * @param {Object} query - 请求查询参数
 * @returns {Object} 包含 currentPage 和 pageSize 的对象
 */
const preparePagination = (query) => ({
  currentPage: Number(query.currentPage) || 1,
  pageSize: Number(query.pageSize) || 10,
});

const list = catchAsync(async (req, res) => {
  const credentials = prepareData(req.apiCredentials);
  const pagination = preparePagination(req.query);

  const grid = await gridStrategyService.getAllGridStrategys(credentials, pagination);

  return res.apiSuccess(grid, '获取网格策略列表成功');
});


/**
 * 数值参数验证函数
 * @param {*} value - 待验证的值
 * @param {string} name - 参数名称
 * @param {boolean} allowZero - 是否允许为0
 * @returns {Object} { valid: boolean, message?: string }
 */
const validateNumberParam = (value, name, allowZero = false) => {
  if (value === undefined || value === null) return { valid: true };
  const num = Number(value);
  if (isNaN(num)) return { valid: false, message: `${name} 必须是数字` };
  if (allowZero ? num < 0 : num <= 0) return { valid: false, message: `${name} 必须${allowZero ? '是非负' : '是大于0'}的数字` };
  return { valid: true };
};

/**
 * 创建网格策略
 * - 终止时是否全部平仓
 * - 预测爆仓价格
 * - 是否立即开启/限价开启
 */
const create = catchAsync(async (req, res) => {
  // 参数验证
  if (!req.body.trading_pair) {
    return res.apiError(null, "trading_pair 是必填项");
  }

  // 数值参数边界检查
  const validations = [
    validateNumberParam(req.body.grid_price_difference, "grid_price_difference"),
    validateNumberParam(req.body.grid_trade_quantity, "grid_trade_quantity"),
    validateNumberParam(req.body.max_open_position_quantity, "max_open_position_quantity"),
    validateNumberParam(req.body.min_open_position_quantity, "min_open_position_quantity"),
    validateNumberParam(req.body.leverage, "leverage"),
  ];

  for (const { valid, message } of validations) {
    if (!valid) return res.apiError(null, message);
  }

  // 合并 API 凭证和请求数据
  const strategyData = prepareData(req.apiCredentials, req.body);

  // 从数据库获取 exchangeInfo，自动填充 price_precision 和 quantity_precision
  try {
    const db = require("../models");
    const BinanceExchangeInfo = db.binance_exchange_info;

    const exchangeInfoRecord = await BinanceExchangeInfo.getLatest();
    if (exchangeInfoRecord && exchangeInfoRecord.exchange_info) {
      const exchangeInfo = JSON.parse(exchangeInfoRecord.exchange_info);
      const symbol = exchangeInfo.symbols?.find(s => s.symbol === req.body.trading_pair);

      if (symbol) {
        // 从 exchangeInfo 获取精度
        strategyData.price_precision = symbol.pricePrecision ?? 2;
        strategyData.quantity_precision = symbol.quantityPrecision ?? 3;
      } else {
        // 如果找不到对应交易对，使用默认值
        strategyData.price_precision = 2;
        strategyData.quantity_precision = 3;
      }
    } else {
      // 如果没有 exchangeInfo 记录，使用默认值
      strategyData.price_precision = 2;
      strategyData.quantity_precision = 3;
    }
  } catch (error) {
    console.error('[grid-strategy.controller] 获取 exchangeInfo 失败，使用默认精度:', error);
    strategyData.price_precision = 2;
    strategyData.quantity_precision = 3;
  }

  // 过滤掉 undefined 或 null 的参数
  Object.keys(strategyData).forEach(key => {
    if (strategyData[key] === undefined || strategyData[key] === null) {
      delete strategyData[key];
    }
  });

  try {
    const { row, created } = await gridStrategyService.createGridStrategy(strategyData);

    if (!created) {
      return res.apiError(null, `已存在该交易对 ${req.body.trading_pair} 的网格策略`);
    }

    return res.apiSuccess(row, "网格策略创建成功");
  } catch (err) {
    console.error('[grid-strategy.controller] 创建网格策略时出错:', err);
    return res.apiError(null, err.message || "创建网格策略失败");
  }
});


/** 删除网格策略 */
const deletes = catchAsync(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.apiError(null, '缺少参数: id');
  }

  if (!Array.isArray(id)) {
    return res.apiError(null, '参数 id 必须是数组格式');
  }

  const result = await gridStrategyService.deleteGridStrategyById(
    prepareData(req.apiCredentials, req.body)
  );

  if (result?.status) {
    return res.apiSuccess({}, '网格策略删除成功');
  }
  return res.apiError(null, '网格策略删除失败');
});


const update = catchAsync(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.apiError(null, "缺少参数: id");
  }

  const updateData = prepareData(req.apiCredentials, {
    ...req.body,
    id: Number(req.body.id),
  });

  // 如果更新了 trading_pair，从 exchangeInfo 获取新的精度
  if (updateData.trading_pair) {
    try {
      const db = require("../models");
      const BinanceExchangeInfo = db.binance_exchange_info;

      const exchangeInfoRecord = await BinanceExchangeInfo.getLatest();
      if (exchangeInfoRecord && exchangeInfoRecord.exchange_info) {
        const exchangeInfo = JSON.parse(exchangeInfoRecord.exchange_info);
        const symbol = exchangeInfo.symbols?.find(s => s.symbol === updateData.trading_pair);

        if (symbol) {
          updateData.price_precision = symbol.pricePrecision ?? 2;
          updateData.quantity_precision = symbol.quantityPrecision ?? 3;
        } else {
          updateData.price_precision = 2;
          updateData.quantity_precision = 3;
        }
      } else {
        updateData.price_precision = 2;
        updateData.quantity_precision = 3;
      }
    } catch (error) {
      console.error('[grid-strategy.controller] 获取 exchangeInfo 失败，使用默认精度:', error);
      updateData.price_precision = 2;
      updateData.quantity_precision = 3;
    }
  }

  // 过滤掉 undefined 的参数
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const result = await gridStrategyService.updateGridStrategyById(updateData);

  if (result.affectedCount > 0) {
    return res.apiSuccess(result.data, "网格策略更新成功");
  }
  return res.apiError(null, "网格策略更新失败");
});


/** 更新网格策略状态（暂停或继续） */
const action = catchAsync(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.apiError(null, '缺少策略ID');
  }

  const paused = req.path.includes('/paused');
  const result = await gridStrategyService.updateGridStrategyById(
    prepareData(req.apiCredentials, { ...req.body, paused, id: Number(id) })
  );

  if (result.affectedCount > 0) {
    return res.apiSuccess(result.data, paused ? '策略已暂停' : '策略已恢复运行');
  }
  return res.apiError(null, '更新策略失败');
});


const query = catchAsync(async (req, res) => {
  const credentials = prepareData(req.apiCredentials);
  const pagination = preparePagination(req.query);

  const grid = await gridStrategyService.getAllGridStrategys(credentials, pagination);

  return res.apiSuccess(grid, '查询网格策略成功');
});


/**
 * 智能网格参数优化
 * 根据K线数据自动计算最优网格参数
 */
const optimize_params = catchAsync(async (req, res) => {
  const { symbol, total_capital, interval, optimize_target, min_trade_value, max_trade_value } = req.body;

  if (!symbol) {
    return res.apiError(null, "缺少交易对参数 symbol");
  }

  const capitalCheck = validateNumberParam(total_capital, "总资金");
  if (!capitalCheck.valid) {
    return res.apiError(null, capitalCheck.message);
  }

  try {
    const result = await gridOptimizerService.optimizeGridParams(
      prepareData(req.apiCredentials, {
        symbol,
        interval: interval || '4h',
        total_capital: Number(total_capital),
        optimize_target: optimize_target || 'profit',
        enable_boundary_defense: false,
        min_trade_value: min_trade_value ? Number(min_trade_value) : 20,
        max_trade_value: max_trade_value ? Number(max_trade_value) : 100,
      })
    );

    return res.apiSuccess(result, "获取优化参数成功");
  } catch (err) {
    console.error("网格参数优化失败:", err);
    return res.apiError(null, err.message || "获取优化参数失败");
  }
});


module.exports = {
  list,
  create,
  deletes,
  update,
  action,
  query,
  optimize_params,
  validateStrategyParams,
};
