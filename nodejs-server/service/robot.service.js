/**
 * 机器人服务
 * 提供交易机器人相关的业务逻辑处理，包括机器人管理和控制功能
 */
const db = require("../models");
const Robot = db.robots;
const httpStatus = require('http-status');
const InfiniteLongGrid = require('../plugin/umInfiniteGrid.js');
const wsClient = require("../plugin/websocketClient.js")
const ApiError = require('../utils/ApiError');


const createRobot = async (params) => {
    const [row, created] = await Robot.findOrCreate({
        where: {
            apiKey: params.apiKey,
            tradingPair: params.tradingPair,
        },
        defaults: params,
    });

    if (created) {
        return row;
    }

    return null;
};


const createSymbolWebsocket = async (params) => {
    // todo 需要此功能
    // wsClient.config({
    //     api_key: params.apiKey,
    //     api_secret: params.apiSecret,
    // })

    debugger
    wsClient.subscribeContinuousContractKlines(params.tradingPair, 'perpetual', '1m', 'usdm');

    let wealthySoon = new InfiniteLongGrid(params);
    wealthySoon.initOrders();

    // todo 需要此功能
    // wealthySoon.on('orders', res => {
    //     console.log(res);
    // })

    wsClient.on('formattedMessage', (data) => {
        // K线
        // wsClient.subscribeContinuousContractKlines
        // close 是最新价格
        if (data.eventType === 'continuous_kline') {
            let { close } = data.kline;
            wealthySoon.gridWebsocket({ latestPrice: close });
        }

        // 最新标记价格
        // wsClient.subscribeMarkPrice
        // markPrice 是标记价格
        if (data.eventType === 'markPriceUpdate') {
            let { markPrice } = data;
            // console.log(markPrice);
            wealthySoon.gridWebsocket({ latestPrice: markPrice });
        }
    });

    return wealthySoon;
};


async function latestMessage(params) {
    const { apiKey, apiSecret } = params;

    const result = await Robot.findOne({
        where: { apiKey, apiSecret },
        order: [['id', 'DESC']], // Assuming there's a created_at field to determine the order
        limit: 1
    });

    return result;
}


const getAllRobots = async (filter, options) => {
    try {
        const robots = await Robot.findAll();
        return robots;
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new ApiError(httpStatus.NOT_IMPLEMENTED, '【获取机器人列表】失败');
    }
};


const getRobotById = async (id) => {
    return Robot.findOne({ where: { id } });
};


const getRobotByApiKey = async (apiKey, apiSecret) => {
    return Robot.findOne({ where: { apiKey, apiSecret } });
};


const updateRobotById = async (robotId, updateBody) => {
    const { robotname, apiKey, active, status } = updateBody;
    const robot = {
        robotname,
        apiKey,
        active,
        status,
    }

    const row = await Robot.update(robot, {
        where: { id: robotId },
    });

    return row;
};


const deleteRobotById = async (robotId) => {
    const robot = await getRobotById(robotId);
    if (!robot) return null
    await robot.destroy();
    return robot;
};


module.exports = {
    createRobot,
    createSymbolWebsocket,
    deleteRobotById,
    updateRobotById,
    getAllRobots,
    getRobotById,
    getRobotByApiKey,
};
