/**
 * 模板路由模块
 * 定义模板相关的API路由
 */
const express = require('express');
const router = express.Router();
const auth = require("../../middleware/auth");

const orderController = require("../../controller/template.controller.js");


/** 
 * 创建新订单: 
 * /v1/template/create
 */
router.post('/create', auth(['admin', 'super_admin']), orderController.createOrder);


/**
 * 删除订单:
 * /v1/template/delete
 */
router.post('/delete', auth(['admin', 'super_admin']), orderController.deleteOrder);


/**
 * 更新订单:
 * /v1/template/update
 */
router.put('/update', auth(['admin', 'super_admin']), orderController.updateOrder);


/**
 * 查询订单:
 * /v1/template/query - 支持查询单个ID、多个ID、所有订单
 * 查询参数：
 * - id: 单个订单ID（可选）
 * - ids: 多个订单ID，用逗号分隔（可选，例如：1,2,3）
 * - user_id: 用户ID过滤（可选）
 * - currentPage: 页码（可选，默认为1）
 * - pageSize: 每页数量（可选，默认为10，最大100）
 * - apiKey: 币安API密钥（VIP验证用）
 * - apiSecret: 币安API密钥Secret（VIP验证用）
 * 
 * 优先级：id > ids > 分页查询所有
 */
router.get('/query', orderController.queryOrders);


