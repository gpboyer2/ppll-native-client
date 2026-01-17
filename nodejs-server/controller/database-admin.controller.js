/**
 * 数据库管理控制器
 * 处理数据库管理相关的请求和响应
 */
const databaseAdminService = require('../service/database-admin.service.js');
const catchAsync = require('../utils/catch-async');


// 获取数据库概览信息
const getInfo = catchAsync(async (req, res) => {
  const data = await databaseAdminService.getInfo();
  return res.apiSuccess(data, '获取数据库信息成功');
});


// 获取表列表
const getTableList = catchAsync(async (req, res) => {
  const params = req.body || {};
  const data = await databaseAdminService.getTableList(params);
  return res.apiSuccess(data, '获取表列表成功');
});


// 获取表结构详情
const getTableDetail = catchAsync(async (req, res) => {
  const { tableName } = req.body || {};
  if (!tableName) {
    return res.apiError('表名不能为空');
  }
  const data = await databaseAdminService.getTableDetail(tableName);
  return res.apiSuccess(data, '获取表结构成功');
});


// 获取表数据
const getTableData = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  const data = await databaseAdminService.getTableData(params);
  return res.apiSuccess(data, '获取表数据成功');
});


// 创建数据
const createData = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('数据不能为空');
  }
  const data = await databaseAdminService.createData(params);
  return res.apiSuccess(data, '创建数据成功');
});


// 更新数据
const updateData = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('数据不能为空');
  }
  const data = await databaseAdminService.updateData(params);
  return res.apiSuccess(data, '更新数据成功');
});


// 删除数据
const deleteData = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('数据不能为空');
  }
  const data = await databaseAdminService.deleteData(params);
  return res.apiSuccess(data, '删除数据成功');
});


// 执行 SQL 查询
const executeQuery = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.sql) {
    return res.apiError('SQL 语句不能为空');
  }
  const data = await databaseAdminService.executeQuery(params);
  return res.apiSuccess(data, '执行查询成功');
});


// 创建表
const createTable = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
    return res.apiError('列不能为空');
  }
  const data = await databaseAdminService.createTable(params);
  return res.apiSuccess(data, '创建表成功');
});


// 删除表
const deleteTable = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('表名不能为空');
  }
  const data = await databaseAdminService.deleteTable(params);
  return res.apiSuccess(data, '删除表成功');
});


// 添加列
const createColumn = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.columnName) {
    return res.apiError('列名不能为空');
  }
  if (!params.type) {
    return res.apiError('列类型不能为空');
  }
  const data = await databaseAdminService.createColumn(params);
  return res.apiSuccess(data, '添加列成功');
});


// 删除列
const deleteColumn = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.columnName) {
    return res.apiError('列名不能为空');
  }
  const data = await databaseAdminService.deleteColumn(params);
  return res.apiSuccess(data, '删除列成功');
});


// 重命名表
const renameTable = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.newName) {
    return res.apiError('新表名不能为空');
  }
  const data = await databaseAdminService.renameTable(params);
  return res.apiSuccess(data, '重命名表成功');
});


// 复制表
const copyTable = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.newName) {
    return res.apiError('新表名不能为空');
  }
  const data = await databaseAdminService.copyTable(params);
  return res.apiSuccess(data, '复制表成功');
});


// 清空表
const truncateTable = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('表名不能为空');
  }
  const data = await databaseAdminService.truncateTable(params);
  return res.apiSuccess(data, '清空表成功');
});


// 重命名列
const renameColumn = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.oldName) {
    return res.apiError('原列名不能为空');
  }
  if (!params.newName) {
    return res.apiError('新列名不能为空');
  }
  const data = await databaseAdminService.renameColumn(params);
  return res.apiSuccess(data, '重命名列成功');
});


// 创建索引
const createIndex = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.tableName) {
    return res.apiError('表名不能为空');
  }
  if (!params.indexName) {
    return res.apiError('索引名不能为空');
  }
  if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
    return res.apiError('列不能为空');
  }
  const data = await databaseAdminService.createIndex(params);
  return res.apiSuccess(data, '创建索引成功');
});


// 删除索引
const deleteIndex = catchAsync(async (req, res) => {
  const params = req.body || {};
  if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
    return res.apiError('索引名不能为空');
  }
  const data = await databaseAdminService.deleteIndex(params);
  return res.apiSuccess(data, '删除索引成功');
});


module.exports = {
  getInfo,
  getTableList,
  getTableDetail,
  getTableData,
  createData,
  updateData,
  deleteData,
  executeQuery,
  createTable,
  deleteTable,
  createColumn,
  deleteColumn,
  renameTable,
  copyTable,
  truncateTable,
  renameColumn,
  createIndex,
  deleteIndex
};
