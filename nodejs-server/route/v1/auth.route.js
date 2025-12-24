/**
 * 认证路由模块
 * 定义用户认证相关的API路由，包括登录、注册等
 */
const express = require('express');
const router = express.Router();
const authController = require('../../controller/auth.controller.js');
const validate = require('../../middleware/validate');
const authValidation = require('../../validations/auth.validation');
const auth = require('../../middleware/auth');

/**
 * 后台管理系统-登录
 * /v1/auth/admin/login
 */
router.post('/admin/login', validate(authValidation.adminLogin), authController.adminLogin);

/**
 * 后台管理系统-退出登录
 * /v1/auth/admin/logout
 */
router.post('/admin/logout', auth(), validate(authValidation.logout), authController.logout);

/**
 * App客户端-登录
 * /v1/auth/app/login
 */
router.post('/app/login', validate(authValidation.appLogin), authController.appLogin);

/**
 * App客户端-退出登录
 * /v1/auth/app/logout
 */
router.post('/app/logout', auth(), validate(authValidation.logout), authController.logout);

/**
 * 用户注册
 * /v1/auth/register
 */
router.post('/register', validate(authValidation.register), authController.register);

/**
 * 刷新令牌
 * /v1/auth/refresh-tokens
 */
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);

/**
 * 获取用户信息
 * /v1/auth/user/profile
 */
router.get('/user/profile', auth(), authController.getUserProfile);

/**
 * 获取验证码
 * /v1/auth/captcha
 */
router.get('/captcha', authController.getCaptcha);

module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 身份验证
 */

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - username
 *               - role
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: 至少包含一个数字和一个字母
 *               username:
 *                type: string
 *                description: 用户名，必须唯一
 *               role:
 *                type: string
 *                description: 用户角色
 *             example:
 *               password: password123
 *               username: testuser
 *               role: user
 *
 */

/**
 * @swagger
 * /v1/auth/app/login:
 *   post:
 *     summary: App端用户登录
 *     description: 支持用户名+密码或apiKey+apiSecret两种登录方式，适用于App端所有角色用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account
 *               - password
 *             properties:
 *               account:
 *                 type: string
 *                 description: 账号（可以是用户名或apiKey）
 *               password:
 *                 type: string
 *                 description: 密码（使用apiKey时填入apiSecret）
 *             example:
 *               account: testuser
 *               password: password123
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 user:
 *                   type: object
 *                   description: 用户信息（保留apiKey，排除apiSecret）
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 访问令牌
 *                     refreshToken:
 *                       type: string
 *                       description: 刷新令牌
 *                     accessTokenExpires:
 *                       type: string
 *                       description: 访问令牌过期时间
 *                     refreshTokenExpires:
 *                       type: string
 *                       description: 刷新令牌过期时间
 *       401:
 *         description: 账号或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: 账号或密码错误
 *       403:
 *         description: 账户被禁用
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: 账户已被禁用
 */

/**
 * @swagger
 * /v1/auth/admin/login:
 *   post:
 *     summary: 后台管理员登录
 *     description: 使用用户名和密码进行后台管理员登录，仅限管理员角色用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               captchaId:
 *                 type: string
 *                 description: 验证码ID（可选，支持前端Canvas验证码）
 *               captchaCode:
 *                 type: string
 *                 description: 验证码（可选，支持前端Canvas验证码）
 *             example:
 *               username: admin
 *               password: password123
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 user:
 *                   type: object
 *                   description: 用户信息（已排除敏感信息）
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 访问令牌
 *                     refreshToken:
 *                       type: string
 *                       description: 刷新令牌
 *                     accessTokenExpires:
 *                       type: string
 *                       description: 访问令牌过期时间
 *                     refreshTokenExpires:
 *                       type: string
 *                       description: 刷新令牌过期时间
 *       400:
 *         description: 验证码错误或参数不完整
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: 验证码错误或已过期
 *       401:
 *         description: 用户名或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: 用户名或密码错误
 *       403:
 *         description: 账户被禁用或无管理员权限
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: 账户已被禁用
 */

/**
 * @swagger
 * /v1/auth/app/logout:
 *   post:
 *     summary: App端用户登出
 *     description: 注销App端用户的登录状态，使refresh token无效
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 需要注销的refresh token
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
 *     responses:
 *       204:
 *         description: 登出成功
 *       400:
 *         description: 请求参数错误
 */

/**
 * @swagger
 * /v1/auth/admin/logout:
 *   post:
 *     summary: 后台管理员登出
 *     description: 注销后台管理员的登录状态，使refresh token无效
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 需要注销的refresh token
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZWJhYzUzNDk1NGI1NDEzOTgwNmMxMTIiLCJpYXQiOjE1ODkyOTg0ODQsImV4cCI6MTU4OTMwMDI4NH0.m1U63blB0MLej_WfB7yC2FTMnCziif9X8yzwDEfJXAg
 *     responses:
 *       204:
 *         description: 登出成功
 *       400:
 *         description: 请求参数错误
 */

/**
 * @swagger
 * /v1/auth/captcha:
 *   get:
 *     summary: 生成图形验证码
 *     description: 生成用于登录验证的图形验证码
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     captchaId:
 *                       type: string
 *                       description: 验证码唯一标识
 *                     captchaImage:
 *                       type: string
 *                       description: base64编码的验证码图片
 */

/**
 * @swagger
 * /v1/auth/user/profile:
 *   get:
 *     summary: 获取当前登录用户的详细信息
 *     description: 通过访问令牌获取用户详细信息，用于初始化用户状态
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     lastLoginTime:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       401:
 *         description: 未认证或token无效
 *       403:
 *         description: 账户已被禁用
 *       404:
 *         description: 用户不存在
 */

/**
 * @swagger
 * /v1/auth/refresh-tokens:
 *   post:
 *     summary: 刷新认证令牌
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZWJhYzUzNDk1NGI1NDEzOTgwNmMxMTIiLCJpYXQiOjE1ODkyOTg0ODQsImV4cCI6MTU4OTMwMDI4NH0.m1U63blB0MLej_WfB7yC2FTMnCziif9X8yzwDEfJXAg
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 access:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     expires:
 *                       type: string
 *                 refresh:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     expires:
 *                       type: string
 *       401:
 *         description: 无效的refresh token
 */


