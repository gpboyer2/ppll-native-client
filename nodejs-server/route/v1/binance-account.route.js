/**
 * 币安账户信息路由模块
 * 定义币安账户信息相关的API路由，提供现货、U本位合约、币本位合约账户信息查询功能
 */
const express = require("express");
const router = express.Router();
const binanceAccountController = require("../../controller/binance-account.controller.js");
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 获取U本位合约账户信息
 * /v1/binance-account/usdm-futures
 */
router.get("/usdm-futures", vipMiddleware.validateVipAccess, binanceAccountController.getUSDMFuturesAccount);

/**
 * 获取现货账户信息
 * /v1/binance-account/spot
 */
router.get("/spot", vipMiddleware.validateVipAccess, binanceAccountController.getSpotAccount);

/**
 * 获取币本位合约账户信息
 * /v1/binance-account/coinm-futures
 */
router.get("/coinm-futures", vipMiddleware.validateVipAccess, binanceAccountController.getCoinMFuturesAccount);

/**
 * 设置U本位合约杠杆倍数（支持批量）
 * /v1/binance-account/set-leverage
 */
router.post("/set-leverage", vipMiddleware.validateVipAccess, binanceAccountController.setLeverage);

/**
 * 生成 ListenKey (U本位合约)
 * /v1/binance-account/generate-listen-key
 */
router.post("/generate-listen-key", vipMiddleware.validateVipAccess, binanceAccountController.generateListenKey);

/**
 * 延长 ListenKey 有效期
 * /v1/binance-account/keep-alive-listen-key
 */
router.put("/keep-alive-listen-key", vipMiddleware.validateVipAccess, binanceAccountController.keepAliveListenKey);

module.exports = router;





/**
 * @swagger
 * tags:
 *   name: BinanceAccount
 *   description: 币安账户信息 - 提供现货、U本位合约、币本位合约账户信息查询，包括余额、持仓、保证金等详细信息
 */


/**
 * @swagger
 * components:
 *   schemas:
 *     AccountAsset:
 *       type: object
 *       properties:
 *         asset:
 *           type: string
 *           description: 资产名称
 *           example: "USDT"
 *         walletBalance:
 *           type: string
 *           description: 钱包余额
 *           example: "1000.00000000"
 *         unrealizedProfit:
 *           type: string
 *           description: 未实现盈亏
 *           example: "5.25000000"
 *         marginBalance:
 *           type: string
 *           description: 保证金余额
 *           example: "1005.25000000"
 *         maintMargin:
 *           type: string
 *           description: 维持保证金
 *           example: "0.00000000"
 *         initialMargin:
 *           type: string
 *           description: 初始保证金
 *           example: "0.00000000"
 *         positionInitialMargin:
 *           type: string
 *           description: 持仓初始保证金
 *           example: "0.00000000"
 *         openOrderInitialMargin:
 *           type: string
 *           description: 挂单初始保证金
 *           example: "0.00000000"
 *         crossWalletBalance:
 *           type: string
 *           description: 全仓钱包余额
 *           example: "1005.25000000"
 *         crossUnPnl:
 *           type: string
 *           description: 全仓未实现盈亏
 *           example: "5.25000000"
 *         availableBalance:
 *           type: string
 *           description: 可用余额
 *           example: "1005.25000000"
 *         maxWithdrawAmount:
 *           type: string
 *           description: 最大可提现金额
 *           example: "1000.00000000"
 *         marginFree:
 *           type: string
 *           description: 可用保证金
 *           example: "1005.25000000"
 *         marginUsed:
 *           type: string
 *           description: 已用保证金
 *           example: "0.00000000"
 *         updateTime:
 *           type: integer
 *           description: 更新时间
 *           example: 1672531200000
 *     AccountPosition:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *           example: "BTCUSDT"
 *         positionAmt:
 *           type: string
 *           description: 持仓数量
 *           example: "0.001"
 *         entryPrice:
 *           type: string
 *           description: 开仓价格
 *           example: "16500.00"
 *         markPrice:
 *           type: string
 *           description: 标记价格
 *           example: "16550.00"
 *         unRealizedProfit:
 *           type: string
 *           description: 未实现盈亏
 *           example: "0.05000000"
 *         liquidationPrice:
 *           type: string
 *           description: 强平价格
 *           example: "0.00000000"
 *         leverage:
 *           type: string
 *           description: 杠杆倍数
 *           example: "10"
 *         maxNotionalValue:
 *           type: string
 *           description: 当前杠杆下用户可用的最大名义价值
 *           example: "2000000.00000000"
 *         marginType:
 *           type: string
 *           description: 保证金模式
 *           example: "isolated"
 *         isolatedMargin:
 *           type: string
 *           description: 逐仓保证金
 *           example: "0.00000000"
 *         isAutoAddMargin:
 *           type: string
 *           description: 是否自动追加保证金
 *           example: "false"
 *         positionSide:
 *           type: string
 *           description: 持仓方向
 *           example: "BOTH"
 *         notional:
 *           type: string
 *           description: 名义价值
 *           example: "16.55000000"
 *         isolatedWallet:
 *           type: string
 *           description: 逐仓钱包余额
 *           example: "0.00000000"
 *         updateTime:
 *           type: integer
 *           description: 更新时间
 *           example: 1672531200000
 *     SpotBalance:
 *       type: object
 *       properties:
 *         asset:
 *           type: string
 *           description: 资产名称
 *           example: "BTC"
 *         free:
 *           type: string
 *           description: 可用余额
 *           example: "0.05000000"
 *         locked:
 *           type: string
 *           description: 冻结余额
 *           example: "0.00000000"
 *     AccountResponse:
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
 *           example: "获取账户信息成功"
 *         data:
 *           type: object
 *           description: 账户信息数据
 */


