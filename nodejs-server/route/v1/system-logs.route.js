/**
 * 系统日志路由
 * 提供系统日志（system_logs）的查询、详情、写入与批量写入接口
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controller/system-logs.controller.js');

// 写入接口
router.post('/create', controller.create);
router.post('/batch-create', controller.batchCreate);

// 查询与详情
router.get('/query', controller.list);
router.get('/detail', controller.detail);

// 删除
router.post('/delete', controller.remove);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: SystemLogs
 *   description: 系统日志接口（系统操作与异常审计）
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     SystemLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           example: 1001
 *           description: 主键ID
 *         api_endpoint:
 *           type: string
 *           example: "/api/v1/orders/create"
 *           description: 接口地址
 *         http_method:
 *           type: string
 *           example: "POST"
 *           description: HTTP 方法
 *         status_code:
 *           type: integer
 *           example: 500
 *           description: HTTP 状态码
 *         error_code:
 *           type: string
 *           example: "BINANCE-1001"
 *           description: 错误码
 *         error_message:
 *           type: string
 *           example: "下单失败: 精度不匹配"
 *           description: 错误信息
 *         request_data:
 *           type: string
 *           example: '{"symbol":"BTCUSDT","quantity":"0.1"}'
 *           description: 请求内容（字符串，可能为JSON）
 *         response_data:
 *           type: string
 *           example: '{"code":-1013,"msg":"Invalid quantity"}'
 *           description: 响应内容（字符串，可能为JSON）
 *         ip_address:
 *           type: string
 *           example: "192.168.1.100"
 *           description: IP地址
 *         user_agent:
 *           type: string
 *           example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ..."
 *           description: 设备/浏览器信息
 *         extra_data:
 *           type: object
 *           example: {"exchange":"binance","env":"prod"}
 *           description: 扩展信息（已对常见敏感键脱敏）
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         module:
 *           type: string
 *           example: "orders"
 *           description: 所属模块（从接口路径或扩展信息推断）
 *         endpoint:
 *           type: string
 *           example: "/api/v1/orders/create"
 *           description: 请求接口
 *         method:
 *           type: string
 *           example: "POST"
 *           description: 请求方法
 *         ip:
 *           type: string
 *           example: "192.168.1.100"
 *           description: IP 地址
 *         location:
 *           type: string
 *           example: "Shanghai, CN"
 *           description: 地点（可来自扩展信息）
 *         os:
 *           type: string
 *           example: "macOS"
 *           description: 操作系统（从 User-Agent 推断）
 *         browser:
 *           type: string
 *           example: "Chrome"
 *           description: 浏览器类型（从 User-Agent 推断）
 *         duration:
 *           type: integer
 *           example: 123
 *           description: 请求耗时（毫秒，来自扩展信息或起止时间推断）
 *         time:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 请求时间（等于 created_at 或外部传入 request_time）
 *         operation:
 *           type: string
 *           example: "POST /v1/orders/create"
 *           description: 操作（来自扩展信息 operation 或由方法+接口拼装）
 */

/**
 * @openapi
 * /api/v1/system-logs/query:
 *   get:
 *     tags: [SystemLogs]
 *     summary: 分页查询系统错误日志
 *     description: 支持按用户、接口、HTTP方法、状态码、错误码、IP 与时间范围过滤
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *           format: int64
 *         description: 日志ID（单个）
 *       - in: query
 *         name: ids
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *             format: int64
 *         style: form
 *         explode: false
 *         description: 多个日志ID，支持数组或逗号分隔字符串，例如 ids=1,2,3
 *       - in: query
 *         name: api_endpoint
 *         schema:
 *           type: string
 *         description: 接口地址（模糊匹配）
 *       - in: query
 *         name: http_method
 *         schema:
 *           type: string
 *         description: HTTP 方法
 *       - in: query
 *         name: status_code
 *         schema:
 *           type: integer
 *         description: HTTP 状态码
 *       - in: query
 *         name: error_code
 *         schema:
 *           type: string
 *         description: 错误码（模糊匹配）
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *         description: IP地址（模糊匹配）
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建时间开始范围
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 创建时间结束范围
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 20
 *         description: 每页条数
 *     responses:
 *       200:
 *         description: 成功返回系统错误日志列表
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
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     list:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiErrorLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 */

/**
 * @openapi
 * /api/v1/system-logs/detail:
 *   get:
 *     tags: [SystemLogs]
 *     summary: 获取系统错误日志详情
 *     description: 根据ID获取系统错误日志详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: 日志ID
 *     responses:
 *       200:
 *         description: 成功返回系统错误日志详情
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
 *                   $ref: '#/components/schemas/ApiErrorLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 */

/**
 * @openapi
 * /api/v1/system-logs/create:
 *   post:
 *     tags: [SystemLogs]
 *     summary: 新增系统错误日志
 *     description: 记录单条系统错误日志。建议仅管理员可调用；扩展字段会对常见敏感键脱敏。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [api_endpoint]
 *             properties:
 *               api_endpoint:
 *                 type: string
 *               http_method:
 *                 type: string
 *               status_code:
 *                 type: integer
 *               error_code:
 *                 type: string
 *               error_message:
 *                 type: string
 *               request_data:
 *                 type: string
 *               response_data:
 *                 type: string
 *               extra_data:
 *                 type: object
 *               request_time:
 *                 type: string
 *                 format: date-time
 *                 description: 请求时间（可选，未提供则使用服务器时间）
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @openapi
 * /api/v1/system-logs/batch-create:
 *   post:
 *     tags: [SystemLogs]
 *     summary: 批量新增系统错误日志
 *     description: 批量写入系统错误日志，需管理员权限。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @openapi
 * /api/v1/system-logs/delete:
 *   post:
 *     tags: [SystemLogs]
 *     summary: 删除系统错误日志
 *     description: 按 ID 删除指定记录，需管理员权限。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: integer
 *                 format: int64
 *     responses:
 *       200:
 *         description: 删除成功
 */
