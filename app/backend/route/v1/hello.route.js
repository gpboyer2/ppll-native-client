/**
 * Hello路由模块
 * 定义基础测试API路由，用于系统健康检查和测试
 */
const express = require('express');
const router = express.Router();

const helloController = require('../../controller/hello.controller.js');

/**
 * 系统连通性测试接口
 * /api/v1/hello
 */
router.get('/', helloController.template);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Hello
 *   description: 你好
 */

/**
 * @openapi
 * /api/v1/hello:
 *  get:
 *     tags: [Hello]
 *     summary: 系统连通性测试接口
 *     description: 基础的测试接口，用于验证系统连通性和基本功能
 *     responses:
 *       200:
 *         description: 系统正常运行
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You are here now..."
 *                   description: 返回的测试消息
 */