/**
 * 资金流路由模块
 * 定义资金流相关的API路由，提供资金流向查询和分析功能
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const fundFlowsController = require('../../controller/fund-flows.controller.js');
const validate = require('../../middleware/validate.js');
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 获取合约资金流向数据
 * /api/v1/fund-flows/contract
 */
router.get('/contract', vipMiddleware.validateVipAccess, fundFlowsController.getContractFundFlows);

/**
 * 获取趋势预测数据
 * /api/v1/fund-flows/trend-prediction
 */
router.get('/trend-prediction', vipMiddleware.validateVipAccess, fundFlowsController.getTrendPrediction);

/**
 * 获取资金流占比数据
 * /api/v1/fund-flows/distribution
 */
router.get('/distribution', vipMiddleware.validateVipAccess, fundFlowsController.getFundFlowDistribution);

/**
 * 获取资金流向分析数据
 * /api/v1/fund-flows/analysis
 */
router.get('/analysis', vipMiddleware.validateVipAccess, fundFlowsController.getFundFlowAnalysis);

/**
 * 获取资金流向百分比数据
 * /api/v1/fund-flows/percentage
 */
router.get('/percentage', vipMiddleware.validateVipAccess, fundFlowsController.getFundFlowPercentage);

/**
 * 获取合约持仓量历史数据（CoinAnk接口，暂时废弃）
 * /api/v1/fund-flows/coinank_open-interest-history
 */
router.get('/coinank_open-interest-history', vipMiddleware.validateVipAccess, fundFlowsController.getOpenInterestHistory);

/**
 * 获取合约持仓量历史数据
 * /api/v1/fund-flows/open-interest-history
 */
router.get('/open-interest-history', vipMiddleware.validateVipAccess, fundFlowsController.getOpenInterestHistory);

/**
 * 获取全网各交易所持仓量
 * /api/v1/fund-flows/open-interest-by-exchange
 */
router.get('/open-interest-by-exchange', vipMiddleware.validateVipAccess, fundFlowsController.getOpenInterestByExchange);

module.exports = router;

/**
 * @openapi
 * tags:
 *   name: FundFlows
 *   description: 资金流向数据分析
 */

/**
 * @openapi
 * /api/v1/fund-flows/contract:
 *   get:
 *     summary: 获取合约资金流向数据
 *     description: 获取不同时间粒度下的合约资金流向分析数据（大单/中单/小单）
 *     tags: [FundFlows]
 *     parameters:
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *           enum: [BTC, ETH, GT, XRP, SOL, all]
 *         description: 资产类型(默认all)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [5M, 30M, 1H, 1D]
 *           default: 1H
 *         description: 时间粒度
 *     responses:
 *       200:
 *         description: 资金流向数据获取成功
 *         content:
 *           application/json:
 *             example:
 *               largeOrder:
 *                 netInflow: -1.87
 *                 inflow: 92.44
 *                 outflow: 94.32
 *               mediumOrder:
 *                 netInflow: -3.04
 *                 inflow: 32.95
 *                 outflow: 36.00
 *               smallOrder:
 *                 netInflow: -7.21
 *                 inflow: 285.51
 *                 outflow: 292.72
 *               unit: '亿'
 */

/**
 * @openapi
 * /api/v1/fund-flows/trend-prediction:
 *   get:
 *     summary: 获取趋势预测数据
 *     description: 获取当前市场的趋势预测分析
 *     tags: [FundFlows]
 *     responses:
 *       200:
 *         description: 趋势预测数据获取成功
 *         content:
 *           application/json:
 *             example:
 *               sentiment: '中立'
 *               score: 51.52
 *               levels:
 *                 - '强烈卖出'
 *                 - '卖出'
 *                 - '中立'
 *                 - '买入'
 *                 - '强烈买入'
 */

/**
 * @openapi
 * /api/v1/fund-flows/distribution:
 *   get:
 *     summary: 获取资金流占比数据
 *     description: 获取主力/散户资金流动分布数据
 *     tags: [FundFlows]
 *     responses:
 *       200:
 *         description: 资金流占比数据获取成功
 *         content:
 *           application/json:
 *             example:
 *               mainForce:
 *                 inflow: 125.40
 *                 netInflow: -4.92
 *                 outflow: 130.32
 *               retail:
 *                 inflow: 285.51
 *                 netInflow: -7.21
 *                 outflow: 292.72
 *               percentage: 10
 *               total: 92.72
 *               unit: '亿'
 */

