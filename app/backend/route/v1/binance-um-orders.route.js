/**
 * 订单交易路由模块
 * 提供U本位合约开仓、平仓、持仓检查等功能
 */
const express = require('express');
const router = express.Router();
const ordersController = require("../../controller/binance-um-orders.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 模板接口: 测试接口连通性
 * /api/v1/orders
 */
router.get('/', ordersController.template);

/**
 * U本位合约开仓: 支持单个或批量开仓操作
 * POST /api/v1/orders/um/open-position body: { api_key, api_secret, positions: [{ symbol, side, amount }] }
 */
router.post('/um/open-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['api_key', 'api_secret', 'positions']),
  ordersController.umOpenPosition
);

/**
 * U本位合约平仓: 支持单个或批量平仓操作
 * POST /api/v1/orders/um/close-position body: { api_key, api_secret, positions: [{ symbol, side, amount?, quantity?, percentage? }] }
 */
router.post('/um/close-position',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['api_key', 'api_secret', 'positions']),
  ordersController.umClosePosition
);

/**
 * 批量检查对冲单持仓: 检查哪些对冲单持仓仅有单边
 * /api/v1/orders/batch-inspect
 */
router.post('/batch-inspect',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['api_key', 'api_secret']),
  ordersController.batchInspect
);

/**
 * 为空单设置原价止盈
 * POST /v1/orders/set-short-take-profit
 * body: { api_key, api_secret, positions: [{symbol, stopPrice, closeRatio}] }
 */
router.post('/set-short-take-profit',
  vipMiddleware.validateVipAccess,
  ordersController.validateParams(['api_key', 'api_secret', 'positions']),
  ordersController.setShortTakeProfit
);

/**
 * 查询快捷订单记录
 * GET /api/v1/orders/quick-order/query?api_key=xxx
 */
router.get('/quick-order/query',
  ordersController.queryQuickOrderRecords
);

/**
 * 更新快捷订单折叠状态
 * POST /api/v1/orders/quick-order/update-collapse
 * body: { api_key: string, order_id: number, is_collapsed: boolean }
 */
router.post('/quick-order/update-collapse',
  ordersController.updateQuickOrderCollapse
);

/**
 * 删除快捷订单记录
 * POST /api/v1/orders/quick-order/delete
 * body: { api_key: string, order_id: number }
 */
router.post('/quick-order/delete',
  ordersController.deleteQuickOrderRecord
);

/**
 * 获取U本位合约胜率统计
 * GET /api/v1/orders/um/win-rate-stats?api_key=xxx
 */
router.get('/um/win-rate-stats',
  ordersController.getUmWinRateStats
);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: 订单交易管理 - 提供U本位合约开仓、平仓、持仓检查等功能
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UmPosition:
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
 *           description: USDT金额（开仓时必填）
 *           example: 100
 *         quantity:
 *           type: number
 *           description: 币数量（平仓时可选，与amount二选一）
 *           example: 0.001
 *         percentage:
 *           type: number
 *           description: 平仓比例（平仓时可选，0-100）
 *           example: 50
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
 *         datum:
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
 * /api/v1/orders:
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
 *                     datum:
 *                       type: string
 *                       example: "orders route is working"
 */

/**
 * @openapi
 * /api/v1/orders/um/open-position:
 *   post:
 *     tags: [Orders]
 *     summary: U本位合约开仓
 *     description: |
 *       支持单个或批量开仓操作。positions数组天然支持批量。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *       - amount为USDT金额
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - api_secret
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               api_secret:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 开仓位置列表
 *                 items:
 *                   $ref: '#/components/schemas/UmPosition'
 *     responses:
 *       200:
 *         description: 开仓成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/v1/orders/um/close-position:
 *   post:
 *     tags: [Orders]
 *     summary: U本位合约平仓
 *     description: |
 *       支持单个或批量平仓操作。positions数组天然支持批量。
 *
 *       平仓方式（三选一）：
 *       - amount: 按USDT金额平仓
 *       - quantity: 按币数量平仓
 *       - percentage: 按百分比平仓（0-100）
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
 *               - api_secret
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               api_secret:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 平仓位置列表
 *                 items:
 *                   $ref: '#/components/schemas/UmPosition'
 *     responses:
 *       200:
 *         description: 平仓成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/v1/orders/batch-inspect:
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
 *               - api_secret
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               api_secret:
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
 *                     datum:
 *                       type: object
 *                       properties:
 *                         imbalancedPositions:
 *                           type: array
 *                           description: 不平衡的持仓列表
 *                           items:
 *                             $ref: '#/components/schemas/UmPosition'
 *                         totalImbalance:
 *                           type: number
 *                           description: 总不平衡金额
 *                           example: 150.5
 */

/**
 * @openapi
 * /api/v1/orders/set-short-take-profit:
 *   post:
 *     tags: [Orders]
 *     summary: 为空单设置原价止盈
 *     description: |
 *       为空单设置原价止盈。使用开仓价的97%作为止盈价。
 *
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 必须提供有效的币安API密钥
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - api_secret
 *               - positions
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your_binance_api_key"
 *               api_secret:
 *                 type: string
 *                 description: 币安API密钥Secret
 *                 example: "your_binance_api_secret"
 *               positions:
 *                 type: array
 *                 description: 止盈设置列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                       description: 交易对符号
 *                       example: "BTCUSDT"
 *                     stopPrice:
 *                       type: number
 *                       description: 止盈价格
 *                       example: 50000
 *                     closeRatio:
 *                       type: number
 *                       description: 平仓比例
 *                       example: 50
 *     responses:
 *       200:
 *         description: 止盈设置成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
