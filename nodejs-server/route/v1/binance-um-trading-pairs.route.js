/**
 * 币安U本位合约交易对路由模块
 * 定义交易对列表查询的API路由
 */
const express = require("express");
const router = express.Router();
const binanceUmTradingPairsController = require("../../controller/binance-um-trading-pairs.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 查询交易对列表
 * GET /api/v1/binance-um-trading-pairs/query
 */
router.get("/query", vipMiddleware.validateVipAccess, binanceUmTradingPairsController.getTradingPairs);

module.exports = router;




/**
 * @swagger
 * tags:
 *   name: BinanceUmTradingPairs
 *   description: 币安U本位合约交易对接口
 */

/**
 * @openapi
 * /api/v1/binance-um-trading-pairs/query:
 *  get:
 *     tags: [BinanceUmTradingPairs]
 *     summary: 查询U本位合约交易对列表
 *     description: 获取数据库中存储的U本位合约交易对列表
 *     responses:
 *       200:
 *         description: 成功获取交易对列表
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
 *                   example: 获取交易对列表成功
 *                 datum:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           symbol:
 *                             type: string
 *                             example: BTCUSDT
 *                           base_asset:
 *                             type: string
 *                             example: BTC
 *                           quote_asset:
 *                             type: string
 *                             example: USDT
 *                     total:
 *                       type: integer
 *                       example: 150
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */


/**
 * @openapi
 * /api/v1/binance-um-trading-pairs/sync:
 *  post:
 *     tags: [BinanceUmTradingPairs]
 *     summary: 手动触发同步交易对
 *     description: 从币安账户信息接口获取交易对并同步到数据库
 *     parameters:
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - api_key
 *             - api_secret
 *           properties:
 *             api_key:
 *               type: string
 *               description: 用户API Key
 *             api_secret:
 *               type: string
 *               description: 用户API Secret
 *     responses:
 *       200:
 *         description: 成功同步交易对
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
 *                   example: 成功同步150个交易对
 *                 datum:
 *                   type: object
 *                   properties:
 *                     synced_count:
 *                       type: integer
 *                       example: 150
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */

