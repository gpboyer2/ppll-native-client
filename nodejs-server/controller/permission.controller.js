/**
 * 权限控制器
 * 处理权限相关的HTTP请求，包括权限的增删改查和树形结构获取
 */
const permissionService = require("../service/permission.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const { sendSuccess, sendError } = require("../utils/api-response");

/**
 * 创建权限
 */
const createPermission = catchAsync(async (req, res) => {
  const result = await permissionService.createPermission(req.body);
  return sendSuccess(res, result, '创建权限成功', 201);
});

/**
 * 删除权限
 */
const deletePermission = catchAsync(async (req, res) => {
  const result = await permissionService.deletePermissionById(req.body.id || req.params.id);
  return sendSuccess(res, result, '删除权限成功');
});

/**
 * 更新权限
 */
const updatePermission = catchAsync(async (req, res) => {
  const permissionId = req.body.id || req.params.id;
  const result = await permissionService.updatePermissionById(permissionId, req.body);
  return sendSuccess(res, result, '更新权限成功');
});

/**
 * 查询权限
 */
const queryPermissions = catchAsync(async (req, res) => {
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

  return sendSuccess(res, {
    list: permissions,
    pagination: {
      currentPage: Number(currentPage),
      pageSize: Number(pageSize),
      total: totalPermissions.length
    }
  }, '查询权限成功');
});

/**
 * 获取权限树
 */
const getPermissionTree = catchAsync(async (req, res) => {
  const { parentId } = req.query;
  const result = await permissionService.getPermissionTree(parentId ? Number(parentId) : 0);
  return sendSuccess(res, result, '获取权限树成功');
});

/**
 * 获取菜单树
 */
const getMenuTree = catchAsync(async (req, res) => {
  const { permissionIds } = req.query;
  let ids = null;

  if (permissionIds) {
    ids = permissionIds.split(',').map(id => Number(id));
  }

  const result = await permissionService.getMenuTree(ids);
  return sendSuccess(res, result, '获取菜单树成功');
});

/**
 * 根据类型获取权限
 */
const getPermissionsByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const result = await permissionService.getPermissionsByType(Number(type));
  return sendSuccess(res, result, '获取权限成功');
});

/**
 * 根据权限编码获取权限详情
 */
const getPermissionByCode = catchAsync(async (req, res) => {
  const { code } = req.params;
  const result = await permissionService.getPermissionByCode(code);

  if (!result) {
    return sendError(res, '权限不存在', 404);
  }

  return sendSuccess(res, result, '获取权限详情成功');
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