module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Order
 *   description: 交易订单管理 - 提供订单的创建、查询、删除和更新功能，支持期货和现货交易订单的全生命周期管理
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 订单唯一标识
 *           example: 1001
 *         order_id:
 *           type: string
 *           description: 交易所订单ID
 *           example: "28141"
 *         client_order_id:
 *           type: string
 *           description: 客户端订单ID
 *           example: "web_6837a40ae6744a43a1b64bb0650d87af"
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *           example: "BTCUSDT"
 *         side:
 *           type: string
 *           enum: [BUY, SELL]
 *           description: 买卖方向
 *           example: "BUY"
 *         position_side:
 *           type: string
 *           enum: [LONG, SHORT]
 *           description: 持仓方向（期货）
 *           example: "LONG"
 *         type:
 *           type: string
 *           enum: [LIMIT, MARKET, STOP, TAKE_PROFIT, STOP_MARKET, TAKE_PROFIT_MARKET]
 *           description: 订单类型
 *           example: "LIMIT"
 *         quantity:
 *           type: string
 *           description: 订单数量
 *           example: "0.001"
 *         price:
 *           type: string
 *           description: 订单价格
 *           example: "50000.00"
 *         status:
 *           type: string
 *           enum: [NEW, PARTIALLY_FILLED, FILLED, CANCELED, PENDING_CANCEL, REJECTED, EXPIRED]
 *           description: 订单状态
 *           example: "NEW"
 *         executed_qty:
 *           type: string
 *           description: 已成交数量
 *           example: "0.0005"
 *         executed_price:
 *           type: string
 *           description: 成交均价
 *           example: "49950.00"
 *         fee:
 *           type: string
 *           description: 手续费
 *           example: "0.02497"
 *         fee_asset:
 *           type: string
 *           description: 手续费资产
 *           example: "USDT"
 *         grid_id:
 *           type: string
 *           description: 网格策略ID（如果属于网格交易）
 *           example: "grid_123456"
 *         grid_level:
 *           type: integer
 *           description: 网格层级
 *           example: 5
 *         source:
 *           type: string
 *           enum: [GRID, MANUAL]
 *           description: 订单来源
 *           example: "GRID"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: "2024-01-15T10:30:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *           example: "2024-01-15T10:35:00Z"
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - symbol
 *         - side
 *         - type
 *         - quantity
 *       properties:
 *         apiKey:
 *           type: string
 *           description: 币安API密钥
 *           example: "your_binance_api_key"
 *         apiSecret:
 *           type: string
 *           description: 币安API密钥Secret
 *           example: "your_binance_api_secret"
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *           example: "BTCUSDT"
 *         side:
 *           type: string
 *           enum: [BUY, SELL]
 *           description: 买卖方向
 *           example: "BUY"
 *         position_side:
 *           type: string
 *           enum: [LONG, SHORT]
 *           description: 持仓方向（期货交易必填）
 *           example: "LONG"
 *         type:
 *           type: string
 *           enum: [LIMIT, MARKET, STOP, TAKE_PROFIT, STOP_MARKET, TAKE_PROFIT_MARKET]
 *           description: 订单类型
 *           example: "LIMIT"
 *         quantity:
 *           type: string
 *           description: 订单数量
 *           example: "0.001"
 *         price:
 *           type: string
 *           description: 订单价格（限价单必填）
 *           example: "50000.00"
 *         time_in_force:
 *           type: string
 *           enum: [GTC, IOC, FOK]
 *           description: 订单有效方式
 *           example: "GTC"
 *         grid_id:
 *           type: string
 *           description: 网格策略ID（网格交易时使用）
 *           example: "grid_123456"
 *         remark:
 *           type: string
 *           description: 订单备注
 *           example: "网格交易买单-第5层"
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
 * /v1/template/create:
 *   post:
 *     tags: [Order]
 *     summary: 创建新订单
 *     description: |
 *       创建新的交易订单，支持期货和现货交易。此接口会验证用户VIP权限，
 *       只有VIP用户才能使用交易功能。支持多种订单类型包括限价单、市价单、
 *       止损止盈等。可用于网格交易策略或手动交易。
 *       
 *       **注意事项：**
 *       - 需要提供有效的币安API密钥
 *       - VIP用户才能使用此功能
 *       - 限价单必须提供价格参数
 *       - 期货交易需要指定持仓方向
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           examples:
 *             limit_buy_order:
 *               summary: 限价买单示例
 *               value:
 *                 apiKey: "your_binance_api_key"
 *                 apiSecret: "your_binance_api_secret"
 *                 symbol: "BTCUSDT"
 *                 side: "BUY"
 *                 type: "LIMIT"
 *                 quantity: "0.001"
 *                 price: "50000.00"
 *                 time_in_force: "GTC"
 *                 remark: "手动买入订单"
 *             market_sell_order:
 *               summary: 市价卖单示例
 *               value:
 *                 apiKey: "your_binance_api_key"
 *                 apiSecret: "your_binance_api_secret"
 *                 symbol: "ETHUSDT"
 *                 side: "SELL"
 *                 type: "MARKET"
 *                 quantity: "0.1"
 *                 remark: "止盈卖出"
 *             grid_order:
 *               summary: 网格交易订单示例
 *               value:
 *                 apiKey: "your_binance_api_key"
 *                 apiSecret: "your_binance_api_secret"
 *                 symbol: "ADAUSDT"
 *                 side: "BUY"
 *                 type: "LIMIT"
 *                 quantity: "100"
 *                 price: "0.45"
 *                 grid_id: "grid_ada_20240115"
 *                 remark: "网格买单-第3层"
 *     responses:
 *       200:
 *         description: 订单创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *             examples:
 *               success:
 *                 summary: 订单创建成功
 *                 value:
 *                   status: "success"
 *                   code: 200
 *                   data:
 *                     id: 1002
 *                     order_id: "28142"
 *                     symbol: "BTCUSDT"
 *                     side: "BUY"
 *                     type: "LIMIT"
 *                     quantity: "0.001"
 *                     price: "50000.00"
 *                     status: "NEW"
 *                     created_at: "2024-01-15T10:35:00Z"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "订单数量必须大于0"
 *               balance_insufficient:
 *                 summary: 余额不足
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "账户余额不足"
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_vip:
 *                 summary: 非VIP用户
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您不是VIP用户，无法使用该功能"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @openapi
 * /v1/template/delete:
 *   post:
 *     tags: [Order]
 *     summary: 删除订单
 *     description: |
 *       根据订单ID删除指定的订单记录。此操作将永久删除订单数据，
 *       请谨慎使用。通常用于清理测试数据或取消未执行的订单。
 *       
 *       **注意事项：**
 *       - 删除操作不可逆
 *       - 只能删除本系统创建的订单记录
 *       - 已在交易所执行的订单建议先取消再删除
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 要删除的订单ID
 *                 example: 1001
 *           examples:
 *             delete_order:
 *               summary: 删除订单示例
 *               value:
 *                 id: 1001
 *     responses:
 *       204:
 *         description: 订单删除成功（无返回内容）
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "订单ID不能为空"
 *       404:
 *         description: 订单不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "订单不存在"
 *       500:
 *         description: 服务器内部错误
 */


