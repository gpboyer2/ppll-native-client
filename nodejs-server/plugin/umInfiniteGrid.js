/**
 * 无限网格策略（支持做多和做空持仓方向）
 * 
 */


const path = require('path');
const dayjs = require('dayjs');
const bigNumber = require('bignumber.js');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require('../utils/record-log.js');
const StrategyLog = require('../utils/strategy-log.js');
const { USDMClient } = require('binance');
const { normalizeDatatypes } = require('../utils/data-types.ts');
const binancePrecision = require('../utils/binance-precision');
const db = require('../models');
const binanceAccountService = require('../service/binance-account.service.js');


/**
 * 无限网格策略 - 支持做多和做空持仓方向
 * 
 * @param {Object} options - 策略配置参数
 * @param {string} options.positionSide - 持仓方向，'LONG'（做多）或'SHORT'（做空）
 * @param {string} options.tradingPair - 交易对，例如`ORDIUSDT`
 * @param {string} options.apiKey - 币安API Key
 * @param {string} options.apiSecret - 币安API Secret
 * @param {number} [options.initialFillPrice=0] - 初始建仓的数量
 * @param {number} [options.leverage=20] - 杠杆倍数，默认为20
 * @param {number} [options.maxOpenPositionQuantity] - 限制的最大持仓数量
 * @param {number} [options.minOpenPositionQuantity] - 限制的最少的持仓数量
 * @param {number} options.gridPriceDifference - 网格之间的价格差价
 * @param {number} [options.gridTradeQuantity] - 网格每次交易的数量（向后兼容，当没有设置分离数量时使用）
 * @param {number} [options.gridLongOpenQuantity] - 做多方向：每次增加多单持仓的数量
 * @param {number} [options.gridLongCloseQuantity] - 做多方向：每次减少多单持仓的数量
 * @param {number} [options.gridShortOpenQuantity] - 做空方向：每次增加空单持仓的数量（开空单）
 * @param {number} [options.gridShortCloseQuantity] - 做空方向：每次减少空单持仓的数量（平空单）
 * @param {number} [options.fallPreventionCoefficient=0] - 防跌/防涨系数
 * @param {number} [options.gtLimitationPrice] - 大于等于某价格时暂停网格
 * @param {number} [options.ltLimitationPrice] - 小于等于某价格时暂停网格
 * @param {boolean} [options.isAboveOpenPrice=false] - 是否开启"当价格大于等于开仓价格时则暂停网格"
 * @param {boolean} [options.isBelowOpenPrice=false] - 是否开启"当价格低于等于开仓价格时则暂停网格"
 * @param {number} [options.pollingInterval=10000] - 获得最新价格的轮询间隔时间，单位：毫秒
 * @param {boolean} [options.enableLog=true] - 是否启用日志输出，默认为true
 * @param {boolean} [options.priorityCloseOnTrend=false] - 允许'顺势仅减仓策略'：当仓位记录为空但实际持有仓位时，在价格趋势中优先执行平仓而不创建新开仓仓位
 */
