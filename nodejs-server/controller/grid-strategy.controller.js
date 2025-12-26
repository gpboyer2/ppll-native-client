/**
 * 网格策略控制器
 * 单用户系统：处理网格交易策略相关的业务逻辑，提供策略创建、管理和执行功能
 */
const gridStrategyService = require("../service/grid-strategy.service");
const gridOptimizerService = require("../service/grid-optimizer.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

const list = catchAsync(async (req, res) => {
    let { apiKey, apiSecret, page, limit } = req.query;

    let grid = await gridStrategyService.getAllGridStrategys(
        { api_key: apiKey, api_secret: apiSecret },
        { page: Number(page) || 1, limit: Number(limit) || 10 },
        req.vipUser
    );

    res.send({
        status: 'success',
        code: 200,
        data: grid
    });
});


/**
 * - 终止时是否全部平仓
 * - 预测爆仓价格
 * - 是否立即开启/限价开启
 * 
 */
const create = catchAsync(async (req, res) => {
    const {
        apiKey,
        apiSecret,
        tradingPair,
        positionSide,
        gridPriceDifference,
        gridTradeQuantity,
        // 分离的开仓/平仓数量
        gridLongOpenQuantity,
        gridLongCloseQuantity,
        gridShortOpenQuantity,
        gridShortCloseQuantity,
        maxOpenPositionQuantity,
        minOpenPositionQuantity,
        fallPreventionCoefficient,
        pollingInterval,
        pricePrecision,
        quantityPrecision,
        name,
        leverage,
        marginType,
        stopLossPrice,
        takeProfitPrice,
        // 价格限制参数
        gtLimitationPrice,
        ltLimitationPrice,
        // 暂停条件参数
        isAboveOpenPrice,
        isBelowOpenPrice,
        // 顺势仅减仓策略
        priorityCloseOnTrend,
        // 交易所类型
        exchangeType,
    } = req.body;

    // 参数验证
    if (!tradingPair) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "tradingPair 是必填项",
        });
    }

    // 数值参数边界检查
    if (gridPriceDifference && (isNaN(gridPriceDifference) || Number(gridPriceDifference) <= 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "gridPriceDifference 必须是大于0的数字",
        });
    }

    if (gridTradeQuantity && (isNaN(gridTradeQuantity) || Number(gridTradeQuantity) <= 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "gridTradeQuantity 必须是大于0的数字",
        });
    }

    if (maxOpenPositionQuantity && (isNaN(maxOpenPositionQuantity) || Number(maxOpenPositionQuantity) <= 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "maxOpenPositionQuantity 必须是大于0的数字",
        });
    }

    if (minOpenPositionQuantity && (isNaN(minOpenPositionQuantity) || Number(minOpenPositionQuantity) <= 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "minOpenPositionQuantity 必须是大于0的数字",
        });
    }

    if (pricePrecision && (isNaN(pricePrecision) || Number(pricePrecision) < 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "pricePrecision 必须是非负整数",
        });
    }

    if (quantityPrecision && (isNaN(quantityPrecision) || Number(quantityPrecision) < 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "quantityPrecision 必须是非负整数",
        });
    }

    if (leverage && (isNaN(leverage) || Number(leverage) <= 0)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "leverage 必须是大于0的整数",
        });
    }

    const strategyData = {
        api_key: apiKey,
        api_secret: apiSecret,
        trading_pair: tradingPair,
        position_side: positionSide,
        grid_price_difference: gridPriceDifference,
        grid_trade_quantity: gridTradeQuantity,
        // 分离的开仓/平仓数量
        grid_long_open_quantity: gridLongOpenQuantity,
        grid_long_close_quantity: gridLongCloseQuantity,
        grid_short_open_quantity: gridShortOpenQuantity,
        grid_short_close_quantity: gridShortCloseQuantity,
        max_open_position_quantity: maxOpenPositionQuantity,
        min_open_position_quantity: minOpenPositionQuantity,
        fall_prevention_coefficient: fallPreventionCoefficient,
        polling_interval: pollingInterval,
        price_precision: pricePrecision,
        quantity_precision: quantityPrecision,
        name: name,
        leverage: leverage,
        margin_type: marginType,
        stop_loss_price: stopLossPrice,
        take_profit_price: takeProfitPrice,
        // 价格限制参数
        gt_limitation_price: gtLimitationPrice,
        lt_limitation_price: ltLimitationPrice,
        // 暂停条件参数
        is_above_open_price: isAboveOpenPrice,
        is_below_open_price: isBelowOpenPrice,
        // 顺势仅减仓策略
        priority_close_on_trend: priorityCloseOnTrend,
        // 交易所类型
        exchange_type: exchangeType,
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
            return res.status(httpStatus.CONFLICT).json({
                status: "error",
                message: `已存在该交易对 ${tradingPair} 的网格策略`,
            });
        }

        res.status(httpStatus.OK).json({
            status: "success",
            data: row,
            message: "网格策略创建成功",
        });
    } catch (error) {
        console.error("创建网格策略时出错:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            status: "error",
            message: "创建网格策略失败",
            error: error.message,
        });
    }
});


