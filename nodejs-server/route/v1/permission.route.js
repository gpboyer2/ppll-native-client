/**
 * 权限路由模块
 * 定义权限管理相关的API路由，包括权限的增删改查和树形结构获取
 * 本地客户端系统：无需认证
 */
const express = require('express');
const router = express.Router();
const permissionController = require('../../controller/permission.controller.js');

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: 权限管理和控制 - 提供权限的创建、查询、删除和更新功能，支持层级权限结构和菜单树管理
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Permission:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - type
 *       properties:
 *         id:
 *           type: integer
 *           description: 权限ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 权限名称
 *           example: "用户管理"
 *         code:
 *           type: string
 *           description: 权限编码
 *           example: "user:manage"
 *         type:
 *           type: integer
 *           description: 权限类型 (1:菜单 2:按钮 3:API)
 *           example: 1
 *         parentId:
 *           type: integer
 *           description: 父权限ID
 *           example: 0
 *         path:
 *           type: string
 *           description: 路由路径
 *           example: "/user"
 *         icon:
 *           type: string
 *           description: 图标
 *           example: "user"
 *         sort:
 *           type: integer
 *           description: 排序号
 *           example: 1
 *         status:
 *           type: integer
 *           description: 状态 (0:禁用 1:启用)
 *           example: 1
 *         description:
 *           type: string
 *           description: 权限描述
 *           example: "用户管理权限"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *     PermissionTree:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 权限ID
 *         name:
 *           type: string
 *           description: 权限名称
 *         code:
 *           type: string
 *           description: 权限编码
 *         type:
 *           type: integer
 *           description: 权限类型
 *         parentId:
 *           type: integer
 *           description: 父权限ID
 *         path:
 *           type: string
 *           description: 路由路径
 *         icon:
 *           type: string
 *           description: 图标
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PermissionTree'
 *           description: 子权限列表
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, error]
 *           example: success
 *         data:
 *           type: object
 *           description: 响应数据
 *         code:
 *           type: integer
 *           description: 错误代码
 *         message:
 *           type: string
 *           description: 响应消息
 */

/**
 * @openapi
 * /v1/permission/create:
 *   post:
 *     tags: [Permissions]
 *     summary: 创建新权限
 *     description: |
 *       创建新的系统权限项，支持创建菜单、按钮和API三种类型的权限。
 *       权限可以按照层级结构组织，支持父子关系。创建成功后可以分配给角色供用户使用。
 *       此接口需要system:permission权限才能访问。
 *       
 *       **注意事项：**
 *       - 需要system:permission权限
 *       - 权限编码必须唯一
 *       - 支持层级结构，可指定父权限
 *       - 适用于三种权限类型：菜单、按钮、API
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: 权限名称
 *                 example: "用户管理"
 *               code:
 *                 type: string
 *                 description: 权限编码（唯一标识）
 *                 example: "user:manage"
 *               type:
 *                 type: integer
 *                 description: 权限类型 (1:菜单 2:按钮 3:API)
 *                 example: 1
 *               parentId:
 *                 type: integer
 *                 description: 父权限ID，默认为0
 *                 default: 0
 *                 example: 0
 *               path:
 *                 type: string
 *                 description: 路由路径（菜单类型时使用）
 *                 example: "/user"
 *               icon:
 *                 type: string
 *                 description: 图标名称
 *                 example: "user"
 *               sort:
 *                 type: integer
 *                 description: 排序号
 *                 default: 0
 *                 example: 1
 *               status:
 *                 type: integer
 *                 description: 状态 (0:禁用 1:启用)
 *                 default: 1
 *                 example: 1
 *               description:
 *                 type: string
 *                 description: 权限描述
 *                 example: "用户管理模块的权限"
 *           examples:
 *             menu_permission:
 *               summary: 创建菜单权限
 *               value:
 *                 name: "系统管理"
 *                 code: "system:manage"
 *                 type: 1
 *                 parentId: 0
 *                 path: "/system"
 *                 icon: "system"
 *                 sort: 1
 *                 status: 1
 *                 description: "系统管理主菜单"
 *             button_permission:
 *               summary: 创建按钮权限
 *               value:
 *                 name: "添加用户"
 *                 code: "user:create"
 *                 type: 2
 *                 parentId: 5
 *                 sort: 1
 *                 status: 1
 *                 description: "用户管理页面的添加用户按钮"
 *             api_permission:
 *               summary: 创建API权限
 *               value:
 *                 name: "用户列表API"
 *                 code: "api:user:list"
 *                 type: 3
 *                 parentId: 5
 *                 sort: 1
 *                 status: 1
 *                 description: "获取用户列表的API接口权限"
 *     responses:
 *       200:
 *         description: 权限创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Permission'
 *             examples:
 *               success:
 *                 summary: 权限创建成功
 *                 value:
 *                   status: "success"
 *                   message: "权限创建成功"
 *                   data:
 *                     id: 15
 *                     name: "系统管理"
 *                     code: "system:manage"
 *                     type: 1
 *                     parentId: 0
 *                     path: "/system"
 *                     icon: "system"
 *                     sort: 1
 *                     status: 1
 *                     description: "系统管理主菜单"
 *                     created_at: "2024-01-15T10:30:00Z"
 *                     updated_at: "2024-01-15T10:30:00Z"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "权限名称不能为空"
 *               duplicate_code:
 *                 summary: 权限编码已存在
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "权限编码已存在"
 *               invalid_parent:
 *                 summary: 父权限不存在
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "父权限不存在"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               no_permission:
 *                 summary: 缺少权限
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您没有system:permission权限"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */


