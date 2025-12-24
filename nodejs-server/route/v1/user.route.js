/**
 * 用户路由模块
 * 定义用户管理相关的API路由，包括用户信息查询、更新等功能
 */
const express = require('express');
const router = express.Router();
const userController = require('../../controller/user.controller.js');
const auth = require("../../middleware/auth");
const validate = require('../../middleware/validate');
const userValidation = require('../../validations/user.validation');




/**
 * 创建用户
 * /v1/user/create
 */
router.post('/create', auth(['admin', 'super_admin']), validate(userValidation.createUser), userController.createUser);


/**
 * 删除用户
 * /v1/user/delete
 */
router.post('/delete', auth(['admin', 'super_admin']), validate(userValidation.deleteUser), userController.deleteUser);


/**
 * 更新用户
 * /v1/user/update
 */
router.post('/update', auth(['admin', 'super_admin']), validate(userValidation.updateUser), userController.updateUser);


/**
 * 查询用户
 * /v1/user/query
 */
router.get('/query', auth(['admin', 'super_admin']), validate(userValidation.getUsers), userController.queryUser);


module.exports = router;




/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: 使用JWT Token进行身份验证
 * 
 * tags:
 *   name: Users
 *   description: 用户管理和检索
 */


/**
 * @openapi
 * /v1/user/create:
 *   post:
 *     summary: 创建用户
 *     description: 创建新用户账户，支持设置用户基本信息、角色权限和API配置。需要管理用户权限。
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 maxLength: 64
 *                 description: 用户名
 *                 example: "testuser"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 128
 *                 description: 用户邮箱
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 maxLength: 256
 *                 description: 用户密码
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: 用户角色
 *                 example: "user"
 *               apiKey:
 *                 type: string
 *                 maxLength: 255
 *                 description: API密钥
 *                 example: "your_api_key"
 *               apiSecret:
 *                 type: string
 *                 maxLength: 255
 *                 description: API密钥Secret
 *                 example: "your_api_secret"
 *               status:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 default: 2
 *                 description: 用户状态(1:未知,2:启用,3:禁用)
 *                 example: 2
 *               remark:
 *                 type: string
 *                 maxLength: 255
 *                 description: 备注信息
 *                 example: "测试用户"
 *     responses:
 *       200:
 *         description: 用户创建成功
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
 *                   description: 创建的用户信息
 *       400:
 *         description: 创建失败，参数错误或用户已存在
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
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "用户已存在"
 */


/**
 * @openapi
 * /v1/user/delete:
 *   post:
 *     summary: 删除用户
 *     description: 根据用户ID删除指定用户。需要删除用户权限。
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 用户ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 删除成功
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
 *                   description: 删除操作的结果信息
 *       400:
 *         description: 删除失败，用户不存在
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
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */


/**
 * @openapi
 * /v1/user/update:
 *   post:
 *     summary: 更新用户
 *     description: 根据用户ID更新用户信息。需要管理用户权限或者用户只能更新自己的信息。
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 用户ID
 *                 example: 1
 *               username:
 *                 type: string
 *                 maxLength: 64
 *                 description: 用户名
 *                 example: "newusername"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 128
 *                 description: 用户邮箱
 *                 example: "newemail@example.com"
 *               password:
 *                 type: string
 *                 maxLength: 256
 *                 description: 用户密码
 *                 example: "newpassword123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: 用户角色
 *                 example: "user"
 *               apiKey:
 *                 type: string
 *                 maxLength: 255
 *                 description: API密钥
 *                 example: "new_api_key"
 *               apiSecret:
 *                 type: string
 *                 maxLength: 255
 *                 description: API密钥Secret
 *                 example: "new_api_secret"
 *               status:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 description: 用户状态(1:未知,2:启用,3:禁用)
 *                 example: 2
 *               remark:
 *                 type: string
 *                 maxLength: 255
 *                 description: 备注信息
 *                 example: "更新的备注"
 *               vip_expire:
 *                 type: string
 *                 format: date-time
 *                 description: VIP到期时间
 *                 example: "2024-12-31T23:59:59Z"
 *               permissions:
 *                 type: string
 *                 maxLength: 255
 *                 description: 用户权限(JSON字符串)
 *                 example: '["read", "write"]'
 *               active:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 是否激活(0:未激活,1:激活)
 *                 example: 1
 *               birthday:
 *                 type: string
 *                 format: date
 *                 description: 生日
 *                 example: "1990-01-01"
 *               roles:
 *                 type: string
 *                 maxLength: 255
 *                 description: 角色列表(备用字段)
 *                 example: "admin,operator"
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                   description: 更新后的用户信息
 *       503:
 *         description: 更新失败，用户不存在
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
 *                   example: 503
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */


/**
 * @openapi
 * /v1/user/query:
 *   get:
 *     summary: 查询用户
 *     description: 根据查询参数获取用户列表，支持分页和多条件筛选。需要获取用户权限。
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: 用户ID
 *         example: 1
 *       - in: query
 *         name: ids
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: 多个用户ID，支持数组或逗号分隔字符串，例如 ids=1,2,3
 *         example: [1,2,3]
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: 用户名
 *         example: "testuser"
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: 用户状态(1:未知,2:启用,3:禁用)
 *         example: 2
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 每页显示数量
 *         example: 10
 *       - in: query
 *         name: currentPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 当前页码
 *         example: 1
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, admin, operator, guest, user]
 *         description: 用户角色
 *         example: "operator"
 *       - in: query
 *         name: includeRole
 *         schema:
 *           type: boolean
 *         description: 是否包含角色信息
 *         example: true
 *     responses:
 *       200:
 *         description: 查询成功
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
 *                     list:
 *                       type: array
 *                       example: []
 *                       items:
 *                         type: object
 *                         description: 用户信息对象
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 100
 *                     pageSize:
 *                       type: integer
 *                       description: 每页显示数量
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 */
