/**
 * 网格策略控制器
 * 单用户系统：处理网格交易策略相关的业务逻辑，提供策略创建、管理和执行功能
 */
const gridStrategyService = require("../service/grid-strategy.service");
const gridOptimizerService = require("../service/grid-optimizer.service");
const { validateStrategyParams } = require("../middleware/strategy-validator");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");

const list = catchAsync(async (req, res) => {
  let { api_key, secret_key } = req.apiCredentials;
  let { currentPage, pageSize } = req.query;

  let grid = await gridStrategyService.getAllGridStrategys(
    { api_key: api_key, api_secret: secret_key },
    { currentPage: Number(currentPage) || 1, pageSize: Number(pageSize) || 10 }
  );

  return res.apiSuccess(grid, '获取网格策略列表成功');
});


/**
 * - 终止时是否全部平仓
 * - 预测爆仓价格
 * - 是否立即开启/限价开启
 * 
 */
const create = catchAsync(async (req, res) => {
  const { api_key, secret_key } = req.apiCredentials;
  const {
    trading_pair,
    position_side,
    grid_price_difference,
    grid_trade_quantity,
    // 分离的开仓/平仓数量
    grid_long_open_quantity,
    grid_long_close_quantity,
    grid_short_open_quantity,
    grid_short_close_quantity,
    max_open_position_quantity,
    min_open_position_quantity,
    fall_prevention_coefficient,
    polling_interval,
    price_precision,
    quantity_precision,
    name,
    leverage,
    margin_type,
    stop_loss_price,
    take_profit_price,
    // 价格限制参数
    gt_limitation_price,
    lt_limitation_price,
    // 暂停条件参数
    is_above_open_price,
    is_below_open_price,
    // 顺势仅减仓策略
    priority_close_on_trend,
    // 交易所类型
    exchange_type,
  } = req.body;

  // 参数验证
  if (!trading_pair) {
    return res.apiError("trading_pair 是必填项");
  }

  // 数值参数边界检查
  if (grid_price_difference && (isNaN(grid_price_difference) || Number(grid_price_difference) <= 0)) {
    return res.apiError("grid_price_difference 必须是大于0的数字");
  }

  if (grid_trade_quantity && (isNaN(grid_trade_quantity) || Number(grid_trade_quantity) <= 0)) {
    return res.apiError("grid_trade_quantity 必须是大于0的数字");
  }

  if (max_open_position_quantity && (isNaN(max_open_position_quantity) || Number(max_open_position_quantity) <= 0)) {
    return res.apiError("max_open_position_quantity 必须是大于0的数字");
  }

  if (min_open_position_quantity && (isNaN(min_open_position_quantity) || Number(min_open_position_quantity) <= 0)) {
    return res.apiError("min_open_position_quantity 必须是大于0的数字");
  }

  if (price_precision && (isNaN(price_precision) || Number(price_precision) < 0)) {
    return res.apiError("price_precision 必须是非负整数");
  }

  if (quantity_precision && (isNaN(quantity_precision) || Number(quantity_precision) < 0)) {
    return res.apiError("quantity_precision 必须是非负整数");
  }

  if (leverage && (isNaN(leverage) || Number(leverage) <= 0)) {
    return res.apiError("leverage 必须是大于0的整数");
  }

  const strategyData = {
    api_key: api_key,
    api_secret: secret_key,
    trading_pair,
    position_side,
    grid_price_difference,
    grid_trade_quantity,
    // 分离的开仓/平仓数量
    grid_long_open_quantity,
    grid_long_close_quantity,
    grid_short_open_quantity,
    grid_short_close_quantity,
    max_open_position_quantity,
    min_open_position_quantity,
    fall_prevention_coefficient,
    polling_interval,
    price_precision,
    quantity_precision,
    name,
    leverage,
    margin_type,
    stop_loss_price,
    take_profit_price,
    // 价格限制参数
    gt_limitation_price,
    lt_limitation_price,
    // 暂停条件参数
    is_above_open_price,
    is_below_open_price,
    // 顺势仅减仓策略
    priority_close_on_trend,
    // 交易所类型
    exchange_type,
  };

  // 过滤掉 undefined 或 null 的参数
  Object.keys(strategyData).forEach(key => {
    if (strategyData[key] === undefined || strategyData[key] === null) {
      delete strategyData[key];
    }
  });

  try {
    const { row, created } = await gridStrategyService.createGridStrategy(strategyData);

    // 检查创建结果
    if (!created) {
      return res.apiError(`已存在该交易对 ${trading_pair} 的网格策略`);
    }

    return res.apiSuccess(row, "网格策略创建成功");
  } catch (err) {
    console.error("创建网格策略时出错:", err);
    return res.apiError(err.message || "创建网格策略失败");
  }
});