/**
 * @openapi
 * /v1/permission/delete:
 *   post:
 *     tags: [Permissions]
 *     summary: 删除权限
 *     description: 根据权限ID删除权限
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
 *                 description: 权限ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 权限删除成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deleted:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: 删除权限失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               status: error
 *               code: 400
 *               message: "权限不存在"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */


/**
 * @openapi
 * /v1/permission/update:
 *   post:
 *     tags: [Permissions]
 *     summary: 更新权限
 *     description: 根据权限ID更新权限信息
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
 *                 description: 权限ID
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: 权限名称
 *                 example: "用户管理"
 *               code:
 *                 type: string
 *                 description: 权限编码
 *                 example: "user:manage"
 *               type:
 *                 type: integer
 *                 description: 权限类型 (1:菜单 2:按钮 3:API)
 *                 example: 1
 *               parentId:
 *                 type: integer
 *                 description: 父权限ID
 *                 example: 0
 *               path:
 *                 type: string
 *                 description: 路由路径
 *                 example: "/user"
 *               icon:
 *                 type: string
 *                 description: 图标
 *                 example: "user"
 *               sort:
 *                 type: integer
 *                 description: 排序号
 *                 example: 1
 *               status:
 *                 type: integer
 *                 description: 状态 (0:禁用 1:启用)
 *                 example: 1
 *               description:
 *                 type: string
 *                 description: 权限描述
 *                 example: "用户管理权限"
 *     responses:
 *       200:
 *         description: 权限更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Permission'
 *       400:
 *         description: 更新权限失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               status: error
 *               code: 400
 *               message: "权限不存在"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */


