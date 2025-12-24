const express = require('express');
const router = express.Router();

const tradingPairsComparisonController = require('../../controller/trading-pairs-comparison.controller.js');



/** 
 * 获取有合约但没有现货的交易对: 
 * /v1/trading-pairs-comparison/futures-only
 */
router.get('/futures-only', tradingPairsComparisonController.getFuturesOnlyPairs);


/** 
 * 获取有现货但没有合约的交易对: 
 * /v1/trading-pairs-comparison/spot-only
 */
router.get('/spot-only', tradingPairsComparisonController.getSpotOnlyPairs);


/** 
 * 获取交易对与基础资产综合分析报告: 
 * 包含现货与合约交易对对比、基础资产覆盖情况等综合信息
 * /v1/trading-pairs-comparison/comprehensive-report
 */
router.get('/comprehensive-report', tradingPairsComparisonController.getComprehensiveReport);


/** 
 * 分析特定交易对的可用性: 
 * /v1/trading-pairs-comparison/analyze?symbol=XXX
 */
router.get('/analyze', tradingPairsComparisonController.analyzeTradingPairAvailability);


/** 
 * 获取所有现货交易对列表: 
 * /v1/trading-pairs-comparison/spot-pairs
 */
router.get('/spot-pairs', tradingPairsComparisonController.getSpotTradingPairs);


/**
 * 获取所有合约交易对列表:
 * /v1/trading-pairs-comparison/futures-pairs
 */
router.get('/futures-pairs', tradingPairsComparisonController.getFuturesTradingPairs);


/**
 * 获取所有币本位合约交易对列表:
 * /v1/trading-pairs-comparison/coin-m-futures-pairs
 */
router.get('/coin-m-futures-pairs', tradingPairsComparisonController.getCoinMFuturesTradingPairs);


module.exports = router;




