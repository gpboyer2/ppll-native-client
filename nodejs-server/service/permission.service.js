/**
 * 权限服务
 * 提供权限管理相关的业务逻辑处理，包括权限信息查询、树形结构构建等功能
 */
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const db = require("../models");
const Permission = db.permissions;

/**
 * 创建权限
 * @param {Object} params - 权限参数
 * @returns {Object} 创建的权限信息
 */
const createPermission = async (params) => {
    const {
        name, code, type, parentId = 0, path, icon, component,
        method, url, sort = 0, status = 1, isShow = 1, description
    } = params;

    // 检查权限编码是否已存在
    const existingPermission = await Permission.isCodeTaken(code);
    if (existingPermission) {
        throw new ApiError(httpStatus.CONFLICT, '权限编码已存在');
    }

    // 验证父权限是否存在
    if (parentId && parentId !== 0) {
        const parentPermission = await getOneBy({ id: parentId });
        if (!parentPermission) {
            throw new ApiError(httpStatus.BAD_REQUEST, '父权限不存在');
        }
    }

    const permission = {
        name,
        code,
        type,
        parentId,
        path,
        icon,
        component,
        method,
        url,
        sort,
        status,
        isShow,
        description
    };

    const createdPermission = await Permission.create(permission);
    return createdPermission;
};

/**
 * 根据ID删除权限
 * @param {number} permissionId - 权限ID
 * @returns {Object} 删除的权限信息
 */
const deletePermissionById = async (permissionId) => {
    try {
        const permission = await getOneBy({ id: permissionId });
        if (!permission) {
            throw new ApiError(httpStatus.NOT_FOUND, '权限不存在');
        }

        // 检查是否有子权限
        const childrenCount = await Permission.count({
            where: { parentId: permissionId }
        });

        if (childrenCount > 0) {
            throw new ApiError(httpStatus.CONFLICT, '该权限还有子权限，无法删除');
        }

        // 检查是否有角色在使用该权限
        const { Op } = require('sequelize');
        const rolesUsingPermission = await db.roles.count({
            where: {
                permissions: {
                    [Op.like]: `%${permissionId}%`
                }
            }
        });

        if (rolesUsingPermission > 0) {
            throw new ApiError(httpStatus.CONFLICT, '该权限还有角色在使用，无法删除');
        }

        await permission.destroy();
        return permission;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
    }
};

/**
 * 根据ID更新权限
 * @param {number} permissionId - 权限ID
 * @param {Object} updateBody - 更新数据
 * @returns {Object} 更新后的权限信息
 */
const updatePermissionById = async (permissionId, updateBody) => {
    try {
        const existingPermission = await getOneBy({ id: permissionId });
        if (!existingPermission) {
            throw new ApiError(httpStatus.NOT_FOUND, '权限不存在');
        }

        const {
            name, code, type, parentId, path, icon, component,
            method, url, sort, status, isShow, description
        } = updateBody;

        // 如果要更新权限编码，检查新编码是否已存在
        if (code && code !== existingPermission.code) {
            const isCodeExists = await Permission.isCodeTaken(code, permissionId);
            if (isCodeExists) {
                throw new ApiError(httpStatus.CONFLICT, '权限编码已存在');
            }
        }

        // 验证父权限是否存在
        if (parentId !== undefined && parentId !== existingPermission.parentId) {
            if (parentId !== 0) {
                const parentPermission = await getOneBy({ id: parentId });
                if (!parentPermission) {
                    throw new ApiError(httpStatus.BAD_REQUEST, '父权限不存在');
                }
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (code !== undefined) updateData.code = code;
        if (type !== undefined) updateData.type = type;
        if (parentId !== undefined) updateData.parentId = parentId;
        if (path !== undefined) updateData.path = path;
        if (icon !== undefined) updateData.icon = icon;
        if (component !== undefined) updateData.component = component;
        if (method !== undefined) updateData.method = method;
        if (url !== undefined) updateData.url = url;
        if (sort !== undefined) updateData.sort = sort;
        if (status !== undefined) updateData.status = status;
        if (isShow !== undefined) updateData.isShow = isShow;
        if (description !== undefined) updateData.description = description;

        const [affectedRows] = await Permission.update(updateData, {
            where: { id: permissionId }
        });

        if (affectedRows === 0) {
            throw new ApiError(httpStatus.NOT_FOUND, '更新失败，权限不存在');
        }

        return await getOneBy({ id: permissionId });
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
    }
};

/**
 * 获取所有权限
 * @param {Object} filter - 过滤条件
 * @param {Object} options - 选项
 * @returns {Array} 权限列表
 */
const getAllPermissions = async (filter = {}, options = {}) => {
    const { status, type, parentId } = filter;
    const { limit, offset } = options;
    const whereCondition = {};

    if (status !== undefined) whereCondition.status = status;
    if (type !== undefined) whereCondition.type = type;
    if (parentId !== undefined) whereCondition.parentId = parentId;

    const queryOptions = {
        where: whereCondition,
        order: [['sort', 'ASC'], ['created_at', 'DESC']]
    };

    if (limit) queryOptions.limit = parseInt(limit);
    if (offset) queryOptions.offset = parseInt(offset);

    const permissions = await Permission.findAll(queryOptions);
    return permissions;
};

/**
 * 根据条件获取单个权限
 * @param {Object} field - 查询条件
 * @returns {Object|null} 权限信息
 */
const getOneBy = async (field) => {
    return Permission.findOne({ where: field });
};

/**
 * 根据条件获取多个权限
 * @param {Object} field - 查询条件
 * @returns {Array} 权限列表
 */
const getAllBy = async (field) => {
    return Permission.findAll({
        where: field,
        order: [['sort', 'ASC']]
    });
};

/**
 * 获取权限树形结构
 * @param {number} parentId - 父权限ID
 * @returns {Array} 权限树
 */
const getPermissionTree = async (parentId = 0) => {
    return await Permission.getTreeStructure(parentId);
};

/**
 * 根据类型获取权限
 * @param {number} type - 权限类型
 * @returns {Array} 权限列表
 */
const getPermissionsByType = async (type) => {
    return await Permission.getByType(type);
};

/**
 * 根据权限编码获取权限
 * @param {string} code - 权限编码
 * @returns {Object|null} 权限信息
 */
const getPermissionByCode = async (code) => {
    let result = await Permission.getByCode(code);
    return result;
};

/**
 * 获取菜单权限树（只包含菜单类型且显示的权限）
 * @param {Array} permissionIds - 权限ID数组
 * @returns {Array} 菜单树
 */
const getMenuTree = async (permissionIds = null) => {
    let whereCondition = {
        type: 1, // 菜单类型
        status: 1,
        isShow: 1
    };

    if (permissionIds && permissionIds.length > 0) {
        const { Op } = require('sequelize');
        whereCondition.id = {
            [Op.in]: permissionIds
        };
    }

    const menuPermissions = await Permission.findAll({
        where: whereCondition,
        order: [['sort', 'ASC']]
    });

    // 构建树形结构
    const buildTree = (permissions, parentId = 0) => {
        const children = permissions.filter(p => p.parentId === parentId);
        return children.map(child => {
            const item = child.toJSON();
            const subChildren = buildTree(permissions, child.id);
            if (subChildren.length > 0) {
                item.children = subChildren;
            }
            return item;
        });
    };

    return buildTree(menuPermissions);
};

module.exports = {
    createPermission,
    deletePermissionById,
    updatePermissionById,
    getAllPermissions,
    getOneBy,
    getAllBy,
    getPermissionTree,
    getPermissionsByType,
    getPermissionByCode,
    getMenuTree,
};