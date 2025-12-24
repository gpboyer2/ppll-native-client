/**
 * Twitter路由模块
 * 定义Twitter相关的API路由，提供Twitter数据获取功能
 */
const express = require('express');
const twitterController = require('../../controller/twitter.controller.js');

const router = express.Router();

router.get(
    '/download-media',
    twitterController.downloadMedia
);

module.exports = router;