/**
 * @swagger
 * tags:
 *   name: TradingPairsComparison
 *   description: 交易所对应的 交易对 的获取功能
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TradingPairComparisonResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 请求是否成功
 *         data:
 *           type: object
 *           description: 响应数据
 *         message:
 *           type: string
 *           description: 响应消息
 *     TradingPairsList:
 *       type: object
 *       properties:
 *         count:
 *           type: integer
 *           description: 交易对数量
 *         pairs:
 *           type: array
 *           items:
 *             type: string
 *           description: 交易对列表
 *         description:
 *           type: string
 *           description: 描述信息
 *     ComprehensiveReport:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             totalSpotPairs:
 *               type: integer
 *               description: 现货交易对总数
 *             totalFuturesPairs:
 *               type: integer
 *               description: 合约交易对总数
 *             commonPairs:
 *               type: integer
 *               description: 同时存在现货和合约的交易对数量
 *             futuresOnlyCount:
 *               type: integer
 *               description: 仅有合约的交易对数量
 *             spotOnlyCount:
 *               type: integer
 *               description: 仅有现货的交易对数量
 *             totalBaseAssets:
 *               type: integer
 *               description: 基础资产总数
 *             commonAssetsCount:
 *               type: integer
 *               description: 同时在现货和合约市场存在的资产数量
 *             spotOnlyAssetsCount:
 *               type: integer
 *               description: 仅在现货市场存在的资产数量
 *             futuresOnlyAssetsCount:
 *               type: integer
 *               description: 仅在合约市场存在的资产数量
 *         commonPairs:
 *           $ref: '#/components/schemas/TradingPairsList'
 *         futuresOnly:
 *           $ref: '#/components/schemas/TradingPairsList'
 *         spotOnly:
 *           $ref: '#/components/schemas/TradingPairsList'
 *         assetAnalysis:
 *           type: object
 *           properties:
 *             summary:
 *               type: object
 *               properties:
 *                 totalBaseAssets:
 *                   type: integer
 *                 commonAssetsCount:
 *                   type: integer
 *                 spotOnlyAssetsCount:
 *                   type: integer
 *                 futuresOnlyAssetsCount:
 *                   type: integer
 *             details:
 *               type: object
 *               properties:
 *                 totalBaseAssets:
 *                   type: integer
 *                 spotOnlyAssets:
 *                   type: array
 *                   items:
 *                     type: string
 *                 futuresOnlyAssets:
 *                   type: array
 *                   items:
 *                     type: string
 *                 commonAssets:
 *                   type: array
 *                   items:
 *                     type: string
 *             generatedAt:
 *               type: string
 *               format: date-time
 *         generatedAt:
 *           type: string
 *           format: date-time
 *     TradingPairAvailability:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *         hasSpot:
 *           type: boolean
 *           description: 是否存在现货交易对
 *         hasFutures:
 *           type: boolean
 *           description: 是否存在合约交易对
 *         category:
 *           type: string
 *           description: 分类描述
 *         checkedAt:
 *           type: string
 *           format: date-time
 *           description: 检查时间
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/futures-only:
 *   get:
 *     summary: 获取有合约但没有现货的交易对
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suffix
 *         required: false
 *         schema:
 *           type: string
 *         description: 可选的交易对后缀过滤器（如：USDT、USDC等），如果提供则只返回指定后缀的交易对
 *         example: USDT
 *     responses:
 *       200:
 *         description: 成功获取有合约但没有现货的交易对
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairsList'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     count: 2
 *                     pairs: ["BTCUSD_PERP", "ETHUSD_PERP"]
 *                     description: "有合约但没有现货的交易对"
 *                   message: "成功获取有合约但没有现货的交易对"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/spot-only:
 *   get:
 *     summary: 获取有现货但没有合约的交易对
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suffix
 *         required: false
 *         schema:
 *           type: string
 *         description: 可选的交易对后缀过滤器（如：USDT、USDC等），如果提供则只返回指定后缀的交易对
 *         example: USDT
 *     responses:
 *       200:
 *         description: 成功获取有现货但没有合约的交易对
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairsList'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     count: 3
 *                     pairs: ["BTCUSDC", "ETHUSDC", "BNBUSDC"]
 *                     description: "有现货但没有合约的交易对"
 *                   message: "成功获取有现货但没有合约的交易对"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/comprehensive-report:
 *   get:
 *     summary: 获取交易对与基础资产综合分析报告
 *     description: |
 *       获取现货与合约市场的综合分析报告，包含：
 *       1. 交易对对比分析（仅现货、仅合约、两者都有）
 *       2. 基础资产覆盖情况分析（USDT本位币种在现货和合约市场的支持情况）
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suffix
 *         required: false
 *         schema:
 *           type: string
 *         description: 可选的交易对后缀过滤器（如：USDT、USDC等），如果提供则只返回指定后缀的交易对
 *         example: USDT
 *     responses:
 *       200:
 *         description: 成功获取交易对与基础资产综合分析报告
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ComprehensiveReport'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     summary:
 *                       totalSpotPairs: 1500
 *                       totalFuturesPairs: 200
 *                       commonPairs: 180
 *                       futuresOnlyCount: 20
 *                       spotOnlyCount: 1320
 *                       totalBaseAssets: 150
 *                       commonAssetsCount: 80
 *                       spotOnlyAssetsCount: 50
 *                       futuresOnlyAssetsCount: 20
 *                     commonPairs:
 *                       count: 180
 *                       pairs: ["BTCUSDT", "ETHUSDT"]
 *                       description: "同时存在现货和合约的交易对"
 *                     futuresOnly:
 *                       count: 20
 *                       pairs: ["BTCUSD_PERP", "ETHUSD_PERP"]
 *                       description: "有合约但没有现货的交易对"
 *                     spotOnly:
 *                       count: 1320
 *                       pairs: ["BTCUSDC", "ETHUSDC"]
 *                       description: "有现货但没有合约的交易对"
 *                     assetAnalysis:
 *                       summary:
 *                         totalBaseAssets: 150
 *                         commonAssetsCount: 80
 *                         spotOnlyAssetsCount: 50
 *                         futuresOnlyAssetsCount: 20
 *                       details:
 *                         totalBaseAssets: 150
 *                         spotOnlyAssets: ["USDC", "BUSD"]
 *                         futuresOnlyAssets: ["XRP", "ADA"]
 *                         commonAssets: ["BTC", "ETH"]
 *                       generatedAt: "2023-01-01T00:00:00.000Z"
 *                     generatedAt: "2023-01-01T00:00:00.000Z"
 *                   message: "成功获取综合分析报告"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/analyze:
 *   get:
 *     summary: 分析特定交易对的可用性
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易对符号（如：BTCUSDT）
 *         example: BTCUSDT
 *     responses:
 *       200:
 *         description: 成功分析交易对可用性
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairAvailability'
 *                 message:
 *                   type: string
 *             examples:
 *               both_available:
 *                 summary: 现货和合约都可用
 *                 value:
 *                   success: true
 *                   data:
 *                     symbol: BTCUSDT
 *                     hasSpot: true
 *                     hasFutures: true
 *                     category: "现货和合约都可用"
 *                     checkedAt: "2023-01-01T00:00:00.000Z"
 *                   message: "成功分析交易对 BTCUSDT 的可用性"
 *               spot_only:
 *                 summary: 仅现货可用
 *                 value:
 *                   success: true
 *                   data:
 *                     symbol: BTCUSDC
 *                     hasSpot: true
 *                     hasFutures: false
 *                     category: "仅现货可用"
 *                     checkedAt: "2023-01-01T00:00:00.000Z"
 *                   message: "成功分析交易对 BTCUSDC 的可用性"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/spot-pairs:
 *   get:
 *     summary: 获取所有现货交易对列表
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suffix
 *         required: false
 *         schema:
 *           type: string
 *         description: 可选的交易对后缀过滤器（如：USDT、USDC等），如果提供则只返回指定后缀的交易对
 *         example: USDT
 *     responses:
 *       200:
 *         description: 成功获取现货交易对列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairsList'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     count: 1500
 *                     pairs: ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
 *                     description: "所有现货交易对"
 *                   message: "成功获取现货交易对列表"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/futures-pairs:
 *   get:
 *     summary: 获取所有合约交易对列表
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suffix
 *         required: false
 *         schema:
 *           type: string
 *         description: 可选的交易对后缀过滤器（如：USDT、USDC等），如果提供则只返回指定后缀的交易对
 *         example: USDT
 *     responses:
 *       200:
 *         description: 成功获取合约交易对列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairsList'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     count: 200
 *                     pairs: ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
 *                     description: "所有合约交易对（永续合约）"
 *                   message: "成功获取合约交易对列表"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */


/**
 * @openapi
 * /v1/trading-pairs-comparison/coin-m-futures-pairs:
 *   get:
 *     summary: 获取所有币本位合约交易对列表
 *     description: |
 *       获取所有币本位合约交易对列表，包括：
 *       - 所有币本位永续合约（如BTCUSD_PERP、ETHUSD_PERP等）
 *       - 返回正在交易状态的交易对
 *       - 币本位合约以基础货币作为保证金进行交易
 *     tags: [TradingPairsComparison]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取币本位合约交易对列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: 请求是否成功
 *                 data:
 *                   $ref: '#/components/schemas/TradingPairsList'
 *                 message:
 *                   type: string
 *                   description: 响应消息
 *             examples:
 *               success:
 *                 summary: 成功响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     count: 32
 *                     pairs: ["BTCUSD_PERP", "ETHUSD_PERP", "BNBUSD_PERP", "ADAUSD_PERP", "SOLUSD_PERP"]
 *                     description: "所有币本位合约交易对（永续合约）"
 *                   message: "成功获取币本位合约交易对列表"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                 data:
 *                   type: object
 *                   nullable: true
 */