/** 删除网格策略 */
const deletes = catchAsync(async (req, res) => {
    let { id, apiKey, apiSecret } = req.body;
    let result = null;

    if (!id) {
        res.send({ code: 400, message: '缺少参数: id' })
        return
    }

    result = await gridStrategyService.deleteGridStrategyById({
        api_key: apiKey,
        api_secret: apiSecret,
        id: Number(id)
    }, req.vipUser);

    let sendContent = { code: 200, data: {} };
    if (result?.status) {
        sendContent.code = 200;
        sendContent.message = '网格策略删除成功';
    } else {
        sendContent.code = 400;
        sendContent.message = '网格策略删除失败';
    }
    res.send(sendContent);
});


const update = catchAsync(async (req, res) => {
    const {
        id,
        apiKey,
        apiSecret,
        gridPriceDifference,
        gridTradeQuantity,
        gridLongOpenQuantity,
        gridLongCloseQuantity,
        gridShortOpenQuantity,
        gridShortCloseQuantity,
        maxOpenPositionQuantity,
        minOpenPositionQuantity,
        fallPreventionCoefficient,
        pollingInterval,
        leverage,
        marginType,
        stopLossPrice,
        takeProfitPrice,
        gtLimitationPrice,
        ltLimitationPrice,
        isAboveOpenPrice,
        isBelowOpenPrice,
        priorityCloseOnTrend,
    } = req.body;

    if (!id) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "缺少参数: id",
        });
    }

    const updateData = {
        id: Number(id),
        api_key: apiKey,
        api_secret: apiSecret,
        grid_price_difference: gridPriceDifference,
        grid_trade_quantity: gridTradeQuantity,
        grid_long_open_quantity: gridLongOpenQuantity,
        grid_long_close_quantity: gridLongCloseQuantity,
        grid_short_open_quantity: gridShortOpenQuantity,
        grid_short_close_quantity: gridShortCloseQuantity,
        max_open_position_quantity: maxOpenPositionQuantity,
        min_open_position_quantity: minOpenPositionQuantity,
        fall_prevention_coefficient: fallPreventionCoefficient,
        polling_interval: pollingInterval,
        leverage: leverage,
        margin_type: marginType,
        stop_loss_price: stopLossPrice,
        take_profit_price: takeProfitPrice,
        gt_limitation_price: gtLimitationPrice,
        lt_limitation_price: ltLimitationPrice,
        is_above_open_price: isAboveOpenPrice,
        is_below_open_price: isBelowOpenPrice,
        priority_close_on_trend: priorityCloseOnTrend,
    };

    // 过滤掉 undefined 的参数
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
            delete updateData[key];
        }
    });

    const result = await gridStrategyService.updateGridStrategyById(updateData, req.vipUser);

    if (result.affectedCount > 0) {
        res.status(httpStatus.OK).json({
            status: "success",
            code: 200,
            data: result.data,
            message: "网格策略更新成功",
        });
    } else {
        res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            code: 400,
            message: "网格策略更新失败",
        });
    }
});


/** 更新网格策略状态（暂停或继续） */
const action = catchAsync(async (req, res) => {
    let { id, apiKey, apiSecret, paused } = req.body;

    if (!id) {
        return res.send({ code: 400, data: {}, message: '缺少策略ID' });
    }

    const result = await gridStrategyService.updateGridStrategyById({
        paused,
        api_key: apiKey,
        api_secret: apiSecret,
        id: Number(id)
    }, req.vipUser);

    // result.affectedCount > 0 表示更新成功
    if (result.affectedCount > 0) {
        res.send({ code: 200, data: result.data });
    } else {
        res.send({ code: 400, data: {}, message: '更新策略失败' });
    }
});


const query = catchAsync(async (req, res) => {
    let { apiKey, apiSecret, page, limit } = req.query;

    let grid = await gridStrategyService.getAllGridStrategys(
        { api_key: apiKey, api_secret: apiSecret },
        { page: Number(page) || 1, limit: Number(limit) || 10 },
        req.vipUser
    );

    res.send({
        code: 200,
        data: grid
    });
});


/**
 * 智能网格参数优化
 * 根据K线数据自动计算最优网格参数
 */
const optimizeParams = catchAsync(async (req, res) => {
    const {
        apiKey,
        apiSecret,
        symbol,
        interval,
        totalCapital,
        optimizeTarget,
        minTradeValue,
        maxTradeValue
    } = req.body;

    // 验证必填参数
    if (!symbol) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "缺少交易对参数 symbol"
        });
    }

    if (!totalCapital || isNaN(totalCapital) || Number(totalCapital) <= 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "总资金必须为大于0的数字"
        });
    }

    if (!apiKey || !apiSecret) {
        return res.status(httpStatus.BAD_REQUEST).json({
            status: "error",
            message: "缺少API凭证"
        });
    }

    try {
        const result = await gridOptimizerService.optimizeGridParams({
            symbol,
            interval: interval || '4h',
            totalCapital: Number(totalCapital),
            optimizeTarget: optimizeTarget || 'profit',
            minTradeValue: minTradeValue ? Number(minTradeValue) : 20,
            maxTradeValue: maxTradeValue ? Number(maxTradeValue) : 100,
            apiKey,
            apiSecret
        });

        res.status(httpStatus.OK).json({
            status: "success",
            code: httpStatus.OK,
            data: result,
            message: "获取优化参数成功"
        });
    } catch (error) {
        console.error("网格参数优化失败:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            status: "error",
            message: error.message || "获取优化参数失败",
            error: error.message
        });
    }
});


module.exports = {
    list,
    create,
    deletes,
    update,
    action,
    query,
    optimizeParams,
}
