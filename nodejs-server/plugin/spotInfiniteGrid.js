/**
 * 无限网格策略（现货版本）
 * 基于 umInfiniteGrid.js 适配现货交易
 * 支持策略模式、工厂模式等设计模式
 */

const path = require('path');
const dayjs = require('dayjs');
const bigNumber = require('bignumber.js');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require('../utils/record-log.js');
const StrategyLog = require('../utils/strategy-log.js');
const { MainClient } = require('binance');
const { normalizeDatatypes } = require('../utils/data-types.ts');

/**
 * 无限网格策略 - 现货版本
 * 
 * @param {Object} options - 策略配置参数
 * @param {string} options.tradingPair - 交易对，例如`BTCUSDT`
 * @param {string} options.apiKey - 币安API Key
 * @param {string} options.apiSecret - 币安API Secret
 * @param {number} [options.baseAssetBalance=0] - 基础资产初始余额（如BTC）
 * @param {number} [options.quoteAssetBalance=0] - 计价资产初始余额（如USDT）
 * @param {number} [options.maxBaseAssetQuantity] - 限制的最大基础资产持有数量
 * @param {number} [options.minBaseAssetQuantity] - 限制的最少基础资产持有数量
 * @param {number} options.gridPriceDiff - 网格之间的价格差价
 * @param {number} [options.gridTradeQuantity] - 网格每次交易的数量（向后兼容，当没有设置分离数量时使用）
 * @param {number} [options.gridLongBuyQuantity] - 现货开仓数量：每次买入基础资产的数量
 * @param {number} [options.gridLongSellQuantity] - 现货平仓数量：每次卖出基础资产的数量
 * @param {number} [options.fallPreventionCoefficient=0] - 防跌系数
 * @param {number} [options.gtLimitationPrice] - 大于等于某价格时暂停网格
 * @param {number} [options.ltLimitationPrice] - 小于等于某价格时暂停网格
 * @param {boolean} [options.isAboveOpenPrice=false] - 是否开启"当价格大于等于开仓价格时则暂停网格"
 * @param {boolean} [options.isBelowOpenPrice=false] - 是否开启"当价格低于等于开仓价格时则暂停网格"
 * @param {number} [options.pollingInterval=10000] - 获得最新价格的轮询间隔时间，单位：毫秒
 * @param {boolean} [options.enableLog=true] - 是否启用日志输出，默认为true
 * @param {boolean} [options.priorityCloseOnTrend=false] - 允许'顺势仅减仓策略'：当网格仓位记录为空但实际持有仓位时，在上涨趋势中优先执行卖出而不创建新买入仓位
 */
