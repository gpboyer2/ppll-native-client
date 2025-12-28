/**
 * 数据库管理服务层
 * 提供数据库管理相关的业务逻辑
 */
const db = require('../models');
const fs = require('fs');


// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


// 获取数据库概览信息
const getInfo = async () => {
  try {
    const storagePath = db.storagePath;
    let fileSize = 0;
    let file_exists = false;
    if (storagePath && fs.existsSync(storagePath)) {
      const stats = fs.statSync(storagePath);
      fileSize = stats.size;
      file_exists = true;
    }

    const tables = await db.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tableList = tables[0].map(t => t.name);
    let total_rows = 0;
    for (const tableName of tableList) {
      try {
        const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        total_rows += countResult[0][0].count;
      } catch (e) {
        // 忽略单个表的统计错误，继续统计其他表
      }
    }

    const versionResult = await db.sequelize.query("SELECT sqlite_version() as version");
    const version = versionResult[0][0].version;

    return {
      filePath: storagePath || '',
      fileSize: fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
      tableCount: tableList.length,
      total_rows: total_rows,
      version: version,
      file_exists: file_exists
    };
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    throw error;
  }
};


// 获取表列表
const getTableList = async (params = {}) => {
  try {
    const { currentPage = 1, pageSize = 20, keyword = '' } = params;
    let sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    if (keyword) {
      sql += ` AND name LIKE '%${keyword}%'`;
    }
    sql += " ORDER BY name";

    const tables = await db.sequelize.query(sql);
    const tableList = tables[0].map(t => t.name);
    const resultList = [];

    for (const tableName of tableList) {
      try {
        const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = countResult[0][0].count;
        const sizeResult = await db.sequelize.query(`SELECT SUM(pgsize) as size FROM dbstat WHERE name='${tableName}'`);
        const size = sizeResult[0][0].size || 0;
        resultList.push({ name: tableName, rowCount: rowCount, size: formatFileSize(size) });
      } catch (e) {
        resultList.push({ name: tableName, rowCount: 0, size: '0 B' });
      }
    }

    const total = resultList.length;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageList = resultList.slice(start, end);

    return {
      list: pageList,
      pagination: { currentPage: Number(currentPage), pageSize: Number(pageSize), total: total }
    };
  } catch (error) {
    console.error('获取表列表失败:', error);
    throw error;
  }
};


// 获取表结构详情
const getTableDetail = async (tableName) => {
  try {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
      defaultValue: col.dflt_value,
      primaryKey: col.pk > 0
    }));

    const indexInfo = await db.sequelize.query(`PRAGMA index_list("${tableName}")`);
    const indexes = [];
    for (const index of indexInfo[0]) {
      const indexColumns = await db.sequelize.query(`PRAGMA index_info("${index.name}")`);
      indexes.push({ name: index.name, unique: index.unique === 1, columns: indexColumns[0].map(ic => ic.name) });
    }

    const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const rowCount = countResult[0][0].count;

    const createTable = await db.sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    const createSql = createTable[0].length > 0 ? createTable[0][0].sql : '';

    return { tableName: tableName, columns: columns, indexes: indexes, rowCount: rowCount, createSql: createSql };
  } catch (error) {
    console.error('获取表结构失败:', error);
    throw error;
  }
};


