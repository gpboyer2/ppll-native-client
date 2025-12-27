/**
 * 角色权限配置
 * 为保持系统扩展性，保留权限体系接口
 * 当前主要使用角色验证：auth(['admin', 'super_admin'])
 * 权限验证作为未来扩展的预留接口
 */
const allRoles = {
  // 超级管理员 - 拥有所有权限
  super_admin: ['*'], // 通配符表示所有权限

  // 管理员 - 拥有管理权限
  admin: ['*'], // 目前与super_admin等效

  // 操作员 - 基本权限（默认角色）
  operator: ['updateSelf', 'viewPublic'],

  // 访客 - 只读权限
  guest: ['viewPublic'],

  // 普通用户 - 基本权限
  user: ['updateSelf', 'viewPublic']
};

const roleKeys = Object.keys(allRoles);
const roleValues = new Map(Object.entries(allRoles));

module.exports = {
  roleKeys,
  roleValues,
};