function InfiniteGridSpot(options) {

  if (!new.target) {
    return new InfiniteGridSpot(options);
  }

  const defaultOptions = {
    /** 由GridStrategyService生成并传入的策略ID */
    id: '',

    /** 必填，交易对 */
    tradingPair: `BTCUSDT`,

    /** 必填，币安API Key */
    apiKey: ``,

    /** 必填，币安API Secret */
    apiSecret: ``,

    /**
     * 基础资产初始余额（如BTC）
     * 现货交易需要同时管理基础资产和计价资产的余额
     */
    baseAssetBalance: 0,

    /**
     * 计价资产初始余额（如USDT）
     */
    quoteAssetBalance: 0,

    /** 限制的最大基础资产持有数量 eg: 1个BTC */
    maxBaseAssetQuantity: undefined,

    /** 限制的最少基础资产持有数量 eg: 0.1个BTC */
    minBaseAssetQuantity: undefined,

    /** 必填，网格之间的价格差价 */
    gridPriceDiff: undefined,

    /** 网格每次交易的数量（向后兼容，当没有设置分离数量时使用） */
    gridTradeQuantity: undefined,

    /** 现货开仓数量：每次买入基础资产的数量 */
    gridLongBuyQuantity: undefined,

    /** 现货平仓数量：每次卖出基础资产的数量 */
    gridLongSellQuantity: undefined,

    /** 防跌系数：系数越大，价格变动时的触发价格会下放的更低，为0时固定使用网格差价 */
    fallPreventionCoefficient: 0,

    /** 大于等于某价格时暂停网格 */
    gtLimitationPrice: undefined,

    /** 小于等于某价格时暂停网格 */
    ltLimitationPrice: undefined,

    /** 是否开启"当价格大于等于开仓价格时则暂停网格" */
    isAboveOpenPrice: false,

    /** 是否开启"当价格低于等于开仓价格时则暂停网格" */
    isBelowOpenPrice: false,

    /** 
     * 获得最新价格的轮询间隔时间，单位：毫秒 
     * 内部关于限制轮询频率的逻辑, 避免频繁下单
     * 设为0则不限制, 回测用
    */
    pollingInterval: 10000,

    /** 是否启用日志输出，默认为 true */
    enableLog: true,

    /** 允许'顺势仅减仓策略'：当网格仓位记录为空但实际持有仓位时，在上涨趋势中优先执行卖出而不创建新买入仓位 */
    priorityCloseOnTrend: true,

    /** 计算平均成本价的默认天数 */
    avgCostPriceDays: 30
  };

  if (!options.gridPriceDiff) {
    UtilRecord.log(`❗️ 必填项'gridPriceDiff'不能为空`);
    return;
  }

  // 检查交易数量配置的有效性
  const hasGridTradeQuantity = options.gridTradeQuantity && options.gridTradeQuantity > 0;
  const hasSeparateQuantities = options.gridLongBuyQuantity && options.gridLongBuyQuantity > 0 &&
    options.gridLongSellQuantity && options.gridLongSellQuantity > 0;

  if (!hasGridTradeQuantity && !hasSeparateQuantities) {
    UtilRecord.log(`❗️ 必须配置 'gridTradeQuantity' 或者同时配置 'gridLongBuyQuantity' 和 'gridLongSellQuantity'，且值必须大于0`);
    return;
  }

  this.config = { ...defaultOptions, ...options };

  // 保存原始的log函数引用，以便动态切换日志输出
  this.originalLog = UtilRecord.log;

  // 如果禁用日志输出，则将 UtilRecord.log 设置为空函数
  if (!this.config.enableLog) this.disableLog();

  if (!this.config.apiKey || !this.config.apiSecret) {
    UtilRecord.log(`❗️ 必填项'apiKey'和'apiSecret'不能为空`);
    return;
  }

  /** 当前网格是否暂停(用户手动暂停当前网格), 暂停权重1(最高) */
  this.paused = false;

  /** 当前网格是否暂停(业务逻辑自动判断进行设定的暂停与否), 暂停权重2 */
  this.paused = true;

  /** 初始化状态 */
  this.initStatus = false;

  /** 当前基础资产持有数量（如BTC数量） */
  this.currentBaseAssetQuantity = 0;

  /** 当前计价资产余额（如USDT余额） */
  this.currentQuoteAssetBalance = 0;

  /** 当前平均持仓成本价格 */
  this.totalOpenPositionEntryPrice = 0;

  /** 期望下次涨至某价格 */
  this.nextExpectedRisePrice = null;

  /** 期望下次跌至某价格 */
  this.nextExpectedFallPrice = null;

  /** 仓位记录，日志记录 */
  this.logs = [];

  /** 建仓记录/持仓记录, 剩余未匹配平仓的订单（与期货策略保持一致的命名） */
  this.positionOpenHistory = [];

  /** 查询次数计数器 */
  this.count = 0;

  /** 配合 pollingInterval 进行轮询操作, 为true则禁止通行 */
  this.throttleEnabled = false;

  /** 账户信息重试间隔时间 */
  this.accountInfoRetryInterval = 5000;

  /** 订单操作锁：防止异步竞态导致重复买入或卖出。'idle': 空闲, 'buying': 买入中, 'selling': 卖出中 */
  this.orderOptions = { lock: 'idle' };

  /** 账户信息 */
  this.accountInfo = {};

  /** 当前交易对余额信息 */
  this.balanceInfo = {};

  /** 策略日志记录器 */
  this.logger = StrategyLog.createLogger({
    symbol: this.config.tradingPair,
    apiKey: this.config.apiKey,
    market: 'spot',
    direction: 'long'
  });

  let mainClientConfig = {};
  if (process.env.NODE_ENV !== 'production') {
    const proxyConfig = getProxyConfig();
    if (proxyConfig) {
      mainClientConfig.proxy = proxyConfig;
    }
  }

  /** 调用binance生成的客户端（现货） */
  this.client = new MainClient(
    {
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
    },
    mainClientConfig
  );

  /**
   * 事件监听: 当触发订单操作时
   * @param {string} type 事件类型 
   * @param {Function} callback 回调函数
   */
  this.on = (type, callback) => {
    if (typeof callback !== 'function') return;
    switch (type.toLowerCase()) {
      case 'onWarn':
      case 'warn':
        this.onWarn = callback;
        break;
      case 'onOpenPosition':
      case 'openPosition':
        this.onOpenPosition = callback;
        break;
      case 'onClosePosition':
      case 'closePosition':
        this.onClosePosition = callback;
        break;
      default:
        this.logger.warn(`未知的事件类型 "${type}"`);
    }
  };

  /**
   * 处理平仓操作的错误
   * 根据不同的错误码执行相应的恢复逻辑
   * @param {Object} error 错误对象
   * @returns {boolean} 是否已处理该错误（true表示已处理，调用方可跳过后续逻辑）
   */
  this.handleCloseOrderError = (error) => {
    const errorCode = error?.code;
    if (!errorCode) return false;

    switch (errorCode) {
    // -2010: 账户余额不足，说明实际没有足够的币可平仓（可能被手动卖出了）
      case -2010:
        this.logger.warn(`检测到仓位已被手动平仓（错误码-2010），清空开仓历史记录并重新初始化`);
        this.positionOpenHistory = [];
        this.currentBaseAssetQuantity = 0;
        this.nextExpectedRisePrice = undefined;
        this.nextExpectedFallPrice = undefined;
        return true;

        // 可在此处扩展其他错误码的处理逻辑
        // case -xxxx:
        //   UtilRecord.log(`⚠️ 处理错误码 -xxxx`);
        //   return true;

      default:
        return false;
    }
  };

  /**
   * 解析object数据为快捷可读的数据
   * @param {Object} datum 无法确认类型和内容的object数据
   */
  this.getParseDatum = (datum) => {
    let data = datum;
    if (typeof datum === 'string') {
      data = JSON.parse(datum);
    }
    return data;
  };

  /**
   * 获取现货开仓数量（买入基础资产的数量）
   * 优先使用 gridLongBuyQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 现货开仓数量
   */
  this.getSpotBuyQuantity = () => {
    return this.config.gridLongBuyQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 获取现货平仓数量（卖出基础资产的数量）
   * 优先使用 gridLongSellQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 现货平仓数量
   */
  this.getSpotSellQuantity = () => {
    return this.config.gridLongSellQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 重置期望价格, 通过防跌系数计算出预期价格(即下一次可以建仓的价格)
   * @param {Number|String} executionPrice 成交价格 
   */
  this.resetTargetPrice = (executionPrice) => {
    if (!executionPrice || !this.config.gridPriceDiff) {
      this.logger.warn(`重置期望价格失败，executionPrice: ${executionPrice}, gridPriceDiff: ${this.config.gridPriceDiff}`);
      return;
    }

    // 现货网格：低买高卖策略
    this.nextExpectedRisePrice = bigNumber(executionPrice).plus(this.config.gridPriceDiff).toNumber();

    // 应用防跌系数
    let coefficient = bigNumber(this.config.gridPriceDiff)
      .times(bigNumber(this.currentBaseAssetQuantity).div(this.config.maxBaseAssetQuantity || this.currentBaseAssetQuantity + 1))
      .times(this.config.fallPreventionCoefficient);
    coefficient = coefficient.isNaN() ? 0 : coefficient;

    this.nextExpectedFallPrice = bigNumber(executionPrice).minus(this.config.gridPriceDiff).minus(coefficient).toNumber();
  };

  /**
   * 调用卖出操作（卖出基础资产，获得计价资产）
   * @param {Number|String} quantity 卖出数量 
   */
  this.sellOrder = (quantity) => {
    return this.client.submitNewOrder({
      symbol: this.config.tradingPair,
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity,
      timestamp: Date.now()
    });
  };

  /**
   * 调用买入操作（买入基础资产，消耗计价资产）
   * @param {Number|String} quantity 买入数量 
   */
  this.buyOrder = (quantity) => {
    return this.client.submitNewOrder({
      symbol: this.config.tradingPair,
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity,
      timestamp: Date.now()
    });
  };

  /**
   * 查询订单详情，最多重试3次，超过后通过持仓推断订单结果
   * @param {Number|String} orderId 订单ID
   * @param {Number} prePositionQty 订单前持仓数量
   * @param {Number} orderQty 订单数量
   * @param {String} orderType 订单类型 'buy' | 'sell'
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
        return res;
      } catch (error) {
        this.logger.error(`查询订单详情失败 (重试${i + 1}/${MAX_RETRY})`, error);
        if (i < MAX_RETRY) await new Promise(r => setTimeout(r, 10000));
      }
    }

    // 超过最大重试次数，启用持仓推断机制
    this.logger.warn(`超过最大重试次数，启用持仓推断机制`);
    await this.initAccountInfo().catch(() => { });
    const expectedQty = orderType === 'buy'
      ? bigNumber(prePositionQty).plus(orderQty).toNumber()
      : bigNumber(prePositionQty).minus(orderQty).toNumber();
    const isSuccess = Math.abs(this.currentBaseAssetQuantity - expectedQty) <= bigNumber(orderQty).times(0.001).toNumber();
    this.logger.log(`📊 持仓推断: 订单前=${prePositionQty}, 预期=${expectedQty}, 当前=${this.currentBaseAssetQuantity}, 推断${isSuccess ? '成功' : '失败'}`);
    if (typeof this.onWarn === 'function') {
      this.onWarn({ id: this.config.id, message: `订单查询失败，通过持仓推断${isSuccess ? '成功' : '失败'}` });
    }
    return isSuccess ? { orderId, cummulativeQuoteQty: String(bigNumber(this.latestPrice || 0).times(orderQty)), executedQty: String(orderQty), status: 'INFERRED' } : null;
  };

  /**
   * 创建仓位（开仓）
   * @param {*} quantity 开仓数量
   */
  this.openOrders = async (quantity) => {
    if (this.orderOptions.lock !== 'idle') {
      this.logger.warn(`订单操作进行中(${this.orderOptions.lock})，跳过本次开仓请求`);
      return;
    }
    this.orderOptions.lock = 'opening';
    const prePositionQty = this.currentBaseAssetQuantity;

    let result = null;
    try {
      const res = await this.buyOrder(quantity);
      this.logger.order('create', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error(`创建仓位失败`, error);
      if (typeof this.onWarn === 'function') this.onWarn({ id: this.config.id, message: '创建仓位失败', error });
    }
    this.initAccountInfo().catch(() => { });
    if (!result) { this.orderOptions.lock = 'idle'; return; }

    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, quantity, 'buy');
    if (!orderDetail) {
      this.logger.warn(`创建仓位后，无法查询订单详情`);
      this.orderOptions.lock = 'idle';
      return;
    }

    const executionPrice = Number(orderDetail.cummulativeQuoteQty) / Number(orderDetail.executedQty);
    this.logs.push(orderDetail);
    this.positionOpenHistory.push(orderDetail);
    if (typeof this.onOpenPosition === 'function') this.onOpenPosition({ id: this.config.id, ...orderDetail });
    this.logger.log(`🎉 建仓成功`);
    this.totalOpenPositionEntryPrice = await this.getAverageCostPrice(this.config.tradingPair);
    this.resetTargetPrice(executionPrice);
    this.orderOptions.lock = 'idle';
  };

  /**
   * 平掉仓位（平仓）
   * @param {*} quantity 平仓数量
   */
  this.closeOrders = async (quantity) => {
    if (this.orderOptions.lock !== 'idle') {
      this.logger.warn(`订单操作进行中(${this.orderOptions.lock})，跳过本次平仓请求`);
      return;
    }
    this.orderOptions.lock = 'closing';
    const prePositionQty = this.currentBaseAssetQuantity;

    let result = null;
    try {
      const res = await this.sellOrder(quantity);
      this.logger.order('close', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error(`平仓失败`, error);
      if (typeof this.onWarn === 'function') this.onWarn({ id: this.config.id, message: '平仓失败', error });
      this.handleCloseOrderError(error);
    }
    this.initAccountInfo().catch(() => { });
    if (!result) { this.orderOptions.lock = 'idle'; return; }

    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, quantity, 'sell');
    if (!orderDetail) {
      this.logger.warn(`平仓后，无法查询订单详情`);
      this.orderOptions.lock = 'idle';
      return;
    }

    const executionPrice = Number(orderDetail.cummulativeQuoteQty) / Number(orderDetail.executedQty);
    this.logs.push(orderDetail);
    if (this.positionOpenHistory.length > 0) this.positionOpenHistory.pop();
    if (typeof this.onClosePosition === 'function') this.onClosePosition({ id: this.config.id, ...orderDetail });
    this.logger.log(`🎉 平仓成功`);
    this.totalOpenPositionEntryPrice = await this.getAverageCostPrice(this.config.tradingPair);
    this.resetTargetPrice(executionPrice);
    this.orderOptions.lock = 'idle';
  };

  /**
   * 获取账户信息（现货账户）
   */
  this.getAccountInfo = async () => {
    try {
      const accountInfo = await this.client.getAccountInformation();
      return accountInfo;
    } catch (error) {
      this.logger.error('获取现货账户信息失败:', error);
      throw error;
    }
  };

  /**
   * 初始化账户信息与余额信息
   */
  this.initAccountInfo = async () => {
    try {
      const accountInfo = await this.getAccountInfo();
      this.accountInfo = accountInfo;

      const [baseAsset, quoteAsset] = this.parseSymbol(this.config.tradingPair);
      const baseBalance = accountInfo.balances.find(b => b.asset === baseAsset);
      const quoteBalance = accountInfo.balances.find(b => b.asset === quoteAsset);

      this.balanceInfo = {
        baseAsset,
        quoteAsset,
        baseBalance: baseBalance ? Number(baseBalance.free) : 0,
        quoteBalance: quoteBalance ? Number(quoteBalance.free) : 0
      };

      this.currentBaseAssetQuantity = this.balanceInfo.baseBalance;
      this.currentQuoteAssetBalance = this.balanceInfo.quoteBalance;
      this.accountInfoRetryInterval = 5000;
      this.lastAccountInfoUpdate = Date.now();

    } catch (error) {
      this.logger.error(`账户信息获取异常`, error);

      if (typeof this.onWarn === 'function') {
        this.onWarn({
          id: this.config.id,
          message: '初始化账户信息失败',
          error: error
        });
      }

      setTimeout(async () => {
        await this.initAccountInfo();
      }, (this.accountInfoRetryInterval += 1000));
    }
  };

  /**
   * 解析交易对符号
   * @param {String} symbol 交易对符号，如 'BTCUSDT'
   * @returns {Array} [baseAsset, quoteAsset]
   */
  this.parseSymbol = (symbol) => {
    const quoteAssets = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];

    for (let quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        return [base, quote];
      }
    }

    return [symbol.slice(0, 3), symbol.slice(3)];
  };

  /**
   * 计算总资产价值（以计价资产计算）
   * @param {Number} currentPrice 当前价格
   * @returns {Number} 总资产价值
   */
  this.getTotalAssetValue = (currentPrice) => {
    return bigNumber(this.currentBaseAssetQuantity).times(currentPrice).plus(this.currentQuoteAssetBalance).toNumber();
  };

  /**
   * 当前每网格匹配成功所得利润
   * @returns {number} 每个网格匹配成功的实际利润
   */
  this.getGridProfit = (latestPrice) => {
    let buyQuantity = this.getSpotBuyQuantity();   // 买入基础资产数量
    let sellQuantity = this.getSpotSellQuantity(); // 卖出基础资产数量
    let buyValue = bigNumber(latestPrice).minus(this.config.gridPriceDiff).times(buyQuantity);
    let sellValue = bigNumber(latestPrice).times(sellQuantity);
    let buyFee = buyValue.times(0.001);
    let sellFee = sellValue.times(0.001);
    let actualProfit = sellValue.minus(buyValue).minus(buyFee).minus(sellFee);
    return actualProfit.toNumber();
  };

  /**
   * 获取上一个卖出的订单信息
   * @returns {Object|null} 上一个卖出的订单详情，如果没有找到则返回 null
   */
  this.getLastSellOrder = () => {
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const order = this.logs[i];
      if (order.side === 'SELL') {
        return order;
      }
    }
    return null;
  };

  /**
   * 获取指定交易对在特定时间范围内的平均持仓成本。
   * - 注意：此方法通过计算历史买入订单的加权平均价得出，并未考虑卖出订单。
   * @param {string} symbol - 交易对, 例如 'BTCUSDT'
   * @param {number} [days] - 可选参数。计算最近N天的平均成本。如果未提供，则使用 this.config.avgCostPriceDays 作为默认值。
   * @returns {Promise<number|null>} - 返回平均成本价, 如果没有买入记录或发生错误则返回 null
   */
  this.getAverageCostPrice = async (symbol, days) => {
    const daysToCalculate = (days === null || days === undefined) ? this.config.avgCostPriceDays : days;

    // 1. 参数校验
    if (typeof symbol !== 'string' || !symbol) {
      this.logger.error('错误：symbol 参数必须是一个非空的字符串。');
      return null;
    }
    if (daysToCalculate !== null && (typeof daysToCalculate !== 'number' || daysToCalculate < 0)) {
      this.logger.error('错误：days 参数必须是一个非负数。');
      return null;
    }

    try {
      const params = {
        symbol: symbol,
        // 币安接口的 limit 最大值为 1000
        limit: 1000,
      };

      // 如果指定了有效的天数，则计算开始时间
      if (daysToCalculate && daysToCalculate > 0) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysToCalculate);
        params.startTime = startTime.getTime();
      }

      // 获取该交易对的历史成交记录
      // 重要提示：币安API单次最多返回1000条记录。
      // 如果指定时间范围内的交易超过1000条，此函数仅基于最近的1000条计算。
      // 若需完全精确，需要实现分页逻辑来获取所有交易。
      const trades = await this.client.getAccountTradeList(params);

      // 2. API响应校验
      if (!Array.isArray(trades)) {
        this.logger.error('错误：从API获取的交易数据格式不正确。');
        return null;
      }

      let totalCost = 0; // 总花费
      let totalQty = 0;  // 总数量

      // 遍历所有买入交易
      for (const trade of trades) {
        // 3. 数据健壮性校验
        if (trade && trade.isBuyer &&
          trade.quoteQty && !isNaN(parseFloat(trade.quoteQty)) &&
          trade.qty && !isNaN(parseFloat(trade.qty)) && parseFloat(trade.qty) > 0) {
          totalCost += parseFloat(trade.quoteQty);
          totalQty += parseFloat(trade.qty);
        }
      }

      // 如果没有有效的买入记录，成本为0
      if (totalQty === 0) {
        this.logger.log(`在指定的时间范围内没有找到 ${symbol} 的有效买入记录。`);
        return 0;
      }

      // 计算加权平均成本
      const averageCost = totalCost / totalQty;
      return averageCost;

    } catch (error) {
      this.logger.error(`获取 ${symbol} 平均成本价时出错:`, error);
      // 可以在这里向上层抛出错误或根据需要处理
      return null;
    }
  };

  /**
   * 主流程函数 - 现货网格交易核心逻辑
   * @param {Object} data - 包含最新价格信息的对象
   * @param {number} data.latestPrice - 最新的市场价格
   */
  this.gridWebsocket = async ({ latestPrice }) => {
    if (!latestPrice) {
      UtilRecord.log(`InfiniteGridSpot gridWebsocket latestPrice error: `, latestPrice);
      return;
    }

    if (!this.initStatus || !this.accountInfo?.balances) {
      UtilRecord.log(`⚠️ 初始化函数还未完成, 请稍等...`);
      return;
    }

    this.latestPrice = latestPrice;

    if (this.paused) {
      UtilRecord.log(`⛔️ 根据用户要求, 将网格暂停`);
      return;
    }

    let { ltLimitationPrice, gtLimitationPrice } = this.config;
    if (Number.isFinite(ltLimitationPrice) && latestPrice <= ltLimitationPrice) {
      UtilRecord.log(`⛔️ 币价小于等于限制价格，暂停网格`);
      this.onPausedGrid();
    }
    else if (Number.isFinite(gtLimitationPrice) && latestPrice >= gtLimitationPrice) {
      UtilRecord.log(`⛔️ 币价大于等于限制价格，暂停网格`);
      this.onPausedGrid();
    }
    else {
      this.onContinueGrid();
    }

    // TODO
    // 现货需要获得 平均开仓价格, 才能执行这步判定
    // if (latestPrice >= this.tradingPairInfo.entryPrice && this.config.isAboveOpenPrice) {
    //   UtilRecord.log(`⛔️ 币价${latestPrice} 大于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
    //   this.onPausedGrid();
    // }
    // else if (latestPrice <= this.tradingPairInfo.entryPrice && this.config.isBelowOpenPrice) {
    //   UtilRecord.log(`⛔️ 币价${latestPrice} 小于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
    //   this.onPausedGrid();
    // }
    // else {
    //   // 网格处于 正常的状态(没有暂停), 则可以 继续网格.
    //   // 主要是需要兼容 ltLimitationPrice, gtLimitationPrice 的情况.
    //   if (!this.paused) this.onContinueGrid();
    // }

    if (this.paused) {
      UtilRecord.log(`⛔️ 因不满足本交易对的配置要求, 网格已暂停`);
      return;
    }

    if (this.throttleEnabled) return;
    if (this.config.pollingInterval) this.throttleEnabled = setTimeout(() => this.throttleEnabled = false, this.config.pollingInterval);

    // 假设没有仓位时：
    //  - 初始化账户信息与仓位信息；
    if (!this.currentBaseAssetQuantity || !this.positionOpenHistory?.length) {
      UtilRecord.log(`⚠️ 当前已没有仓位信息，重新初始化账户信息与仓位信息用以同步最新数据`);
      UtilRecord.log(`⚠️ this.currentBaseAssetQuantity`, this.currentBaseAssetQuantity);
      UtilRecord.log(`⚠️ this.positionOpenHistory`, this.positionOpenHistory);
      await this.initAccountInfo().catch(() => { });
    }

    // 定期刷新账户信息，避免手动转入资金后无法及时更新余额的问题
    // 每100次轮询或超过5分钟未更新时强制刷新一次
    if (this.count % 100 === 0 || !this.lastAccountInfoUpdate || (Date.now() - this.lastAccountInfoUpdate) > 300000) {
      UtilRecord.log(`🔄 定期刷新账户信息以同步最新余额`);
      await this.initAccountInfo().catch(() => { });
    }

    UtilRecord.log(`----- ${dayjs().format('YYYY-MM-DD HH:mm:ss')} -----`);
    UtilRecord.log(`💰 现货网格, ID:${this.config.id} . 轮询第 ${this.count} 次`);
    this.count += 1;

    let buyQuantity = this.getSpotBuyQuantity();
    let sellQuantity = this.getSpotSellQuantity();

    UtilRecord.log(`当前价格: ${latestPrice}`);
    UtilRecord.log(`近${this.config.avgCostPriceDays}天平均持仓成本: ${this.totalOpenPositionEntryPrice}`);

    UtilRecord.log(`每次买入数量: ${buyQuantity}/${this.config.tradingPair}, 每次卖出数量: ${sellQuantity}/${this.config.tradingPair}, 网格价差: ${this.config.gridPriceDiff} ${this.config.quoteAsset}, 下次网格匹配利润预计为(扣除0.1%手续费): ${this.getGridProfit(latestPrice)} ${this.config.quoteAsset}`);

    UtilRecord.log(`是否允许'顺势仅减仓策略': ${this.config.priorityCloseOnTrend}`);
    UtilRecord.log(`期望下次涨至: ${this.nextExpectedRisePrice}, 期望下次跌至: ${this.nextExpectedFallPrice}`);
    UtilRecord.log(`累计已成交 ${this.logs.length} 次`);
    UtilRecord.log(`当前持仓数量为 ${this.currentBaseAssetQuantity}/${this.config.tradingPair}, 限制最大持仓数量为 ${this.maxBaseAssetQuantity}/${this.config.tradingPair}`);
    UtilRecord.log(`剩余未匹配平仓的订单: `, this.positionOpenHistory);

    // 如果没有期望价格，初始化
    if ((!this.nextExpectedRisePrice || !this.nextExpectedFallPrice) && this.logs.length) {
      let lastOrder = this.logs[this.logs.length - 1];
      let lastPrice = Number(lastOrder.cummulativeQuoteQty) / Number(lastOrder.executedQty);
      this.resetTargetPrice(lastPrice);
    }

    // 缓存中没有仓位且没有超过最大持仓数量限制, 创建一个新的仓位;
    // 假设 priorityCloseOnTrend 为true, 则逻辑有微调
    if (
      !this.positionOpenHistory?.length
      && (this.config.maxBaseAssetQuantity ? this.currentBaseAssetQuantity < this.config.maxBaseAssetQuantity : true)
    ) {
      if (this.currentQuoteAssetBalance < bigNumber(latestPrice).times(buyQuantity).toNumber()) {
        UtilRecord.log(`余额不足，无法执行买入操作`);
        return;
      }

      // 检查 priorityCloseOnTrend 配置,
      // 且存在仓位可以卖出,
      // 且当前价格latestPrice 大于等于 this.nextExpectedFallPrice(即不满足买入条件, 小于预期价格才买入)
      // 时,
      // 不买入
      if (
        this.config.priorityCloseOnTrend &&
        Number.isFinite(this.nextExpectedFallPrice) &&
        Number.isFinite(this.totalOpenPositionEntryPrice) &&
        this.currentBaseAssetQuantity >= buyQuantity &&
        latestPrice >= this.nextExpectedFallPrice &&
        latestPrice >= this.totalOpenPositionEntryPrice
      ) {
        // latestPrice >= this.nextExpectedFallPrice : 代表持续上涨中，不买入
        UtilRecord.log(`🔄 启用顺势仅减仓策略：当前实际仓位数量为 ${this.currentBaseAssetQuantity} / ${this.config.tradingPair}， 足够平仓，且当前仍处于上涨趋势，因此跳过创建新仓位`);
      } else {
        UtilRecord.log(`😎 缓存中没有仓位且没有超过最大持仓数量限制, 增加一个新的仓位`);
        this.openOrders(buyQuantity);
        return;
      }
    }

    // 订单历史中，最后一个订单的成交价格（用于价格参考）
    let lastPosition = this.positionOpenHistory[this.positionOpenHistory.length - 1];

    // 价格上涨到期望价格，执行卖出 (要求: 订单历史中，最后一个订单的成交价格（用于价格参考）满足期待涨跌价格, 当前持仓数量大于等于每次网格交易数量, 当前持仓数量大于等于限定最少持仓数量)
    if (
      latestPrice > this.nextExpectedRisePrice &&
      Number.isFinite(this.nextExpectedRisePrice) &&
      this.currentBaseAssetQuantity >= sellQuantity &&
      this.currentBaseAssetQuantity >= (this.config.minBaseAssetQuantity || 0)
    ) {
      UtilRecord.log(`⬆️ 价格上涨，执行平仓操作. 匹配上一个网格的价格为：`, lastPosition?.cummulativeQuoteQty);
      this.closeOrders(sellQuantity);
      return;
    }

    // 价格下跌到期望价格，执行买入
    if (
      latestPrice < this.nextExpectedFallPrice &&
      Number.isFinite(this.nextExpectedFallPrice) &&
      (this.config.maxBaseAssetQuantity ? this.currentBaseAssetQuantity < this.config.maxBaseAssetQuantity : true)
    ) {
      if (this.currentQuoteAssetBalance < bigNumber(latestPrice).times(buyQuantity).toNumber()) {
        UtilRecord.log(`余额不足，无法执行买入操作`);
        return;
      }

      UtilRecord.log(`⬇️ 价格下跌，执行开仓操作`);
      this.openOrders(buyQuantity);
      return;
    }

    // 如果基础资产少于最小持仓要求，立即买入
    if (this.config.minBaseAssetQuantity &&
      this.currentBaseAssetQuantity < this.config.minBaseAssetQuantity
    ) {
      if (this.currentQuoteAssetBalance < bigNumber(latestPrice).times(buyQuantity).toNumber()) {
        UtilRecord.log(`余额不足，无法执行买入操作`);
        return;
      }

      UtilRecord.log(`😎 基础资产低于最小持仓要求，立即开仓`);
      this.openOrders(buyQuantity);
      return;
    }
  };

  /** 暂停网格 */
  this.onPausedGrid = () => { this.paused = true; };

  /** 继续网格 */
  this.onContinueGrid = () => { this.paused = false; };

  /** 手动暂停网格 */
  this.onManualPausedGrid = () => { this.paused = true; };

  /** 手动继续网格 */
  this.onManualContinueGrid = () => { this.paused = false; };

  /** 启用日志输出 */
  this.enableLog = () => {
    UtilRecord.log = this.originalLog;
    UtilRecord.log(' 日志输出已启用');
  };

  /** 禁用日志输出 */
  this.disableLog = () => {
    UtilRecord.log = function () { };
  };

  /**
   * 入口函数 - 初始化持仓信息
   */
  this.initOrders = async () => {
    this.onPausedGrid();

    let isOk = true;
    await this.initAccountInfo().catch(() => { isOk = false; });
    if (isOk === false) {
      setTimeout(this.initOrders, 1000);
      return;
    }

    // 初始化时获取准确的平均持仓成本
    this.totalOpenPositionEntryPrice = await this.getAverageCostPrice(this.config.tradingPair);
    UtilRecord.log(`📈 初始平均持仓成本: ${this.totalOpenPositionEntryPrice}`);

    let { minBaseAssetQuantity } = this.config;
    let buyQuantity = this.getSpotBuyQuantity();

    // 如果基础资产少于最小持仓要求，补仓
    if (minBaseAssetQuantity && this.currentBaseAssetQuantity < minBaseAssetQuantity) {
      let quantity = bigNumber(minBaseAssetQuantity).minus(this.currentBaseAssetQuantity).plus(buyQuantity).toNumber();

      // 修复：只有在有最新价格时才计算需要的计价资产
      if (this.latestPrice && this.latestPrice > 0) {
        let requiredQuote = bigNumber(this.latestPrice).times(quantity).toNumber();

        if (this.currentQuoteAssetBalance >= requiredQuote) {
          await this.executeBuyOrder(quantity).catch(UtilRecord.log);
        } else {
          UtilRecord.log(`计价资产不足，需要 ${requiredQuote}，当前仅有 ${this.currentQuoteAssetBalance}`);
        }
      } else {
        UtilRecord.log(`等待获取最新价格后再进行初始化补仓`);
      }
    }

    this.initStatus = true;
  };
}

module.exports = InfiniteGridSpot;