// 获取表数据
const getTableData = async (params) => {
  try {
    const { tableName, currentPage = 1, pageSize = 20, sortBy = '', sortOrder = 'ASC' } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => col.name);

    const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const total = countResult[0][0].count;

    let order_clause = '';
    if (sortBy && columns.includes(sortBy)) {
      order_clause = ` ORDER BY "${sortBy}" ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
    } else if (columns.length > 0) {
      order_clause = ` ORDER BY "${columns[0]}" ASC`;
    }

    const offset = (currentPage - 1) * pageSize;
    const limitClause = ` LIMIT ${pageSize} OFFSET ${offset}`;

    const dataSql = `SELECT * FROM "${tableName}"${order_clause}${limitClause}`;
    const dataResult = await db.sequelize.query(dataSql);
    const rows = dataResult[0];

    return {
      columns: columns,
      list: rows,
      pagination: { currentPage: Number(currentPage), pageSize: Number(pageSize), total: total }
    };
  } catch (error) {
    console.error('获取表数据失败:', error);
    throw error;
  }
};


// 创建数据
const createData = async (params) => {
  try {
    const { tableName, data } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].map(col => col.name);

    const keys = Object.keys(data[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const columnsStr = keys.map(k => `"${k}"`).join(', ');

    let inserted_count = 0;
    const errors = [];

    for (const item of data) {
      try {
        const values = keys.map(k => item[k]);
        await db.sequelize.query(`INSERT INTO "${tableName}" (${columnsStr}) VALUES (${placeholders})`, { replacements: values });
        inserted_count++;
      } catch (e) {
        errors.push({ data: item, error: e.message });
      }
    }

    return { success_count: inserted_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('创建数据失败:', error);
    throw error;
  }
};


// 更新数据
const updateData = async (params) => {
  try {
    const { tableName, data } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const primaryKey = tableInfo[0].find(col => col.pk > 0);
    if (!primaryKey) {
      throw new Error('表没有主键，无法更新');
    }
    const pkName = primaryKey.name;

    let updated_count = 0;
    const errors = [];

    for (const item of data) {
      try {
        if (item[pkName] === undefined || item[pkName] === null) {
          throw new Error('缺少主键值');
        }

        const setClause = Object.keys(item).filter(k => k !== pkName).map(k => `"${k}" = ?`).join(', ');
        const values = Object.keys(item).filter(k => k !== pkName).map(k => item[k]);
        values.push(item[pkName]);

        await db.sequelize.query(`UPDATE "${tableName}" SET ${setClause} WHERE "${pkName}" = ?`, { replacements: values });
        updated_count++;
      } catch (e) {
        errors.push({ data: item, error: e.message });
      }
    }

    return { success_count: updated_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('更新数据失败:', error);
    throw error;
  }
};


// 删除数据
const deleteData = async (params) => {
  try {
    const { tableName, data } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const primaryKey = tableInfo[0].find(col => col.pk > 0);
    if (!primaryKey) {
      throw new Error('表没有主键，无法删除');
    }
    const pkName = primaryKey.name;

    let deleted_count = 0;
    const errors = [];

    for (const pkValue of data) {
      try {
        await db.sequelize.query(`DELETE FROM "${tableName}" WHERE "${pkName}" = ?`, { replacements: [pkValue] });
        deleted_count++;
      } catch (e) {
        errors.push({ id: pkValue, error: e.message });
      }
    }

    return { success_count: deleted_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('删除数据失败:', error);
    throw error;
  }
};


// 执行 SQL 查询
const execute_query = async (params) => {
  try {
    const { sql, queryParams = [] } = params;
    const trimSql = sql.trim().toUpperCase();
    if (!trimSql.startsWith('SELECT') && !trimSql.startsWith('PRAGMA')) {
      throw new Error('仅允许执行 SELECT 和 PRAGMA 查询');
    }

    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of dangerousKeywords) {
      if (trimSql.includes(keyword)) {
        throw new Error(`查询包含危险关键字: ${keyword}`);
      }
    }

    const result = await db.sequelize.query(sql, { replacements: queryParams });
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


// 创建表
const createTable = async (params) => {
  try {
    const { tableName, columns } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('列必须是非空数组');
    }

    const columnDefs = columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTOINCREMENT';
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    }).join(', ');

    await db.sequelize.query(`CREATE TABLE "${tableName}" (${columnDefs})`);

    return { success: true, tableName: tableName };
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
};


// 删除表
const deleteTable = async (params) => {
  try {
    const { data } = params;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('表名必须是非空数组');
    }

    let deleted_count = 0;
    const errors = [];

    for (const tableName of data) {
      try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
          throw new Error('表名包含非法字符');
        }
        await db.sequelize.query(`DROP TABLE IF EXISTS "${tableName}"`);
        deleted_count++;
      } catch (e) {
        errors.push({ table: tableName, error: e.message });
      }
    }

    return { success_count: deleted_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('删除表失败:', error);
    throw error;
  }
};


// 添加列
const createColumn = async (params) => {
  try {
    const { tableName, columnName, type, nullable = true, defaultValue } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error('列名包含非法字符');
    }

    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${type}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue !== undefined) sql += ` DEFAULT ${defaultValue}`;

    await db.sequelize.query(sql);

    return { success: true, tableName: tableName, columnName: columnName };
  } catch (error) {
    console.error('添加列失败:', error);
    throw error;
  }
};


// 删除列
const deleteColumn = async (params) => {
  try {
    const { tableName, columnName } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error('列名包含非法字符');
    }

    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columns = tableInfo[0].filter(col => col.name !== columnName);
    if (columns.length === tableInfo[0].length) {
      throw new Error('列不存在');
    }

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
    await db.sequelize.query(`INSERT INTO "${newTableName}" SELECT ${columnList} FROM "${tableName}"`);
    await db.sequelize.query(`DROP TABLE "${tableName}"`);
    await db.sequelize.query(`ALTER TABLE "${newTableName}" RENAME TO "${tableName}"`);

    return { success: true, tableName: tableName, columnName: columnName };
  } catch (error) {
    console.error('删除列失败:', error);
    throw error;
  }
};


// 重命名表
const renameTable = async (params) => {
  try {
    const { tableName, newName } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
      throw new Error('新表名包含非法字符');
    }
    if (tableName === newName) {
      throw new Error('新表名不能与原表名相同');
    }

    // 检查新表名是否已存在
    const existingTable = await db.sequelize.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${newName}'`
    );
    if (existingTable[0].length > 0) {
      throw new Error('表名已存在');
    }

    await db.sequelize.query(`ALTER TABLE "${tableName}" RENAME TO "${newName}"`);

    return { success: true, oldName: tableName, newName: newName };
  } catch (error) {
    console.error('重命名表失败:', error);
    throw error;
  }
};


