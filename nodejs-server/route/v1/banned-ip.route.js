/**
 * IP封禁管理路由模块
 * 定义IP地址封禁和解封相关的API路由
 */
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const bannedIpController = require('../../controller/banned-ip.controller.js');
const validateMiddleware = require('../../middleware/validate');
const Joi = require('joi');

/**
 * 定义验证规则
 */
const banIPSchema = {
  body: Joi.object({
    ip: Joi.string().ip().required(),
    reason: Joi.string().max(500).required(),
    remark: Joi.string().max(255).optional(),
    duration: Joi.number().min(1).max(720).default(24)
  })
};

const batchUnbanSchema = {
  body: Joi.object({
    ips: Joi.array().items(Joi.string().ip()).min(1).required()
  })
};

const trustedIPSchema = {
  body: Joi.object({
    ip: Joi.string().ip().required()
  })
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.number().integer().valid(0, 1).optional()
  })
};

const ipQuerySchema = {
  query: Joi.object({
    ip: Joi.string().ip().required()
  })
};

/**
 * 保护所有路由，要求管理员权限
 */
router.use(auth(['admin', 'super_admin']));

/**
 * 获取被封禁IP列表:
 * /v1/banned-ips
 */
router.get('/', validateMiddleware(listSchema), bannedIpController.getBannedIps);

/**
 * 封禁IP地址:
 * /v1/banned-ips
 */
router.post('/', validateMiddleware(banIPSchema), bannedIpController.banIP);

/**
 * 解封IP地址:
 * /v1/banned-ips/unban
 */
router.delete('/unban', validateMiddleware(ipQuerySchema), bannedIpController.unbanIp);

/**
 * 获取IP封禁详情:
 * /v1/banned-ips/detail
 */
router.get('/detail', validateMiddleware(ipQuerySchema), bannedIpController.getIPBanDetail);

/**
 * 批量解封IP地址:
 * /v1/banned-ips/batch-unban
 */
router.post('/batch-unban', validateMiddleware(batchUnbanSchema), bannedIpController.batchUnbanIP);

/**
 * 清理过期封禁记录:
 * /v1/banned-ips/cleanup
 */
router.post('/cleanup', bannedIpController.cleanupExpiredBans);

/**
 * 内存紧急清理:
 * /v1/banned-ips/memory/cleanup
 */
router.post('/memory/cleanup', bannedIpController.executeEmergencyCleanup);

/**
 * 获取可信IP列表:
 * /v1/banned-ips/trusted-ips
 */
router.get('/trusted-ips', bannedIpController.getTrustedIPs);

/**
 * 添加可信IP地址:
 * /v1/banned-ips/trusted-ips
 */
router.post('/trusted-ips', validateMiddleware(trustedIPSchema), bannedIpController.addTrustedIPAddress);

/**
 * 移除可信IP地址:
 * /v1/banned-ips/trusted-ips/remove
 */