/**
 * @openapi
 * /v1/template/update:
 *   put:
 *     tags: [Order]
 *     summary: 更新订单
 *     description: |
 *       根据订单ID更新指定订单的信息。支持更新订单的基本信息如备注、状态等，
 *       但不能修改交易相关的核心字段如数量、价格等。此接口需要VIP权限验证。
 *       
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 不能修改已成交订单的核心交易信息
 *       - 只能更新系统允许修改的字段
 *       - 更新操作会记录操作时间
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 要更新的订单ID
 *                 example: 1001
 *               apiKey:
 *                 type: string
 *                 description: 币安API密钥（VIP验证用）
 *                 example: "your_binance_api_key"
 *               apiSecret:
 *                 type: string
 *                 description: 币安API密钥Secret（VIP验证用）
 *                 example: "your_binance_api_secret"
 *               ordername:
 *                 type: string
 *                 description: 订单名称
 *                 example: "BTC买入订单"
 *               email:
 *                 type: string
 *                 description: 关联邮箱
 *                 example: "trader@example.com"
 *               active:
 *                 type: integer
 *                 description: 激活状态（0-未激活，1-已激活）
 *                 example: 1
 *               status:
 *                 type: integer
 *                 description: 订单状态（0-待处理，1-处理中，2-已完成）
 *                 example: 1
 *               password:
 *                 type: boolean
 *                 description: 是否重置密码时间戳
 *                 example: false
 *           examples:
 *             update_order:
 *               summary: 更新订单示例
 *               value:
 *                 id: 1001
 *                 apiKey: "your_binance_api_key"
 *                 apiSecret: "your_binance_api_secret"
 *                 ordername: "BTC买入订单-已确认"
 *                 active: 1
 *                 status: 2
 *     responses:
 *       200:
 *         description: 订单更新成功
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
 *                         affectedRows:
 *                           type: integer
 *                           description: 受影响的行数
 *                           example: 1
 *             examples:
 *               success:
 *                 summary: 订单更新成功
 *                 value:
 *                   status: "success"
 *                   code: 200
 *                   message: "订单更新成功"
 *                   data:
 *                     affectedRows: 1
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "订单ID不能为空"
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_vip:
 *                 summary: 非VIP用户
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您不是VIP用户，无法使用该功能"
 *       404:
 *         description: 订单不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 summary: 订单不存在
 *                 value:
 *                   status: "error"
 *                   code: 404
 *                   message: "订单不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @openapi
 * /v1/template/query:
 *   get:
 *     tags: [Order]
 *     summary: 查询订单列表
 *     description: |
 *       查询订单列表，支持分页和按ID筛选。如果提侟ID参数，则查询单个订单；
 *       如果不提侟ID参数，则返回分页的订单列表。此接口需要VIP权限验证，
 *       返回订单的完整信息包括执行状态、成交价格、手续费等详细数据。
 *       适用于订单状态跟踪和交易记录查询。
 *       
 *       **注意事项：**
 *       - 需要VIP用户权限
 *       - 需要提供有效的API密钥
 *       - 返回订单的实时状态信息
 *       - 支持分页查询，默认每页显示10条记录
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: 订单ID（如果提供则查询单个订单）
 *         example: 1001
 *       - in: query
 *         name: ids
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: 多个订单ID，支持数组或逗号分隔字符串，例如 ids=1,2,3
 *         example: [1001,1002]
 *       - in: query
 *         name: user_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: 用户ID过滤
 *         example: 123
 *       - in: query
 *         name: currentPage
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页数量
 *         example: 10
 *       - in: query
 *         name: apiKey
 *         required: false
 *         schema:
 *           type: string
 *         description: 币安API密钥（VIP验证用）
 *         example: "your_binance_api_key"
 *       - in: query
 *         name: apiSecret
 *         required: false
 *         schema:
 *           type: string
 *         description: 币安API密钥Secret（VIP验证用）
 *         example: "your_binance_api_secret"
 *     responses:
 *       200:
 *         description: 成功返回订单数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: 响应状态
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *                       description: 订单数据列表
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 100
 *                     currentPage:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 *             examples:
 *               single_order:
 *                 summary: 单个订单查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1001
 *                         order_id: "28141"
 *                         client_order_id: "web_6837a40ae6744a43a1b64bb0650d87af"
 *                         symbol: "BTCUSDT"
 *                         side: "BUY"
 *                         type: "LIMIT"
 *                         quantity: "0.001"
 *                         price: "50000.00"
 *                         status: "FILLED"
 *                         executed_qty: "0.001"
 *                         executed_price: "49950.00"
 *                         fee: "0.04995"
 *                         fee_asset: "USDT"
 *                         source: "MANUAL"
 *                         created_at: "2024-01-15T10:30:00Z"
 *                         updated_at: "2024-01-15T10:35:00Z"
 *                     total: 1
 *                     currentPage: 1
 *               paginated_orders:
 *                 summary: 分页订单查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1002
 *                         order_id: "28142"
 *                         symbol: "ETHUSDT"
 *                         side: "SELL"
 *                         type: "MARKET"
 *                         quantity: "0.1"
 *                         status: "FILLED"
 *                         source: "GRID"
 *                         created_at: "2024-01-15T11:00:00Z"
 *                       - id: 1001
 *                         order_id: "28141"
 *                         symbol: "BTCUSDT"
 *                         side: "BUY"
 *                         type: "LIMIT"
 *                         quantity: "0.001"
 *                         status: "FILLED"
 *                         source: "MANUAL"
 *                         created_at: "2024-01-15T10:30:00Z"
 *                     total: 50
 *                     currentPage: 1
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "订单ID不能为空"
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_vip:
 *                 summary: 非VIP用户
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您不是VIP用户，无法使用该功能"
 *       404:
 *         description: 订单不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "订单不存在"
 *       500:
 *         description: 服务器内部错误
 */


