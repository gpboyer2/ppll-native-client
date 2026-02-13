/**
 * 小时K线控制器
 * 处理小时K线相关的业务逻辑
 */
const httpStatus = require("http-status");
const { pick } = require("../utils/pick");
const ApiError = require("../utils/api-error");
const catchAsync = require("../utils/catch-async");
const hourlyKlineService = require("../service/hourly-kline.service.js");

/**
 * 创建小时K线记录
 */
const createHourlyKline = catchAsync(async (req, res) => {
    const kline = await hourlyKlineService.createHourlyKline(req.body);
    return res.apiSuccess(kline, "创建成功");
});

/**
 * 查询小时K线列表
 */
const getHourlyKlineList = catchAsync(async (req, res) => {
    const filter = pick(req.query, ["symbol", "start_time", "end_time"]);
    const options = pick(req.query, ["sortBy", "page_size", "current_page"]);
    const result = await hourlyKlineService.queryHourlyKline(filter, options);
    return res.apiSuccess(result, "查询成功");
});

/**
 * 更新小时K线记录
 */
const updateHourlyKline = catchAsync(async (req, res) => {
    const kline = await hourlyKlineService.updateHourlyKline(
        req.body.id,
        req.body,
    );
    return res.apiSuccess(kline, "更新成功");
});

/**
 * 删除小时K线记录
 */
const deleteHourlyKline = catchAsync(async (req, res) => {
    const data = req.body.data || [req.body.id];
    await hourlyKlineService.deleteHourlyKline(data);
    return res.apiSuccess(null, "删除成功");
});

module.exports = {
    createHourlyKline,
    getHourlyKlineList,
    updateHourlyKline,
    deleteHourlyKline,
};
