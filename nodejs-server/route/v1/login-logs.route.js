/**
 * 登录日志路由
 * 提供登录日志的查询与（可选）写入接口
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const controller = require('../../controller/login-logs.controller.js');

// 新增登录日志
router.post('/create', controller.create);

// 更新登录日志
router.post('/update', controller.update);

// 分页查询登录日志（支持按用户、IP、状态、时间范围过滤）
router.get('/query', controller.list);

// 获取登录日志详情
router.get('/detail', controller.detail);

// 删除登录日志
router.post('/delete', controller.remove);

module.exports = router;




/**
 * @swagger
 * tags:
 *   name: LoginLogs
 *   description: 登录日志审计接口（仅管理员）
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginLog:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           example: "user123"
 *           description: 用户名
 *         api_key:
 *           type: string
 *           example: "abcd12***34"
 *           description: API密钥（已脱敏）
 *         login_time:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 登录时间
 *         ip:
 *           type: string
 *           example: "192.168.1.100"
 *           description: 登录IP
 *         location:
 *           type: string
 *           example: "中国/北京"
 *           description: 登录地址详情
 *         user_agent:
 *           type: string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *           description: User-Agent
 *         browser:
 *           type: string
 *           example: "Chrome"
 *           description: 浏览器类型
 *         os:
 *           type: string
 *           example: "Windows 10"
 *           description: 操作系统
 *         device:
 *           type: string
 *           example: "Desktop"
 *           description: 设备
 *         method:
 *           type: string
 *           example: "password"
 *           description: 登录方式
 *         login_system:
 *           type: string
 *           example: "admin"
 *           description: 登录系统（app/admin）
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           example: 1
 *           description: 登录状态（0:失败,1:成功）
 *         fail_reason:
 *           type: string
 *           example: null
 *           description: 失败原因
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2025-09-22T10:30:00.000Z"
 *           description: 更新时间
 *       required:
 *         - login_time
 *         - status
 *         - created_at
 *         - updated_at
 */

/**
 * @openapi
 * /v1/login-logs/query:
 *   get:
 *     tags: [LoginLogs]
 *     summary: 分页查询登录日志
 *     description: 分页查询登录日志（支持按用户、IP、状态、时间范围过滤）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: 登录日志ID（单个）
 *       - in: query
 *         name: ids
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: 多个登录日志ID，支持数组或逗号分隔字符串，例如 ids=1,2,3
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: 用户名（模糊匹配）
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *         description: 登录IP（模糊匹配）
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: 登录状态（0:失败,1:成功）
 *       - in: query
 *         name: login_system
 *         schema:
 *           type: string
 *         description: 登录系统（app/admin）
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 登录时间开始范围
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 登录时间结束范围
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
 *         description: 成功返回登录日志列表
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
 *                         $ref: '#/components/schemas/LoginLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */


/**
 * @openapi
 * /v1/login-logs/detail:
 *   get:
 *     tags: [LoginLogs]
 *     summary: 获取登录日志详情
 *     description: 根据ID获取登录日志详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: 登录日志ID
 *     responses:
 *       200:
 *         description: 成功返回登录日志详情
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
 *                   $ref: '#/components/schemas/LoginLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 登录日志不存在
 */

/**
 * @openapi
 * /v1/login-logs/create:
 *   post:
 *     tags: [LoginLogs]
 *     summary: 新增登录日志
 *     description: 新增登录日志（仅用于内部/管理员）。支持使用 (apiKey+apiSecret) 或 (username+password)，若两者同时提供则按组合方式记录；敏感字段不会持久化。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码（可选，仅用于判定登录方式，不落库）
 *               api_key:
 *                 type: string
 *                 description: API密钥
 *               secret_key:
 *                 type: string
 *                 description: API密钥Secret（可选，仅用于判定登录方式，不落库）
 *               login_time:
 *                 type: string
 *                 format: date-time
 *                 description: 登录时间
 *               ip:
 *                 type: string
 *                 description: 登录IP
 *               location:
 *                 type: string
 *                 description: 登录地址详情
 *               user_agent:
 *                 type: string
 *                 description: User-Agent
 *               browser:
 *                 type: string
 *                 description: 浏览器类型
 *               os:
 *                 type: string
 *                 description: 操作系统
 *               device:
 *                 type: string
 *                 description: 设备
 *               method:
 *                 type: string
 *                 description: 登录方式
 *               login_system:
 *                 type: string
 *                 description: 登录系统（app/admin）
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 登录状态（0:失败,1:成功）
 *               fail_reason:
 *                 type: string
 *                 description: 失败原因
 *             required:
 *               - login_time
 *               - status
 *     responses:
 *       201:
 *         description: 成功创建登录日志
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
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/LoginLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */

/**
 * @openapi
 * /v1/login-logs/update:
 *   post:
 *     tags: [LoginLogs]
 *     summary: 更新登录日志
 *     description: 更新登录日志（仅用于内部/管理员）
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
 *                 description: 登录日志ID
 *               username:
 *                 type: string
 *                 description: 用户名
 *               api_key:
 *                 type: string
 *                 description: API密钥
 *               login_time:
 *                 type: string
 *                 format: date-time
 *                 description: 登录时间
 *               ip:
 *                 type: string
 *                 description: 登录IP
 *               location:
 *                 type: string
 *                 description: 登录地址详情
 *               user_agent:
 *                 type: string
 *                 description: User-Agent
 *               browser:
 *                 type: string
 *                 description: 浏览器类型
 *               os:
 *                 type: string
 *                 description: 操作系统
 *               device:
 *                 type: string
 *                 description: 设备
 *               method:
 *                 type: string
 *                 description: 登录方式
 *               login_system:
 *                 type: string
 *                 description: 登录系统（app/admin）
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 登录状态（0:失败,1:成功）
 *               fail_reason:
 *                 type: string
 *                 description: 失败原因
 *             required:
 *               - id
 *     responses:
 *       200:
 *         description: 成功更新登录日志
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
 *                   $ref: '#/components/schemas/LoginLog'
 *               required:
 *                 - status
 *                 - code
 *                 - data
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 登录日志不存在
 */

/**
 * @openapi
 * /v1/login-logs/delete:
 *   post:
 *     tags: [LoginLogs]
 *     summary: 删除登录日志
 *     description: 删除登录日志（仅用于内部/管理员）
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
 *                 description: 登录日志ID
 *             required:
 *               - id
 *     responses:
 *       200:
 *         description: 成功删除登录日志
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
 *                     id:
 *                       type: integer
 *                       format: int64
 *                       example: 123456
 *                   required:
 *                     - id
 *               required:
 *                 - status
 *                 - code
 *                 - data
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 登录日志不存在
 */