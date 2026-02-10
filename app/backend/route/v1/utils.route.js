/**
 * 工具路由模块
 * 定义工具类API路由，包括文件上传、图片生成等实用功能
 */
const express = require('express');
const router = express.Router();
const utilsController = require('../../controller/utils.controller.js');


/**
 * @swagger
 * tags:
 *   name: Utils
 *   description: 工具接口，如定时建仓/定时平仓/定时查询账户信息等
 * 
 */


/**
 * @openapi
 * /v1/utils/timed:
 *  post:
 *     tags: [Utils]
 *     description: 定时建仓计划
 *     responses:
 *       200:
 *         description: 
 */
// TODO: 定时建仓计划接口未完成，暂时注释
// router.post('/timed', async (req, res) => {
//
//   /**
//    * 入参：
//    * 计划创建时间 plan_create_time
//    * 计划执行时间 plan_execute_time
//    * 用户的apikey apikey
//    * 用户的apisecret apisecret
//    * 是否仅执行一次 is_once
//    * 建仓的币种列表 [{ symbol: 'BTCUSDT', longAmount: 40, shortAmount: 20 }]
//    *
//    */
//   const { plan_create_time, apiKey, apiSecret, is_once, symbolList } = req.body;
//
//   res.send({
//     status: 'success',
//     code: 200,
//     data: JSON.parse(accountInfo)
//   });
// });


module.exports = router;
