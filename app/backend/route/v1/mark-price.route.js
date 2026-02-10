/**
 * 标记价格路由模块
 * 定义标记价格相关的API路由，提供价格数据查询和管理功能
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const markPriceController = require('../../controller/mark-price.controller.js');

// 创建一条标记价格记录
router.post('/create', markPriceController.createMarkPrice);

// 删除一条标记价格记录
router.post('/delete', markPriceController.deleteMarkPrice);

// 更新一条标记价格记录
router.post('/update', markPriceController.updateMarkPrice);

// 查询标记价格记录
router.get('/query', markPriceController.getMarkPrices);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: MarkPrice
 *   description: 标记价格管理与查询
 */

/**
 * @openapi
 * /api/v1/mark-price/create:
 *  post:
 *     tags: [MarkPrice]
 *     summary: 创建一条标记价格记录
 *     description: 仅授权用户可以创建
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - mark_price
 *               - index_price
 *               - funding_rate
 *               - next_funding_time
 *             properties:
 *               event_type:
 *                 type: string
 *                 default: markPriceUpdate
 *               event_time:
 *                 type: integer
 *               symbol:
 *                 type: string
 *               mark_price:
 *                 type: string
 *                 format: decimal
 *               index_price:
 *                 type: string
 *                 format: decimal
 *               estimated_settle_price:
 *                 type: string
 *                 format: decimal
 *                 nullable: true
 *               funding_rate:
 *                 type: string
 *                 format: decimal
 *               next_funding_time:
 *                 type: integer
 *             example:
 *               event_type: markPriceUpdate
 *               event_time: 1628512345678
 *               symbol: BTCUSDT
 *               mark_price: 45000.12345678
 *               index_price: 45000.12345678
 *               estimated_settle_price: 45000.12345678
 *               funding_rate: 0.00012345
 *               next_funding_time: 1628516000000
 *     responses:
 *       200:
 *         description: 标记价格记录创建成功
 */

/**
 * @openapi
 * /api/v1/mark-price/delete:
 *  post:
 *     tags: [MarkPrice]
 *     summary: 删除一条标记价格记录
 *     description: 仅授权用户可以删除
 *     security:
 *       - bearerAuth: []
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
 *             example:
 *               id: 1
 *     responses:
 *       200:
 *         description: 标记价格记录删除成功
 */

/**
 * @openapi
 * /api/v1/mark-price/update:
 *  post:
 *     tags: [MarkPrice]
 *     summary: 更新一条标记价格记录
 *     description: 仅授权用户可以更新
 *     security:
 *       - bearerAuth: []
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
 *               event_type:
 *                 type: string
 *               event_time:
 *                 type: integer
 *               symbol:
 *                 type: string
 *               mark_price:
 *                 type: string
 *                 format: decimal
 *               index_price:
 *                 type: string
 *                 format: decimal
 *               estimated_settle_price:
 *                 type: string
 *                 format: decimal
 *                 nullable: true
 *               funding_rate:
 *                 type: string
 *                 format: decimal
 *               next_funding_time:
 *                 type: integer
 *             example:
 *               id: 1
 *               event_type: markPriceUpdate
 *               event_time: 1628512345678
 *               symbol: BTCUSDT
 *               mark_price: 45000.12345678
 *               index_price: 45000.12345678
 *               estimated_settle_price: 45000.12345678
 *               funding_rate: 0.00012345
 *               next_funding_time: 1628516000000
 *     responses:
 *       200:
 *         description: 标记价格记录更新成功
 */

/**
 * @openapi
 * /api/v1/mark-price/query:
 *  get:
 *     tags: [MarkPrice]
 *     summary: 查询标记价格记录
 *     description: |
 *       根据条件查询标记价格记录，支持以下特性：
 *       - Symbol 大小写不敏感（如 ETH/USDT、btc 会自动转为 ETHUSDT、BTCUSDT）
 *       - 分页与排序（支持按任意字段排序）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: |
 *           交易对符号（不区分大小写，支持简写或带分隔符格式）：
 *           - 示例 1: ETH/USDT → 转为 ETHUSDT
 *           - 示例 2: btc → 转为 BTCUSDT
 *           - 示例 3: SOL-USD → 转为 SOLUSD
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: |
 *           排序规则，格式为 `字段名:方向`（方向为 asc/desc）：
 *           - 示例 1: `mark_price:desc`（按价格降序）
 *           - 示例 2: `event_time:asc`（按时间升序）
 *           - 默认: `id:asc`
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: 每页条目数（最大 100）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: 页码（从 1 开始）
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       example: []
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                 message:
 *                   type: string
 *                   example: "查询成功"
 *       400:
 *         description: 参数错误（如无效的 sortBy 字段）
 *       401:
 *         description: 未授权访问
 *
 * components:
 *   schemas:
 *     MarkPrice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         symbol:
 *           type: string
 *           example: "BTCUSDT"
 *         mark_price:
 *           type: string
 *           format: decimal
 *           example: "45000.12345678"
 *         event_time:
 *           type: integer
 *           example: 1628512345678
 */