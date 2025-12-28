/**
 * 仪表盘路由模块
 * 定义仪表盘相关的API路由，提供数据统计和概览功能
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/dashboard.controller.js');
const vipMiddleware = require("../../middleware/vip.js");


/**
 * 获取仪表盘概览数据
 * GET /v1/dashboard
 */
router.get('/', vipMiddleware.validateVipAccess, dashboardController.dashboard);


/**
 * 获取合约账户详情
 * POST /v1/dashboard/account
 */
router.post('/account', vipMiddleware.validateVipAccess, dashboardController.account);


module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: 面板
 */

/**
 * @openapi
 * /v1/dashboard:
 *  get:
 *     tags: [Dashboard]
 *     summary: 获取仪表盘概览数据
 *     description: 获取系统仪表盘的主要数据和统计信息，包括用户统计、交易数据等概览信息
 *     responses:
 *       200:
 *         description: 成功获取仪表盘数据
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
 *                   description: 仪表盘数据
 */

/**
 * @openapi
 * /v1/dashboard/account:
 *  post:
 *     tags: [Dashboard]
 *     summary: 获取合约账户详情
 *     description: 获取用户的币安合约账户详细信息，包括余额、持仓、保证金等账户状态
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *     responses:
 *       200:
 *         description: 成功获取账户详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   description: 账户详细信息
 *                 fromCache:
 *                   type: boolean
 *                   description: 是否来自缓存
 *                   example: false
 *       400:
 *         description: 请求参数错误或API调用失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   description: 错误信息
 */
