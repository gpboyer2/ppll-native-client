/**
 * 机器人控制器
 * 单用户系统：处理交易机器人相关的业务逻辑，提供机器人管理和控制功能
 */
const robotService = require("../service/robot.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

const robot = async (req, res) => {
    const { apiKey, apiSecret } = req.query;
    let errorMsg = null;

    //  1 检查是否有该交易对(symbol)的websocket监听
    //      1.A 有该交易对的监听，则继续下一环节
    //      1.B 没该交易对的监听，则新建一个该交易对的监听
    //  2 websocket监听会将最新的币种价格数据给到本地内存
    //  3 启用一个定时器读取本地内存数据并执行网格策略

    res.send({
        status: 'success',
        code: 200,
        data: ``
    })
}


/**
 * - 终止时是否全部平仓
 * - 预测爆仓价格
 * - 是否立即开启/限价开启
 * 
 */
const createRobot = catchAsync(async (req, res) => {
    let { apiKey, apiSecret, } = req.body;
    let errorMsg = null;

    if (errorMsg) throw new Error(errorMsg);

    const result = await robotService.createRobot(req.body).catch(error => { throw error });

    // TODO:
    // 应该是先ws后入库？
    const tradeGrid = result && await robotService.createSymbolWebsocket(req.body).catch(error => { throw error });

    if (!tradeGrid) {
        debugger
    }

    res.send({ code: 200, status: 1, data: result })
});


const deleteRobot = catchAsync(async (req, res) => {
    let { id } = req.body;
    let robots = null;
    if (id) {
        robots = await robotService.deleteRobotById(Number(id));
    }

    res.send({
        status: 1,
        data: robots
    });
});


const updateRobot = catchAsync(async (req, res) => {
    const { apiKey, apiSecret } = req.body;
    let errorMsg = null;

    // ... ... 
});


const queryRobot = catchAsync(async (req, res) => {
    let { id } = req.query;
    let robots = null;
    if (id) {
        robots = await robotService.getRobotById(Number(id));
    } else {
        robots = await robotService.getAllRobots();
    }

    res.send({
        status: 1,
        data: robots
    });
});


module.exports = {
    robot,
    createRobot,
    deleteRobot,
    updateRobot,
    queryRobot,
}
