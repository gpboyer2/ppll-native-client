/**
 * Binance ApiKey 路由模块
 * 单用户系统：定义 Binance ApiKey 管理相关的 API 路由
 */
const express = require('express');
const router = express.Router();
const binanceApiKeyController = require('../../controller/binance-api-key.controller.js');

/**
 * 创建 ApiKey
 * POST /v1/binance-api-key/create
 */
router.post('/create', binanceApiKeyController.createApiKey);

/**
 * 删除 ApiKey
 * POST /v1/binance-api-key/delete
 */
router.post('/delete', binanceApiKeyController.deleteApiKey);

/**
 * 更新 ApiKey
 * POST /v1/binance-api-key/update
 */
router.post('/update', binanceApiKeyController.updateApiKey);

/**
 * 查询 ApiKey 列表
 * GET /v1/binance-api-key/query
 */
router.get('/query', binanceApiKeyController.queryApiKey);

module.exports = router;
