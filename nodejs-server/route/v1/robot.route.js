/**
 * 机器人路由模块
 * 定义交易机器人相关的API路由，提供机器人管理和控制功能
 */
const express = require('express');
const router = express.Router();
const auth = require("../../middleware/auth");

const robotController = require("../../controller/robot.controller.js");


/**
 * @swagger
 * tags:
 *   name: Robot
 *   description: 网格策略-量化机器人
 */


/**
 * @openapi
 * /v1/robot:
 *  get:
 *     tags: [Robot]
 *     summary: 获取交易机器人列表
 *     description: 获取所有交易机器人的状态和配置信息
 *     responses:
 *       200:
 *         description: 成功获取机器人列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: 机器人信息对象
 */
router.get('/', robotController.robot);


/**
 * @openapi
 * /v1/robot/create:
 *  post:
 *     tags: [Robot]
 *     description: 创建一个网格策略
 *     responses:
 *       200:
 *         description: 
 */
router.post('/create', auth(['admin', 'super_admin']), robotController.createRobot);


/**
 * @openapi
 * /v1/robot/delete:
 *  post:
 *     tags: [Robot]
 *     description: 删除一个网格策略
 *     responses:
 *       200:
 *         description: 
 */
router.post('/delete', auth(['admin', 'super_admin']), robotController.deleteRobot);


/**
 * @openapi
 * /v1/robot/update:
 *  post:
 *     tags: [Robot]
 *     description: 更新一个网格策略
 *     responses:
 *       200:
 *         description: 
 */
router.post('/update', auth(['admin', 'super_admin']), robotController.updateRobot);


/**
 * @openapi
 * /v1/robot/query:
 *  get:
 *     tags: [Robot]
 *     description: 根据apikey等相关信息查询网格策略
 *     responses:
 *       200:
 *         description: 
 */
router.get('/query', robotController.queryRobot);


module.exports = router;

