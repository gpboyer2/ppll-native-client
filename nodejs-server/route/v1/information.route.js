/**
 * 信息路由模块
 * 定义信息查询相关的API路由，提供各类数据信息获取功能
 */
const express = require('express');
const router = express.Router();
const { USDMClient } = require('binance');
const { proxy_obj } = require('../../binance/config.js');

const informationController = require('../../controller/information.controller.js');
const vipMiddleware = require("../../middleware/vip.js");

/**
 * 获取标记价格和资金费率信息
 * /v1/information/premiumIndex
 */
router.post('/premiumIndex', vipMiddleware.validateVipAccess, async (req, res) => {
  const { symbol, apiKey, apiSecret } = req.body;

  try {
    const options = {
      api_key: apiKey,
      api_secret: apiSecret,
      beautify: true,
    };

    const requestOptions = {
      timeout: 10000,
    };

    if (process.env.NODE_ENV !== "production") {
      requestOptions.proxy = proxy_obj;
    }

    const client = new USDMClient(options, requestOptions);
    const accountInfo = await client.getPremiumIndex(symbol ? { symbol } : {});

    res.send({
      status: 'success',
      code: 200,
      data: accountInfo
    });
  } catch (error) {
    res.send({
      status: 'error',
      code: 400,
      message: error.message || error
    });
  }
});

/**
 * 获取合约交易对及最新价格
 * /v1/information/ticker/price
 */
router.post('/ticker/price', vipMiddleware.validateVipAccess, async (req, res) => {
  const { apiKey, apiSecret } = req.body;

  try {
    const options = {
      api_key: apiKey,
      api_secret: apiSecret,
      beautify: true,
    };

    const requestOptions = {
      timeout: 10000,
    };

    if (process.env.NODE_ENV !== "production") {
      requestOptions.proxy = proxy_obj;
    }

    const client = new USDMClient(options, requestOptions);

    /** 获取交易规则和交易对 */
    const exchangeInfo = await client.getExchangeInfo();

    /** 遍历所有的永续合约, 并过滤掉非usdt合约 */
    const priceInfo = await client.getSymbolPriceTicker();
    const usdtTradingList = priceInfo.filter(item => {
      return item.symbol.endsWith('USDT')
    });

    if (usdtTradingList?.length) {
      res.send({
        status: 'success',
        code: 200,
        data: usdtTradingList
      });
    } else {
      res.send({
        status: 'error',
        code: 500,
        data: '获取失败'
      });
    }
  } catch (error) {
    res.send({
      status: 'error',
      code: 500,
      message: error.message || error
    });
  }
});


module.exports = router;



/**
 * @swagger
 * tags:
 *   name: Information
 *   description: 其他信息/不方便归纳的信息接口
 */

/**
 * @openapi
 * /v1/information/premiumIndex:
 *  post:
 *     tags: [Information]
 *     description: 当前币安用户的账户信息，包括API速率限制，杠杠倍数，最新标记价格和资金费率等等
 *     responses:
 *       200:
 *         description:
 */

/**
 * @openapi
 * /v1/ticker/price:
 *  post:
 *     tags: [Information]
 *     description: 返回合约交易对及其最新价格
 *     responses:
 *       200:
 *         description:
 */