/**
 * @openapi
 * /v1/binance-account/usdm-futures:
 *  get:
 *     tags: [BinanceAccount]
 *     summary: 获取U本位合约账户信息
 *     description: |
 *       获取币安U本位合约账户的详细信息，包括资产余额、持仓信息、保证金状态等。
 *       此接口需要VIP权限验证，返回完整的合约账户状态信息，可用于资产管理、
 *       风险控制和持仓监控。
 *
 *       **主要返回信息：**
 *       - 账户基本信息：手续费等级、交易权限等
 *       - 资金信息：总余额、可用余额、未实现盈亏等
 *       - 持仓详情：各交易对的持仓数量、盈亏、强平价格等
 *       - 保证金信息：初始保证金、维持保证金、保证金模式等
 *     parameters:
 *       - in: query
 *         name: api_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Key
 *         example: "your_binance_api_key"
 *       - in: query
 *         name: secret_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Secret
 *         example: "your_binance_api_secret"
 *       - in: query
 *         name: includePositions
 *         schema:
 *           type: string
 *           enum: [true, false, "true", "false", "1", "0", "yes", "no", "on", "off"]
 *         required: false
 *         description: 是否包含持仓信息数据，默认为true。设置为false可以显著减少内存占用和响应数据大小
 *         example: "true"
 *     responses:
 *       200:
 *         description: 成功获取U本位合约账户信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AccountResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         feeTier:
 *                           type: integer
 *                           description: 手续费等级
 *                           example: 2
 *                         canTrade:
 *                           type: boolean
 *                           description: 是否可以交易
 *                           example: true
 *                         canDeposit:
 *                           type: boolean
 *                           description: 是否可以充值
 *                           example: true
 *                         canWithdraw:
 *                           type: boolean
 *                           description: 是否可以提现
 *                           example: true
 *                         updateTime:
 *                           type: integer
 *                           description: 更新时间
 *                           example: 1672531200000
 *                         totalInitialMargin:
 *                           type: string
 *                           description: 总初始保证金
 *                           example: "100.00000000"
 *                         totalMaintMargin:
 *                           type: string
 *                           description: 总维持保证金
 *                           example: "50.00000000"
 *                         totalWalletBalance:
 *                           type: string
 *                           description: 总钱包余额
 *                           example: "1500.00000000"
 *                         totalUnrealizedProfit:
 *                           type: string
 *                           description: 总未实现盈亏
 *                           example: "25.50000000"
 *                         totalMarginBalance:
 *                           type: string
 *                           description: 总保证金余额
 *                           example: "1525.50000000"
 *                         availableBalance:
 *                           type: string
 *                           description: 可用余额
 *                           example: "1400.00000000"
 *                         maxWithdrawAmount:
 *                           type: string
 *                           description: 最大可提现金额
 *                           example: "1400.00000000"
 *                         assets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AccountAsset'
 *                           description: 资产详情
 *                         positions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AccountPosition'
 *                           description: 持仓详情
 *       400:
 *         description: 请求参数错误
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
 *                   example: "缺少必要的API凭证参数"
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */


/**
 * @openapi
 * /v1/binance-account/spot:
 *  get:
 *     tags: [BinanceAccount]
 *     summary: 获取现货账户信息
 *     description: |
 *       获取币安现货账户的详细信息，包括各币种余额、交易权限、账户状态等。
 *       此接口需要VIP权限验证，返回完整的现货账户状态信息，可用于资产管理、
 *       余额监控和交易权限检查。
 *
 *       **主要返回信息：**
 *       - 账户基本信息：手续费等级、交易权限、账户类型等
 *       - 资产余额：各币种的可用余额和冻结余额
 *       - 权限信息：支持的操作权限
 *     parameters:
 *       - in: query
 *         name: api_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Key
 *         example: "your_binance_api_key"
 *       - in: query
 *         name: secret_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Secret
 *         example: "your_binance_api_secret"
 *       - in: query
 *         name: includeEmptyBalances
 *         schema:
 *           type: string
 *           enum: [true, false, "true", "false", "1", "0", "yes", "no", "on", "off"]
 *         required: false
 *         description: 是否包含空余额币种，默认为true。设置为false只返回有余额的币种，可以显著减少内存占用
 *         example: "true"
 *     responses:
 *       200:
 *         description: 成功获取现货账户信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AccountResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         makerCommission:
 *                           type: integer
 *                           description: Maker手续费率
 *                           example: 15
 *                         takerCommission:
 *                           type: integer
 *                           description: Taker手续费率
 *                           example: 15
 *                         buyerCommission:
 *                           type: integer
 *                           description: 买方手续费率
 *                           example: 0
 *                         sellerCommission:
 *                           type: integer
 *                           description: 卖方手续费率
 *                           example: 0
 *                         canTrade:
 *                           type: boolean
 *                           description: 是否可以交易
 *                           example: true
 *                         canWithdraw:
 *                           type: boolean
 *                           description: 是否可以提现
 *                           example: true
 *                         canDeposit:
 *                           type: boolean
 *                           description: 是否可以充值
 *                           example: true
 *                         updateTime:
 *                           type: integer
 *                           description: 更新时间
 *                           example: 1672531200000
 *                         accountType:
 *                           type: string
 *                           description: 账户类型
 *                           example: "SPOT"
 *                         balances:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SpotBalance'
 *                           description: 资产余额详情
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 权限列表
 *                           example: ["SPOT"]
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */


/**
 * @openapi
 * /v1/binance-account/coinm-futures:
 *  get:
 *     tags: [BinanceAccount]
 *     summary: 获取币本位合约账户信息
 *     description: |
 *       获取币安币本位合约账户的详细信息，包括各币种保证金余额、持仓信息、账户状态等。
 *       此接口需要VIP权限验证，返回完整的币本位合约账户状态信息，可用于资产管理、
 *       风险控制和持仓监控。
 *
 *       **主要返回信息：**
 *       - 账户基本信息：手续费等级、交易权限等
 *       - 资金信息：各币种的保证金余额、未实现盈亏等
 *       - 持仓详情：各币本位合约的持仓状态、盈亏情况等
 *       - 保证金信息：保证金模式、维持保证金等
 *     parameters:
 *       - in: query
 *         name: api_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Key
 *         example: "your_binance_api_key"
 *       - in: query
 *         name: secret_key
 *         schema:
 *           type: string
 *         required: true
 *         description: 币安API Secret
 *         example: "your_binance_api_secret"
 *       - in: query
 *         name: includePositions
 *         schema:
 *           type: string
 *           enum: [true, false, "true", "false", "1", "0", "yes", "no", "on", "off"]
 *         required: false
 *         description: 是否包含持仓信息数据，默认为true。设置为false可以显著减少内存占用和响应数据大小
 *         example: "true"
 *     responses:
 *       200:
 *         description: 成功获取币本位合约账户信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AccountResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         feeTier:
 *                           type: integer
 *                           description: 手续费等级
 *                           example: 2
 *                         canTrade:
 *                           type: boolean
 *                           description: 是否可以交易
 *                           example: true
 *                         canDeposit:
 *                           type: boolean
 *                           description: 是否可以充值
 *                           example: true
 *                         canWithdraw:
 *                           type: boolean
 *                           description: 是否可以提现
 *                           example: true
 *                         updateTime:
 *                           type: integer
 *                           description: 更新时间
 *                           example: 1672531200000
 *                         totalInitialMargin:
 *                           type: string
 *                           description: 总初始保证金
 *                           example: "0.50000000"
 *                         totalMaintMargin:
 *                           type: string
 *                           description: 总维持保证金
 *                           example: "0.25000000"
 *                         totalWalletBalance:
 *                           type: string
 *                           description: 总钱包余额
 *                           example: "10.50000000"
 *                         totalUnrealizedProfit:
 *                           type: string
 *                           description: 总未实现盈亏
 *                           example: "0.15000000"
 *                         totalMarginBalance:
 *                           type: string
 *                           description: 总保证金余额
 *                           example: "10.65000000"
 *                         availableBalance:
 *                           type: string
 *                           description: 可用余额
 *                           example: "10.15000000"
 *                         maxWithdrawAmount:
 *                           type: string
 *                           description: 最大可提现金额
 *                           example: "10.15000000"
 *                         assets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AccountAsset'
 *                           description: 资产详情
 *                         positions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AccountPosition'
 *                           description: 持仓详情
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
 */


