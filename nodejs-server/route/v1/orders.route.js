/**
 * 订单交易路由模块
 * 提供批量建仓、平仓、持仓检查等功能，支持对冲单和自定义交易操作
 */
const express = require('express');
const router = express.Router();
const ordersController = require("../../controller/orders.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 模板接口: 测试接口连通性
 * /v1/orders
 */
router.get('/', ordersController.template);

/**
 * 批量建仓（对冲单）: 一键建仓/批量建仓功能，对所有USDT永续合约进行批量建仓操作
 * /v1/orders/batch-build-position
 */
router.post('/batch-build-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'longAmount', 'shortAmount']),
  ordersController.batchBuildPosition
);

/**
 * 自定义建仓（对冲单）: 根据指定的交易对列表进行自定义建仓操作
 * /v1/orders/custom-build-position
 */
router.post('/custom-build-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.customBuildPosition
);

/**
 * 自定义平多单（看空策略）: 只平多单，空单不做任何操作。适用于看空策略
 * /v1/orders/custom-close-multiple-position
 */
router.post('/custom-close-multiple-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.customCloseMultiplePosition
);

/**
 * 批量平仓: 一键收菜/批量平仓功能，对所有指定交易对进行平仓操作
 * /v1/orders/batch-close-position
 */
router.post('/batch-close-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.batchClosePosition
);

/**
 * 自定义平仓: 根据币种，平仓方向，平仓数量等参数执行平仓操作
 * /v1/orders/custom-close-position
 */
router.post('/custom-close-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.customClosePosition
);

/**
 * 指定平仓: 指定平仓哪些币种，哪个方向，并确认平仓数量
 * /v1/orders/appoint-close-position
 */
router.post('/appoint-close-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.appointClosePosition
);

/**
 * 批量检查对冲单持仓: 检查哪些对冲单持仓仅有单边
 * /v1/orders/batch-inspect
 */
router.post('/batch-inspect',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret']),
  ordersController.batchInspect
);

/**
 * 为空单设置原价止盈
 * POST /v1/orders/set-short-take-profit
 * body: { apiKey, apiSecret, positions: [{symbol, stopPrice, closeRatio}] }
 */
router.post('/set-short-take-profit',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['apiKey', 'apiSecret', 'positions']),
  ordersController.setShortTakeProfit
);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: 订单交易管理 - 提供批量建仓、平仓、持仓检查等功能，支持对冲单和自定义交易操作
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *           example: "BTCUSDT"
 *         side:
 *           type: string
 *           enum: [LONG, SHORT]
 *           description: 持仓方向
 *           example: "LONG"
 *         amount:
 *           type: number
 *           description: 持仓数量
 *           example: 0.001
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: 响应状态
 *           example: "success"
 *         code:
 *           type: integer
 *           description: 响应代码
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: "操作成功"
 *         data:
 *           type: object
 *           description: 响应数据
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: 错误状态
 *           example: "error"
 *         code:
 *           type: integer
 *           description: 错误代码
 *           example: 400
 *         message:
 *           type: string
 *           description: 错误信息
 *           example: "参数验证失败"
 */

/**
 * @openapi
 * /v1/orders:
 *   get:
 *     tags: [Orders]
 *     summary: 模板接口
 *     description: 测试接口连通性
 *     responses:
 *       200:
 *         description: 接口正常
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: string
 *                       example: "orders route is working"
 */

/**
 * @openapi
 * /v1/orders/batch-build-position:
 *   post:
 *     tags: [Orders]
 *     summary: 批量建仓（对冲单）
 *     description: |
 *       一键建仓/批量建仓功能，对所有USDT永续合约进行批量建仓操作。
 *       支持对冲单策略，同时建立多头和空头仓位。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *       - 建仓前会验证账户余额和风险
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - longAmount
 *               - shortAmount
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               longAmount:
 *                 type: number
 *                 description: 多头建仓金额（USDT）
 *                 example: 100
 *               shortAmount:
 *                 type: number
 *                 description: 空头建仓金额（USDT）
 *                 example: 100
 *     responses:
 *       200:
 *         description: 批量建仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Position'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @openapi
 * /v1/orders/custom-build-position:
 *   post:
 *     tags: [Orders]
 *     summary: 自定义建仓（对冲单）
 *     description: |
 *       根据指定的交易对列表进行自定义建仓操作。
 *       支持对冲单策略，可以指定具体要建仓的交易对和方向。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *       - 支持多个交易对同时建仓
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 建仓位置列表
 *                 items:
 *                   $ref: '#/components/schemas/Position'
 *     responses:
 *       200:
 *         description: 自定义建仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Position'
 */

