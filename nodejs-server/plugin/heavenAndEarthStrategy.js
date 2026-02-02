/**
 * 天地针策略
 * 
 */

const path = require('path');
const dayjs = require('dayjs');
const bigNumber = require('bignumber.js');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require('../utils/record-log.js');
const StrategyLog = require('../utils/strategy-log.js');
const { USDMClient } = require('binance');
const binancePrecision = require('../utils/binance-precision');
const { normalizeDatatypes } = require('../utils/data-types.ts');

function HeavenAndEarthStrategy(options) {
  if (!new.target) {
    return new HeavenAndEarthStrategy(options);
  }

  const defaultOptions = {
    tradingPair: `BTCUSDT`,
    apiKey: `your_api_key`,
    apiSecret: `your_api_secret`,
    skyPrice: 100000,
    groundPrice: 50000,
    needlePrice: 75000,
    maxOpenPositionQuantity: 20,
    minOpenPositionQuantity: 0.2,
    grid_price_difference: 0.2,
    gridTradeQuantity: 0.2,
    pollingInterval: 10000
  };

  this.config = Object.assign({}, defaultOptions, options);

  this.paused = true;
  this.totalOpenPositionQuantity = 0;
  this.totalOpenPositionEntryPrice = 0;
  this.nextExpectedRisePrice = null;
  this.nextExpectedFallPrice = null;
  this.logs = [];
  this.positionOpenHistory = [];
  this.count = 0;
  this.throttleEnabled = false;
  this.orderOptions = {
    status: '',
    orderId: null,
    origClientOrderId: null,
  };

  let usdmClientConfig = {};

  if (process.env.NODE_ENV !== 'production') {
    const proxyConfig = getProxyConfig();
    if (proxyConfig) {
      usdmClientConfig.proxy = proxyConfig;
    }
  }

  /** 交易所信息缓存 */
  this.exchangeInfo = null;

  this.client = new USDMClient(
    {
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
    },
    usdmClientConfig
  );

  /** 策略日志记录器 */
  this.logger = StrategyLog.createLogger({
    symbol: this.config.tradingPair,
    apiKey: this.config.apiKey,
    market: 'um',
    direction: 'long'
  });

  /**
     * 获取交易所信息
     */
  this.getExchangeInfo = async () => {
    if (this.exchangeInfo) {
      return this.exchangeInfo;
    }

    try {
      const exchangeInfo = await this.client.getExchangeInfo();
      this.exchangeInfo = exchangeInfo;
      return this.exchangeInfo;
    } catch (error) {
      this.logger.error('获取交易所信息失败:', error);
      this.exchangeInfo = { symbols: [] };
      return this.exchangeInfo;
    }
  };

  /**
     * 调整订单数量精度
     * @param {Number|String} quantity 原始数量
     * @returns {String} 调整后的数量
     */
  this.adjustQuantity = async (quantity) => {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      return binancePrecision.smartAdjustQuantity(exchangeInfo, this.config.tradingPair, quantity.toString());
    } catch (error) {
      this.logger.error('调整数量精度失败:', error);
      return new bigNumber(quantity).toFixed(8);
    }
  };

  this.getParseDatum = (datum) => {
    let data = datum;
    if (typeof datum === 'string') {
      data = JSON.parse(datum);
    }

    return data;
  };

  this.resetTargetPrice = (executionPrice) => {
    if (!executionPrice || !this.config.grid_price_difference) {
      this.logger.warn(`重置期望价格失败，executionPrice: ${executionPrice}, grid_price_difference: ${this.config.grid_price_difference}`);
      return;
    }

    this.nextExpectedRisePrice = bigNumber(executionPrice).plus(this.config.grid_price_difference).toNumber();
    this.nextExpectedFallPrice = bigNumber(executionPrice).minus(this.config.grid_price_difference).toNumber();
  };

  this.closePositionOrder = async (positionQuantity) => {
    const adjustedQuantity = await this.adjustQuantity(positionQuantity);
    return this.client.submitNewOrder({
      symbol: this.config.tradingPair,
      side: 'SELL',
      type: 'MARKET',
      quantity: adjustedQuantity,
      positionSide: 'LONG'
    });
  };

  this.placePositionOrder = async (positionQuantity) => {
    const adjustedQuantity = await this.adjustQuantity(positionQuantity);
    return this.client.submitNewOrder({
      symbol: this.config.tradingPair,
      side: 'BUY',
      type: 'MARKET',
      quantity: adjustedQuantity,
      positionSide: 'LONG'
    });
  };

  /**
     * 查询订单详情，最多重试3次，超过后通过持仓推断订单结果
     * @returns {Object|null} 订单详情，失败返回null
     */
  this.queryOrder = async (orderId, prePositionQty, orderQty, orderType) => {
    if (!orderId) return null;

    const MAX_RETRY = 3;
    for (let i = 0; i <= MAX_RETRY; i++) {
      this.logger.log(`🔍 查询订单详情 (重试${i + 1}/${MAX_RETRY})`);
      try {
        let res = await this.client.getOrder({ symbol: this.config.tradingPair, orderId });
        this.logger.order('query', res);
        return this.getParseDatum(res);
      } catch (error) {
        this.logger.error(`查询订单详情失败 (重试${i + 1}/${MAX_RETRY})`, error);
        if (i < MAX_RETRY) await new Promise(r => setTimeout(r, 10000));
      }
    }

    this.logger.warn(`超过最大重试次数，启用持仓推断机制`);
    await this.initAccountInfo().catch(() => { });
    const expectedQty = orderType === 'open'
      ? bigNumber(prePositionQty).plus(orderQty).toNumber()
      : bigNumber(prePositionQty).minus(orderQty).toNumber();
    const isSuccess = Math.abs(this.totalOpenPositionQuantity - expectedQty) <= bigNumber(orderQty).times(0.001).toNumber();
    this.logger.log(`📊 持仓推断: 订单前=${prePositionQty}, 预期=${expectedQty}, 当前=${this.totalOpenPositionQuantity}, 推断${isSuccess ? '成功' : '失败'}`);
    return isSuccess ? { orderId, avgPrice: String(this.latestPrice || 0), status: 'INFERRED' } : null;
  };

  this.createMultipleOrders = async (positionQuantity) => {
    const prePositionQty = this.totalOpenPositionQuantity;
    let result = null;
    try {
      const res = await this.placePositionOrder(positionQuantity);
      this.logger.order('create', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error('创建多单失败', error);
    }
    this.initAccountInfo().catch(() => { });
    if (!result) return;

    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, positionQuantity, 'open');
    if (!orderDetail) {
      this.logger.warn(`创建多单后，无法查询订单详情`);
      return;
    }

    this.logs.push(orderDetail);
    this.positionOpenHistory.push(orderDetail);
    this.logger.log(`🎉 建仓成功`);
    this.totalOpenPositionQuantity = bigNumber(this.totalOpenPositionQuantity).plus(positionQuantity).toNumber();
    this.resetTargetPrice(Number(orderDetail.avgPrice));
  };

  this.closeMultipleOrders = async (positionQuantity) => {
    const prePositionQty = this.totalOpenPositionQuantity;
    let result = null;
    try {
      const res = await this.closePositionOrder(positionQuantity);
      this.logger.order('close', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error('平多单失败', error);
    }
    this.initAccountInfo().catch(() => { });
    if (!result) return;

    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, positionQuantity, 'close');
    if (!orderDetail) {
      this.logger.warn(`平掉多单后，无法查询订单详情`);
      return;
    }

    this.logs.push(orderDetail);
    this.positionOpenHistory.pop();
    this.logger.log(`🎉 平仓成功`);
    this.totalOpenPositionQuantity = bigNumber(this.totalOpenPositionQuantity).minus(positionQuantity).toNumber();
    this.resetTargetPrice(Number(orderDetail.avgPrice));
  };

  this.getAccountInfo = async () => {
    let errorMsg = null;
    let accountInfo = await this.client.getAccountInformation().catch(error => {
      if (typeof error === 'string') {
        errorMsg = JSON.parse(error);
      }
      if (typeof error === 'object') {
        errorMsg = error;
      }
    });

    return errorMsg || accountInfo;
  };

  this.initAccountInfo = async () => {
    let accountInfo = await this.getAccountInfo().catch((error) => {
      this.logger.error('获取账户信息失败', error);
    });

    try {
      if (typeof accountInfo === 'string') {
        accountInfo = JSON.parse(accountInfo);
      } else if (typeof accountInfo === 'object' && accountInfo !== null) {
        if (accountInfo.code || accountInfo.message) {
          throw accountInfo;
        }
      } else {
        throw new Error('账户信息为空');
      }

      let tradingPairPosition = accountInfo.positions.find(item => item.symbol === this.config.tradingPair && item.positionSide === 'LONG');
      this.totalOpenPositionQuantity = Number(tradingPairPosition.positionAmt);
      this.totalOpenPositionEntryPrice = Number(tradingPairPosition.entryPrice) < this.totalOpenPositionEntryPrice ? this.totalOpenPositionEntryPrice : Number(tradingPairPosition.entryPrice);
    } catch (error) {
      this.logger.error(`accountInfo 数据异常`, error);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.exchange('accountInfo', accountInfo);
      }
      setTimeout(async () => {
        await this.initAccountInfo();
      }, 1000);
    }
  };

  this.heavenAndEarthWebsocket = async ({ latestPrice }) => {
    if (!latestPrice) {
      this.logger.warn(`latestPrice error: `, latestPrice);
      return;
    }

    let { skyPrice, groundPrice, needlePrice } = this.config;
    if (latestPrice >= skyPrice) {
      this.logger.log(`⛔️ 币价大于等于天价，执行卖空操作`);
      this.closeMultipleOrders(this.totalOpenPositionQuantity);
    } else if (latestPrice <= groundPrice) {
      this.logger.log(`⛔️ 币价小于等于地价，执行买入操作`);
      this.createMultipleOrders(this.config.gridTradeQuantity);
    } else if (latestPrice >= needlePrice && latestPrice <= skyPrice) {
      this.logger.log(`⛔️ 币价在针价范围内，执行震荡交易`);
    }

    if (this.paused) return;
    if (this.throttleEnabled) return;
    if (this.config.pollingInterval) this.throttleEnabled = setTimeout(() => this.throttleEnabled = false, this.config.pollingInterval);

    if (!this.totalOpenPositionQuantity || !this.positionOpenHistory?.length) {
      await this.initAccountInfo().catch(() => { });
    }

    this.logger.log(`----- ${dayjs().format('YYYY-MM-DD HH:mm:ss')} -----`);
    this.logger.log(`💰 天地针策略 轮询第 ${this.count} 次`);
    this.count += 1;

    this.logger.log(`当前价格: ${latestPrice}`);
    this.logger.log(`当前总持仓数量为 ${this.totalOpenPositionQuantity}/${this.config.tradingPair}, 限制最大持仓数量为 ${this.config.maxOpenPositionQuantity}/${this.config.tradingPair}`);
    this.logger.log(`期望下次涨至某价格: ${this.nextExpectedRisePrice}, 期望下次跌至某价格: ${this.nextExpectedFallPrice}`);
    this.logger.log(`累计已成交 ${this.logs.length} 次，其中开仓多单 ${(this.logs.filter(p => p.side === 'BUY')).length} 次，平仓多单 ${(this.logs.filter(p => p.side === 'SELL')).length} 次`);
    this.logger.log(`当前持仓平均开仓价为 ${this.totalOpenPositionEntryPrice}`);
    this.logger.log(`剩余未匹配平仓的订单: `, this.positionOpenHistory);
  };

  this.onPausedGrid = async () => {
    this.paused = true;
  };

  this.onContinueGrid = async () => {
    this.paused = false;
  };

  this.initOrders = async () => {
    this.onManualPausedGrid();

    let isOk = true;
    await this.initAccountInfo().catch(() => { isOk = false; });
    if (isOk === false) {
      setTimeout(this.initOrders, 1000);
      return;
    }

    let { minOpenPositionQuantity, maxOpenPositionQuantity, gridTradeQuantity } = this.config;

    if (this.totalOpenPositionQuantity < minOpenPositionQuantity) {
      let quantity = bigNumber(minOpenPositionQuantity)
        .minus(this.totalOpenPositionQuantity)
        .plus(gridTradeQuantity)
        .toNumber();
      await this.createMultipleOrders(quantity).catch((err) => this.logger.error('初始化开仓失败', err));
    }

    this.onContinueGrid();
    await this.initAccountInfo().catch(() => { });
  };
}

module.exports = HeavenAndEarthStrategy;
