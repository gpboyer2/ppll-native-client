/**
 * 角色服务
 * 提供角色管理相关的业务逻辑处理，包括角色信息查询、权限验证等功能
 */
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const db = require("../models");
const Role = db.roles;
const Permission = db.permissions;


const createRole = async (params) => {
    const { name, code, permissions, isDefault, status = 1, remark, sort = 0 } = params;

    // 检查角色编码是否已存在
    const existingRole = await Role.isCodeTaken(code);
    if (existingRole) {
        throw new ApiError(httpStatus.CONFLICT, '角色编码已存在');
    }

    const role = {
        name,
        code,
        permissions: Array.isArray(permissions) ? permissions : null,
        isDefault: isDefault || 0,
        status: status || 1,
        remark,
        sort: sort || 0,
        deleted: null
    };

    const createdRole = await Role.create(role);
    return createdRole;
};

const deleteRoleById = async (roleId) => {
    try {
        const role = await getOneBy({ id: roleId });
        if (!role) {
            throw new ApiError(httpStatus.NOT_FOUND, '角色不存在');
        }

        // 检查是否有用户使用该角色
        const userCount = await db.users.count({
            where: {
                role: role.code,
                deleted: { [db.Sequelize.Op.ne]: 1 }
            }
        });

        if (userCount > 0) {
            throw new ApiError(httpStatus.CONFLICT, '该角色还有用户在使用，无法删除');
        }

        // 软删除
        await role.update({ deleted: 1 });
        return role;
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
    }
};

