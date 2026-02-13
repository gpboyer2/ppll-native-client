/**
 * 币安交易所信息路由模块
 * 定义币安交易所信息相关的API路由，提供交易对信息和市场数据查询功能
 */
const express = require("express");
const router = express.Router();
const binanceExchangeInfoController = require("../../controller/binance-exchange-info.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 获取币安交易所信息
 * /api/v1/binance-exchange-info/list
 */
router.get(
    "/list",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.getExchangeInfo,
);

/**
 * 强制更新交易所信息
 * /api/v1/binance-exchange-info/force-update
 */
router.post(
    "/force-update",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.forceUpdate,
);

/**
 * 获取交易所信息状态
 * /api/v1/binance-exchange-info/status
 */
router.get(
    "/status",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.getStatus,
);

/**
 * 获取币安交易所的溢价指数
 * /api/v1/binance-exchange-info/premium-index
 */
router.get(
    "/premium-index",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.getPremiumIndex,
);

/**
 * 获取即将下架的U本位永续合约
 * /api/v1/binance-exchange-info/delisting-perpetual-contracts
 */
router.get(
    "/delisting-perpetual-contracts",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.getDelistingPerpetualContracts,
);

/**
 * 测试获取下架计划原始数据
 * /api/v1/binance-exchange-info/delist-schedule-test
 */
router.get(
    "/delist-schedule-test",
    vipMiddleware.validateVipAccess,
    binanceExchangeInfoController.getDelistScheduleTest,
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: BinanceExchangeInfo
 *   description: 币安交易所信息接口
 */

/**
 * @openapi
 * /api/v1/binance-exchange-info/list:
 *  get:
 *     tags: [BinanceExchangeInfo]
 *     summary: 获取币安交易所信息
 *     description: 获取币安交易所的交易规则和交易对信息，自动检查是否需要更新
 *     responses:
 *       200:
 *         description: 成功获取交易所信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: 币安交易所信息
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @openapi
 * /api/v1/binance-exchange-info/force-update:
 *  post:
 *     tags: [BinanceExchangeInfo]
 *     summary: 强制更新交易所信息
 *     description: 强制从币安API获取最新交易所信息并更新数据库
 *     responses:
 *       200:
 *         description: 成功更新交易所信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @openapi
 * /api/v1/binance-exchange-info/status:
 *  get:
 *     tags: [BinanceExchangeInfo]
 *     summary: 获取交易所信息状态
 *     description: 检查当前存储的交易所信息是否最新
 *     responses:
 *       200:
 *         description: 成功获取状态信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isUpToDate:
 *                   type: boolean
 *                   description: 是否是最新数据
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   description: 最后更新时间
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @openapi
 * /api/v1/binance-exchange-info/premium-index:
 *  get:
 *     tags: [BinanceExchangeInfo]
 *     summary: 获取最新标记价格和资金费率
 *     description: 从币安API获取所有交易对的最新标记价格和资金费率数据
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户API Key
 *       - in: query
 *         name: apiSecret
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户API Secret
 *     responses:
 *       200:
 *         description: 成功获取标记价格和资金费率数据
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: BTCUSDT
 *                         description: 交易对
 *                       markPrice:
 *                         type: string
 *                         example: "11793.63104562"
 *                         description: 标记价格
 *                       indexPrice:
 *                         type: string
 *                         example: "11781.80495970"
 *                         description: 指数价格
 *                       estimatedSettlePrice:
 *                         type: string
 *                         example: "11781.16138815"
 *                         description: 预估结算价，仅在交割开始前最后一小时有意义
 *                       lastFundingRate:
 *                         type: string
 *                         example: "0.00038246"
 *                         description: 最近更新的资金费率
 *                       interestRate:
 *                         type: string
 *                         example: "0.00010000"
 *                         description: 标的资产基础利率
 *                       nextFundingTime:
 *                         type: integer
 *                         example: 1597392000000
 *                         description: 下次资金费时间
 *                       time:
 *                         type: integer
 *                         example: 1597370495002
 *                         description: 更新时间
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @openapi
 * /api/v1/binance-exchange-info/delisting-perpetual-contracts:
 *  get:
 *     tags: [BinanceExchangeInfo]
 *     summary: 获取即将下架的U本位永续合约
 *     description: 获取币安U本位永续合约中即将下架的交易对信息，用于风险管理和提前预警
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户API Key
 *       - in: query
 *         name: apiSecret
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户API Secret
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 30
 *         required: false
 *         description: 提前多少天预警，默认30天
 *     responses:
 *       200:
 *         description: 成功获取即将下架的永续合约信息
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
 *                   example: 发现2个即将下架的永续合约
 *                 data:
 *                   type: object
 *                   properties:
 *                     contracts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                             example: ALPHAUSDT
 *                             description: 交易对名称
 *                           pair:
 *                             type: string
 *                             example: ALPHAUSDT
 *                             description: 交易对
 *                           deliveryDate:
 *                             type: integer
 *                             example: 1727068800000
 *                             description: 下架时间戳
 *                           deliveryDateFormatted:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-09-23T12:00:00.000Z"
 *                             description: 格式化的下架时间
 *                           status:
 *                             type: string
 *                             example: TRADING
 *                             description: 合约状态
 *                           baseAsset:
 *                             type: string
 *                             example: ALPHA
 *                             description: 基础资产
 *                           quoteAsset:
 *                             type: string
 *                             example: USDT
 *                             description: 计价资产
 *                           daysUntilDelisting:
 *                             type: integer
 *                             example: 15
 *                             description: 距离下架剩余天数
 *                     totalCount:
 *                       type: integer
 *                       example: 2
 *                       description: 即将下架的合约数量
 *                     daysAhead:
 *                       type: integer
 *                       example: 30
 *                       description: 预警天数
 *                     checkTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T12:14:34.000Z"
 *                       description: 检查时间
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */
