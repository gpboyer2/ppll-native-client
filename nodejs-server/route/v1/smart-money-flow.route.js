/**
 * 智能资金流路由模块
 * 定义智能资金流分析相关的API路由，提供高级资金流向分析功能
 */
const express = require('express');
const router = express.Router();
const smartMoneyFlowController = require('../../controller/smart-money-flow.controller.js');
const vipMiddleware = require("../../middleware/vip.js");


/**
 * @openapi
 * /api/v1/smart-money-flow/kol-vc-holdings:
 *   get:
 *     summary: 获取KOL/VC链上持仓分布数据
 *     description: 获取前1000名KOL/VC的链上地址代币持仓占比数据（全部链）
 *     tags: [SmartMoneyFlow]
 *     parameters:
 *       - in: query
 *         name: chain_name
 *         schema:
 *           type: string
 *           enum: [all, sol, eth, base, bsc]
 *           default: all
 *         description: 区块链名称 (all表示全部链)
 *     responses:
 *       200:
 *         description: 成功获取KOL/VC持仓数据
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - token_address: "0x6982508145454ce325ddbe47a25d4ec3d2311933"
 *                   token_name: "PEPE"
 *                   token_logo_url: "https://image.gatedataimg.com/spider_gmgn/4f7474dc0e76058ab1490068deb471e5_1749739680991.png"
 *                   token_position_rate: "16.28"
 *                   token_amount: "0.000011812687"
 *                   increase_rate_24h: "6.83"
 *                   market_value_current: "4969478108.668724"
 *                   tran_volume_24h: "3153266.4798382"
 *       400:
 *         description: 无效的请求参数
 *       503:
 *         description: 上游服务不可用
 */

/**
 * @openapi
 * /api/v1/smart-money-flow/twitter-resonance-signal:
 *   get:
 *     summary: 获取聪明钱共振信号数据
 *     description: |
 *       获取KOL/VC在Twitter上的交易信号与链上行为的共振数据
 *       数据来源: Gate.io链上数据分析API
 *     tags: [SmartMoneyFlow]
 *     parameters:
 *       - in: query
 *         name: chain_name
 *         schema:
 *           type: string
 *           enum: [all, sol, eth, base, bsc]
 *           default: all
 *         description: 区块链名称 (all表示全部链)
 *     responses:
 *       200:
 *         description: 成功获取共振信号数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logo_s3_url:
 *                   type: string
 *                   format: uri
 *                   example: "https://image.gatedataimg.com/spider_logearn/6d1078fe201bbb5ef7b53b6b4e8578cc_1754877327997.png"
 *                   description: 代币logo图片URL
 *                 token_name:
 *                   type: string
 *                   example: "fable"
 *                   description: 代币名称
 *                 token_address:
 *                   type: string
 *                   example: "DHuHRLNcFB9UfiaAYzSMFiQpLzXBFN9cCgvxuUg8vPZE"
 *                   description: 代币合约地址
 *                 chain_name:
 *                   type: string
 *                   example: "sol"
 *                   description: 区块链名称
 *                 mkt_cap:
 *                   type: string
 *                   example: "70726"
 *                   description: 市值(USD)
 *                 alert_count:
 *                   type: integer
 *                   example: 4
 *                   description: 警报总数
 *                 signals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         example: "2h"
 *                         description: 信号时间(相对当前时间)
 *                       maker:
 *                         type: string
 *                         example: "杀破狼(@Wolfy_XBT)"
 *                         description: 交易者Twitter账号及昵称
 *                       volume:
 *                         type: string
 *                         example: "3.777413131658"
 *                         description: 交易量
 *                       order_type:
 *                         type: string
 *                         enum: [b, s]
 *                         example: "s"
 *                         description: 交易类型(b=买入, s=卖出)
 *       400:
 *         description: 无效参数
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "不支持的区块链参数"
 *       503:
 *         description: 服务不可用
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "数据服务暂时不可用"
 */


