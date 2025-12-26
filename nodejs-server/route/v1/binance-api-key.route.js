/**
 * Binance ApiKey 路由模块
 * 定义 Binance ApiKey 管理相关的 API 路由，提供增删改查功能
 */
const express = require('express');
const router = express.Router();
const binanceApiKeyController = require('../../controller/binance-api-key.controller.js');
const auth = require("../../middleware/auth");
const validate = require('../../middleware/validate');
const binanceApiKeyValidation = require('../../validations/binance-api-key.validation');

/**
 * 创建 ApiKey
 * POST /v1/binance-api-key/create
 */
router.post('/create', binanceApiKeyController.createApiKey);

/**
 * 删除 ApiKey
 * POST /v1/binance-api-key/delete
 */
router.post('/delete', auth(), validate(binanceApiKeyValidation.deleteApiKey), binanceApiKeyController.deleteApiKey);

/**
 * 更新 ApiKey
 * POST /v1/binance-api-key/update
 */
router.post('/update', auth(), validate(binanceApiKeyValidation.updateApiKey), binanceApiKeyController.updateApiKey);

/**
 * 查询 ApiKey 列表
 * GET /v1/binance-api-key/query
 */
router.get('/query', auth(), validate(binanceApiKeyValidation.getApiKeys), binanceApiKeyController.queryApiKey);

module.exports = router;

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: 使用JWT Token进行身份验证
 *
 * tags:
 *   name: BinanceApiKey
 *   description: Binance ApiKey 管理
 */

/**
 * @openapi
 * /v1/binance-api-key/create:
 *   post:
 *     summary: 创建 ApiKey
 *     description: 创建新的 Binance ApiKey 配置，需要登录验证
 *     tags: [BinanceApiKey]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - apiKey
 *               - secretKey
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 64
 *                 description: API Key 名称
 *                 example: "主账户"
 *               apiKey:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 description: Binance API Key
 *                 example: "abcd1234efgh5678"
 *               secretKey:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 description: Binance Secret Key
 *                 example: "xyz789abc456def123"
 *               status:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 default: 2
 *                 description: 状态(1:未知,2:启用,3:禁用)
 *                 example: 2
 *               remark:
 *                 type: string
 *                 maxLength: 255
 *                 description: 备注信息
 *                 example: "用于现货交易"
 *     responses:
 *       200:
 *         description: ApiKey 创建成功
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
 *                   description: 创建的 ApiKey 信息
 *       400:
 *         description: 创建失败，参数错误或已存在
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
 *                   example: "该 API Key 已存在"
 */

/**
 * @openapi
 * /v1/binance-api-key/delete:
 *   post:
 *     summary: 删除 ApiKey
 *     description: 根据 ID 删除指定的 Binance ApiKey，需要登录验证
 *     tags: [BinanceApiKey]
 *     security:
 *       - bearerAuth: []
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
 *                 description: ApiKey ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                   description: 删除的 ApiKey 信息
 *       400:
 *         description: 删除失败，ApiKey 不存在或无权操作
 */

/**
 * @openapi
 * /v1/binance-api-key/update:
 *   post:
 *     summary: 更新 ApiKey
 *     description: 根据 ID 更新 Binance ApiKey 信息，需要登录验证
 *     tags: [BinanceApiKey]
 *     security:
 *       - bearerAuth: []
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
 *                 description: ApiKey ID
 *                 example: 1
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 64
 *                 description: API Key 名称
 *                 example: "主账户（已更新）"
 *               apiKey:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 description: Binance API Key
 *                 example: "new_api_key_12345"
 *               secretKey:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 description: Binance Secret Key
 *                 example: "new_secret_key_67890"
 *               status:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 description: 状态(1:未知,2:启用,3:禁用)
 *                 example: 2
 *               remark:
 *                 type: string
 *                 maxLength: 255
 *                 description: 备注信息
 *                 example: "用于现货和合约交易"
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   description: 更新后的 ApiKey 信息
 *       400:
 *         description: 更新失败，ApiKey 不存在或无权操作
 */

/**
 * @openapi
 * /v1/binance-api-key/query:
 *   get:
 *     summary: 查询 ApiKey 列表
 *     description: 获取当前用户的 Binance ApiKey 列表，支持分页和多条件筛选，需要登录验证
 *     tags: [BinanceApiKey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: ApiKey ID（单个）
 *         example: 1
 *       - in: query
 *         name: ids
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: 多个 ApiKey ID，支持数组或逗号分隔字符串，例如 ids=1,2,3
 *         example: [1,2,3]
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 名称模糊匹配
 *         example: "主账户"
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: 状态(1:未知,2:启用,3:禁用)
 *         example: 2
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 每页显示数量
 *         example: 10
 *       - in: query
 *         name: currentPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 当前页码
 *         example: 1
 *     responses:
 *       200:
 *         description: 查询成功
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
 *                     list:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           user_id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "主账户"
 *                           api_key:
 *                             type: string
 *                             example: "abcd1234efgh5678"
 *                           secret_key:
 *                             type: string
 *                             example: "xyz789abc456def123"
 *                           status:
 *                             type: integer
 *                             example: 2
 *                           remark:
 *                             type: string
 *                             example: "用于现货交易"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 100
 *                     pageSize:
 *                       type: integer
 *                       description: 每页显示数量
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 *       401:
 *         description: 用户未登录
 */