router.delete('/trusted-ips/remove', validateMiddleware(ipQuerySchema), bannedIpController.removeTrustedIPAddress);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: BannedIP
 *   description: IP封禁管理 - 提供IP地址的封禁和解封功能，用于系统安全防护和访问控制管理
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BannedIP:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 封禁记录唯一标识
 *           example: 1001
 *         ip:
 *           type: string
 *           description: 被封禁的IP地址
 *           example: "192.168.1.100"
 *         reason:
 *           type: string
 *           description: 封禁原因
 *           example: "频繁恶意请求"
 *         bannedAt:
 *           type: string
 *           format: date-time
 *           description: 封禁时间
 *           example: "2024-01-15T10:30:00Z"
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: 过期时间
 *           example: "2124-01-15T10:30:00Z"
 *         createdBy:
 *           type: integer
 *           description: 创建者用户ID
 *           example: 1
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 状态(0:已解除,1:生效中)
 *           example: 1
 *         remark:
 *           type: string
 *           description: 备注
 *           example: "系统自动封禁"
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
 * @swagger
 * /v1/banned-ips:
 *   get:
 *     tags: [BannedIP]
 *     summary: 获取被封禁IP列表
 *     description: 获取所有仍在生效中的被封禁IP地址列表，按封禁时间倒序排列
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取被封禁IP列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BannedIP'
 *             example:
 *               - id: 1001
 *                 ip: "192.168.1.100"
 *                 reason: "频繁恶意请求"
 *                 bannedAt: "2024-01-15T10:30:00Z"
 *                 expiresAt: "2124-01-15T10:30:00Z"
 *                 createdBy: 1
 *                 status: 1
 *                 remark: "系统自动封禁"
 *                 created_at: "2024-01-15T10:30:00Z"
 *                 updated_at: "2024-01-15T10:30:00Z"
 *               - id: 1002
 *                 ip: "10.0.0.50"
 *                 reason: "恶意攻击"
 *                 bannedAt: "2024-01-14T15:20:00Z"
 *                 expiresAt: "2124-01-14T15:20:00Z"
 *                 createdBy: 1
 *                 status: 1
 *                 remark: "手动封禁"
 *                 created_at: "2024-01-14T15:20:00Z"
 *                 updated_at: "2024-01-14T15:20:00Z"
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 401
 *               message: "请先登录"
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 403
 *               message: "权限不足，需要管理员权限"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 500
 *               message: "服务器内部错误"
 */

/**
 * @swagger
 * /v1/banned-ips/unban:
 *   delete:
 *     tags: [BannedIP]
 *     summary: 解封IP地址
 *     description: 将指定的IP地址从封禁列表中移除，恢复其正常访问权限
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         description: 要解封的IP地址
 *         schema:
 *           type: string
 *           pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
 *         example: "192.168.1.100"
 *     responses:
 *       204:
 *         description: 成功解封IP地址，无返回内容
 *       400:
 *         description: 请求参数无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 400
 *               message: "IP地址格式无效"
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 401
 *               message: "请先登录"
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 403
 *               message: "权限不足，需要管理员权限"
 *       404:
 *         description: 该IP未被封禁或记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 404
 *               message: "该IP未被封禁或记录不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 500
 *               message: "服务器内部错误"
 */

/**
 * @swagger
 * /v1/banned-ips/detail:
 *   get:
 *     tags: [BannedIP]
 *     summary: 获取IP封禁详情
 *     description: 获取指定IP地址的封禁详情信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         description: 要查询的IP地址
 *         schema:
 *           type: string
 *           pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
 *         example: "192.168.1.100"
 *     responses:
 *       200:
 *         description: 成功获取IP封禁详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BannedIP'
 *             example:
 *               id: 1001
 *               ip: "192.168.1.100"
 *               reason: "频繁恶意请求"
 *               bannedAt: "2024-01-15T10:30:00Z"
 *               expiresAt: "2124-01-15T10:30:00Z"
 *               createdBy: 1
 *               status: 1
 *               remark: "系统自动封禁"
 *               created_at: "2024-01-15T10:30:00Z"
 *               updated_at: "2024-01-15T10:30:00Z"
 *       400:
 *         description: 请求参数无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               code: 400
 *               message: "IP地址格式无效"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 该IP记录不存在
 *       500:
 *         description: 服务器内部错误
 */

/**
 * @swagger
 * /v1/banned-ips/trusted-ips/remove:
 *   delete:
 *     tags: [BannedIP]
 *     summary: 移除可信IP
 *     description: 从可信IP白名单中移除指定的IP地址
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ip
 *         required: true
 *         description: 要移除的可信IP地址
 *         schema:
 *           type: string
 *           pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
 *         example: "192.168.1.100"
 *     responses:
 *       204:
 *         description: 成功移除可信IP，无返回内容
 *       400:
 *         description: 请求参数无效
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 该IP不在可信列表中
 *       500:
 *         description: 服务器内部错误
 */