/**
 * @openapi
 * /api/v1/smart-money-flow/kol-vc-top-list:
 *   get:
 *     summary: 获取KOL/VC盈亏排行榜
 *     description: |
 *       获取链上被标记为KOL/VC的钱包地址的排行榜数据，包括：
 *       - 总盈亏金额/比例
 *       - 30天胜率
 *       - 持仓代币明细
 *     tags: [SmartMoneyFlow]
 *     parameters:
 *       - in: query
 *         name: chain_name
 *         schema:
 *           type: string
 *           enum: [all, sol, eth, base, bsc]
 *           default: sol
 *         description: 区块链名称
 *     responses:
 *       200:
 *         description: 成功获取排行榜数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       chain_name:
 *                         type: string
 *                         example: "sol"
 *                       nick_name:
 *                         type: string
 *                         example: "王小二"
 *                       user_address:
 *                         type: string
 *                         example: "71CPXu3TvH3iUKaY1bNkAAow24k6tjH473SsKprQBABC"
 *                       wallet_logo:
 *                         type: string
 *                         format: uri
 *                         example: "https://image.gatedataimg.com/spider_gmgn/799b425205c80b5a28282ffc04cf49b8_1749744083132.png"
 *                       address_label:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["kol", "bluechip_owner"]
 *                       pnl_total_rate:
 *                         type: string
 *                         example: "23.69"
 *                         description: 总盈亏比例(%)
 *                       pnl_total:
 *                         type: string
 *                         example: "10083026.686236423"
 *                         description: 总盈亏金额(USD)
 *                       win_rate_30d:
 *                         type: string
 *                         example: "100.00"
 *                         description: 30天胜率(%)
 *                       token_hold:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             token_name:
 *                               type: string
 *                               example: "Nailong"
 *                             token_address:
 *                               type: string
 *                               example: "mkvXiNBpa8uiSApe5BrhWVJaT87pJFTZxRy7zFapump"
 *                             logo_s3_url:
 *                               type: string
 *                               format: uri
 *                             total_profit:
 *                               type: string
 *                               example: "149664.14478522076961152592"
 *                             pnl_rate:
 *                               type: string
 *                               example: "14.9973967948733838"
 *                       thirty_days_profit:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             date:
 *                               type: string
 *                               format: date
 *                               example: "2025-07-10"
 *                             amount:
 *                               type: string
 *                               example: "59.35"
 *       400:
 *         description: 无效参数
 *       503:
 *         description: 服务不可用
 */


/**
 * @openapi
 * /api/v1/smart-money-flow/24h-trade-volume:
 *   get:
 *     summary: 获取24小时KOL/VC买卖量数据
 *     description: |
 *       获取KOL/VC钱包地址24小时内的买入和卖出总量
 *       数据来源: Gate.io链上数据分析API
 *     tags: [SmartMoneyFlow]
 *     parameters:
 *       - in: query
 *         name: chain_name
 *         schema:
 *           type: string
 *           enum: [all, sol, eth, base, bsc]
 *           default: all
 *         description: 区块链名称 (all表示全部链)
 *     responses:
 *       200:
 *         description: 成功获取买卖量数据
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
 *                     buy_amount:
 *                       type: string
 *                       example: "4542097368.13"
 *                       description: 24小时买入总量(USD)
 *                     buy_amount_rate:
 *                       type: string
 *                       example: "46.0300"
 *                       description: 买入量占比(百分比)
 *                     sell_amount:
 *                       type: string
 *                       example: "5324780098.03"
 *                       description: 24小时卖出总量(USD)
 *                     sell_amount_rate:
 *                       type: string
 *                       example: "53.9700"
 *                       description: 卖出量占比(百分比)
 *       400:
 *         description: 无效参数
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "不支持的区块链参数"
 *       503:
 *         description: 服务不可用
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "数据服务暂时不可用"
 */


/**
 * @openapi
 * /api/v1/smart-money-flow/30d-profit-distribution:
 *   get:
 *     summary: 获取KOL/VC 30日盈亏分布数据
 *     description: 获取前1000名KOL/VC地址的30日盈亏走势数据
 *     tags: [SmartMoneyFlow]
 *     parameters:
 *       - in: query
 *         name: chain_name
 *         schema:
 *           type: string
 *           enum: [all, sol, eth, base, bsc]
 *           default: all
 *         description: 区块链名称 (all表示全部链)
 *     responses:
 *       200:
 *         description: 成功获取30日盈亏数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ct_time:
 *                         type: string
 *                         format: date
 *                         example: "2025-07-13"
 *                         description: 日期
 *                       surplus_amount:
 *                         type: string
 *                         example: "1930128197.69"
 *                         description: 当日盈亏金额(USD)
 *       400:
 *         description: 无效的请求参数
 *       503:
 *         description: 上游服务不可用
 */


// 获取KOL/VC链上持仓分布数据  /v1/smart-money-flow/kol-vc-holdings
router.get('/kol-vc-holdings', vipMiddleware.validateVipAccess, smartMoneyFlowController.getKolVcHoldings);


// 推特聪明钱共振信号路由 /v1/smart-money-flow/twitter-resonance-signal
router.get('/twitter-resonance-signal', vipMiddleware.validateVipAccess, smartMoneyFlowController.getTwitterResonanceSignal);


// KOL/VC TOP榜(盈亏金额/盈亏比例/30天胜率榜), 获取链上被标记为 KOL/VC 的钱包地址的排行榜数据
// KOL/VC链上持仓分布数据排行榜 /v1/smart-money-flow/kol-vc-top-list
router.get('/kol-vc-top-list', vipMiddleware.validateVipAccess, smartMoneyFlowController.getKolVcTopList);


// 24小时KOL/VC买卖量数据 /v1/smart-money-flow/24h-trade-volume
router.get('/24h-trade-volume', vipMiddleware.validateVipAccess, smartMoneyFlowController.get24hTradeVolume);


// 获取KOL/VC 30日盈亏分布数据 /v1/smart-money-flow/30d-profit-distribution
router.get('/30d-profit-distribution', vipMiddleware.validateVipAccess, smartMoneyFlowController.get30DayProfitDistribution);


module.exports = router;

