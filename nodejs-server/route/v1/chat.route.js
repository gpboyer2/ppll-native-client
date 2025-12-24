/**
 * 聊天路由模块
 * 定义聊天相关的API路由，提供消息发送和获取功能
 */
const express = require("express");
const router = express.Router();

const chatController = require("../../controller/chat.controller.js");

/**
 * 获取聊天室消息列表
 * /v1/chat
 */
router.get("/", chatController.chat);

/**
 * 发送聊天消息
 * /v1/chat/send
 */
router.post("/send", chatController.sendMessage);

/**
 * 获取指定消息详情
 * /v1/chat/message
 */
router.get("/message", chatController.message);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: 聊天室
 */

/**
 * @openapi
 * /v1/chat:
 *  get:
 *     tags: [Chat]
 *     summary: 获取聊天室消息列表
 *     description: 获取聊天室的历史消息列表，支持分页查询
 *     responses:
 *       200:
 *         description: 成功获取消息列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: 消息对象
 */

/**
 * @openapi
 * /v1/chat/send:
 *  post:
 *     tags: [Chat]
 *     summary: 发送聊天消息
 *     description: 向聊天室发送新消息
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: 消息内容
 *                 example: "Hello, everyone!"
 *               username:
 *                 type: string
 *                 description: 用户名
 *                 example: "user123"
 *     responses:
 *       200:
 *         description: 消息发送成功
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
 *                   description: 发送结果信息
 */

/**
 * @openapi
 * /v1/chat/message:
 *  get:
 *     tags: [Chat]
 *     summary: 获取指定消息详情
 *     description: 根据消息ID获取指定消息的详细信息
 *     parameters:
 *       - in: query
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: 消息ID
 *     responses:
 *       200:
 *         description: 成功获取消息详情
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
 *                   description: 消息详情对象
 */
