/**
 * 角色路由模块
 * 定义角色管理相关的API路由，提供角色权限管理功能
 */
const express = require('express');
const router = express.Router();
const roleController = require('../../controller/role.controller.js');
const auth = require("../../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: 角色权限管理 - 提供角色的创建、查询、删除和更新功能，支持角色权限分配和用户权限树管理
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 角色唯一标识
 *           example: 1
 *         name:
 *           type: string
 *           description: 角色名称
 *           example: "系统管理员"
 *         code:
 *           type: string
 *           description: 角色编码
 *           example: "super_admin"
 *         status:
 *           type: integer
 *           description: 角色状态 (0:禁用 1:启用)
 *           example: 1
 *         description:
 *           type: string
 *           description: 角色描述
 *           example: "拥有系统所有权限的超级管理员"
 *         permissions:
 *           type: array
 *           items:
 *             type: integer
 *           description: 角色拥有的权限ID列表
 *           example: [1, 2, 3, 4]
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: "2024-01-15T10:30:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *           example: "2024-01-15T10:35:00Z"
 *     CreateRoleRequest:
 *       type: object
 *       required:
 *         - name
 *         - code
 *       properties:
 *         name:
 *           type: string
 *           description: 角色名称
 *           example: "部门管理员"
 *         code:
 *           type: string
 *           description: 角色编码（唯一标识）
 *           example: "dept_admin"
 *         status:
 *           type: integer
 *           description: 角色状态 (0:禁用 1:启用)
 *           default: 1
 *           example: 1
 *         description:
 *           type: string
 *           description: 角色描述
 *           example: "部门级管理员，拥有部门内用户管理权限"
 *     UpdateRoleRequest:
 *       type: object
 *       required:
 *         - id
 *       properties:
 *         id:
 *           type: integer
 *           description: 角色ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 角色名称
 *           example: "高级管理员"
 *         code:
 *           type: string
 *           description: 角色编码
 *           example: "senior_admin"
 *         status:
 *           type: integer
 *           description: 角色状态 (0:禁用 1:启用)
 *           example: 1
 *         description:
 *           type: string
 *           description: 角色描述
 *           example: "拥有高级管理权限的管理员角色"
 *     AssignPermissionsRequest:
 *       type: object
 *       required:
 *         - roleCode
 *         - permissionIds
 *       properties:
 *         roleCode:
 *           type: string
 *           description: 角色编码
 *           example: "admin"
 *         permissionIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: 权限ID列表
 *           example: [1, 2, 5, 8, 10]
 *     PermissionTree:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 权限ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 权限名称
 *           example: "系统管理"
 *         code:
 *           type: string
 *           description: 权限编码
 *           example: "system:manage"
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
 *           example: "/system"
 *         icon:
 *           type: string
 *           description: 图标
 *           example: "system"
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
 *           description: 响应状态
 *           example: "success"
 *         code:
 *           type: integer
 *           description: 响应代码
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: "操作成功"
 *         data:
 *           type: object
 *           description: 响应数据
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: 错误状态
 *           example: "error"
 *         code:
 *           type: integer
 *           description: 错误代码
 *           example: 400
 *         message:
 *           type: string
 *           description: 错误信息
 *           example: "参数验证失败"
 */


/**
 * @openapi
 * /v1/role/create:
 *   post:
 *     tags: [Roles]
 *     summary: 创建新角色
 *     description: |
 *       创建新的系统角色，用于权限管理和用户分组。创建角色时需要指定角色名称、
 *       编码和描述信息。角色创建成功后可以为其分配相应的权限。此接口需要
 *       system:role权限才能访问。
 *       
 *       **注意事项：**
 *       - 需要system:role权限
 *       - 角色编码必须唯一
 *       - 角色名称建议使用中文描述
 *       - 创建后的角色默认没有任何权限
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *           examples:
 *             admin_role:
 *               summary: 创建管理员角色
 *               value:
 *                 name: "部门管理员"
 *                 code: "dept_admin"
 *                 status: 1
 *                 description: "负责部门内用户管理和权限分配"
 *             operator_role:
 *               summary: 创建操作员角色
 *               value:
 *                 name: "系统操作员"
 *                 code: "system_operator"
 *                 status: 1
 *                 description: "负责系统日常操作和维护工作"
 *     responses:
 *       200:
 *         description: 角色创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Role'
 *             examples:
 *               success:
 *                 summary: 角色创建成功
 *                 value:
 *                   status: "success"
 *                   code: 200
 *                   message: "角色创建成功"
 *                   data:
 *                     id: 5
 *                     name: "部门管理员"
 *                     code: "dept_admin"
 *                     status: 1
 *                     description: "负责部门内用户管理和权限分配"
 *                     created_at: "2024-01-15T10:30:00Z"
 *                     updated_at: "2024-01-15T10:30:00Z"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "角色名称不能为空"
 *               duplicate_code:
 *                 summary: 角色编码已存在
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "角色编码已存在"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_permission:
 *                 summary: 缺少权限
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您没有system:role权限"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @openapi
 * /v1/role/delete:
 *   post:
 *     tags: [Roles]
 *     summary: 删除角色
 *     description: |
 *       根据角色ID删除指定的系统角色。删除角色前会检查是否有用户正在使用该角色，
 *       如果有用户关联该角色，则不允许删除。此操作不可逆，请谨慎使用。
 *       需要system:role权限才能访问此接口。
 *       
 *       **注意事项：**
 *       - 需要system:role权限
 *       - 删除操作不可逆
 *       - 不能删除有用户关联的角色
 *       - 不能删除系统预置角色
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
 *                 description: 角色ID
 *                 example: 5
 *           examples:
 *             delete_role:
 *               summary: 删除角色示例
 *               value:
 *                 id: 5
 *     responses:
 *       200:
 *         description: 角色删除成功
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
 *             examples:
 *               success:
 *                 summary: 角色删除成功
 *                 value:
 *                   status: "success"
 *                   message: "角色删除成功"
 *                   data:
 *                     deleted: true
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "角色ID不能为空"
 *               role_in_use:
 *                 summary: 角色被使用中
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "该角色正在被用户使用，无法删除"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 summary: 角色不存在
 *                 value:
 *                   status: "error"
 *                   code: 404
 *                   message: "角色不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @openapi
 * /v1/role/update:
 *   post:
 *     tags: [Roles]
 *     summary: 更新角色
 *     description: |
 *       根据角色ID更新指定角色的信息。可以更新角色的名称、状态、描述等信息，
 *       但不允许修改角色编码（code）以保证系统稳定性。更新后的角色信息将
 *       立即生效，影响所有使用该角色的用户权限。
 *       
 *       **注意事项：**
 *       - 需要system:role权限
 *       - 不能修改角色编码
 *       - 更新后立即生效
 *       - 不能更新系统预置角色
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *           examples:
 *             update_role:
 *               summary: 更新角色信息
 *               value:
 *                 id: 5
 *                 name: "高级部门管理员"
 *                 status: 1
 *                 description: "升级后的部门管理员，拥有更多管理权限"
 *             disable_role:
 *               summary: 禁用角色
 *               value:
 *                 id: 6
 *                 status: 0
 *                 description: "角色已被禁用，不再使用"
 *     responses:
 *       200:
 *         description: 角色更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Role'
 *             examples:
 *               success:
 *                 summary: 角色更新成功
 *                 value:
 *                   status: "success"
 *                   message: "角色更新成功"
 *                   data:
 *                     id: 5
 *                     name: "高级部门管理员"
 *                     code: "dept_admin"
 *                     status: 1
 *                     description: "升级后的部门管理员，拥有更多管理权限"
 *                     updated_at: "2024-01-15T11:00:00Z"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "角色ID不能为空"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 summary: 角色不存在
 *                 value:
 *                   status: "error"
 *                   code: 404
 *                   message: "角色不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @openapi
 * /v1/role/query:
 *   get:
 *     tags: [Roles]
 *     summary: 查询角色列表
 *     description: |
 *       查询系统中的角色列表，支持分页和按条件筛选。可以按角色ID、名称、
 *       编码或状态进行精确查询。返回的角色信息包含详细的角色属性和创建更新时间。
 *       适用于管理员查看和管理系统角色。
 *       
 *       **注意事项：**
 *       - 需要system:role权限
 *       - 默认返回启用的角色
 *       - 支持分页查询，默认每页显示10条记录
 *       - 支持多个筛选条件组合使用
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: 角色ID
 *         example: 1
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: 角色名称模糊查询
 *         example: "管理员"
 *       - in: query
 *         name: code
 *         required: false
 *         schema:
 *           type: string
 *         description: 角色编码精确查询
 *         example: "admin"
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: integer
 *         description: 角色状态 (0:禁用 1:启用)
 *         example: 1
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
 *         description: 成功返回角色数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: 响应状态
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       example: []
 *                       description: 角色数据列表
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 25
 *                     pageSize:
 *                       type: integer
 *                       description: 每页条数
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       description: 当前页码
 *                       example: 1
 *             examples:
 *               single_role:
 *                 summary: 单个角色查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1
 *                         name: "系统管理员"
 *                         code: "super_admin"
 *                         status: 1
 *                         description: "拥有系统所有权限的超级管理员"
 *                         created_at: "2024-01-15T10:00:00Z"
 *                         updated_at: "2024-01-15T10:00:00Z"
 *                     total: 1
 *                     pageSize: 10
 *                     currentPage: 1
 *               paginated_roles:
 *                 summary: 分页角色查询成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     list:
 *                       - id: 1
 *                         name: "系统管理员"
 *                         code: "super_admin"
 *                         status: 1
 *                         description: "拥有系统所有权限的超级管理员"
 *                       - id: 2
 *                         name: "管理员"
 *                         code: "admin"
 *                         status: 1
 *                         description: "拥有大部分管理权限的管理员"
 *                       - id: 3
 *                         name: "操作员"
 *                         code: "operator"
 *                         status: 1
 *                         description: "拥有基本操作权限的操作员"
 *                     total: 25
 *                     pageSize: 10
 *                     currentPage: 1
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_permission:
 *                 summary: 缺少权限
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您没有system:role权限"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /v1/role/assign-permissions:
 *   post:
 *     tags: [Roles]
 *     summary: 为角色分配权限
 *     description: |
 *       为指定的角色分配一组权限。此操作会替换角色的所有现有权限，
 *       不是增加模式。分配成功后，拥有该角色的所有用户都会立即获得新权限。
 *       需要role:assign权限才能访问此接口。
 *       
 *       **注意事项：**
 *       - 需要role:assign权限
 *       - 会替换角色的所有权限
 *       - 分配后立即生效
 *       - 权限ID必须存在且启用
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionsRequest'
 *           examples:
 *             assign_admin_permissions:
 *               summary: 为管理员分配权限
 *               value:
 *                 roleCode: "admin"
 *                 permissionIds: [1, 2, 5, 8, 10, 15, 20]
 *             assign_operator_permissions:
 *               summary: 为操作员分配权限
 *               value:
 *                 roleCode: "operator"
 *                 permissionIds: [1, 5, 10]
 *     responses:
 *       200:
 *         description: 权限分配成功
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
 *                         roleCode:
 *                           type: string
 *                           example: "admin"
 *                         assignedPermissions:
 *                           type: integer
 *                           example: 7
 *             examples:
 *               success:
 *                 summary: 权限分配成功
 *                 value:
 *                   status: "success"
 *                   message: "权限分配成功"
 *                   data:
 *                     roleCode: "admin"
 *                     assignedPermissions: 7
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_params:
 *                 summary: 参数验证失败
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "角色编码不能为空"
 *               invalid_permissions:
 *                 summary: 权限ID无效
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "包含无效的权限ID"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_permission:
 *                 summary: 缺少权限
 *                 value:
 *                   status: "error"
 *                   code: 403
 *                   message: "您没有role:assign权限"
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 summary: 角色不存在
 *                 value:
 *                   status: "error"
 *                   code: 404
 *                   message: "角色不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /v1/role/{roleCode}/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: 获取角色的权限列表
 *     description: |
 *       根据角色编码获取该角色拥有的所有权限信息。返回的权限包含权限的
 *       详细信息如权限名称、类型、状态等。适用于角色权限审计和管理。
 *       需要system:role权限才能访问此接口。
 *       
 *       **注意事项：**
 *       - 需要system:role权限
 *       - 返回所有启用的权限
 *       - 包含权限层级关系信息
 *       - 用于权限审计和检查
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleCode
 *         required: true
 *         schema:
 *           type: string
 *         description: 角色编码
 *         example: "admin"
 *     responses:
 *       200:
 *         description: 成功返回角色权限数据
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
 *                     roleCode:
 *                       type: string
 *                       description: 角色编码
 *                       example: "admin"
 *                     roleName:
 *                       type: string
 *                       description: 角色名称
 *                       example: "管理员"
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "用户管理"
 *                           code:
 *                             type: string
 *                             example: "user:manage"
 *                           type:
 *                             type: integer
 *                             example: 1
 *                           status:
 *                             type: integer
 *                             example: 1
 *                       description: 权限列表
 *                     totalPermissions:
 *                       type: integer
 *                       description: 权限总数
 *                       example: 15
 *             examples:
 *               success:
 *                 summary: 获取角色权限成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     roleCode: "admin"
 *                     roleName: "管理员"
 *                     permissions:
 *                       - id: 1
 *                         name: "用户管理"
 *                         code: "user:manage"
 *                         type: 1
 *                         status: 1
 *                       - id: 2
 *                         name: "角色管理"
 *                         code: "role:manage"
 *                         type: 1
 *                         status: 1
 *                       - id: 5
 *                         name: "系统设置"
 *                         code: "system:setting"
 *                         type: 1
 *                         status: 1
 *                     totalPermissions: 15
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 角色不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 summary: 角色不存在
 *                 value:
 *                   status: "error"
 *                   code: 404
 *                   message: "角色不存在"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /v1/role/user-permission-tree:
 *   get:
 *     tags: [Roles]
 *     summary: 获取用户的权限树
 *     description: |
 *       获取当前登录用户的权限树结构。返回的权限树包含用户可访问的所有菜单、
 *       按钮和API权限，按照层级关系组织。适用于前端构建导航菜单和权限控制。
 *       只需要基本的登录认证即可访问。
 *       
 *       **注意事项：**
 *       - 只需要登录认证
 *       - 返回层级化的权限树
 *       - 包含菜单、按钮和API权限
 *       - 用于前端权限控制
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回用户权限树
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
 *                     userId:
 *                       type: integer
 *                       description: 用户ID
 *                       example: 123
 *                     userRole:
 *                       type: string
 *                       description: 用户角色
 *                       example: "admin"
 *                     permissionTree:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PermissionTree'
 *                       description: 权限树结构
 *                     totalPermissions:
 *                       type: integer
 *                       description: 用户权限总数
 *                       example: 25
 *             examples:
 *               success:
 *                 summary: 获取用户权限树成功
 *                 value:
 *                   status: "success"
 *                   data:
 *                     userId: 123
 *                     userRole: "admin"
 *                     permissionTree:
 *                       - id: 1
 *                         name: "系统管理"
 *                         code: "system"
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
 *                           - id: 3
 *                             name: "角色管理"
 *                             code: "role:manage"
 *                             type: 1
 *                             path: "/system/role"
 *                             icon: "role"
 *                             children: []
 *                     totalPermissions: 25
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * 创建角色
 * /v1/role/create
 */
router.post('/create', auth(['admin', 'super_admin']), roleController.createRole);


/**
 * 删除角色
 * /v1/role/delete
 */
router.post('/delete', auth(['admin', 'super_admin']), roleController.deleteRole);


/**
 * 更新角色
 * /v1/role/update
 */
router.post('/update', auth(['admin', 'super_admin']), roleController.updateRole);


/**
 * 查询角色
 * /v1/role/query
 */
router.get('/query', auth(['admin', 'super_admin']), roleController.queryRole);


/**
 * 分配权限
 * /v1/role/assign-permissions
 */
router.post('/assign-permissions', auth(['admin', 'super_admin']), roleController.assignPermissions);


/**
 * 获取角色权限
 * /v1/role/:roleCode/permissions
 */
router.get('/:roleCode/permissions', auth(['admin', 'super_admin']), roleController.getRolePermissions);


/**
 * 获取用户权限树
 * /v1/role/user-permission-tree
 */
router.get('/user-permission-tree', auth(), roleController.getUserPermissionTree);


module.exports = router;
