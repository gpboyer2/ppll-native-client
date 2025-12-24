/**
 * 网格交易历史路由模块
 * 定义网格交易历史相关的API路由，提供交易记录查询和统计功能
 */
const express = require('express');
const router = express.Router();
const auth = require("../../middleware/auth");

const controller = require("../../controller/grid-trade-history.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

// 固定路径需放在 /:id 之前，避免被占用

/**
 * 创建一条交易历史
 * /v1/grid-trade-history/create
 */
router.post('/create', auth(['admin', 'super_admin']), controller.create);

/**
 * 更新一条交易历史
 * /v1/grid-trade-history/update
 */
router.post('/update', auth(['admin', 'super_admin']), controller.update);

/**
 * 批量删除交易历史
 * /v1/grid-trade-history/deletes
 */
router.post('/deletes', auth(['admin', 'super_admin']), controller.deletes);

/**
 * 分页查询网格交易历史
 * /v1/grid-trade-history
 */
router.get('/', controller.query);

/**
 * 获取交易历史详情
 * /v1/grid-trade-history/:id
 */
router.get('/:id', vipMiddleware.validateVipAccess, controller.detail);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: GridTradeHistory
 *   description: 网格交易历史
 */

/**
 * @openapi
 * /v1/grid-trade-history:
 *  get:
 *     tags: [GridTradeHistory]
 *     summary: 分页查询网格交易历史
 *     description: 获取网格交易的历史记录，支持分页查询和条件筛选
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         required: false
 *         description: 每页数量
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         required: false
 *         description: 交易对筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 结束日期
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
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: 交易历史记录
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     limit:
 *                       type: integer
 *                       description: 每页数量
 */

/**
 * @openapi
 * /v1/grid-trade-history/{id}:
 *  get:
 *     tags: [GridTradeHistory]
 *     summary: 获取交易历史详情
 *     description: 根据记录ID获取指定网格交易历史的详细信息
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 交易历史记录ID
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
 *                   description: 交易历史详情
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 记录ID
 *                     symbol:
 *                       type: string
 *                       description: 交易对
 *                     tradeType:
 *                       type: string
 *                       description: 交易类型
 *                     price:
 *                       type: number
 *                       description: 交易价格
 *                     quantity:
 *                       type: number
 *                       description: 交易数量
 *                     amount:
 *                       type: number
 *                       description: 交易金额
 *                     profit:
 *                       type: number
 *                       description: 收益
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *       404:
 *         description: 记录不存在
 */

/**
 * @openapi
 * /v1/grid-trade-history/create:
 *  post:
 *     tags: [GridTradeHistory]
 *     summary: 创建交易历史记录
 *     description: 创建新的网格交易历史记录，记录交易详情
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - tradeType
 *               - price
 *               - quantity
 *             properties:
 *               symbol:
 *                 type: string
 *                 description: 交易对符号
 *                 example: "BTCUSDT"
 *               tradeType:
 *                 type: string
 *                 enum: [BUY, SELL]
 *                 description: 交易类型
 *                 example: "BUY"
 *               price:
 *                 type: number
 *                 description: 交易价格
 *                 example: 45000
 *               quantity:
 *                 type: number
 *                 description: 交易数量
 *                 example: 0.001
 *               amount:
 *                 type: number
 *                 description: 交易金额
 *                 example: 45
 *               profit:
 *                 type: number
 *                 description: 收益
 *                 example: 1.5
 *               strategyId:
 *                 type: integer
 *                 description: 关联的策略ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 创建成功
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
 *                   description: 创建的记录信息
 */

/**
 * @openapi
 * /v1/grid-trade-history/update:
 *  post:
 *     tags: [GridTradeHistory]
 *     summary: 更新交易历史记录
 *     description: 根据记录ID更新指定的网格交易历史记录信息
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
 *                 description: 记录ID
 *                 example: 1
 *               symbol:
 *                 type: string
 *                 description: 交易对符号
 *                 example: "BTCUSDT"
 *               tradeType:
 *                 type: string
 *                 enum: [BUY, SELL]
 *                 description: 交易类型
 *                 example: "BUY"
 *               price:
 *                 type: number
 *                 description: 交易价格
 *                 example: 45000
 *               quantity:
 *                 type: number
 *                 description: 交易数量
 *                 example: 0.001
 *               amount:
 *                 type: number
 *                 description: 交易金额
 *                 example: 45
 *               profit:
 *                 type: number
 *                 description: 收益
 *                 example: 1.5
 *               strategyId:
 *                 type: integer
 *                 description: 关联的策略ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   description: 更新后的记录信息
 *       404:
 *         description: 记录不存在
 */

/**
 * @openapi
 * /v1/grid-trade-history/deletes:
 *  post:
 *     tags: [GridTradeHistory]
 *     summary: 批量删除交易历史记录
 *     description: 根据ID列表批量删除网格交易历史记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要删除的记录ID列表
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                   example: "成功删除3条记录"
 *                 deletedCount:
 *                   type: integer
 *                   description: 删除的记录数量
 *                   example: 3
 *       400:
 *         description: 请求参数错误
 */