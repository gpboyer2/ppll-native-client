/**
 * 权限控制器
 * 处理权限相关的HTTP请求，包括权限的增删改查和树形结构获取
 */
const permissionService = require("../service/permission.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

/**
 * 创建权限
 */
const createPermission = catchAsync(async (req, res) => {
    try {
        const result = await permissionService.createPermission(req.body);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '创建权限失败'
        });
    }
});

/**
 * 删除权限
 */
const deletePermission = catchAsync(async (req, res) => {
    try {
        const result = await permissionService.deletePermissionById(req.body.id || req.params.id);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '删除权限失败'
        });
    }
});

/**
 * 更新权限
 */
const updatePermission = catchAsync(async (req, res) => {
    try {
        const permissionId = req.body.id || req.params.id;
        const result = await permissionService.updatePermissionById(permissionId, req.body);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '更新权限失败'
        });
    }
});

/**
 * 查询权限
 */
const queryPermissions = catchAsync(async (req, res) => {
    try {
        let { id, type, status, parentId, pageSize = 10, currentPage = 1 } = req.query;
        
        const filter = {};
        if (id) filter.id = Number(id);
        if (type !== undefined) filter.type = Number(type);
        if (status !== undefined) filter.status = Number(status);
        if (parentId !== undefined) filter.parentId = Number(parentId);

        const options = {};
        if (pageSize) options.limit = Number(pageSize);
        if (currentPage > 1) options.offset = (Number(currentPage) - 1) * Number(pageSize);

        const permissions = await permissionService.getAllPermissions(filter, options);
        
        // 获取总数（用于分页）
        let totalPermissions;
        if (Object.keys(filter).length) {
            totalPermissions = await permissionService.getAllBy(filter);
        } else {
            totalPermissions = await permissionService.getAllPermissions();
        }

        res.send({
            status: 'success',
            data: {
                list: permissions,
                total: totalPermissions.length,
                pageSize: Number(pageSize),
                currentPage: Number(currentPage),
            }
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '查询权限失败'
        });
    }
});

/**
 * 获取权限树
 */
const getPermissionTree = catchAsync(async (req, res) => {
    try {
        const { parentId } = req.query;
        const result = await permissionService.getPermissionTree(parentId ? Number(parentId) : 0);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取权限树失败'
        });
    }
});

/**
 * 获取菜单树
 */
const getMenuTree = catchAsync(async (req, res) => {
    try {
        const { permissionIds } = req.query;
        let ids = null;
        
        if (permissionIds) {
            ids = permissionIds.split(',').map(id => Number(id));
        }
        
        const result = await permissionService.getMenuTree(ids);
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取菜单树失败'
        });
    }
});

/**
 * 根据类型获取权限
 */
const getPermissionsByType = catchAsync(async (req, res) => {
    try {
        const { type } = req.params;
        const result = await permissionService.getPermissionsByType(Number(type));
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取权限失败'
        });
    }
});

/**
 * 根据权限编码获取权限详情
 */
const getPermissionByCode = catchAsync(async (req, res) => {
    try {
        const { code } = req.params;
        const result = await permissionService.getPermissionByCode(code);
        
        if (!result) {
            return res.status(httpStatus.NOT_FOUND).send({
                status: 'error',
                code: httpStatus.NOT_FOUND,
                message: '权限不存在'
            });
        }
        
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '获取权限详情失败'
        });
    }
});

module.exports = {
    createPermission,
    deletePermission,
    updatePermission,
    queryPermissions,
    getPermissionTree,
    getMenuTree,
    getPermissionsByType,
    getPermissionByCode,
};