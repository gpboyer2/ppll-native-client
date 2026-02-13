/**
 * 数据库管理路由模块
 * 定义数据库管理相关的API路由
 */
const express = require("express");
const router = express.Router();
const databaseAdminController = require("../../controller/database-admin.controller.js");

/**
 * 获取数据库概览信息
 * GET /v1/database-admin/info
 */
router.get("/info", databaseAdminController.getInfo);

/**
 * 获取表列表
 * POST /v1/database-admin/tables  body: { currentPage, pageSize, keyword }
 */
router.post("/tables", databaseAdminController.getTableList);

/**
 * 获取表结构详情
 * POST /v1/database-admin/table-detail  body: { tableName }
 */
router.post("/table-detail", databaseAdminController.getTableDetail);

/**
 * 获取表数据
 * POST /v1/database-admin/table-data  body: { tableName, currentPage, pageSize, sortBy, sortOrder }
 */
router.post("/table-data", databaseAdminController.getTableData);

/**
 * 创建数据
 * POST /v1/database-admin/data-create  body: { tableName, data: [] }
 */
router.post("/data-create", databaseAdminController.createData);

/**
 * 更新数据
 * PUT /v1/database-admin/data-update  body: { tableName, data: [] }
 */
router.put("/data-update", databaseAdminController.updateData);

/**
 * 删除数据
 * DELETE /v1/database-admin/data-delete  body: { tableName, data: [] }
 */
router.delete("/data-delete", databaseAdminController.deleteData);

/**
 * 执行 SQL 查询
 * POST /v1/database-admin/query  body: { sql, queryParams: [] }
 */
router.post("/query", databaseAdminController.executeQuery);

/**
 * 创建表
 * POST /v1/database-admin/table-create  body: { tableName, columns: [] }
 */
router.post("/table-create", databaseAdminController.createTable);

/**
 * 删除表
 * DELETE /v1/database-admin/table-delete  body: { data: [] }
 */
router.delete("/table-delete", databaseAdminController.deleteTable);

/**
 * 添加列
 * POST /v1/database-admin/column-create  body: { tableName, columnName, type, nullable, defaultValue }
 */
router.post("/column-create", databaseAdminController.createColumn);

/**
 * 删除列
 * DELETE /v1/database-admin/column-delete  body: { tableName, columnName }
 */
router.delete("/column-delete", databaseAdminController.deleteColumn);

/**
 * 重命名表
 * POST /v1/database-admin/table-rename  body: { tableName, newName }
 */
router.post("/table-rename", databaseAdminController.renameTable);

/**
 * 复制表
 * POST /v1/database-admin/table-copy  body: { tableName, newName, copyData }
 */
router.post("/table-copy", databaseAdminController.copyTable);

/**
 * 清空表
 * POST /v1/database-admin/table-truncate  body: { data: [] }
 */
router.post("/table-truncate", databaseAdminController.truncateTable);

/**
 * 重命名列
 * POST /v1/database-admin/column-rename  body: { tableName, oldName, newName }
 */
router.post("/column-rename", databaseAdminController.renameColumn);

/**
 * 创建索引
 * POST /v1/database-admin/index-create  body: { tableName, indexName, columns: [], unique }
 */
router.post("/index-create", databaseAdminController.createIndex);

/**
 * 删除索引
 * DELETE /v1/database-admin/index-delete  body: { data: [] }
 */
router.delete("/index-delete", databaseAdminController.deleteIndex);

module.exports = router;