/**
 * @swagger
 * /v1/binance-account/set-leverage:
 *   post:
 *     tags:
 *       - BinanceAccount
 *     summary: 设置U本位合约杠杆倍数（支持批量）
 *     description: |
 *       调整U本位合约交易对的杠杆倍数，支持单个或多个交易对。
 *
 *       注意事项：
 *       - 杠杆倍数范围：1-125倍
 *       - 调整杠杆会立即影响该交易对的所有持仓
 *       - 请确保了解杠杆交易的风险
 *       - API会自动添加延迟以防止触发频率限制
 *       - 所有凭证和参数都通过请求体传递
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *               - apiSecret
 *               - leverageList
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: 币安API密钥
 *                 example: "your-api-key-here"
 *               apiSecret:
 *                 type: string
 *                 description: 币安API密钥对应的Secret
 *                 example: "your-api-secret-here"
 *               leverageList:
 *                 type: array
 *                 description: 杠杆设置列表
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   $ref: "#/components/schemas/LeverageSetting"
 *                 example:
 *                   - symbol: "BTCUSDT"
 *                     leverage: 20
 *                   - symbol: "ETHUSDT"
 *                     leverage: 15
 *                   - symbol: "ADAUSDT"
 *                     leverage: 10
 *               delay:
 *                 type: integer
 *                 description: 每次请求之间的延迟（毫秒）
 *                 minimum: 0
 *                 maximum: 5000
 *                 default: 100
 *                 example: 200
 *     responses:
 *       200:
 *         description: 批量设置杠杆成功
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
 *                 message:
 *                   type: string
 *                   example: "批量设置杠杆完成：成功 3 个，失败 0 个"
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       description: 每个交易对的设置结果
 *                       items:
 *                         $ref: "#/components/schemas/LeverageResult"
 *                       example:
 *                         - symbol: "BTCUSDT"
 *                           leverage: 20
 *                           success: true
 *                           result:
 *                             leverage: 20
 *                             maxNotionalValue: "9000000"
 *                             symbol: "BTCUSDT"
 *                           message: "成功设置 BTCUSDT 杠杆为 20x"
 *                         - symbol: "ETHUSDT"
 *                           leverage: 15
 *                           success: false
 *                           error: "Invalid symbol"
 *                           message: "设置 ETHUSDT 杠杆失败: Invalid symbol"
 *                     summary:
 *                       $ref: "#/components/schemas/LeverageSummary"
 *       400:
 *         description: 请求参数错误
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
 *                   example: "leverageList 必须是一个数组，格式为 [{symbol: \"BTCUSDT\", leverage: 20}]"
 *       401:
 *         description: 未授权访问
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
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: "缺少API凭证"
 *       403:
 *         description: 非VIP用户无法使用
 *       500:
 *         description: 服务器内部错误
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
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "批量设置杠杆失败"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LeverageSetting:
 *       type: object
 *       required:
 *         - symbol
 *         - leverage
 *       properties:
 *         symbol:
 *           type: string
 *           description: 交易对符号（仅限U本位合约）
 *           pattern: "^[A-Z0-9]+USDT$"
 *           example: "BTCUSDT"
 *         leverage:
 *           type: integer
 *           description: 杠杆倍数
 *           minimum: 1
 *           maximum: 125
 *           example: 20
 *
 *     LeverageResult:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           description: 交易对符号
 *           example: "BTCUSDT"
 *         leverage:
 *           type: integer
 *           description: 设置的杠杆倍数
 *           example: 20
 *         success:
 *           type: boolean
 *           description: 是否设置成功
 *           example: true
 *         result:
 *           type: object
 *           description: 币安API返回的原始结果（仅成功时存在）
 *           properties:
 *             leverage:
 *               type: integer
 *               example: 20
 *             maxNotionalValue:
 *               type: string
 *               description: 最大名义价值
 *               example: "9000000"
 *             symbol:
 *               type: string
 *               example: "BTCUSDT"
 *         error:
 *           type: string
 *           description: 错误信息（仅失败时存在）
 *           example: "Invalid symbol"
 *         message:
 *           type: string
 *           description: 结果描述
 *           example: "成功设置 BTCUSDT 杠杆为 20x"
 *
 *     LeverageSummary:
 *       type: object
 *       description: 批量设置结果统计
 *       properties:
 *         total:
 *           type: integer
 *           description: 总交易对数量
 *           example: 3
 *         success:
 *           type: integer
 *           description: 成功设置的数量
 *           example: 2
 *         failed:
 *           type: integer
 *           description: 设置失败的数量
 *           example: 1
 *         successRate:
 *           type: string
 *           description: 成功率
 *           example: "66.67%"
 *
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 *       description: 币安API密钥
 *     ApiSecretAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Secret
 *       description: 币安API密钥对应的Secret
 */