// 复制表
const copyTable = async (params) => {
  try {
    const { tableName, newName, copyData = true } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
      throw new Error('新表名包含非法字符');
    }
    if (tableName === newName) {
      throw new Error('新表名不能与原表名相同');
    }

    // 检查新表名是否已存在
    const existingTable = await db.sequelize.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${newName}'`
    );
    if (existingTable[0].length > 0) {
      throw new Error('表名已存在');
    }

    if (copyData) {
      // 复制表结构和数据
      await db.sequelize.query(`CREATE TABLE "${newName}" AS SELECT * FROM "${tableName}"`);
    } else {
      // 仅复制表结构
      const createTable = await db.sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      if (createTable[0].length === 0) {
        throw new Error('原表不存在');
      }
      const createSql = createTable[0][0].sql.replace(`CREATE TABLE "${tableName}"`, `CREATE TABLE "${newName}"`);
      await db.sequelize.query(createSql);
    }

    return { success: true, sourceTable: tableName, newTable: newName };
  } catch (error) {
    console.error('复制表失败:', error);
    throw error;
  }
};


// 清空表
const truncateTable = async (params) => {
  try {
    const { data } = params;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('表名必须是非空数组');
    }

    let truncated_count = 0;
    const errors = [];

    for (const tableName of data) {
      try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
          throw new Error('表名包含非法字符');
        }

        // 检查表是否存在
        const existingTable = await db.sequelize.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
        );
        if (existingTable[0].length === 0) {
          throw new Error('表不存在');
        }

        await db.sequelize.query(`DELETE FROM "${tableName}"`);

        // 重置自增序列
        await db.sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);

        truncated_count++;
      } catch (e) {
        errors.push({ table: tableName, error: e.message });
      }
    }

    return { success_count: truncated_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('清空表失败:', error);
    throw error;
  }
};


// 重命名列
const renameColumn = async (params) => {
  try {
    const { tableName, oldName, newName } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(oldName)) {
      throw new Error('原列名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
      throw new Error('新列名包含非法字符');
    }
    if (oldName === newName) {
      throw new Error('新列名不能与原列名相同');
    }

    // 检查列是否存在
    const tableInfo = await db.sequelize.query(`PRAGMA table_info("${tableName}")`);
    const columnExists = tableInfo[0].some(col => col.name === oldName);
    if (!columnExists) {
      throw new Error('列不存在');
    }

    // 检查新列名是否已存在
    const newColumnExists = tableInfo[0].some(col => col.name === newName);
    if (newColumnExists) {
      throw new Error('列名已存在');
    }

    await db.sequelize.query(`ALTER TABLE "${tableName}" RENAME COLUMN "${oldName}" TO "${newName}"`);

    return { success: true, tableName: tableName, oldName: oldName, newName: newName };
  } catch (error) {
    console.error('重命名列失败:', error);
    throw error;
  }
};


// 创建索引
const createIndex = async (params) => {
  try {
    const { tableName, indexName, columns = [], unique = false } = params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('表名包含非法字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(indexName)) {
      throw new Error('索引名包含非法字符');
    }
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('列必须是非空数组');
    }

    // 验证列名
    for (const col of columns) {
      if (!/^[a-zA-Z0-9_]+$/.test(col)) {
        throw new Error(`列名 "${col}" 包含非法字符`);
      }
    }

    // 检查索引名是否已存在
    const existingIndex = await db.sequelize.query(
      `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
    );
    if (existingIndex[0].length > 0) {
      throw new Error('索引名已存在');
    }

    const uniqueKeyword = unique ? 'UNIQUE' : '';
    const columnsStr = columns.map(col => `"${col}"`).join(', ');

    await db.sequelize.query(`CREATE ${uniqueKeyword} INDEX "${indexName}" ON "${tableName}" (${columnsStr})`);

    return { success: true, indexName: indexName, tableName: tableName, columns: columns, unique: unique };
  } catch (error) {
    console.error('创建索引失败:', error);
    throw error;
  }
};


// 删除索引
const deleteIndex = async (params) => {
  try {
    const { data } = params;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('索引名必须是非空数组');
    }

    let deleted_count = 0;
    const errors = [];

    for (const indexName of data) {
      try {
        if (!/^[a-zA-Z0-9_]+$/.test(indexName)) {
          throw new Error('索引名包含非法字符');
        }

        // 检查索引是否存在
        const existingIndex = await db.sequelize.query(
          `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
        );
        if (existingIndex[0].length === 0) {
          throw new Error('索引不存在');
        }

        await db.sequelize.query(`DROP INDEX "${indexName}"`);
        deleted_count++;
      } catch (e) {
        errors.push({ index: indexName, error: e.message });
      }
    }

    return { success_count: deleted_count, fail_count: errors.length, errors: errors };
  } catch (error) {
    console.error('删除索引失败:', error);
    throw error;
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
  execute_query,
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
