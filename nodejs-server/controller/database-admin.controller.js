/**
 * 数据库管理控制器
 * 处理数据库管理相关的请求和响应
 */
const databaseAdminService = require('../service/database-admin.service.js');


// 获取数据库概览信息
const getInfo = async (req, res) => {
  try {
    const data = await databaseAdminService.getInfo();
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '获取数据库信息失败', data: null });
  }
};


// 获取表列表
const getTableList = async (req, res) => {
  try {
    const params = req.body || {};
    const data = await databaseAdminService.getTableList(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '获取表列表失败', data: null });
  }
};


// 获取表结构详情
const getTableDetail = async (req, res) => {
  try {
    const { tableName } = req.body || {};
    if (!tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.getTableDetail(tableName);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '获取表结构失败', data: null });
  }
};


// 获取表数据
const getTableData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.getTableData(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '获取表数据失败', data: null });
  }
};


// 创建数据
const createData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '数据不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.createData(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '创建数据失败', data: null });
  }
};


// 更新数据
const updateData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '数据不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.updateData(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '更新数据失败', data: null });
  }
};


// 删除数据
const deleteData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '数据不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.deleteData(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '删除数据失败', data: null });
  }
};


// 执行 SQL 查询
const executeQuery = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.sql) {
      res.send({ code: 400, message: 'SQL 语句不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.executeQuery(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '执行查询失败', data: null });
  }
};


// 创建表
const createTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
      res.send({ code: 400, message: '列不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.createTable(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '创建表失败', data: null });
  }
};


// 删除表
const deleteTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.deleteTable(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '删除表失败', data: null });
  }
};


// 添加列
const createColumn = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.columnName) {
      res.send({ code: 400, message: '列名不能为空', data: null });
      return;
    }
    if (!params.type) {
      res.send({ code: 400, message: '列类型不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.createColumn(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '添加列失败', data: null });
  }
};


// 删除列
const deleteColumn = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.columnName) {
      res.send({ code: 400, message: '列名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.deleteColumn(params);
    res.send({ code: 200, message: '操作成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '删除列失败', data: null });
  }
};


// 重命名表
const renameTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.newName) {
      res.send({ code: 400, message: '新表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.renameTable(params);
    res.send({ code: 200, message: '重命名成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '重命名表失败', data: null });
  }
};


// 复制表
const copyTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.newName) {
      res.send({ code: 400, message: '新表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.copyTable(params);
    res.send({ code: 200, message: '复制表成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '复制表失败', data: null });
  }
};


// 清空表
const truncateTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.truncateTable(params);
    res.send({ code: 200, message: '清空表成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '清空表失败', data: null });
  }
};


// 重命名列
const renameColumn = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.oldName) {
      res.send({ code: 400, message: '原列名不能为空', data: null });
      return;
    }
    if (!params.newName) {
      res.send({ code: 400, message: '新列名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.renameColumn(params);
    res.send({ code: 200, message: '重命名成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '重命名列失败', data: null });
  }
};


// 创建索引
const createIndex = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({ code: 400, message: '表名不能为空', data: null });
      return;
    }
    if (!params.indexName) {
      res.send({ code: 400, message: '索引名不能为空', data: null });
      return;
    }
    if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
      res.send({ code: 400, message: '列不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.createIndex(params);
    res.send({ code: 200, message: '创建索引成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '创建索引失败', data: null });
  }
};


// 删除索引
const deleteIndex = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({ code: 400, message: '索引名不能为空', data: null });
      return;
    }
    const data = await databaseAdminService.deleteIndex(params);
    res.send({ code: 200, message: '删除索引成功', data: data });
  } catch (error) {
    res.send({ code: 500, message: error.message || '删除索引失败', data: null });
  }
};


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
