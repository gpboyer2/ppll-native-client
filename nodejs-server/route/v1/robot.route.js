/**
 * 机器人路由模块
 * 定义交易机器人相关的API路由，提供机器人管理和控制功能
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const robotController = require("../../controller/robot.controller.js");

/**
 * @swagger
 * tags:
 *   name: Robot
 *   description: 网格策略-量化机器人
 */

// 获取交易机器人列表
router.get('/', robotController.robot);

// 创建一个网格策略
router.post('/create', robotController.createRobot);

// 删除一个网格策略
router.post('/delete', robotController.deleteRobot);

// 更新一个网格策略
router.post('/update', robotController.updateRobot);


/**
 * @openapi
 * /api/v1/robot/query:
 *  get:
 *     tags: [Robot]
 *     description: 根据apikey等相关信息查询网格策略
 *     responses:
 *       200:
 *         description: 
 */
router.get('/query', robotController.queryRobot);


module.exports = router;

