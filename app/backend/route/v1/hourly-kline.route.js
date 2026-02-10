/**
 * 小时K线路由模块
 * 定义小时K线相关的API路由
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controller/hourly-kline.controller.js');

/**
 * 查询小时K线列表
 * GET /api/v1/hourly-kline/list
 */
router.get('/list', controller.getHourlyKlineList);


/**
 * 创建小时K线记录
 * POST /api/v1/hourly-kline/create  body: { symbol, open_time, open, high, low, close, volume }
 */
router.post('/create', controller.createHourlyKline);


/**
 * 更新小时K线记录
 * POST /api/v1/hourly-kline/update  body: { id, ...updates }
 */
router.post('/update', controller.updateHourlyKline);


/**
 * 删除小时K线记录
 * POST /api/v1/hourly-kline/delete  body: { data: [id1, id2, ...] }
 */
router.post('/delete', controller.deleteHourlyKline);


module.exports = router;



/**
 * @swagger
 * tags:
 *   name: HourlyKline
 *   description: 小时K线数据管理与查询
 */

/**
 * @openapi
 * /api/v1/hourly-kline/list:
 *  get:
 *     tags: [HourlyKline]
 *     summary: 查询小时K线列表
 *     description: 根据条件查询小时K线数据，支持分页、筛选和排序
 *     parameters:
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: 交易对（如 BTCUSDT）
 *       - in: query
 *         name: start_time
 *         schema:
 *           type: integer
 *         description: 开始时间戳（毫秒）
 *       - in: query
 *         name: end_time
 *         schema:
 *           type: integer
 *         description: 结束时间戳（毫秒）
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: 排序规则，格式为 `字段名:方向`（如 open_time:desc）
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页条目数
 *       - in: query
 *         name: current_page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *     responses:
 *       200:
 *         description: 查询成功
 */

/**
 * @openapi
 * /api/v1/hourly-kline/create:
 *  post:
 *     tags: [HourlyKline]
 *     summary: 创建小时K线记录
 *     description: 创建一条新的小时K线数据记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - open_time
 *               - open
 *               - high
 *               - low
 *               - close
 *               - volume
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTCUSDT
 *               open_time:
 *                 type: integer
 *                 example: 1767178800000
 *               open:
 *                 type: number
 *                 example: 45000.5
 *               high:
 *                 type: number
 *                 example: 45100.0
 *               low:
 *                 type: number
 *                 example: 44900.0
 *               close:
 *                 type: number
 *                 example: 45050.0
 *               volume:
 *                 type: number
 *                 example: 1234567.89
 *     responses:
 *       200:
 *         description: 创建成功
 */

/**
 * @openapi
 * /api/v1/hourly-kline/update:
 *  post:
 *     tags: [HourlyKline]
 *     summary: 更新小时K线记录
 *     description: 根据ID更新小时K线数据记录
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
 *               open:
 *                 type: number
 *               high:
 *                 type: number
 *               low:
 *                 type: number
 *               close:
 *                 type: number
 *               volume:
 *                 type: number
 *     responses:
 *       200:
 *         description: 更新成功
 */

/**
 * @openapi
 * /api/v1/hourly-kline/delete:
 *  post:
 *     tags: [HourlyKline]
 *     summary: 删除小时K线记录
 *     description: 根据ID删除小时K线数据记录，支持批量删除
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: ID数组，支持批量删除
 *                 example: [1, 2, 3]
 *               id:
 *                 type: integer
 *                 description: 单个ID（与data二选一）
 *                 example: 1
 *     responses:
 *       200:
 *         description: 删除成功
 */
