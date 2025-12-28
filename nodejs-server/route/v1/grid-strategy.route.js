const express = require('express');
const router = express.Router();
const { apiKeyIdentity } = require('../../middleware/api-key-identity');
const gridStrategyController = require('../../controller/grid-strategy.controller.js');
const vipMiddleware = require('../../middleware/vip.js');

// 应用 API Key 标识中间件到所有路由
router.use(apiKeyIdentity);

// 获取策略列表
// GET /api/v1/grid-strategy  params: { status?: string }
router.get('/', vipMiddleware.validateVipAccess, gridStrategyController.list);

// 查询策略
// GET /api/v1/grid-strategy/query  params: { api_key?: string, status?: string }
router.get('/query', vipMiddleware.validateVipAccess, gridStrategyController.query);

// 创建策略
// POST /api/v1/grid-strategy/create  body: { symbol: string, upper_price: number, lower_price: number, grid_number: number, ... }
router.post('/create', vipMiddleware.validateVipAccess, gridStrategyController.create);

// 创建做多策略（兼容旧接口）
// POST /api/v1/grid-strategy/create-long  body: { symbol: string, upper_price: number, lower_price: number, grid_number: number, ... }
router.post('/create-long', vipMiddleware.validateVipAccess, gridStrategyController.create);

// 更新策略
// POST /api/v1/grid-strategy/update  body: { id: number, ... }
router.post('/update', vipMiddleware.validateVipAccess, gridStrategyController.update);

// 暂停策略
// POST /api/v1/grid-strategy/paused  body: { id: number }
router.post('/paused', vipMiddleware.validateVipAccess, gridStrategyController.action);

// 恢复策略
// POST /api/v1/grid-strategy/resume  body: { id: number }
router.post('/resume', vipMiddleware.validateVipAccess, gridStrategyController.action);

// 删除策略
// POST /api/v1/grid-strategy/deletes  body: { data: number[] }
router.post('/deletes', vipMiddleware.validateVipAccess, gridStrategyController.deletes);

// 智能优化参数
// POST /api/v1/grid-strategy/optimize  body: { symbol: string, total_capital: number, interval?: string, ... }
router.post('/optimize', vipMiddleware.validateVipAccess, gridStrategyController.optimize_params);

module.exports = router;


/**
 * @swagger
 * tags:
 *   name: 网格策略
 *   description: 网格交易策略管理
 */

/**
 * @swagger
 * /api/v1/grid-strategy:
 *   get:
 *     summary: 获取策略列表
 *     description: 获取所有网格交易策略的列表，支持分页和条件筛选
 *     tags: [网格策略]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 20
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RUNNING, STOPPED, DELETED]
 *         description: 策略状态筛选
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GridStrategy'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/v1/grid-strategy/query:
 *   get:
 *     summary: 查询策略
 *     description: 根据API密钥等相关信息查询用户的网格策略列表
 *     tags: [网格策略]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         schema:
 *           type: string
 *         description: API密钥筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RUNNING, STOPPED, DELETED]
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
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GridStrategy'
 */

/**
 * @swagger
 * /api/v1/grid-strategy/create:
 *   post:
 *     summary: 创建策略
 *     description: 创建新的网格交易策略，设置交易对、价格区间、网格数量等参数
 *     tags: [网格策略]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - upper_price
 *               - lower_price
 *               - grid_number
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTCUSDT
 *                 description: 交易对
 *               upper_price:
 *                 type: number
 *                 example: 50000
 *                 description: 上限价格
 *               lower_price:
 *                 type: number
 *                 example: 40000
 *                 description: 下限价格
 *               grid_number:
 *                 type: integer
 *                 example: 10
 *                 description: 网格数量
 *               total_investment:
 *                 type: number
 *                 example: 1000
 *                 description: 总投入资金
 *               margin_type:
 *                 type: string
 *                 enum: [cross, isolated]
 *                 example: cross
 *                 description: 保证金模式
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
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/GridStrategy'
 */

/**
 * @swagger
 * /api/v1/grid-strategy/update:
 *   post:
 *     summary: 更新策略
 *     description: 根据策略ID更新网格交易策略的配置参数
 *     tags: [网格策略]
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
 *                 example: 1
 *                 description: 策略ID
 *               symbol:
 *                 type: string
 *                 example: BTCUSDT
 *                 description: 交易对
 *               upper_price:
 *                 type: number
 *                 example: 50000
 *                 description: 上限价格
 *               lower_price:
 *                 type: number
 *                 example: 40000
 *                 description: 下限价格
 *               grid_number:
 *                 type: integer
 *                 example: 10
 *                 description: 网格数量
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
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/GridStrategy'
 */

/**
 * @swagger
 * /api/v1/grid-strategy/paused:
 *   post:
 *     summary: 暂停策略
 *     description: 暂停指定网格策略的运行，停止自动交易
 *     tags: [网格策略]
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
 *                 example: 1
 *                 description: 策略ID
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 策略已暂停
 */

/**
 * @swagger
 * /api/v1/grid-strategy/resume:
 *   post:
 *     summary: 恢复策略
 *     description: 恢复已暂停的网格策略，重新开始自动交易
 *     tags: [网格策略]
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
 *                 example: 1
 *                 description: 策略ID
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 策略已恢复运行
 */

/**
 * @swagger
 * /api/v1/grid-strategy/deletes:
 *   post:
 *     summary: 删除策略
 *     description: 根据策略ID删除指定的网格交易策略
 *     tags: [网格策略]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *                 description: 策略ID数组
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 策略删除成功
 */

/**
 * @swagger
 * /api/v1/grid-strategy/optimize:
 *   post:
 *     summary: 智能优化参数
 *     description: 根据历史K线数据自动计算最优网格参数
 *     tags: [网格策略]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - total_capital
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTCUSDT
 *                 description: 交易对
 *               total_capital:
 *                 type: number
 *                 example: 1000
 *                 description: 总投入资金
 *               interval:
 *                 type: string
 *                 enum: [1h, 4h, 1d]
 *                 default: 4h
 *                 description: K线周期
 *               optimize_target:
 *                 type: string
 *                 enum: [profit, cost, boundary]
 *                 default: profit
 *                 description: 优化目标
 *               min_trade_value:
 *                 type: number
 *                 default: 20
 *                 description: 最小每笔交易金额
 *               max_trade_value:
 *                 type: number
 *                 default: 100
 *                 description: 最大每笔交易金额
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   description: 优化结果
 *                   properties:
 *                     grid_spacing:
 *                       type: number
 *                       description: 网格间距
 *                     grid_number:
 *                       type: integer
 *                       description: 网格数量
 *                     trade_value:
 *                       type: number
 *                       description: 每笔交易金额
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GridStrategy:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 策略ID
 *         symbol:
 *           type: string
 *           description: 交易对
 *         upper_price:
 *           type: number
 *           description: 上限价格
 *         lower_price:
 *           type: number
 *           description: 下限价格
 *         grid_number:
 *           type: integer
 *           description: 网格数量
 *         total_investment:
 *           type: number
 *           description: 总投入资金
 *         margin_type:
 *           type: string
 *           enum: [cross, isolated]
 *           description: 保证金模式
 *         status:
 *           type: string
 *           enum: [RUNNING, STOPPED, DELETED]
 *           description: 策略状态
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *     Pagination:
 *       type: object
 *       properties:
 *         current_page:
 *           type: integer
 *           description: 当前页码
 *         page_size:
 *           type: integer
 *           description: 每页数量
 *         total:
 *           type: integer
 *           description: 总记录数
 */