function InfiniteGrid(options) {

  if (!new.target) {
    return new InfiniteGrid(options);
  }

  const defaultOptions = {
    /** 由GridStrategyService生成并传入的策略ID */
    id: '',

    /** 必填，持仓方向 */
    positionSide: 'LONG', // 'LONG' 或 'SHORT'

    /** 必填，交易对 */
    tradingPair: ``,

    /** 必填，币安API Key */
    apiKey: ``,

    /** 必填，币安API Secret */
    apiSecret: ``,

    /**
     *  初始建仓的数量；
     *    存在此值时，则在策略启动时执行初始建仓数量；
     *    不存在此值，则立即加仓满足minOpenPositionQuantity条件；
     *  TODO
     *    此字段好像没有用上, 因为实际与minOpenPositionQuantity的逻辑冲突;
     *    假设持仓logs里没有数据, 自然会重新创建一次仓位;
     */
    initialFillPrice: 0,

    /** 杠杆倍数, 默认20(不足20的设为最大倍数) */
    leverage: 20,

    /** 限制的最大的持仓数量,为null或者undefined则不做限制 eg: 1个ETH */
    maxOpenPositionQuantity: undefined,

    /** 限制的最少的持仓数量,为null或者undefined则不做限制 eg: 0.2个ETH */
    minOpenPositionQuantity: undefined,

    /** 必填，网格之间的价格差价 */
    gridPriceDifference: undefined,

    /** 网格每次交易的数量（向后兼容，当没有设置分离数量时使用） */
    gridTradeQuantity: undefined,

    /** 做多方向：每次增加多单持仓的数量 */
    gridLongOpenQuantity: undefined,

    /** 做多方向：每次减少多单持仓的数量 */
    gridLongCloseQuantity: undefined,

    /** 做空方向：每次增加空单持仓的数量（开空单） */
    gridShortOpenQuantity: undefined,

    /** 做空方向：每次减少空单持仓的数量（平空单） */
    gridShortCloseQuantity: undefined,

    /** 防跌/防涨系数：系数越大，价格变动时的触发价格会下放的更低，为0时固定使用网格差价 */
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
     * 内部关于限制沦陷频率的逻辑, 避免频繁下单
     * 设为0则不限制, 回测用
    */
    pollingInterval: 10000,

    /** 是否启用日志输出，默认为 true */
    enableLog: true,

    /** 允许'顺势仅减仓策略'：当仓位记录为空但实际持有仓位时，在价格趋势中优先执行平仓而不创建新开仓仓位 */
    priorityCloseOnTrend: true,

    /** 计算平均成本价的默认天数 */
    avgCostPriceDays: 30
  };

  // TODO: normalizeDatatypes 需要改造为一个通用函数，内部饮用models的相关data-tpye要求
  // this.config = Object.assign({}, defaultOptions, normalizeDatatypes(options));

  if (!options.gridPriceDifference) {
    UtilRecord.log(`❗️ 必填项'gridPriceDifference'不能为空`);
    return;
  }

  // 检查交易数量配置的有效性
  const hasGridTradeQuantity = options.gridTradeQuantity && options.gridTradeQuantity > 0;

  // 检查做多方向的分离数量配置
  const hasLongQuantities = options.gridLongOpenQuantity && options.gridLongOpenQuantity > 0 &&
    options.gridLongCloseQuantity && options.gridLongCloseQuantity > 0;

  // 检查做空方向的分离数量配置
  const hasShortQuantities = options.gridShortOpenQuantity && options.gridShortOpenQuantity > 0 &&
    options.gridShortCloseQuantity && options.gridShortCloseQuantity > 0;

  // 根据持仓方向检查数量配置
  if (options.positionSide === 'LONG') {
    if (!hasGridTradeQuantity && !hasLongQuantities) {
      UtilRecord.log(`❗️ 做多方向必须配置 'gridTradeQuantity' 或者同时配置 'gridLongOpenQuantity' 和 'gridLongCloseQuantity'，且值必须大于0`);
      return;
    }
  }
  if (options.positionSide === 'SHORT') {
    if (!hasGridTradeQuantity && !hasShortQuantities) {
      UtilRecord.log(`❗️ 做空方向必须配置 'gridTradeQuantity' 或者同时配置 'gridShortOpenQuantity' 和 'gridShortCloseQuantity'，且值必须大于0`);
      return;
    }
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

  if (!this.config.positionSide || (this.config.positionSide !== 'LONG' && this.config.positionSide !== 'SHORT')) {
    UtilRecord.log(`❗️ 必填项'positionSide'不能为空，且必须为'LONG'或'SHORT'`);
    return;
  }

  /** 当前网格是否暂停(用户手动暂停当前网格), 暂停权重1(最高) */
  this.paused = false;

  /** 当前网格是否暂停(业务逻辑自动判断进行设定的暂停与否), 暂停权重2 */
  this.autoPaused = true;

  /** 初始化状态 */
  this.initStatus = false;

  /** 当前已有的持仓数量 */
  this.totalOpenPositionQuantity = 0;

  /** 当前平均持仓成本价格 */
  this.totalOpenPositionEntryPrice = 0;

  /** 当前持仓保本价格 */
  this.breakEvenPrice = 0;

  /** 期望下次涨至某价格 */
  this.nextExpectedRisePrice = null;

  /** 期望下次跌至某价格 */
  this.nextExpectedFallPrice = null;

  /** 仓位记录，日志记录 */
  this.logs = [];

  /** 建仓记录, 剩余未匹配平仓的订单 */
  this.positionOpenHistory = [];

  /** 查询次数计数器 */
  this.count = 0;

  /** 配合 pollingInterval 进行轮询操作, 为true则禁止通行 */
  this.throttleEnabled = false;

  /** 账户信息重试间隔时间 */
  this.accountInfoRetryInterval = 5000;

  /** 订单操作锁：防止异步竞态导致重复开单或平单。'idle': 空闲, 'opening': 开仓中, 'closing': 平仓中 */
  this.orderOptions = { lock: 'idle' };

  /** 账户信息 */
  this.accountInfo = {};

  /** 当前制定交易对与其开单方向的币种持仓信息 */
  this.tradingPairInfo = {};

  /** 交易所信息缓存 */
  this.exchangeInfo = null;

  /** 策略日志记录器 */
  this.logger = StrategyLog.createLogger({
    symbol: this.config.tradingPair,
    apiKey: this.config.apiKey,
    market: 'um',
    direction: this.config.positionSide === 'LONG' ? 'long' : 'short'
  });

  let usdmClientConfig = {};
  if (process.env.NODE_ENV !== 'production') {
    const proxyConfig = getProxyConfig();
    if (proxyConfig) {
      usdmClientConfig.proxy = proxyConfig;
    }
  }

  /** 调用binance生成的客户端 */
  this.client = new USDMClient(
    {
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
    },
    usdmClientConfig
  );


  /**
   * 获取交易所信息(三级缓存:内存→数据库→API)
   * @returns {Promise<Object>} 交易所信息对象
   */
  this.getExchangeInfo = async () => {
    // 第一级:检查内存缓存
    if (this.exchangeInfo && this.exchangeInfo.symbols && this.exchangeInfo.symbols.length > 0) {
      this.logger.debug(`从内存缓存获取交易所信息(${this.exchangeInfo.symbols.length}个交易对)`);
      return this.exchangeInfo;
    }

    try {
      // 第二级:检查数据库缓存
      const dbRecord = await db.binance_exchange_info.getLatest();
      if (dbRecord && dbRecord.exchange_info) {
        try {
          const exchangeInfo = JSON.parse(dbRecord.exchange_info);
          if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
            this.exchangeInfo = exchangeInfo;
            this.logger.debug(`从数据库缓存获取交易所信息(${exchangeInfo.symbols.length}个交易对)`);

            // 检查是否需要后台更新(超过1天)
            const needsUpdate = await db.binance_exchange_info.needsUpdate();
            if (needsUpdate) {
              this.logger.debug(`数据库缓存已过期,启动后台更新任务`);
              this.updateExchangeInfoInBackground();
            }

            return this.exchangeInfo;
          }
        } catch (parseError) {
          this.logger.warn(`解析数据库中的交易所信息失败:`, parseError?.message);
        }
      }

      // 第三级:从API获取
      this.logger.debug(`内存和数据库均无有效缓存,从币安API获取交易所信息`);
      const exchangeInfo = await this.fetchExchangeInfoFromAPI();

      if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
        // 更新内存缓存
        this.exchangeInfo = exchangeInfo;

        // 更新数据库缓存(异步,不阻塞主流程)
        this.saveExchangeInfoToDB(exchangeInfo).catch(err => {
          this.logger.warn(`保存交易所信息到数据库失败:`, err?.message);
        });

        return this.exchangeInfo;
      }

      // 所有方式都失败,返回空结构
      this.logger.error(`无法通过任何方式获取交易所信息`);
      this.exchangeInfo = { symbols: [] };
      return this.exchangeInfo;

    } catch (error) {
      this.logger.error(`获取交易所信息过程出错:`, error);
      this.exchangeInfo = { symbols: [] };
      return this.exchangeInfo;
    }
  };

  /**
   * 从币安API获取交易所信息(带重试机制)
   * @returns {Promise<Object>} 交易所信息对象
   */
  this.fetchExchangeInfoFromAPI = async () => {
    const maxRetries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.debug(`第 ${attempt} 次尝试从API获取交易所信息...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        const exchangeInfo = await this.client.getExchangeInfo();

        if (!exchangeInfo || !exchangeInfo.symbols || exchangeInfo.symbols.length === 0) {
          throw new Error('API返回的交易所信息为空或格式异常');
        }

        this.logger.debug(`成功从API获取交易所信息(${exchangeInfo.symbols.length}个交易对)`);
        return exchangeInfo;
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(`从API获取交易所信息失败(已重试${maxRetries}次):`, error);
          throw error;
        }
        this.logger.warn(`从API获取交易所信息失败(第${attempt}次尝试):`, error?.message || error);
      }
    }
  };

  /**
   * 保存交易所信息到数据库
   * @param {Object} exchangeInfo 交易所信息对象
   */
  this.saveExchangeInfoToDB = async (exchangeInfo) => {
    try {
      await db.binance_exchange_info.create({
        exchange_info: JSON.stringify(exchangeInfo),
        market_type: 'usdm'
      });
      this.logger.debug(`交易所信息已保存到数据库`);
    } catch (error) {
      this.logger.error(`保存交易所信息到数据库失败:`, error);
      throw error;
    }
  };

  /**
   * 后台更新交易所信息(不阻塞主流程)
   */
  this.updateExchangeInfoInBackground = () => {
    setTimeout(async () => {
      try {
        this.logger.debug(`开始后台更新交易所信息`);
        const exchangeInfo = await this.fetchExchangeInfoFromAPI();

        if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
          // 更新内存缓存
          this.exchangeInfo = exchangeInfo;

          // 更新数据库缓存
          await this.saveExchangeInfoToDB(exchangeInfo);
          this.logger.debug(`后台更新交易所信息完成`);
        }
      } catch (error) {
        this.logger.warn(`后台更新交易所信息失败:`, error?.message);
      }
    }, 5000); // 延迟5秒执行,避免影响主流程
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
      // 回退到默认的精度处理
      return new bigNumber(quantity).toFixed(8);
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
    // -2022: ReduceOnly 订单被拒绝，说明实际没有仓位可平（可能被手动平仓了）
      case -2022:
        this.logger.warn(`检测到仓位已被手动平仓（错误码-2022），清空开仓历史记录并重新初始化情况`);
        this.positionOpenHistory = [];
        this.totalOpenPositionQuantity = 0;
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
   * 获取做多方向的增加数量（开多单）
   * 优先使用 gridLongOpenQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 做多增加数量
   */
  this.getLongOpenQuantity = () => {
    return this.config.gridLongOpenQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 获取做多方向的减少数量
   * 优先使用 gridLongCloseQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 做多减少数量
   */
  this.getLongCloseQuantity = () => {
    return this.config.gridLongCloseQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 获取做空方向的增加数量（开空单）
   * 优先使用 gridShortOpenQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 做空增加数量
   */
  this.getShortOpenQuantity = () => {
    return this.config.gridShortOpenQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 获取做空方向的减少数量（平空单）
   * 优先使用 gridShortCloseQuantity，如果没有则使用 gridTradeQuantity
   * @returns {number} 做空减少数量
   */
  this.getShortCloseQuantity = () => {
    return this.config.gridShortCloseQuantity || this.config.gridTradeQuantity;
  };

  /**
   * 获取开仓数量
   * 做多：增加多单
   * 做空：增加空单
   * @returns {number} 开仓数量
   */
  this.getOpenQuantity = () => {
    if (this.config.positionSide === 'LONG') {
      return this.getLongOpenQuantity();
    } else {
      return this.getShortOpenQuantity();
    }
  };

  /**
   * 获取平仓数量
   * 做多：减少多单
   * 做空：减少空单
   * @returns {number} 平仓数量
   */
  this.getCloseQuantity = () => {
    if (this.config.positionSide === 'LONG') {
      return this.getLongCloseQuantity();
    } else {
      return this.getShortCloseQuantity();
    }
  };


  /**
   * 重置期望价格, 通过防跌系数计算出预期价格(即下一次可以建仓的价格)
   * @param {Number|String} executionPrice 成交价格 
   */
  this.resetTargetPrice = (executionPrice) => {
    if (!executionPrice || !this.config.gridPriceDifference) {
      this.logger.warn(`重置期望价格失败，executionPrice: ${executionPrice}, gridPriceDifference: ${this.config.gridPriceDifference}`);
      return;
    }

    // 根据方向确定价格计算方式
    if (this.config.positionSide === 'LONG') {
      // 做多逻辑
      this.nextExpectedRisePrice = bigNumber(executionPrice).plus(this.config.gridPriceDifference).toNumber();
      let coefficient = bigNumber(this.config.gridPriceDifference)
        .times(bigNumber(this.totalOpenPositionQuantity).div(this.config.maxOpenPositionQuantity))
        .times(this.config.fallPreventionCoefficient);
      coefficient = coefficient.isNaN() ? 0 : coefficient;
      this.nextExpectedFallPrice = bigNumber(executionPrice).minus(this.config.gridPriceDifference).minus(coefficient).toNumber();
    } else {
      // 做空逻辑
      this.nextExpectedFallPrice = bigNumber(executionPrice).minus(this.config.gridPriceDifference).toNumber();
      let coefficient = bigNumber(this.config.gridPriceDifference)
        .times(bigNumber(this.totalOpenPositionQuantity).div(this.config.maxOpenPositionQuantity))
        .times(this.config.fallPreventionCoefficient);
      coefficient = coefficient.isNaN() ? 0 : coefficient;
      this.nextExpectedRisePrice = bigNumber(executionPrice).plus(this.config.gridPriceDifference).plus(coefficient).toNumber();
    }
  };


  /**
   * 调用平仓位接口
   * @param {Number|String} positionQuantity 操作数量 
   */
  this.closePositionOrder = async (positionQuantity) => {
    const adjustedQuantity = await this.adjustQuantity(positionQuantity);
    // 根据方向确定平仓操作
    if (this.config.positionSide === 'LONG') {
      // 做多平仓
      return this.client.submitNewOrder({
        symbol: this.config.tradingPair,
        side: 'SELL',
        type: 'MARKET',
        quantity: adjustedQuantity,
        positionSide: 'LONG'
      });
    } else {
      // 做空平仓
      return this.client.submitNewOrder({
        symbol: this.config.tradingPair,
        side: 'BUY',
        type: 'MARKET',
        quantity: adjustedQuantity,
        positionSide: 'SHORT'
      });
    }
  };


  /**
   * 调用创建仓位接口
   * @param {Number|String} positionQuantity 操作数量 
   */
  this.placePositionOrder = async (positionQuantity) => {
    const adjustedQuantity = await this.adjustQuantity(positionQuantity);
    // 根据方向确定开仓操作
    if (this.config.positionSide === 'LONG') {
      // 做多开仓
      return this.client.submitNewOrder({
        symbol: this.config.tradingPair,
        side: 'BUY',
        type: 'MARKET',
        quantity: adjustedQuantity,
        positionSide: 'LONG'
      });
    } else {
      // 做空开仓
      return this.client.submitNewOrder({
        symbol: this.config.tradingPair,
        side: 'SELL',
        type: 'MARKET',
        quantity: adjustedQuantity,
        positionSide: 'SHORT'
      });
    }
  };


  /**
   * 查询订单详情，最多重试3次，超过后通过持仓推断订单结果
   * @param {Number|String} orderId 订单ID
   * @param {Number} prePositionQty 订单前持仓数量
   * @param {Number} orderQty 订单数量
   * @param {String} orderType 订单类型 'open' | 'close'
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
        if (i < MAX_RETRY) await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 超过最大重试次数，启用持仓推断机制
    this.logger.warn(`超过最大重试次数，启用持仓推断机制`);
    await this.initAccountInfo().catch(() => { });
    const expectedQty = orderType === 'open'
      ? bigNumber(prePositionQty).plus(orderQty).toNumber()
      : bigNumber(prePositionQty).minus(orderQty).toNumber();
    const isSuccess = Math.abs(this.totalOpenPositionQuantity - expectedQty) <= bigNumber(orderQty).times(0.001).toNumber();
    this.logger.log(`📊 持仓推断: 订单前=${prePositionQty}, 预期=${expectedQty}, 当前=${this.totalOpenPositionQuantity}, 推断${isSuccess ? '成功' : '失败'}`);
    if (typeof this.onWarn === 'function') {
      this.onWarn({ id: this.config.id, message: `订单查询失败，通过持仓推断${isSuccess ? '成功' : '失败'}` });
    }
    return isSuccess ? { orderId, avgPrice: String(this.latestPrice || 0), status: 'INFERRED' } : null;
  };


  /**
   * 创建仓位
   * @param {*} positionQuantity 操作数量
   */
  this.openOrders = async (positionQuantity) => {
    if (this.orderOptions.lock !== 'idle') {
      this.logger.warn(`订单操作进行中(${this.orderOptions.lock})，跳过本次开仓请求`);
      return;
    }
    this.orderOptions.lock = 'opening';
    const prePositionQty = this.totalOpenPositionQuantity;

    let result = null;
    try {
      const res = await this.placePositionOrder(positionQuantity);
      this.logger.order('create', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error(`创建${this.config.positionSide === 'LONG' ? '多' : '空'}单仓位失败`, error);
      if (typeof this.onWarn === 'function') this.onWarn({ id: this.config.id, message: `创建仓位失败`, error });
    }
    await new Promise(r => setTimeout(r, 1000));
    this.initAccountInfo().catch(() => { });
    if (!result) { this.orderOptions.lock = 'idle'; return; }

    await new Promise(r => setTimeout(r, 500));
    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, positionQuantity, 'open');
    if (!orderDetail) {
      this.logger.warn(`创建${this.config.positionSide === 'LONG' ? '多' : '空'}单后，无法查询订单详情`);
      this.orderOptions.lock = 'idle';
      return;
    }

    this.logs.push(orderDetail);
    this.positionOpenHistory.push(orderDetail);
    if (typeof this.onOpenPosition === 'function') this.onOpenPosition({ id: this.config.id, ...orderDetail });
    this.logger.log(`🎉 建仓成功`);
    this.resetTargetPrice(Number(orderDetail.avgPrice));
    this.orderOptions.lock = 'idle';
  };


  /**
   * 平掉仓位
   * @param {*} positionQuantity 操作数量
   */
  this.closeOrders = async (positionQuantity) => {
    if (this.orderOptions.lock !== 'idle') {
      this.logger.warn(`订单操作进行中(${this.orderOptions.lock})，跳过本次平仓请求`);
      return;
    }
    this.orderOptions.lock = 'closing';
    const prePositionQty = this.totalOpenPositionQuantity;

    let result = null;
    try {
      const res = await this.closePositionOrder(positionQuantity);
      this.logger.order('close', res);
      result = this.getParseDatum(res);
    } catch (error) {
      this.logger.error(`平${this.config.positionSide === 'LONG' ? '多' : '空'}单仓位失败`, error);
      if (typeof this.onWarn === 'function') this.onWarn({ id: this.config.id, message: `平仓失败`, error });
      this.handleCloseOrderError(error);
    }
    await new Promise(r => setTimeout(r, 1000));
    this.initAccountInfo().catch(() => { });
    if (!result) { this.orderOptions.lock = 'idle'; return; }

    await new Promise(r => setTimeout(r, 500));
    const orderDetail = await this.queryOrder(result.orderId, prePositionQty, positionQuantity, 'close');
    if (!orderDetail) {
      this.logger.warn(`平掉${this.config.positionSide === 'LONG' ? '多' : '空'}单后，无法查询订单详情`);
      this.orderOptions.lock = 'idle';
      return;
    }

    this.logs.push(orderDetail);
    this.positionOpenHistory.pop();
    if (typeof this.onClosePosition === 'function') this.onClosePosition({ id: this.config.id, ...orderDetail });
    this.logger.log(`🎉 平仓成功`);
    this.resetTargetPrice(Number(orderDetail.avgPrice));
    this.orderOptions.lock = 'idle';
  };


  /**
   * 获取账户信息（U本位合约账户）
   * 使用 Service 层的缓存机制和限流保护，避免频繁调用币安API导致限流
   * Service 层有三层缓存: 内存缓存(20秒) -> 数据库缓存(20秒) -> API调用(带限流保护)
   */
  this.getAccountInfo = async () => {
    try {
      // 使用 Service 层获取账户信息（带缓存和限流保护）
      // 如果没有 userId，则直接调用 client（向后兼容）
      let accountInfo;
      if (this.config.userId) {
        accountInfo = await binanceAccountService.getUSDMFuturesAccount(
          this.config.apiKey,
          this.config.apiSecret,
          this.config.userId,
          true // includePositions
        );
      } else {
        // 向后兼容：没有 userId 时使用原有方式
        this.logger.warn('未提供 userId，使用直接API调用（无缓存保护）');
        accountInfo = await this.client.getAccountInformation();
      }

      if (!accountInfo || !accountInfo.positions) {
        throw new Error('账户信息为空或格式异常');
      }

      return accountInfo;
    } catch (error) {
      this.logger.error('获取账户信息失败:', error);
      throw error;
    }
  };


  /**
   * 初始化账户信息与仓位信息
   */
  this.initAccountInfo = async () => {
    let accountInfo = await this.getAccountInfo().catch((error) => {
      this.logger.error('获取账户信息失败', error);

      // 获取账户信息失败时触发 onWarn 事件
      if (typeof this.onWarn === 'function') {
        this.onWarn({
          id: this.config.id,
          message: '获取账户信息失败',
          error: error
        });
      }
    });

    try {
      // 处理 accountInfo 可能是对象、字符串或 undefined 的情况
      if (typeof accountInfo === 'string') {
        accountInfo = JSON.parse(accountInfo);
      } else if (typeof accountInfo === 'object' && accountInfo !== null) {
        // 如果已经是对象，检查是否是错误对象
        if (accountInfo.code || accountInfo.message) {
          throw accountInfo;
        }
      } else {
        // accountInfo 为 undefined 或其他无效值
        throw new Error('账户信息为空');
      }

      this.accountInfo = accountInfo;
      this.tradingPairInfo = accountInfo.positions.find(item => item.symbol === this.config.tradingPair && item.positionSide === this.config.positionSide);

      // 做多
      if (this.config.positionSide === 'LONG') {
        this.totalOpenPositionQuantity = Number(this.tradingPairInfo.positionAmt);
        this.totalOpenPositionEntryPrice = Number(this.tradingPairInfo.entryPrice) || this.totalOpenPositionEntryPrice;
        this.breakEvenPrice = Number(this.tradingPairInfo.breakEvenPrice) || 0;
      }
      // 做空
      else {
        this.totalOpenPositionQuantity = Math.abs(Number(this.tradingPairInfo.positionAmt));
        this.totalOpenPositionEntryPrice = Number(this.tradingPairInfo.entryPrice) || this.totalOpenPositionEntryPrice;
        this.breakEvenPrice = Number(this.tradingPairInfo.breakEvenPrice) || 0;
      }

      this.accountInfoRetryInterval = 5000;
      this.lastAccountInfoUpdate = Date.now();
    } catch (error) {
      this.logger.error(`accountInfo 数据异常`, error);
      this.logger.debug(`NODE_ENV: ${process.env.NODE_ENV}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.exchange('accountInfo', accountInfo);
      }

      // 初始化账户信息失败时触发 onWarn 事件
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
   * 当前每网格匹配成功所得利润(扣减0.1%手续费)
   * @returns {number} 每个网格匹配成功的实际利润
   */
  this.getGridProfit = (latestPrice) => {
    if (this.config.positionSide === 'LONG') {
      // 做多利润计算： 下一个网格的平仓价格 * 平仓数量 - 开仓价格 * 平仓数量 - 手续费
      // 做多手续费计算: 开仓手续费 + 平仓手续费
      // 开仓手续费: 开仓价格 * 平仓数量 * 0.001
      // 平仓手续费: 下一个网格的平仓价格 * 平仓数量 * 0.001
      // 下一个网格的平仓价格: 开仓价格 + 网格差价
      let closeQuantity = this.getLongCloseQuantity(); // 减少多单数量
      let openCost = bigNumber(latestPrice).times(closeQuantity);
      let closeValue = bigNumber(latestPrice).plus(this.config.gridPriceDifference).times(closeQuantity);
      let openFee = openCost.times(0.001);
      let closeFee = closeValue.times(0.001);
      let actualProfit = closeValue.minus(openCost).minus(openFee).minus(closeFee);
      return actualProfit;
    } else {
      // 做空利润计算： 开仓价格 * 平仓数量 - 下一个网格的平仓价格 * 平仓数量 - 手续费
      // 做空手续费计算: 开仓手续费 + 平仓手续费
      // 开仓手续费: 开仓价格 * 平仓数量 * 0.001
      // 平仓手续费: 下一个网格的平仓价格 * 平仓数量 * 0.001
      // 下一个网格的平仓价格: 开仓价格 - 网格差价
      let closeQuantity = this.getShortCloseQuantity();   // 减少空单数量（平空单）
      let openCost = bigNumber(latestPrice).times(closeQuantity);
      let closeValue = bigNumber(latestPrice).minus(this.config.gridPriceDifference).times(closeQuantity);
      let openFee = openCost.times(0.001);
      let closeFee = closeValue.times(0.001);
      let actualProfit = openCost.minus(closeValue).minus(openFee).minus(closeFee);
      return actualProfit;
    }
  };


  /**
   * 获取上一个平仓的订单信息
   * @returns {Object|null} 上一个平仓的订单详情，如果没有找到则返回 null
   */
  this.getLastClosedOrder = () => {
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const order = this.logs[i];
      if (this.config.positionSide === 'LONG' && order.side === 'SELL') {
        return order;
      }
      if (this.config.positionSide === 'SHORT' && order.side === 'BUY') {
        return order;
      }
    }
    return null;
  };

  /**
   * 获取上一个开仓的订单信息
   * @returns {Object|null} 上一个开仓的订单详情，如果没有找到则返回 null
   */
  this.getLastOpenOrder = () => {
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const order = this.logs[i];
      if (this.config.positionSide === 'LONG' && order.side === 'BUY') {
        return order;
      }
      if (this.config.positionSide === 'SHORT' && order.side === 'SELL') {
        return order;
      }
    }
    return null;
  };


  /**
   * 主流程函数, 循环网格 - step.2
   * @description 此函数是网格交易策略的核心，它根据最新的价格信息来决定是否进行建仓或平仓操作。
   *               函数首先检查最新的价格，然后根据当前的价格与期望的涨跌价格进行比较，决定是否进行交易。
   *               如果价格达到或超过期望的价格，则会平仓；如果价格符合条件，则会加仓。
   *               此外，函数还会根据配置的限制价格来决定是否暂停网格交易。
   * @param {Object} data - 包含最新价格信息的对象。
   * @param {number} data.latestPrice - 最新的市场价格。
   */
  this.gridWebsocket = async ({ latestPrice }) => {
    if (!latestPrice) {
      this.logger.warn(`gridWebsocket latestPrice error: `, latestPrice);
      return;
    }

    if (!this.initStatus || !this.accountInfo?.positions) {
      this.logger.warn(`initOrders 函数还未初始化完成, 请稍等...`);
      this.logger.debug(`initStatus`, this.initStatus);
      this.logger.debug(`accountInfo?.positions`, this.accountInfo?.positions);
      return;
    }

    this.latestPrice = latestPrice; // 缓存用, 其他作用域会用到

    // 根据用户要求, 将网格暂停
    if (this.paused) {
      this.logger.log(`⛔️ 根据用户要求, 将网格暂停`);
      return;
    }

    // 大于等于或小于等于限制价格时，暂停网格
    let { ltLimitationPrice, gtLimitationPrice } = this.config;
    if (Number.isFinite(ltLimitationPrice) && latestPrice <= ltLimitationPrice) {
      this.logger.log(`⛔️ 币价小于等于限制价格，暂停网格`);
      this.onPausedGrid();
    }
    else if (Number.isFinite(gtLimitationPrice) && latestPrice >= gtLimitationPrice) {
      this.logger.log(`⛔️ 币价大于等于限制价格，暂停网格`);
      this.onPausedGrid();
    }
    else {
      this.onContinueGrid();
    }

    if (latestPrice >= this.tradingPairInfo.entryPrice && this.config.isAboveOpenPrice) {
      this.logger.log(`⛔️ 币价${latestPrice} 大于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
      this.onPausedGrid();
    }
    else if (latestPrice <= this.tradingPairInfo.entryPrice && this.config.isBelowOpenPrice) {
      this.logger.log(`⛔️ 币价${latestPrice} 小于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
      this.onPausedGrid();
    }
    else {
      // 网格处于 正常的状态(没有暂停), 则可以 继续网格.
      // 主要是需要兼容 ltLimitationPrice, gtLimitationPrice 的情况.
      if (!this.autoPaused) this.onContinueGrid();
    }

    if (this.autoPaused) {
      this.logger.log(`⛔️ 因不满足本交易对的配置要求, 网格已暂停`);
      return;
    }

    if (this.throttleEnabled) return;
    if (this.config.pollingInterval) this.throttleEnabled = setTimeout(() => this.throttleEnabled = false, this.config.pollingInterval);

    // 假设没有仓位时：
    //  - 初始化账户信息与仓位信息；
    if (!this.totalOpenPositionQuantity || !this.positionOpenHistory?.length) {
      this.logger.warn(`当前已没有仓位信息，重新初始化账户信息与仓位信息用以同步最新数据`);
      this.logger.debug(`totalOpenPositionQuantity`, this.totalOpenPositionQuantity);
      this.logger.debug(`positionOpenHistory`, this.positionOpenHistory);
      await this.initAccountInfo().catch(() => { });
    }

    // 定期刷新账户信息，避免手动转入资金后无法及时更新余额的问题
    // 每100次轮询或超过5分钟未更新时强制刷新一次
    if (this.count % 100 === 0 || !this.lastAccountInfoUpdate || (Date.now() - this.lastAccountInfoUpdate) > 300000) {
      this.logger.log(`🔄 定期刷新账户信息以同步最新余额`);
      await this.initAccountInfo().catch(() => { });
    }

    this.logger.log(`----- ${dayjs().format('YYYY-MM-DD HH:mm:ss')} -----`);
    this.logger.log(`💰 ${this.config.positionSide === 'LONG' ? '做多' : '做空'}网格策略(ID: ${this.config.id}). 轮询第 ${this.count} 次`);
    this.count += 1;

    let longOpenQuantity = this.getLongOpenQuantity();
    let longCloseQuantity = this.getLongCloseQuantity();
    let shortOpenQuantity = this.getShortOpenQuantity();
    let shortCloseQuantity = this.getShortCloseQuantity();

    this.logger.log(`当前价格: ${latestPrice}`);
    this.logger.log(`当前总持仓数量为 ${this.totalOpenPositionQuantity}/${this.config.tradingPair}, 限制最大持仓数量为 ${this.config.maxOpenPositionQuantity}/${this.config.tradingPair}`);

    if (this.config.positionSide === 'LONG') this.logger.log(`每次增加多单数量: ${longOpenQuantity}, 每次减少多单数量: ${longCloseQuantity}, 网格之间的价格差价: ${this.config.gridPriceDifference}`);
    if (this.config.positionSide === 'SHORT') this.logger.log(`每次增加空单数量: ${shortOpenQuantity}, 每次减少空单数量: ${shortCloseQuantity}, 网格之间的价格差价: ${this.config.gridPriceDifference}`);

    // TODO 
    // 单独编写一个函数, 从 getGridProfit 中拆出来, 用作计算手续费损耗

    this.logger.log(`下次网格减仓时匹配的利润预计为(扣除0.1%手续费): ${this.getGridProfit(latestPrice)}, `);

    this.logger.log(`允许顺势仅减仓策略: ${this.config.priorityCloseOnTrend}`);
    this.logger.log(`期望下次涨至某价格:`, this.nextExpectedRisePrice, `期望下次跌至某价格:`, this.nextExpectedFallPrice);

    if (this.config.positionSide === 'LONG') {
      this.logger.log(`累计已成交 ${this.logs.length} 次，其中开仓多单 ${(this.logs.filter(p => p.side === 'BUY')).length} 次，平仓多单 ${(this.logs.filter(p => p.side === 'SELL')).length} 次`);
    } else {
      this.logger.log(`累计已成交 ${this.logs.length} 次，其中开仓空单 ${(this.logs.filter(p => p.side === 'SELL')).length} 次，平仓空单 ${(this.logs.filter(p => p.side === 'BUY')).length} 次`);
    }

    this.logger.log(`API返回的平均开仓价: ${this.totalOpenPositionEntryPrice}, 保本价: ${this.breakEvenPrice}`);
    this.logger.log(`剩余未匹配平仓的订单: `, this.positionOpenHistory);

    if (this.config.maxOpenPositionQuantity ? this.totalOpenPositionQuantity > this.config.maxOpenPositionQuantity : false) {
      this.logger.log(`😎 当前方向持有仓位超过最大持仓数量限制`);
    }

    // 缓存中没有仓位且没有超过最大持仓数量限制, 创建一个新的仓位; 
    // 假设 priorityCloseOnTrend 为true, 则逻辑有微调
    if (
      !this.positionOpenHistory?.length
      && (this.config.maxOpenPositionQuantity ? this.totalOpenPositionQuantity < this.config.maxOpenPositionQuantity : true)
    ) {
      // 检查 priorityCloseOnTrend 配置,
      // 且存在仓位可以平仓,
      // 且当前价格latestPrice 大于等于 this.nextExpectedFallPrice(做多)或小于等于 this.nextExpectedRisePrice(做空) (即不满足开仓条件)
      // 时,
      // 不买入
      const openQuantity = this.getOpenQuantity();
      if (
        this.config.priorityCloseOnTrend &&
        Number.isFinite(this.nextExpectedFallPrice) &&
        Number.isFinite(this.totalOpenPositionEntryPrice) &&
        this.totalOpenPositionQuantity >= openQuantity &&
        (
          (this.config.positionSide === 'LONG' && latestPrice >= this.nextExpectedFallPrice && latestPrice >= this.totalOpenPositionEntryPrice)
          ||
          (this.config.positionSide === 'SHORT' && latestPrice <= this.nextExpectedRisePrice && latestPrice <= this.totalOpenPositionEntryPrice)
        )
      ) {
        this.logger.log(`🔄 启用顺势仅减仓策略：当前实际仓位数量为 ${this.totalOpenPositionQuantity}/${this.config.tradingPair}， 足够平仓，且当前仍处于${this.config.positionSide === 'LONG' ? '上涨' : '下跌'}趋势，因此跳过创建新仓位`);
      } else {
        this.logger.log(`😎 缓存中没有${this.config.positionSide === 'LONG' ? '多' : '空'}单仓位且没有超过最大持仓数量限制, 增加一个新的${this.config.positionSide === 'LONG' ? '多' : '空'}单仓位`);
        this.openOrders(openQuantity);
        return;
      }
    }

    // 订单历史中，最后一个订单的成交价格
    let lastPosition = this.positionOpenHistory[this.positionOpenHistory.length - 1];

    // 如果没有期望的涨跌价格，则初始化期望的涨跌价格
    if (
      (!this.nextExpectedRisePrice || !this.nextExpectedFallPrice)
      && this.logs.length
    ) {
      this.resetTargetPrice(this.logs[this.logs.length - 1].avgPrice);
    }

    // 做多逻辑
    if (this.config.positionSide === 'LONG') {
      // 缓存中还有多单订单的数据，且币价持续上涨则平仓, 但：
      // 不得少于最少持仓数量限制
      if (
        latestPrice > this.nextExpectedRisePrice &&
        this.totalOpenPositionQuantity >= (this.config.minOpenPositionQuantity || 0)
      ) {
        this.logger.log(`⬆️ 币价上涨，匹配上一个网格的价格为：`, lastPosition?.avgPrice);
        this.closeOrders(this.getCloseQuantity()); // 做多平仓使用卖出多单数量
        return;
      }

      // 币价下跌，则会加仓，但：
      // 不得超出最大持仓数量限制(如果没有设定最大持仓数量限制，则不做限制)
      if (
        latestPrice < this.nextExpectedFallPrice &&
        (this.config.maxOpenPositionQuantity ? this.totalOpenPositionQuantity < this.config.maxOpenPositionQuantity : true)
      ) {
        this.logger.log(`⬇️ 币价下跌, 增加一个新的多单仓位`);
        this.openOrders(this.getOpenQuantity()); // 做多开仓使用买入多单数量
        return;
      }
    }

    // 做空逻辑
    else {
      // 缓存中还有空单订单的数据，且币价持续下跌时应该平仓, 但：
      // 不得少于最少持仓数量限制
      if (
        latestPrice < this.nextExpectedFallPrice &&
        this.totalOpenPositionQuantity >= (this.config.minOpenPositionQuantity || 0)
      ) {
        this.logger.log(`⬇️ 币价下跌，匹配上一个空单的网格盈利价：`, lastPosition?.avgPrice);
        this.closeOrders(this.getCloseQuantity()); // 做空平仓使用买入空单数量
        return;
      }

      // 币价上涨，则会持续增加空单，但：
      // 不得超出最大持仓数量限制(如果没有设定最大持仓数量限制，则不做限制)
      if (
        latestPrice > this.nextExpectedRisePrice &&
        (this.config.maxOpenPositionQuantity ? this.totalOpenPositionQuantity < this.config.maxOpenPositionQuantity : true)
      ) {
        this.logger.log(`⬆️ 币价上涨, 增加一个新的空单仓位`);
        this.openOrders(this.getOpenQuantity()); // 做空开仓使用卖出空单数量
        return;
      }
    }

    // 提示：当前已有的持仓数量 大于 "最大持仓数量"，不再加仓
    if (
      this.totalOpenPositionQuantity !== 0
      && this.config.maxOpenPositionQuantity
      && this.totalOpenPositionQuantity >= this.config.maxOpenPositionQuantity
    ) {
      this.logger.log(`⛔️ 当前已有的持仓数量${this.totalOpenPositionQuantity} 大于 "最大持仓数量"${this.config.maxOpenPositionQuantity}，不再加仓`);
      return;
    }

    // 当前已有的持仓数量 小于 "最少持仓数量"，必然加仓
    if (
      this.config.minOpenPositionQuantity ? this.totalOpenPositionQuantity <= this.config.minOpenPositionQuantity : false
    ) {
      const quantity = this.getOpenQuantity(); // 使用开仓数量
      this.logger.log(`😎 当前已有的持仓数量${this.totalOpenPositionQuantity} 小于 "最少持仓数量"${this.config.minOpenPositionQuantity}, 立即加仓`);
      this.openOrders(quantity);
      return;
    }

    // TODO
    // 太长了, 暂时隐藏
    // if (process.env.NODE_ENV !== 'production') console.log(` 仓位记录 this.logs: `, this.logs);
  };


  /**
   * 暂停网格(业务逻辑自动判断进行设定的暂停与否)
   */
  this.onPausedGrid = async () => {
    this.autoPaused = true;
  };


  /**
   * 继续网格交易(业务逻辑自动判断进行设定的暂停与否)
   */
  this.onContinueGrid = async () => {
    this.autoPaused = false;
  };


  /** 手动暂停网格交易(根据用户要求设定网格的暂停状态) */
  this.onManualPausedGrid = async () => {
    this.paused = true;
  };


  /** 手动继续网格交易(根据用户要求设定网格的暂停状态) */
  this.onManualContinueGrid = async () => {
    this.paused = false;
  };

  /**
   * 启用日志输出
   */
  this.enableLog = () => {
    this.config.enableLog = true;
  };

  /**
   * 禁用日志输出
   */
  this.disableLog = () => {
    this.config.enableLog = false;
  };

  /**
   * 入口函数
   * 初始化持仓信息, step.1
   * 
   */
  this.initOrders = async () => {
    this.onPausedGrid();

    // 先获取交易所信息,避免后续精度处理失败
    await this.getExchangeInfo().catch((err) => {
      this.logger.error('初始化时获取交易所信息失败', err);
    });

    // 添加延迟,避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));

    let isOk = true;
    await this.initAccountInfo().catch(() => { isOk = false; });
    if (isOk === false) {
      setTimeout(this.initOrders, 1000);
      return;
    }

    let { minOpenPositionQuantity, maxOpenPositionQuantity } = this.config;

    // 假设不满足最少持仓数量限制，则补仓至-最少持仓数量+对应方向的开仓数量
    if (minOpenPositionQuantity && this.totalOpenPositionQuantity < minOpenPositionQuantity) {
      const openQuantity = this.getOpenQuantity(); // 使用开仓数量
      let quantity = bigNumber(minOpenPositionQuantity)
        .minus(this.totalOpenPositionQuantity)
        .plus(openQuantity)
        .toNumber();
      await this.openOrders(quantity).catch((err) => this.logger.error('初始化开仓失败', err));
    }

    this.initStatus = true;

    // 初始化完成后，恢复网格运行（由 gridWebsocket 根据价格条件判断是否暂停）
    this.onContinueGrid();
    this.logger.log(`✅ 策略初始化完成，网格已恢复运行`);
  };
}


module.exports = InfiniteGrid;