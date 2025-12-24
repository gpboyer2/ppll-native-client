/**
 * Gate.io 币种数据路由
 * 提供24h涨跌幅排序相关接口
 */

const express = require('express');
const gateCoinListController = require('../../controller/gate-coin-list.controller');

const router = express.Router();

/**
 * 获取涨幅榜数据
 * /v1/gate-coin-list/gainers
 */
router.get('/gainers', gateCoinListController.getGainers);

/**
 * 获取跌幅榜数据
 * /v1/gate-coin-list/losers
 */
router.get('/losers', gateCoinListController.getLosers);

/**
 * 获取所有币种数据，按24h涨跌幅排序
 * /v1/gate-coin-list/all
 */
router.get('/all', gateCoinListController.getAllSorted);

/**
 * 获取缓存状态信息
 * /v1/gate-coin-list/status
 */
router.get('/status', gateCoinListController.getCacheStatus);

module.exports = router;

/**
 * @swagger
 * /v1/gate-coin-list/gainers:
 *   get:
 *     summary: 获取涨幅榜数据
 *     tags: [Gate币种数据]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取涨幅榜数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 获取涨幅榜数据成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       example: []
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-01T12:00:00.000Z'
 */

/**
 * @swagger
 * /v1/gate-coin-list/losers:
 *   get:
 *     summary: 获取跌幅榜数据
 *     tags: [Gate币种数据]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取跌幅榜数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 获取跌幅榜数据成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       example: []
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-01T12:00:00.000Z'
 */

/**
 * @swagger
 * /v1/gate-coin-list/all:
 *   get:
 *     summary: 获取全部币种数据（按24h涨跌幅排序）
 *     tags: [Gate币种数据]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [desc, asc]
 *           default: desc
 *         description: 排序方向（desc=从高到低，asc=从低到高）
 *     responses:
 *       200:
 *         description: 成功获取币种数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 获取币种数据成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       example: []
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 300
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-01T12:00:00.000Z'
 *                     sort:
 *                       type: string
 *                       enum: [desc, asc]
 *                       example: desc
 */

/**
 * @swagger
 * /v1/gate-coin-list/status:
 *   get:
 *     summary: 获取缓存状态信息
 *     tags: [Gate币种数据]
 *     responses:
 *       200:
 *         description: 成功获取缓存状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 获取缓存状态成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     isReady:
 *                       type: boolean
 *                       example: true
 *                       description: 缓存是否已准备就绪
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-01T12:00:00.000Z'
 *                       description: 最后更新时间
 *                     gainersCount:
 *                       type: integer
 *                       example: 150
 *                       description: 涨幅榜数据条数
 *                     losersCount:
 *                       type: integer
 *                       example: 150
 *                       description: 跌幅榜数据条数
 *                     totalCount:
 *                       type: integer
 *                       example: 300
 *                       description: 总币种数据条数
 */