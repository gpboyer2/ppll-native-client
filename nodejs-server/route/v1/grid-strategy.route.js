/**
 * 网格策略路由模块
 * 定义网格交易策略相关的API路由，提供策略创建、管理和执行功能
 */
const express = require('express');
const router = express.Router();
const { apiKeyIdentity } = require("../../middleware/api-key-identity");

const gridStrategyController = require("../../controller/grid-strategy.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

// 应用 API Key 标识中间件到所有路由，实现数据隔离
router.use(apiKeyIdentity);


/**
 * @swagger
 * tags:
 *   name: GridStrategy
 *   description: 网格策略-量化机器人
 */


/**
 * @openapi
 * /v1/grid-strategy:
 *  get:
 *     tags: [GridStrategy]
 *     summary: 获取网格策略列表
 *     description: 获取所有网格交易策略的列表，支持分页和条件筛选
 *     responses:
 *       200:
 *         description: 成功获取策略列表
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
 *                     description: 网格策略对象
 */
router.get('/', vipMiddleware.validateVipAccess, gridStrategyController.list);


/**
 * @openapi
 * /v1/grid-strategy/create:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 创建网格策略
 *     description: 创建新的网格交易策略，设置交易对、价格区间、网格数量等参数
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - upperPrice
 *               - lowerPrice
 *               - gridCount
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: 交易对符号
 *                 example: "BTCUSDT"
 *               upperPrice:
 *                 type: number
 *                 description: 网格上限价格
 *                 example: 50000
 *               lowerPrice:
 *                 type: number
 *                 description: 网格下限价格
 *                 example: 40000
 *               gridCount:
 *                 type: integer
 *                 description: 网格数量
 *                 example: 10
 *     responses:
 *       200:
 *         description: 策略创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   description: 创建的策略信息
 */
router.post('/create-long', vipMiddleware.validateVipAccess, gridStrategyController.create);
router.post('/create', vipMiddleware.validateVipAccess, gridStrategyController.create);


/**
 * @openapi
 * /v1/grid-strategy/deletes:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 删除网格策略
 *     description: 根据策略ID删除指定的网格交易策略
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 策略ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 策略删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "策略删除成功"
 */
router.post('/deletes', vipMiddleware.validateVipAccess, gridStrategyController.deletes);


/**
 * @openapi
 * /v1/grid-strategy/update:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 更新网格策略
 *     description: 根据策略ID更新网格交易策略的配置参数
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 策略ID
 *                 example: 1
 *               symbol:
 *                 type: string
 *                 description: 交易对符号
 *                 example: "BTCUSDT"
 *               upperPrice:
 *                 type: number
 *                 description: 网格上限价格
 *                 example: 50000
 *               lowerPrice:
 *                 type: number
 *                 description: 网格下限价格
 *                 example: 40000
 *               gridCount:
 *                 type: integer
 *                 description: 网格数量
 *                 example: 10
 *     responses:
 *       200:
 *         description: 策略更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   description: 更新后的策略信息
 */
router.post('/update', vipMiddleware.validateVipAccess, gridStrategyController.update);


/**
 * @openapi
 * /v1/grid-strategy/paused:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 暂停网格策略
 *     description: 暂停指定网格策略的运行，停止自动交易
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 策略ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 策略暂停成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "策略已暂停"
 */
router.post('/paused', vipMiddleware.validateVipAccess, gridStrategyController.action);




/**
 * @openapi
 * /v1/grid-strategy/resume:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 恢复网格策略
 *     description: 恢复已暂停的网格策略，重新开始自动交易
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 策略ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 策略恢复成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "策略已恢复运行"
 */
router.post('/resume', vipMiddleware.validateVipAccess, gridStrategyController.action);


/**
 * @openapi
 * /v1/grid-strategy/query:
 *  get:
 *     tags: [GridStrategy]
 *     summary: 查询网格策略
 *     description: 根据API密钥等相关信息查询用户的网格策略列表
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户API密钥
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RUNNING,STOPPED,DELETED]
 *         required: false
 *         description: 策略状态筛选
 *     responses:
 *       200:
 *         description: 查询成功
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
 *                     description: 网格策略信息
 */
router.get('/query', vipMiddleware.validateVipAccess, gridStrategyController.query);


/**
 * @openapi
 * /v1/grid-strategy/optimize:
 *  post:
 *     tags: [GridStrategy]
 *     summary: 智能网格参数优化
 *     description: 根据历史K线数据自动计算最优网格参数
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - totalCapital
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: 交易对符号
 *                 example: "BTCUSDT"
 *               totalCapital:
 *                 type: number
 *                 description: 总投入资金 (USDT)
 *                 example: 1000
 *               interval:
 *                 type: string
 *                 description: K线周期 (1h, 4h, 1d)
 *                 default: "4h"
 *               optimizeTarget:
 *                 type: string
 *                 description: 优化目标 (profit, cost)
 *                 default: "profit"
 *               minTradeValue:
 *                 type: number
 *                 description: 最小每笔交易金额
 *                 default: 20
 *               maxTradeValue:
 *                 type: number
 *                 description: 最大每笔交易金额
 *                 default: 100
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   description: 优化结果
 */
router.post('/optimize', vipMiddleware.validateVipAccess, gridStrategyController.optimizeParams);


module.exports = router;

