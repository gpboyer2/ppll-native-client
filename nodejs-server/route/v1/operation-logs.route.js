/**
 * 操作日志路由
 * 基于表 operation_logs，提供查询、详情、写入与批量写入接口
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controller/operation-logs.controller.js');

// 写入操作日志
router.post('/create', controller.create);

// 批量写入操作日志
router.post('/batch-create', controller.batchCreate);

// 分页查询操作日志
router.get('/query', controller.list);

// 获取操作日志详情
router.get('/detail', controller.detail);

// 删除操作日志
router.post('/delete', controller.remove);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: OperationLogs
 *   description: 操作日志审计接口
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     OperationLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           example: 1001
 *           description: 主键ID
 *         operator:
 *           type: string
 *           example: "张三"
 *           description: 操作人员（用户名或显示名）
 *         module:
 *           type: string
 *           example: "settings"
 *           description: 所属模块（从页面路径或扩展数据推断）
 *         action:
 *           type: string
 *           example: "update_profile"
 *           description: 操作类型
 *         summary:
 *           type: string
 *           example: "修改头像"
 *           description: 操作概要
 *         description:
 *           type: string
 *           example: "修改头像"
 *           description: 操作描述
 *         page:
 *           type: string
 *           example: "/settings/profile"
 *           description: 所在页面
 *         ip_address:
 *           type: string
 *           example: "192.168.1.100"
 *           description: IP地址
 *         location:
 *           type: string
 *           example: "Shanghai, CN"
 *           description: 操作地点
 *         os:
 *           type: string
 *           example: "macOS"
 *           description: 操作系统
 *         browser:
 *           type: string
 *           example: "Chrome"
 *           description: 浏览器类型
 *         user_agent:
 *           type: string
 *           example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ..."
 *           description: 设备/浏览器信息
 *         extra_data:
 *           type: object
 *           description: 扩展信息（已对常见敏感字段脱敏）
 *         status:
 *           type: integer
 *           example: 1
 *           description: 操作状态(0:失败,1:成功)
 *         operation_time:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 操作时间
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 记录时间
 *         time:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 展示时间（服务端兼容字段，等同于 operation_time）
 */

/**
 * @openapi
 * /v1/operation-logs/query:
 *   get:
 *     tags: [OperationLogs]
 *     summary: 分页查询操作日志
 *     description: 支持按用户、模块、操作人员、动作、描述、页面、IP、状态、时间范围过滤；注意页面路径过滤参数名为 page_path
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
 *         name: module
 *         schema:
 *           type: string
 *         description: 所属模块
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型（模糊匹配）
 *       - in: query
 *         name: description
 *         schema:
 *           type: string
 *         description: 操作描述（模糊匹配）
 *       - in: query
 *         name: operator
 *         schema:
 *           type: string
 *         description: 操作人员（模糊匹配）
 *       - in: query
 *         name: page_path
 *         schema:
 *           type: string
 *         description: 页面路径（模糊匹配）
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *         description: IP地址（模糊匹配）
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0,1]
 *         description: 操作状态(0:失败,1:成功)
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 操作时间开始范围（operation_time）
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 操作时间结束范围（operation_time）
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
 *         description: 成功返回操作日志列表
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
 *                         $ref: '#/components/schemas/OperationLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 */

/**
 * @openapi
 * /v1/operation-logs/detail:
 *   get:
 *     tags: [OperationLogs]
 *     summary: 获取操作日志详情
 *     description: 根据ID获取操作日志详情
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
 *         description: 成功返回操作日志详情
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
 *                   $ref: '#/components/schemas/OperationLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 */

/**
 * @openapi
 * /v1/operation-logs/create:
 *   post:
 *     tags: [OperationLogs]
 *     summary: 新增操作日志
 *     description: 记录单条用户操作日志（单用户系统）。服务端自动补全 operator、IP 与 User-Agent；扩展字段会对常见敏感键脱敏。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: 操作类型（必填）
 *               description:
 *                 type: string
 *                 description: 操作描述
 *               summary:
 *                 type: string
 *                 description: 操作概要（不传则后端用 description 或 action 推断）
 *               page:
 *                 type: string
 *                 description: 页面路径
 *               extra_data:
 *                 type: object
 *                 description: 扩展信息（敏感字段会脱敏）
 *               module:
 *                 type: string
 *                 description: 所属模块（不传则后端根据 page 推断）
 *               status:
 *                 type: integer
 *                 enum: [0,1]
 *                 description: 操作状态(0:失败,1:成功)。不传则由后端根据错误信息推断
 *               operation_time:
 *                 type: string
 *                 format: date-time
 *                 description: 操作发生的时间（不传则为当前时间）
 *     responses:
 *       201:
 *         description: 成功写入
 */

/**
 * @openapi
 * /v1/operation-logs/batch-create:
 *   post:
 *     tags: [OperationLogs]
 *     summary: 批量新增操作日志
 *     description: 批量记录用户操作日志（需要登录）。扩展字段会对常见敏感键脱敏。
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
 *                   properties:
 *                     action:
 *                       type: string
 *                     description:
 *                       type: string
 *                     summary:
 *                       type: string
 *                     page:
 *                       type: string
 *                     module:
 *                       type: string
 *                     extra_data:
 *                       type: object
 *                     status:
 *                       type: integer
 *                       enum: [0,1]
 *                     operation_time:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       201:
 *         description: 成功写入
 */

/**
 * @openapi
 * /v1/operation-logs/delete:
 *   post:
 *     tags: [OperationLogs]
 *     summary: 删除操作日志
 *     description: 按ID删除日志（仅管理员）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 format: int64
 *                 description: 日志ID
 *             required:
 *               - id
 *     responses:
 *       200:
 *         description: 成功删除
 */