/**
 * @openapi
 * /v1/orders/batch-close-position:
 *   post:
 *     tags: [Orders]
 *     summary: 批量平仓
 *     description: |
 *       一键收菜/批量平仓功能，对所有指定交易对进行平仓操作。
 *       支持快速平仓所有持仓或指定交易对的平仓操作。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *       - 平仓操作不可逆，请谨慎操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 平仓位置列表
 *                 items:
 *                   $ref: '#/components/schemas/Position'
 *     responses:
 *       200:
 *         description: 批量平仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           side:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           result:
 *                             type: string
 */

/**
 * @openapi
 * /v1/orders/batch-inspect:
 *   post:
 *     tags: [Orders]
 *     summary: 批量检查对冲单持仓
 *     description: |
 *       检查哪些对冲单持仓仅有单边。用于监控对冲策略的完整性，
 *       识别需要重新平衡的不对称持仓。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *       - 会检查所有永续合约的持仓情况
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
 *         description: 持仓检查成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         imbalancedPositions:
 *                           type: array
 *                           description: 不平衡的持仓列表
 *                           items:
 *                             $ref: '#/components/schemas/Position'
 *                         totalImbalance:
 *                           type: number
 *                           description: 总不平衡金额
 *                           example: 150.5
 */

/**
 * @openapi
 * /v1/orders/custom-close-multiple-position:
 *   post:
 *     tags: [Orders]
 *     summary: 自定义平多单（看空策略）
 *     description: |
 *       只平多单，空单不做任何操作。适用于看空策略。
 *       用于执行看空策略时，选择性平掉多头仓位。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 只平多头仓位，保留空头仓位
 *       - 适用于看跌市场策略
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 要平仓的多头仓位列表
 *                 items:
 *                   $ref: '#/components/schemas/Position'
 *     responses:
 *       200:
 *         description: 多头平仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: 平仓结果列表
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           result:
 *                             type: string
 */

/**
 * @openapi
 * /v1/orders/custom-close-position:
 *   post:
 *     tags: [Orders]
 *     summary: 自定义平仓
 *     description: |
 *       根据币种、平仓方向、平仓数量等参数执行平仓操作。
 *       支持精确控制平仓的币种、方向和数量。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 支持指定具体的平仓数量
 *       - 可以精确控制平仓操作
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 平仓位置列表
 *                 items:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Position'
 *                     - type: object
 *                       properties:
 *                         closeAmount:
 *                           type: number
 *                           description: 平仓数量
 *                           example: 0.5
 *     responses:
 *       200:
 *         description: 自定义平仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           side:
 *                             type: string
 *                           closeAmount:
 *                             type: number
 *                           result:
 *                             type: string
 */

/**
 * @openapi
 * /v1/orders/appoint-close-position:
 *   post:
 *     tags: [Orders]
 *     summary: 指定平仓
 *     description: |
 *       指定平仓哪些币种、哪个方向，并确认平仓数量。
 *       提供最精确的平仓控制，可以指定具体的币种、方向和数量。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 提供最精确的平仓控制
 *       - 支持单币种精确平仓
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - secret_key
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               secret_key:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 指定平仓位置列表
 *                 items:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Position'
 *                     - type: object
 *                       properties:
 *                         closeAmount:
 *                           type: number
 *                           description: 指定平仓数量
 *                           example: 0.1
 *                         confirmClose:
 *                           type: boolean
 *                           description: 确认平仓标志
 *                           example: true
 *     responses:
 *       200:
 *         description: 指定平仓成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           side:
 *                             type: string
 *                           closeAmount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           orderId:
 *                             type: string
 */
