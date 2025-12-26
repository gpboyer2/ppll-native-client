/**
 * 系统服务层
 * 提供系统相关的业务逻辑，包括获取本机网络信息等
 */
const ipUtil = require('../utils/ip');
const db = require('../models');
const SocketIOManager = require('../managers/SocketIOManager');


// 服务启动时间
const SERVICE_START_TIME = Date.now();


/**
 * 格式化运行时长
 * @param {number} uptimeMs 运行时长（毫秒）
 * @returns {string} 格式化后的时长
 */
const formatUptime = (uptimeMs) => {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`;
  }
  return `${seconds}秒`;
};


/**
 * 获取本机所有 IPv4 地址列表
 * @returns {Array<string>} IPv4 地址数组
 */
const getIPv4List = () => {
  try {
    const ipList = ipUtil.getIp();
    return ipList;
  } catch (error) {
    console.error('获取 IPv4 地址列表失败:', error);
    return [];
  }
};


/**
 * 获取 Git 信息
 * @returns {object} Git 信息对象
 */
const getGitInfo = () => {
  // 从全局对象获取 git 信息（由 jobs/git.js 在启动时写入）
  return (global && global.GIT_INFO) || null;
};


/**
 * 获取系统健康状态
 * @returns {Promise<object>} 健康状态信息
 */
const getHealth = async () => {
  // 进程信息
  const pid = process.pid;
  const uptimeMs = Date.now() - SERVICE_START_TIME;

  // 数据库健康检查
  let dbHealthy = false;
  try {
    await db.sequelize.authenticate();
    const tables = await db.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables[0].map(t => t.name);
    dbHealthy = tableNames.includes('users') && tableNames.includes('grid_strategies');
  } catch (e) {
    dbHealthy = false;
  }

  // 资源使用
  const memUsage = process.memoryUsage();
  const memoryUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memoryTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memoryPercentage = memoryTotal > 0 ? parseFloat((memoryUsed / memoryTotal * 100).toFixed(2)) : 0;

  const cpuUsage = process.cpuUsage();
  const cpuUser = cpuUsage.user / 1000000;
  const cpuSystem = cpuUsage.system / 1000000;

  // 连接统计
  const wsStats = global.wsManager?.getStats() || { active: 0, total: 0 };
  const socketioStats = SocketIOManager.getStats();

  return {
    service: {
      isRunning: true,
      pid,
      startTime: new Date(SERVICE_START_TIME).toISOString(),
      uptime: formatUptime(uptimeMs)
    },
    health: {
      isHealthy: dbHealthy,
      database: {
        healthy: dbHealthy
      }
    },
    resources: {
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        percentage: memoryPercentage
      },
      cpu: {
        user: parseFloat(cpuUser.toFixed(2)),
        system: parseFloat(cpuSystem.toFixed(2))
      }
    },
    connections: {
      websocket: {
        active: wsStats.active,
        public: wsStats.public || 0,
        userData: wsStats.userData || 0,
        total: wsStats.total
      },
      socketio: {
        active: socketioStats.active,
        total: socketioStats.total
      }
    }
  };
};


// ==================== 数据库管理相关 ====================

const fs = require('fs');
const path = require('path');

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 获取数据库概览信息
 * @returns {Promise<object>} 数据库信息
 */
const getDatabaseInfo = async () => {
  try {
    const storagePath = db.storagePath;

    // 获取数据库文件大小
    let fileSize = 0;
    let fileExists = false;
    if (storagePath && fs.existsSync(storagePath)) {
      const stats = fs.statSync(storagePath);
      fileSize = stats.size;
      fileExists = true;
    }

    // 获取所有表
    const tables = await db.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tableList = tables[0].map(t => t.name);

    // 获取总记录数
    let totalRows = 0;
    for (const tableName of tableList) {
      try {
        const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        totalRows += countResult[0][0].count;
      } catch (e) {
        // 表可能不存在或无法访问
      }
    }

    // 获取 SQLite 版本
    const versionResult = await db.sequelize.query("SELECT sqlite_version() as version");
    const version = versionResult[0][0].version;

    return {
      filePath: storagePath || '',
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
      tableCount: tableList.length,
      totalRows: totalRows,
      version: version,
      fileExists: fileExists
    };
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    throw error;
  }
};

/**
 * 获取表列表
 * @param {object} params 查询参数
 * @returns {Promise<object>} 表列表
 */
const getTableList = async (params = {}) => {
  try {
    const { currentPage = 1, pageSize = 20, keyword = '' } = params;

    // 获取所有表
    let sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    if (keyword) {
      sql += ` AND name LIKE '%${keyword}%'`;
    }
    sql += " ORDER BY name";

    const tables = await db.sequelize.query(sql);
    let tableList = tables[0].map(t => t.name);

    // 获取每个表的行数和大小
    const resultList = [];
    for (const tableName of tableList) {
      try {
        // 获取行数
        const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = countResult[0][0].count;

        // 获取表大小（通过 pgsize）
        const sizeResult = await db.sequelize.query(
          `SELECT SUM(pgsize) as size FROM dbstat WHERE name='${tableName}'`
        );
        const size = sizeResult[0][0].size || 0;

        resultList.push({
          name: tableName,
          rowCount: rowCount,
          size: formatFileSize(size)
        });
      } catch (e) {
        resultList.push({
          name: tableName,
          rowCount: 0,
          size: '0 B'
        });
      }
    }

    // 分页处理
    const total = resultList.length;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageList = resultList.slice(start, end);

    return {
      list: pageList,
      pagination: {
        currentPage: Number(currentPage),
        pageSize: Number(pageSize),
        total: total
      }
    };
  } catch (error) {
    console.error('获取表列表失败:', error);
    throw error;
  }
};

/**
 * 获取表结构详情
 * @param {string} tableName 表名
 * @returns {Promise<object>} 表结构详情
 */
const getTableDetail = async (tableName) => {
  try {
    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    // 获取表信息
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
      defaultValue: col.dflt_value,
      primaryKey: col.pk > 0
    }));

    // 获取索引信息
    const indexInfo = await db.sequelize.query(`PRAGMA index_list("${tableName}")`);
    const indexes = [];
    for (const index of indexInfo[0]) {
      const indexColumns = await db.sequelize.query(`PRAGMA index_info("${index.name}")`);
      indexes.push({
        name: index.name,
        unique: index.unique === 1,
        columns: indexColumns[0].map(ic => ic.name)
      });
    }

    // 获取行数
    const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const rowCount = countResult[0][0].count;

    // 获取建表语句
    const createTable = await db.sequelize.query(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`
    );
    const createSql = createTable[0].length > 0 ? createTable[0][0].sql : '';

    return {
      tableName: tableName,
      columns: columns,
      indexes: indexes,
      rowCount: rowCount,
      createSql: createSql
    };
  } catch (error) {
    console.error('获取表结构失败:', error);
    throw error;
  }
};

