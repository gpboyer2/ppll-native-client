/**
 * 前端日志路由模块
 * 用于接收和存储前端 console 日志
 */
const express = require("express");
const router = express.Router();
const frontendLogController = require("../../controller/frontend-log.controller.js");

/**
 * 创建前端日志 POST /api/v1/frontend-logs/create body: { log_level, log_data, page_url, user_agent }
 */
router.post("/create", frontendLogController.create);

/**
 * 获取前端日志列表 GET /api/v1/frontend-logs/list query: { current_page, page_size, log_level }
 */
router.get("/list", frontendLogController.list);

/**
 * 删除前端日志 POST /api/v1/frontend-logs/delete body: { data: [id1, id2, ...] }
 */
router.post("/delete", frontendLogController.delete_logs);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: FrontendLog
 *   description: 前端日志管理 - 用于收集和存储前端 console 日志
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FrontendLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 主键ID
 *           example: 1
 *         log_level:
 *           type: string
 *           description: 日志级别（log/error/warn/info/table/debug）
 *           example: "log"
 *         log_data:
 *           type: object
 *           description: 日志数据
 *         page_url:
 *           type: string
 *           description: 当前页面 URL
 *           example: "/#/dashboard"
 *         user_agent:
 *           type: string
 *           description: 浏览器信息
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 日志记录时间
 */

/**
 * @swagger
 * /api/v1/frontend-logs/create:
 *   post:
 *     tags: [FrontendLog]
 *     summary: 创建前端日志
 *     description: 接收前端 console 日志并存储到数据库
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               log_level:
 *                 type: string
 *                 description: 日志级别（log/error/warn/info/table/debug）
 *                 example: "log"
 *               log_data:
 *                 type: object
 *                 description: 日志数据（可选）
 *               page_url:
 *                 type: string
 *                 description: 当前页面 URL
 *               user_agent:
 *                 type: string
 *                 description: 浏览器信息
 *     responses:
 *       200:
 *         description: 日志记录成功
 */

/**
 * @swagger
 * /api/v1/frontend-logs/list:
 *   get:
 *     tags: [FrontendLog]
 *     summary: 获取前端日志列表
 *     description: 获取前端日志列表，支持分页和日志级别过滤
 *     parameters:
 *       - in: query
 *         name: current_page
 *         schema:
 *           type: integer
 *         description: 当前页码
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: log_level
 *         schema:
 *           type: string
 *         description: 日志级别过滤
 *     responses:
 *       200:
 *         description: 成功获取日志列表
 */

/**
 * @swagger
 * /api/v1/frontend-logs/delete:
 *   post:
 *     tags: [FrontendLog]
 *     summary: 删除前端日志
 *     description: 批量删除前端日志
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 日志 ID 列表
 *     responses:
 *       200:
 *         description: 删除成功
 */