/**
 * @openapi
 * /v1/permission/query:
 *   get:
 *     tags: [Permissions]
 *     summary: 查询权限列表
 *     description: |
 *       根据条件分页查询系统中的权限列表。支持按权限ID、类型、状态、父权限ID等
 *       条件进行筛选。返回的权限信息包含详细的权限属性和层级关系。
 *       适用于权限管理和审计功能。需要system:permission权限才能访问。
 *       
 *       **注意事项：**
 *       - 需要system:permission权限
 *       - 支持多条件组合筛选
 *       - 支持分页查询，默认每页显示10条记录
 *       - 返回完整的权限层级结构信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: 权限ID精确查询
 *         example: 1
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: integer
 *         description: 权限类型 (1:菜单 2:按钮 3:API)
 *         example: 1
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: integer
 *         description: 状态 (0:禁用 1:启用)
 *         example: 1
 *       - in: query
 *         name: parentId
 *         required: false
 *         schema:
 *           type: integer
 *         description: 父权限ID，0表示根级权限
 *         example: 0
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: 权限名称模糊查询
 *         example: "管理"
 *       - in: query
 *         name: code
 *         required: false
 *         schema:
 *           type: string
 *         description: 权限编码模糊查询
 *         example: "user:"
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页条数
 *         example: 10
 *       - in: query
 *         name: currentPage
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 当前页码
 *         example: 1
 *     responses:
 *       200:
 *         description: 查询权限成功
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
 *                       description: 权限数据列表
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 100
 *                     pageSize:
 *                       type: integer
 *                       description: 每页条数
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 *             examples:
 *               menu_permissions:
 *                 summary: 菜单权限查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1
 *                         name: "系统管理"
 *                         code: "system:manage"
 *                         type: 1
 *                         parentId: 0
 *                         path: "/system"
 *                         icon: "system"
 *                         sort: 1
 *                         status: 1
 *                         description: "系统管理主菜单"
 *                       - id: 2
 *                         name: "用户管理"
 *                         code: "user:manage"
 *                         type: 1
 *                         parentId: 1
 *                         path: "/system/user"
 *                         icon: "user"
 *                         sort: 1
 *                         status: 1
 *                         description: "用户管理子菜单"
 *                     total: 25
 *                     pageSize: 10
 *                     currentPage: 1
 *               all_permissions:
 *                 summary: 所有权限查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1
 *                         name: "系统管理"
 *                         code: "system:manage"
 *                         type: 1
 *                         parentId: 0
 *                         status: 1
 *                       - id: 5
 *                         name: "添加用户"
 *                         code: "user:create"
 *                         type: 2
 *                         parentId: 2
 *                         status: 1
 *                       - id: 8
 *                         name: "用户列表API"
 *                         code: "api:user:list"
 *                         type: 3
 *                         parentId: 2
 *                         status: 1
 *                     total: 100
 *                     pageSize: 10
 *                     currentPage: 1
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "页码必须大于0"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               no_permission:
 *                 summary: 缺少权限
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您没有system:permission权限"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */


/**
 * @openapi
 * /v1/permission/tree:
 *   get:
 *     tags: [Permissions]
 *     summary: 获取权限树
 *     description: 获取完整的权限树结构
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 父权限ID，默认为0获取完整树
 *         example: 0
 *     responses:
 *       200:
 *         description: 获取权限树成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PermissionTree'
 *       400:
 *         description: 获取权限树失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */

/**
 * @openapi
 * /v1/permission/menu-tree:
 *   get:
 *     tags: [Permissions]
 *     summary: 获取菜单树结构
 *     description: |
 *       获取用户可访问的菜单树结构，用于前端渲染导航菜单。如果提供权限ID列表，
 *       则根据指定的权限构建菜单树；如果不提供，则根据当前用户的角色权限
 *       构建菜单树。只返回菜单类型（type=1）的权限，并保持层级结构。
 *       
 *       **注意事项：**
 *       - 只需要登录认证
 *       - 只返回菜单类型的权限
 *       - 自动过滤禁用的权限
 *       - 保持层级结构和排序
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: permissionIds
 *         required: false
 *         schema:
 *           type: string
 *         description: 权限ID列表，用逗号分隔。为空时获取当前用户的菜单树
 *         example: "1,2,3,5,8"
 *       - in: query
 *         name: includeDisabled
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含禁用的权限
 *         example: false
 *     responses:
 *       200:
 *         description: 获取菜单树成功
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
 *                     menuTree:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PermissionTree'
 *                       description: 菜单树结构
 *                     totalMenus:
 *                       type: integer
 *                       description: 菜单总数
 *                       example: 15
 *                     userRole:
 *                       type: string
 *                       description: 用户角色
 *                       example: "admin"
 *             examples:
 *               user_menu_tree:
 *                 summary: 用户菜单树获取成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     menuTree:
 *                       - id: 1
 *                         name: "系统管理"
 *                         code: "system:manage"
 *                         type: 1
 *                         parentId: 0
 *                         path: "/system"
 *                         icon: "system"
 *                         sort: 1
 *                         children:
 *                           - id: 2
 *                             name: "用户管理"
 *                             code: "user:manage"
 *                             type: 1
 *                             parentId: 1
 *                             path: "/system/user"
 *                             icon: "user"
 *                             sort: 1
 *                             children: []
 *                           - id: 3
 *                             name: "角色管理"
 *                             code: "role:manage"
 *                             type: 1
 *                             parentId: 1
 *                             path: "/system/role"
 *                             icon: "role"
 *                             sort: 2
 *                             children: []
 *                     totalMenus: 15
 *                     userRole: "admin"
 *               specified_menu_tree:
 *                 summary: 指定权限菜单树获取成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     menuTree:
 *                       - id: 1
 *                         name: "系统管理"
 *                         code: "system:manage"
 *                         type: 1
 *                         path: "/system"
 *                         icon: "system"
 *                         children:
 *                           - id: 2
 *                             name: "用户管理"
 *                             code: "user:manage"
 *                             type: 1
 *                             path: "/system/user"
 *                             icon: "user"
 *                             children: []
 *                     totalMenus: 2
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 权限ID格式错误
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "权限ID格式不正确"
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               unauthorized:
 *                 summary: 未登录
 *                 value:
 *                   status: "error"
 *                   code: 401
 *                   message: "请先登录"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */


/**
 * @openapi
 * /v1/permission/type/{type}:
 *   get:
 *     tags: [Permissions]
 *     summary: 根据类型获取权限
 *     description: 根据权限类型获取权限列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: integer
 *         description: 权限类型 (1:菜单 2:按钮 3:API)
 *         example: 1
 *     responses:
 *       200:
 *         description: 获取权限成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *       400:
 *         description: 获取权限失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */


/**
 * @openapi
 * /v1/permission/code/{code}:
 *   get:
 *     tags: [Permissions]
 *     summary: 根据编码获取权限详情
 *     description: 根据权限编码获取具体权限信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 权限编码
 *         example: "user:manage"
 *     responses:
 *       200:
 *         description: 获取权限详情成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Permission'
 *       404:
 *         description: 权限不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               status: error
 *               code: 404
 *               message: "权限不存在"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 */


/**
 * 创建权限
 * /v1/permission/create
 */
router.post('/create', permissionController.createPermission);


/**
 * 删除权限
 * /v1/permission/delete
 */
router.post('/delete', permissionController.deletePermission);


/**
 * 更新权限
 * /v1/permission/update
 */
router.post('/update', permissionController.updatePermission);


/**
 * 查询权限
 * /v1/permission/query
 */
router.get('/query', permissionController.queryPermissions);


/**
 * 获取权限树
 * /v1/permission/tree
 */
router.get('/tree', permissionController.getPermissionTree);


/**
 * 获取菜单树
 * /v1/permission/menu-tree
 */
router.get('/menu-tree', permissionController.getMenuTree);


/**
 * 根据类型获取权限
 * /v1/permission/type/:type
 */
router.get('/type/:type', permissionController.getPermissionsByType);


/**
 * 根据编码获取权限详情
 * /v1/permission/code/:code
 */
router.get('/code/:code', permissionController.getPermissionByCode);


module.exports = router;