const updateRoleById = async (roleId, updateBody) => {
    try {
        const existingRole = await getOneBy({ id: roleId });
        if (!existingRole) {
            throw new ApiError(httpStatus.NOT_FOUND, '角色不存在');
        }

        const { name, code, permissions, isDefault, status, remark, sort } = updateBody;

        // 如果要更新角色编码，检查新编码是否已存在
        if (code && code !== existingRole.code) {
            const isCodeExists = await Role.isCodeTaken(code, roleId);
            if (isCodeExists) {
                throw new ApiError(httpStatus.CONFLICT, '角色编码已存在');
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (code !== undefined) updateData.code = code;
        if (permissions !== undefined) updateData.permissions = Array.isArray(permissions) ? permissions : null;
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        if (status !== undefined) updateData.status = status;
        if (remark !== undefined) updateData.remark = remark;
        if (sort !== undefined) updateData.sort = sort;

        const [affectedRows] = await Role.update(updateData, {
            where: { id: roleId }
        });

        if (affectedRows === 0) {
            throw new ApiError(httpStatus.NOT_FOUND, '更新失败，角色不存在');
        }

        return await getOneBy({ id: roleId });
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
    }
};

async function getAllRoles(filter = {}, options = {}) {
    const { status, isDefault, sort } = filter;
    const { limit, offset } = options;
    const whereCondition = {
        deleted: null
    };

    if (status !== undefined) whereCondition.status = status;
    if (isDefault !== undefined) whereCondition.isDefault = isDefault;

    const queryOptions = {
        where: whereCondition,
        order: [['sort', 'ASC'], ['created_at', 'DESC']]
    };

    if (limit) queryOptions.limit = parseInt(limit);
    if (offset) queryOptions.offset = parseInt(offset);

    const roles = await Role.findAll(queryOptions);
    return roles;
}

async function getOneBy(field) {
    return Role.findOne({
        where: {
            ...field,
            deleted: null
        }
    });
}

async function getAllBy(field) {
    return Role.findAll({
        where: {
            ...field,
            deleted: null
        },
        order: [['sort', 'ASC']]
    });
}

// 权限验证相关方法

/**
 * 根据角色编码获取角色信息
 * @param {string} code - 角色编码
 * @returns {Object|null} 角色信息
 */
const getRoleByCode = async (code) => {
    let result = await Role.getByCode(code);
    return result;
};

/**
 * 获取默认角色
 * @returns {Object|null} 默认角色信息
 */
const getDefaultRole = async () => {
    return await Role.getDefaultRole();
};

/**
 * 检查用户是否有特定权限
 * @param {Object} user - 用户对象
 * @param {string|Array} requiredPermissions - 需要的权限（权限编码或权限编码数组）
 * @returns {boolean} 是否有权限
 */
const checkUserPermission = async (user, requiredPermissions) => {
    if (!user || !user.role) return false;

    // 超级管理员拥有所有权限
    if (user.role === 'super_admin') return true;

    const role = await getRoleByCode(user.role);
    if (!role || role.status !== 1) return false;

    if (!requiredPermissions) return true;

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // 获取角色的权限详情
    const rolePermissions = await getRolePermissions(role.code);
    const permissionCodes = rolePermissions.map(p => p.code);

    return permissions.every(permission => {
        return permissionCodes.includes(permission);
    });
};

/**
 * 检查角色是否有特定权限
 * @param {string} roleCode - 角色编码
 * @param {string|Array} requiredPermissions - 需要的权限
 * @returns {boolean} 是否有权限
 */
const checkRolePermission = async (roleCode, requiredPermissions) => {
    if (!roleCode) return false;

    // 超级管理员拥有所有权限
    if (roleCode === 'super_admin') return true;

    const role = await getRoleByCode(roleCode);
    if (!role || role.status !== 1) return false;

    if (!requiredPermissions) return true;

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return permissions.every(permission => {
        return role.hasPermission(permission);
    });
};

/**
 * 获取角色的权限详情
 * @param {string} roleCode - 角色编码
 * @returns {Array} 权限详情数组
 */
const getRolePermissions = async (roleCode) => {
    const role = await getRoleByCode(roleCode);
    if (!role || role.status !== 1 || !role.permissions) return [];
    const { Op } = require('sequelize');
    const permissions = await Permission.findAll({
        where: {
            id: {
                [Op.in]: role.permissions
            },
            status: 1
        },
        order: [['sort', 'ASC']]
    });
    return permissions;
};

/**
 * 为角色分配权限
 * @param {string} roleCode - 角色编码
 * @param {Array} permissionIds - 权限ID数组
 * @returns {Object} 更新后的角色信息
 */
const assignPermissionsToRole = async (roleCode, permissionIds) => {
    const role = await getRoleByCode(roleCode);
    if (!role) {
        throw new ApiError(httpStatus.NOT_FOUND, '角色不存在');
    }
    // 验证权限ID是否存在
    if (permissionIds && permissionIds.length > 0) {
        const { Op } = require('sequelize');
        const validPermissions = await Permission.findAll({
            where: {
                id: {
                    [Op.in]: permissionIds
                },
                status: 1
            }
        });
        if (validPermissions.length !== permissionIds.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, '包含无效的权限ID');
        }
    }

    await role.update({
        permissions: permissionIds || []
    });

    return role;
};

/**
 * 获取用户的所有权限
 * @param {Object} user - 用户对象
 * @returns {Array} 权限数组
 */
const getUserPermissions = async (user) => {
    if (!user || !user.role) return [];
    return await getRolePermissions(user.role);
};

/**
 * 获取用户的权限树结构
 * @param {Object} user - 用户对象
 * @returns {Array} 权限树数组
 */
const getUserPermissionTree = async (user) => {
    if (!user || !user.role) return [];

    const role = await getRoleByCode(user.role);
    if (!role || role.status !== 1 || !role.permissions) return [];

    return await Permission.getUserPermissionTree(role.permissions);
};

module.exports = {
    createRole,
    deleteRoleById,
    updateRoleById,
    getAllRoles,
    getOneBy,
    getAllBy,
    getRoleByCode,
    getDefaultRole,
    checkUserPermission,
    checkRolePermission,
    getUserPermissions,
    getRolePermissions,
    assignPermissionsToRole,
    getUserPermissionTree,
};
