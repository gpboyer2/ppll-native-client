/**
 * 数据分析路由模块
 * 定义系统性能分析、用户行为分析等数据统计相关的API路由
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const AnalyticsService = require('../../service/analytics.service.js');
const analyticsController = require('../../controller/analytics.controller.js');
const validateMiddleware = require('../../middleware/validate');
const Joi = require('joi');

/**
 * 获取系统分析数据概览:
 * /v1/analytics/overview
 */
router.get('/overview', analyticsController.getSystemOverview);

/**
 * 获取系统性能指标:
 * /v1/analytics/performance
 */
router.get('/performance', analyticsController.getPerformanceMetrics);

/**
 * 获取用户行为分析数据:
 * /v1/analytics/user-behavior
 */
router.get('/user-behavior', analyticsController.getUserBehaviorAnalytics);

/**
 * 获取API使用统计:
 * /v1/analytics/api-usage - 获取API调用频率、响应时间、错误率等统计数据
 */
router.get('/api-usage', analyticsController.getAPIUsageStats);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: 数据分析 - 提供系统性能分析、用户行为分析等数据统计功能
 */

/**
 * @swagger
 * /v1/analytics/overview:
 *   get:
 *     summary: 获取系统分析数据概览
 *     description: 获取系统整体运行状态和关键指标概览，包括用户数量、订单统计、系统健康状态等核心业务指标
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取系统概览数据
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
 *                     userStats:
 *                       type: object
 *                       description: 用户统计信息
 *                     orderStats:
 *                       type: object
 *                       description: 订单统计信息
 *                     systemHealth:
 *                       type: object
 *                       description: 系统健康状态
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */

/**
 * @swagger
 * /v1/analytics/performance:
 *   get:
 *     summary: 获取系统性能指标
 *     description: 获取CPU使用率、内存使用情况、磁盘IO、网络流量等系统性能数据
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取性能指标
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
 *                     cpu:
 *                       type: object
 *                       description: CPU使用情况
 *                     memory:
 *                       type: object
 *                       description: 内存使用情况
 *                     disk:
 *                       type: object
 *                       description: 磁盘使用情况
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */

/**
 * @swagger
 * /v1/analytics/user-behavior:
 *   get:
 *     summary: 获取用户行为分析数据
 *     description: 获取用户活跃度、登录频率、功能使用统计、用户留存等行为分析数据
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户行为数据
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
 *                     activeUsers:
 *                       type: object
 *                       description: 活跃用户统计
 *                     loginStats:
 *                       type: object
 *                       description: 登录统计信息
 *                     featureUsage:
 *                       type: object
 *                       description: 功能使用统计
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */

/**
 * @swagger
 * /v1/analytics/api-usage:
 *   get:
 *     summary: 获取API使用统计
 *     description: 获取API调用频率、响应时间、错误率、热门接口等API使用统计数据
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取API使用统计
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
 *                     requestStats:
 *                       type: object
 *                       description: 请求统计信息
 *                     responseTime:
 *                       type: object
 *                       description: 响应时间统计
 *                     errorRate:
 *                       type: object
 *                       description: 错误率统计
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