/**
 * @openapi
 * /api/v1/fund-flows/analysis:
 *   get:
 *     summary: 资金流分析数据代理接口
 *     description: 代理访问Gate.io的资金流数据接口
 *     tags: [FundFlow]
 *     parameters:
 *       - in: query
 *         name: coin_type
 *         schema:
 *           type: string
 *         example: BTC
 *       - in: query
 *         name: contra_spot
 *         schema:
 *           type: string
 *           enum: [contra, spot]
 *         example: contra
 *       - in: query
 *         name: time_type
 *         schema:
 *           type: string
 *           enum: [5M, 30M, 1H, 1D]
 *         example: 1H
 */

/**
 * @openapi
 * /api/v1/fund_flow/percentage:
 *   get:
 *     summary: 资金流占比数据代理接口
 *     description: 代理访问Gate.io的资金流占比接口
 *     tags: [FundFlow]
 *     parameters:
 *       - in: query
 *         name: coin_type
 *         schema:
 *           type: string
 *         example: BTC
 *       - in: query
 *         name: contra_spot
 *         schema:
 *           type: string
 *           enum: [contra, spot]
 *         example: contra
 *       - in: query
 *         name: time_type
 *         schema:
 *           type: string
 *           enum: [5M, 30M, 1H, 1D]
 *         example: 1H
 */

/**
 * @openapi
 * /api/v1/fund-flows/coinank_open-interest-history:
 *   get:
 *     summary: 暂时废弃 - 获取合约持仓量历史数据
 *     description: 从 CoinAnk 获取指定交易对、时间间隔和类型的合约持仓量历史数据。
 *     tags: [FundFlows]
 *     parameters:
 *       - in: query
 *         name: baseCoin
 *         schema:
 *           type: string
 *           default: BTC
 *         description: 基础币种 (例如 BTC, ETH, SOL).
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d]
 *           default: 1h
 *         description: 时间间隔.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [USD, COIN]
 *           default: USD
 *         description: 类型 (USD-本位 or COIN-本位).
 *     responses:
 *       200:
 *         description: 成功获取数据
 *       400:
 *         description: 无效的请求参数
 *       503:
 *         description: 上游服务不可用
 */

/**
 * @openapi
 * /api/v1/fund-flows/open-interest-history:
 *   get:
 *     summary: 获取合约持仓量历史数据
 *     description: 从 Gate.io 获取指定币种、交易所、时间间隔和计价单位的合约持仓量历史数据。
 *     tags: [FundFlows]
 *     parameters:
 *       - in: query
 *         name: coin_type
 *         schema:
 *           type: string
 *           default: ETH
 *         description: 币种类型 (例如 BTC, ETH).
 *       - in: query
 *         name: ex
 *         schema:
 *           type: string
 *           enum: [ALL, binance, okx, bybit, gate-io, huobi, bitget, bingx, bitmex, coinex]
 *           default: ALL
 *         description: 交易所.
 *       - in: query
 *         name: ts
 *         schema:
 *           type: string
 *           enum: [5M, 15M, 30M, 1H, 4H, 1D]
 *           default: 4H
 *         description: 时间间隔.
 *       - in: query
 *         name: cy
 *         schema:
 *           type: string
 *           enum: [ALL, USDT, USD]
 *           default: ALL
 *         description: 计价单位.
 *     responses:
 *       200:
 *         description: 成功获取数据
 *       400:
 *         description: 无效的请求参数
 *       503:
 *         description: 上游服务不可用
 */

/**
 * @openapi
 * /api/v1/fund-flows/open-interest-by-exchange:
 *   get:
 *     summary: 获取全网各交易所持仓量
 *     description: 通过爬虫抓取Gate.io页面，获取指定币种在全网各大交易所的实时持仓量数据。
 *     tags: [FundFlows]
 *     parameters:
 *       - in: query
 *         name: coin_type
 *         schema:
 *           type: string
 *           default: btc
 *         description: 币种 (例如 btc, eth).
 *     responses:
 *       200:
 *         description: 成功获取持仓数据
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               source: "https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/btc"
 *               data:
 *                 - exchangeAbbr: "B"
 *                   exchangeName: "Binance永续"
 *                   openInterest: "$117.8亿"
 *                   change24h: "+1.13%"
 *                 - exchangeAbbr: "O"
 *                   exchangeName: "OKX永续"
 *                   openInterest: "$58.3亿"
 *                   change24h: "-0.55%"
 *       404:
 *         description: 未在页面上找到数据
 *       503:
 *         description: 上游服务(Gate.io)抓取失败
 */