/**
 * 获取表数据
 * @param {object} params 查询参数
 * @returns {Promise<object>} 表数据
 */
const getTableData = async (params) => {
  try {
    const { tableName, currentPage = 1, pageSize = 20, sortBy = '', sortOrder = 'ASC' } = params;

    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    // 获取表的列信息
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => col.name);

    // 构建查询
    let countSql = `SELECT COUNT(*) as count FROM "${tableName}"`;
    const countResult = await db.sequelize.query(countSql);
    const total = countResult[0][0].count;

    // 构建排序
    let orderClause = '';
    if (sortBy && columns.includes(sortBy)) {
      orderClause = ` ORDER BY "${sortBy}" ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
    } else if (columns.length > 0) {
      orderClause = ` ORDER BY "${columns[0]}" ASC`;
    }

    // 构建分页
    const offset = (currentPage - 1) * pageSize;
    const limitClause = ` LIMIT ${pageSize} OFFSET ${offset}`;

    // 查询数据
    const dataSql = `SELECT * FROM "${tableName}"${orderClause}${limitClause}`;
    const dataResult = await db.sequelize.query(dataSql);
    const rows = dataResult[0];

    return {
      columns: columns,
      list: rows,
      pagination: {
        currentPage: Number(currentPage),
        pageSize: Number(pageSize),
        total: total
      }
    };
  } catch (error) {
    console.error('获取表数据失败:', error);
    throw error;
  }
};

/**
 * 创建数据（支持批量插入）
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const createData = async (params) => {
  try {
    const { tableName, data } = params;

    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    // 获取表的列信息
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => col.name);

    // 构建插入语句
    const keys = Object.keys(data[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const columnsStr = keys.map(k => `"${k}"`).join(', ');

    let insertedCount = 0;
    const errors = [];

    // 批量插入
    for (const item of data) {
      try {
        const values = keys.map(k => item[k]);
        await db.sequelize.query(
          `INSERT INTO "${tableName}" (${columnsStr}) VALUES (${placeholders})`,
          { replacements: values }
        );
        insertedCount++;
      } catch (e) {
        errors.push({ data: item, error: e.message });
      }
    }

    return {
      successCount: insertedCount,
      failCount: errors.length,
      errors: errors
    };
  } catch (error) {
    console.error('创建数据失败:', error);
    throw error;
  }
};

/**
 * 更新数据（支持批量更新）
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const updateData = async (params) => {
  try {
    const { tableName, data } = params;

    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    // 获取表的主键
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const primaryKey = tableInfo[0].find(col => col.pk > 0);
    if (!primaryKey) {
      throw new Error('表没有主键，无法更新');
    }
    const pkName = primaryKey.name;

    let updatedCount = 0;
    const errors = [];

    // 批量更新
    for (const item of data) {
      try {
        if (item[pkName] === undefined || item[pkName] === null) {
          throw new Error('缺少主键值');
        }

        // 构建更新语句
        const setClause = Object.keys(item)
          .filter(k => k !== pkName)
          .map(k => `"${k}" = ?`)
          .join(', ');
        const values = Object.keys(item)
          .filter(k => k !== pkName)
          .map(k => item[k]);
        values.push(item[pkName]);

        await db.sequelize.query(
          `UPDATE "${tableName}" SET ${setClause} WHERE "${pkName}" = ?`,
          { replacements: values }
        );
        updatedCount++;
      } catch (e) {
        errors.push({ data: item, error: e.message });
      }
    }

    return {
      successCount: updatedCount,
      failCount: errors.length,
      errors: errors
    };
  } catch (error) {
    console.error('更新数据失败:', error);
    throw error;
  }
};

/**
 * 删除数据（支持批量删除）
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const deleteData = async (params) => {
  try {
    const { tableName, data } = params;

    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    // 获取表的主键
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const primaryKey = tableInfo[0].find(col => col.pk > 0);
    if (!primaryKey) {
      throw new Error('表没有主键，无法删除');
    }
    const pkName = primaryKey.name;

    let deletedCount = 0;
    const errors = [];

    // 批量删除
    for (const pkValue of data) {
      try {
        await db.sequelize.query(
          `DELETE FROM "${tableName}" WHERE "${pkName}" = ?`,
          { replacements: [pkValue] }
        );
        deletedCount++;
      } catch (e) {
        errors.push({ id: pkValue, error: e.message });
      }
    }

    return {
      successCount: deletedCount,
      failCount: errors.length,
      errors: errors
    };
  } catch (error) {
    console.error('删除数据失败:', error);
    throw error;
  }
};

/**
 * 执行 SQL 查询
 * @param {object} params 参数
 * @returns {Promise<object>} 查询结果
 */
const executeQuery = async (params) => {
  try {
    const { sql, queryParams = [] } = params;

    // 安全检查：只允许 SELECT 语句
    const trimSql = sql.trim().toUpperCase();
    if (!trimSql.startsWith('SELECT') && !trimSql.startsWith('PRAGMA')) {
      throw new Error('仅允许执行 SELECT 和 PRAGMA 查询');
    }

    // 禁止危险操作
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of dangerousKeywords) {
      if (trimSql.includes(keyword)) {
        throw new Error(`查询包含危险关键字: ${keyword}`);
      }
    }

    const result = await db.sequelize.query(sql, {
      replacements: queryParams
    });

    const rows = result[0] || [];

    return {
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      list: rows,
      rowCount: rows.length
    };
  } catch (error) {
    console.error('执行查询失败:', error);
    throw error;
  }
};

/**
 * 创建表
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const createTable = async (params) => {
  try {
    const { tableName, columns } = params;

    // 验证表名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('列必须是非空数组');
    }

    // 构建创建表语句
    const columnDefs = columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTOINCREMENT';
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    }).join(', ');

    const sql = `CREATE TABLE "${tableName}" (${columnDefs})`;

    await db.sequelize.query(sql);

    return {
      success: true,
      tableName: tableName
    };
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
};

/**
 * 删除表（支持批量删除）
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const deleteTable = async (params) => {
  try {
    const { data } = params;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('表名必须是非空数组');
    }

    let deletedCount = 0;
    const errors = [];

    for (const tableName of data) {
      try {
        // 验证表名安全性
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
          throw new Error('表名包含非法字符');
        }

        await db.sequelize.query(`DROP TABLE IF EXISTS "${tableName}"`);
        deletedCount++;
      } catch (e) {
        errors.push({ table: tableName, error: e.message });
      }
    }

    return {
      successCount: deletedCount,
      failCount: errors.length,
      errors: errors
    };
  } catch (error) {
    console.error('删除表失败:', error);
    throw error;
  }
};

/**
 * 添加列
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const createColumn = async (params) => {
  try {
    const { tableName, columnName, type, nullable = true, defaultValue } = params;

    // 验证表名和列名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error('列名包含非法字符');
    }

    // 构建添加列语句
    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${type}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue !== undefined) sql += ` DEFAULT ${defaultValue}`;

    await db.sequelize.query(sql);

    return {
      success: true,
      tableName: tableName,
      columnName: columnName
    };
  } catch (error) {
    console.error('添加列失败:', error);
    throw error;
  }
};

/**
 * 删除列
 * @param {object} params 参数
 * @returns {Promise<object>} 操作结果
 */
const deleteColumn = async (params) => {
  try {
    const { tableName, columnName } = params;

    // 验证表名和列名安全性
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error('列名包含非法字符');
    }

    // SQLite 不支持直接删除列，需要重建表
    // 获取原表结构
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].filter(col => col.name !== columnName);

    if (columns.length === tableInfo[0].length) {
      throw new Error('列不存在');
    }

    // 获取建表语句
    const createTableResult = await db.sequelize.query(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`
    );
    const createSql = createTableResult[0][0]?.sql;

    if (!createSql) {
      throw new Error('无法获取表结构');
    }

    // 获取主键信息
    const pkInfo = tableInfo[0].filter(col => col.pk > 0);
    const pkNames = pkInfo.map(col => col.name);

    // 创建新表
    const newTableName = `${tableName}_new_${Date.now()}`;
    const columnDefs = columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.pk > 0) def += ' PRIMARY KEY';
      if (col.notnull === 1 && col.pk === 0) def += ' NOT NULL';
      if (col.dflt_value) def += ` DEFAULT ${col.dflt_value}`;
      return def;
    }).join(', ');

    const columnList = columns.map(col => `"${col.name}"`).join(', ');

    await db.sequelize.query(`CREATE TABLE "${newTableName}" (${columnDefs})`);

    // 复制数据
    await db.sequelize.query(`INSERT INTO "${newTableName}" SELECT ${columnList} FROM "${tableName}"`);

    // 删除旧表
    await db.sequelize.query(`DROP TABLE "${tableName}"`);

    // 重命名新表
    await db.sequelize.query(`ALTER TABLE "${newTableName}" RENAME TO "${tableName}"`);

    return {
      success: true,
      tableName: tableName,
      columnName: columnName
    };
  } catch (error) {
    console.error('删除列失败:', error);
    throw error;
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
