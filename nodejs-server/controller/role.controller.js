const db = require("../models");
const Role = db.roles;
const roleService = require("../service/role.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

const createRole = catchAsync(async (req, res) => {
    try {
        const result = await roleService.createRole(req.body);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '创建角色失败'
        });
    }
});

const deleteRole = catchAsync(async (req, res) => {
    try {
        const result = await roleService.deleteRoleById(req.body.id || req.params.id);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '删除角色失败'
        });
    }
});

const updateRole = catchAsync(async (req, res) => {
    try {
        const roleId = req.body.id || req.params.id;
        const result = await roleService.updateRoleById(roleId, req.body);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '更新角色失败'
        });
    }
});

const getAllRoles = catchAsync(async (req, res) => {
    const roles = await Role.findAll();
    res.send({ roles });
});

const queryRole = catchAsync(async (req, res) => {
    try {
        let { id, name, code, status, pageSize = 10, currentPage = 1 } = req.query;
        
        const filter = {};
        if (id) filter.id = Number(id);
        if (name) filter.name = name;
        if (code) filter.code = code;
        if (status !== undefined) filter.status = Number(status);

        const options = {};
        if (pageSize) options.limit = Number(pageSize);
        if (currentPage > 1) options.offset = (Number(currentPage) - 1) * Number(pageSize);

        const roles = await roleService.getAllRoles(filter, options);
        
        // 获取总数（用于分页）
        let totalRoles;
        if (Object.keys(filter).length) {
            totalRoles = await roleService.getAllBy(filter);
        } else {
            totalRoles = await roleService.getAllRoles();
        }

        res.send({
            status: 'success',
            data: {
                list: roles,
                total: totalRoles.length,
                pageSize: Number(pageSize),
                currentPage: Number(currentPage),
            }
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '查询角色失败'
        });
    }
});


/**
 * 为角色分配权限
 */
const assignPermissions = catchAsync(async (req, res) => {
    try {
        const { roleCode, permissionIds } = req.body;
        const result = await roleService.assignPermissionsToRole(roleCode, permissionIds);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '分配权限失败'
        });
    }
});

/**
 * 获取角色的权限
 */
const getRolePermissions = catchAsync(async (req, res) => {
    try {
        const { roleCode } = req.params;
        const result = await roleService.getRolePermissions(roleCode);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取角色权限失败'
        });
    }
});

/**
 * 获取用户的权限树
 */
const getUserPermissionTree = catchAsync(async (req, res) => {
    try {
        const user = req.user; // 从认证中间件获取用户信息
        const result = await roleService.getUserPermissionTree(user);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取用户权限树失败'
        });
    }
});

module.exports = {
    createRole,
    deleteRole,
    updateRole,
    queryRole,
    assignPermissions,
    getRolePermissions,
    getUserPermissionTree,
}