/** 删除网格策略 */
const deletes = catchAsync(async (req, res) => {
  let { api_key, secret_key } = req.apiCredentials;
  let { id } = req.body;
  let result = null;

  if (!id) {
    return res.apiError('缺少参数: id');
  }

  result = await gridStrategyService.deleteGridStrategyById({
    api_key: api_key,
    api_secret: secret_key,
    id: Number(id)
  });

  if (result?.status) {
    return res.apiSuccess({}, '网格策略删除成功');
  } else {
    return res.apiError('网格策略删除失败');
  }
});


const update = catchAsync(async (req, res) => {
  const { api_key, secret_key } = req.apiCredentials;
  const {
    id,
    grid_price_difference,
    grid_trade_quantity,
    grid_long_open_quantity,
    grid_long_close_quantity,
    grid_short_open_quantity,
    grid_short_close_quantity,
    max_open_position_quantity,
    min_open_position_quantity,
    fall_prevention_coefficient,
    polling_interval,
    leverage,
    margin_type,
    stop_loss_price,
    take_profit_price,
    gt_limitation_price,
    lt_limitation_price,
    is_above_open_price,
    is_below_open_price,
    priority_close_on_trend,
  } = req.body;

  if (!id) {
    return res.apiError("缺少参数: id");
  }

  const updateData = {
    id: Number(id),
    api_key: api_key,
    api_secret: secret_key,
    grid_price_difference,
    grid_trade_quantity,
    grid_long_open_quantity,
    grid_long_close_quantity,
    grid_short_open_quantity,
    grid_short_close_quantity,
    max_open_position_quantity,
    min_open_position_quantity,
    fall_prevention_coefficient,
    polling_interval,
    leverage,
    margin_type,
    stop_loss_price,
    take_profit_price,
    gt_limitation_price,
    lt_limitation_price,
    is_above_open_price,
    is_below_open_price,
    priority_close_on_trend,
  };

  // 过滤掉 undefined 的参数
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const result = await gridStrategyService.updateGridStrategyById(updateData);

  if (result.affectedCount > 0) {
    return res.apiSuccess(result.data, "网格策略更新成功");
  } else {
    return res.apiError("网格策略更新失败");
  }
});


/** 更新网格策略状态（暂停或继续） */
const action = catchAsync(async (req, res) => {
  let { api_key, secret_key } = req.apiCredentials;
  let { id, paused } = req.body;

  if (!id) {
    return res.apiError('缺少策略ID');
  }

  const result = await gridStrategyService.updateGridStrategyById({
    paused,
    api_key: api_key,
    api_secret: secret_key,
    id: Number(id)
  });

  // result.affectedCount > 0 表示更新成功
  if (result.affectedCount > 0) {
    return res.apiSuccess(result.data, '更新策略状态成功');
  } else {
    return res.apiError('更新策略失败');
  }
});


const query = catchAsync(async (req, res) => {
  let { api_key, secret_key } = req.apiCredentials;
  let { currentPage, pageSize } = req.query;

  let grid = await gridStrategyService.getAllGridStrategys(
    { api_key: api_key, api_secret: secret_key },
    { currentPage: Number(currentPage) || 1, pageSize: Number(pageSize) || 10 }
  );

  return res.apiSuccess(grid, '查询网格策略成功');
});


/**
 * 智能网格参数优化
 * 根据K线数据自动计算最优网格参数
 */
const optimize_params = catchAsync(async (req, res) => {
  const { api_key, secret_key } = req.apiCredentials;
  const {
    symbol,
    interval,
    total_capital,
    optimize_target,
    min_trade_value,
    max_trade_value
  } = req.body;

  // 验证必填参数
  if (!symbol) {
    return res.apiError("缺少交易对参数 symbol");
  }

  if (!total_capital || isNaN(total_capital) || Number(total_capital) <= 0) {
    return res.apiError("总资金必须为大于0的数字");
  }

  try {
    const result = await gridOptimizerService.optimizeGridParams({
      symbol,
      interval: interval || '4h',
      total_capital: Number(total_capital),
      optimize_target: optimize_target || 'profit',
      enable_boundary_defense: false,
      min_trade_value: min_trade_value ? Number(min_trade_value) : 20,
      max_trade_value: max_trade_value ? Number(max_trade_value) : 100,
      api_key: api_key,
      api_secret: secret_key
    });

    return res.apiSuccess(result, "获取优化参数成功");
  } catch (err) {
    console.error("网格参数优化失败:", err);
    return res.apiError(err.message || "获取优化参数失败");
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
