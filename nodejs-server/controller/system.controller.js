/**
 * 系统控制器
 * 处理系统相关的请求和响应
 */
const systemService = require('../service/system.service.js');


/**
 * 获取本机 IPv4 地址列表
 */
const getIPv4List = (req, res) => {
  try {
    const ipList = systemService.getIPv4List();
    res.send({
      status: 'success',
      code: 200,
      data: ipList
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取 IPv4 地址列表失败',
      error: error.message
    });
  }
};


/**
 * 获取 Git 信息
 */
const getGitInfo = (req, res) => {
  try {
    const gitInfo = systemService.getGitInfo();
    if (!gitInfo) {
      res.status(500).send({
        status: 'error',
        code: 500,
        message: 'Git 信息未初始化'
      });
      return;
    }
    res.send({
      status: 'success',
      code: 200,
      data: gitInfo
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取 Git 信息失败',
      error: error.message
    });
  }
};


/**
 * 获取系统健康状态
 */
const getHealth = async (req, res) => {
  try {
    const healthData = await systemService.getHealth();
    res.send({
      status: 'success',
      code: 200,
      data: healthData
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取健康状态失败',
      error: error.message
    });
  }
};


module.exports = {
  getIPv4List,
  getGitInfo,
  getHealth,
  // 数据库管理
  getDatabaseInfo,
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
  deleteColumn
};


// ==================== 数据库管理相关 ====================

/**
 * 获取数据库概览信息
 */
const getDatabaseInfo = async (req, res) => {
  try {
    const data = await systemService.getDatabaseInfo();
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '获取数据库信息失败',
      data: null
    });
  }
};

/**
 * 获取表列表
 * POST /v1/system/database/tables  body: { currentPage, pageSize, keyword }
 */
const getTableList = async (req, res) => {
  try {
    const params = req.body || {};
    const data = await systemService.getTableList(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '获取表列表失败',
      data: null
    });
  }
};

/**
 * 获取表结构详情
 * POST /v1/system/database/table-detail  body: { tableName }
 */
const getTableDetail = async (req, res) => {
  try {
    const { tableName } = req.body || {};
    if (!tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.getTableDetail(tableName);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '获取表结构失败',
      data: null
    });
  }
};

/**
 * 获取表数据
 * POST /v1/system/database/table-data  body: { tableName, currentPage, pageSize, sortBy, sortOrder }
 */
const getTableData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.getTableData(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '获取表数据失败',
      data: null
    });
  }
};

/**
 * 创建数据
 * POST /v1/system/database/data-create  body: { tableName, data: [] }
 */
const createData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({
        code: 400,
        message: '数据不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.createData(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '创建数据失败',
      data: null
    });
  }
};

/**
 * 更新数据
 * PUT /v1/system/database/data-update  body: { tableName, data: [] }
 */
const updateData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({
        code: 400,
        message: '数据不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.updateData(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '更新数据失败',
      data: null
    });
  }
};

/**
 * 删除数据
 * DELETE /v1/system/database/data-delete  body: { tableName, data: [] }
 */
const deleteData = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({
        code: 400,
        message: '数据不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.deleteData(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '删除数据失败',
      data: null
    });
  }
};

/**
 * 执行 SQL 查询
 * POST /v1/system/database/query  body: { sql, queryParams: [] }
 */
const executeQuery = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.sql) {
      res.send({
        code: 400,
        message: 'SQL 语句不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.executeQuery(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '执行查询失败',
      data: null
    });
  }
};

/**
 * 创建表
 * POST /v1/system/database/table-create  body: { tableName, columns: [] }
 */
const createTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.columns || !Array.isArray(params.columns) || params.columns.length === 0) {
      res.send({
        code: 400,
        message: '列不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.createTable(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '创建表失败',
      data: null
    });
  }
};

/**
 * 删除表
 * DELETE /v1/system/database/table-delete  body: { data: [] }
 */
const deleteTable = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.deleteTable(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '删除表失败',
      data: null
    });
  }
};

/**
 * 添加列
 * POST /v1/system/database/column-create  body: { tableName, columnName, type, nullable, defaultValue }
 */
const createColumn = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.columnName) {
      res.send({
        code: 400,
        message: '列名不能为空',
        data: null
      });
      return;
    }
    if (!params.type) {
      res.send({
        code: 400,
        message: '列类型不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.createColumn(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '添加列失败',
      data: null
    });
  }
};

/**
 * 删除列
 * DELETE /v1/system/database/column-delete  body: { tableName, columnName }
 */
const deleteColumn = async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.tableName) {
      res.send({
        code: 400,
        message: '表名不能为空',
        data: null
      });
      return;
    }
    if (!params.columnName) {
      res.send({
        code: 400,
        message: '列名不能为空',
        data: null
      });
      return;
    }
    const data = await systemService.deleteColumn(params);
    res.send({
      code: 200,
      message: '操作成功',
      data: data
    });
  } catch (error) {
    res.send({
      code: 500,
      message: error.message || '删除列失败',
      data: null
    });
  }
};
