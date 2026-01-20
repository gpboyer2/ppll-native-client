/**
 * U本位合约无限网格插件日志路由模块
 * 用于管理网格策略插件的运行日志和事件
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controller/usd-m-futures-plugin-log.controller.js');

/**
 * 查询插件日志列表
 * GET /api/v1/usd-m-futures-plugin-log/list
 */
router.get('/list', controller.list);

/**
 * 获取插件日志统计
 * GET /api/v1/usd-m-futures-plugin-log/statistics
 */
router.get('/statistics', controller.getStatistics);

/**
 * 创建插件日志
 * POST /api/v1/usd-m-futures-plugin-log/create
 */
router.post('/create', controller.create);

/**
 * 更新插件日志
 * PUT /api/v1/usd-m-futures-plugin-log/update
 */
router.put('/update', controller.update);

/**
 * 删除插件日志
 * DELETE /api/v1/usd-m-futures-plugin-log/delete
 */
router.delete('/delete', controller.delete);

/**
 * 清理旧日志（按时间）
 * POST /api/v1/usd-m-futures-plugin-log/clean
 */
router.post('/clean', controller.cleanOldLogs);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: UsdMFuturesPluginLog
 *   description: U本位合约无限网格插件日志管理 - 用于管理网格策略插件的运行日志和事件
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UsdMFuturesPluginLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 主键ID
 *           example: 1
 *         strategy_id:
 *           type: integer
 *           description: 关联的网格策略ID
 *           example: 1
 *         trading_pair:
 *           type: string
 *           description: 交易对
 *           example: "BTCUSDT"
 *         event_type:
 *           type: string
 *           description: 事件类型
 *           enum: [error, warn, info, success, pause, resume, open_position, close_position, limit_reached]
 *           example: "open_position"
 *         level:
 *           type: string
 *           description: 日志级别
 *           enum: [error, warn, info, success, debug]
 *           example: "info"
 *         message:
 *           type: string
 *           description: 日志消息内容
 *           example: "成功开仓 0.001 BTC"
 *         details:
 *           type: object
 *           description: 详细信息JSON
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 */

/**
 * @swagger
 * /api/v1/usd-m-futures-plugin-log/list:
 *   get:
 *     tags: [UsdMFuturesPluginLog]
 *     summary: 获取插件日志列表
 *     description: 获取U本位合约无限网格策略插件日志列表，支持分页和多条件过滤
 *     parameters:
 *       - in: query
 *         name: strategy_id
 *         schema:
 *           type: integer
 *         description: 网格策略ID过滤
 *       - in: query
 *         name: trading_pair
 *         schema:
 *           type: string
 *         description: 交易对过滤
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *         description: 事件类型过滤
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: 日志级别过滤
 *       - in: query
 *         name: start_time
 *         schema:
 *           type: string
 *         description: 开始时间
 *       - in: query
 *         name: end_time
 *         schema:
 *           type: string
 *         description: 结束时间
 *       - in: query
 *         name: current_page
 *         schema:
 *           type: integer
 *         description: 当前页码
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: 排序字段
 *     responses:
 *       200:
 *         description: 成功获取日志列表
 */

/**
 * @swagger
 * /api/v1/usd-m-futures-plugin-log/statistics:
 *   get:
 *     tags: [UsdMFuturesPluginLog]
 *     summary: 获取插件日志统计
 *     description: 获取指定策略的插件日志统计信息
 *     parameters:
 *       - in: query
 *         name: strategy_id
 *         schema:
 *           type: integer
 *         description: 网格策略ID
 *     responses:
 *       200:
 *         description: 成功获取统计数据
 */

/**
 * @swagger
 * /api/v1/usd-m-futures-plugin-log/clean:
 *   post:
 *     tags: [UsdMFuturesPluginLog]
 *     summary: 清理旧日志
 *     description: 清理指定天数之前的旧插件日志
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 description: 保留最近多少天的日志（默认30天）
 *                 example: 30
 *     responses:
 *       200:
 *         description: 清理成功
 */
