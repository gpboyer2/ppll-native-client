/**
 * 系统路由模块
 * 定义系统相关的API路由，提供系统信息查询功能
 */
const express = require("express");
const router = express.Router();
const systemController = require("../../controller/system.controller.js");

/**
 * 获取系统健康状态
 * GET /v1/system/health
 */
router.get("/health", systemController.getHealth);

/**
 * 获取本机 IPv4 地址列表
 * GET /v1/system/ipv4-list
 */
router.get("/ipv4-list", systemController.getIPv4List);

/**
 * 获取数据库路径
 * GET /v1/system/database-path
 */
router.get("/database-path", systemController.getDatabasePath);

/**
 * 获取 Git 信息
 * GET /v1/system/git-info
 */
router.get("/git-info", systemController.getGitInfo);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: System
 *   description: 系统信息
 */

/**
 * @openapi
 * /api/v1/system/ipv4-list:
 *  get:
 *     tags: [System]
 *     summary: 获取本机 IPv4 地址列表
 *     description: 获取本机所有网络接口的 IPv4 地址（不包括回环地址）
 *     responses:
 *       200:
 *         description: 成功获取 IPv4 地址列表
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
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["192.168.1.100", "10.0.0.5"]
 *                   description: IPv4 地址数组
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
 *                   example: "获取 IPv4 地址列表失败"
 */
