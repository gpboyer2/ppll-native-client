/**
 * 机器人服务
 * 提供交易机器人相关的业务逻辑处理，包括机器人管理和控制功能
 */
const db = require("../models");
const Robot = db.robots;
const httpStatus = require('http-status');
const InfiniteLongGrid = require('../plugin/umInfiniteGrid.js');
const { createWsClient } = require("../plugin/websocketClient.js");
const ApiError = require('../utils/api-error');


const createRobot = async (params) => {
  const [row, created] = await Robot.findOrCreate({
    where: {
      api_key: params.apiKey,
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
  // 使用传入的 API 密钥创建独立的 WebSocket 客户端
  const wsClient = createWsClient({
    api_key: params.apiKey,
    secret_key: params.apiSecret,
    beautify: true,
  });

  wsClient.subscribeContinuousContractKlines(params.tradingPair, 'perpetual', '1m', 'usdm');

  let wealthySoon = new InfiniteLongGrid(params);
  wealthySoon.initOrders();

  wsClient.on('formattedMessage', (data) => {
    // K线
    if (data.eventType === 'continuous_kline') {
      let { close } = data.kline;
      wealthySoon.gridWebsocket({ latestPrice: close });
    }

    // 最新标记价格
    if (data.eventType === 'markPriceUpdate') {
      let { markPrice } = data;
      wealthySoon.gridWebsocket({ latestPrice: markPrice });
    }
  });

  // 返回客户端实例，便于外部管理和清理
  return { wealthySoon, wsClient };
};


async function latestMessage(params) {
  const { api_key, secret_key } = params;

  const result = await Robot.findOne({
    where: { api_key, secret_key },
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


const getRobotByApiKey = async (api_key, secret_key) => {
  return Robot.findOne({ where: { api_key, secret_key } });
};


const updateRobotById = async (robotId, updateBody) => {
  const { robotname, api_key, active, status } = updateBody;
  const robot = {
    robotname,
    api_key,
    active,
    status,
  };

  const row = await Robot.update(robot, {
    where: { id: robotId },
  });

  return row;
};


const deleteRobotById = async (robotId) => {
  const robot = await getRobotById(robotId);
  if (!robot) return null;
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
