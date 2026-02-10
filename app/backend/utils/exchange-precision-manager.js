/**
 * 交易对精度信息管理模块
 * 
 * 功能:
 * - 支持多交易所(Binance、OKX、Gate.io等)
 * - 支持多市场类型(现货spot、U本位合约usdm、币本位合约coinm)
 * - 三级缓存机制(内存 → 数据库 → API)
 * - 统一的精度调整接口
 * 
 * 使用场景:
 * - 策略插件中调整订单数量精度
 * - Service层处理订单时的精度处理
 * - 任何需要获取交易对精度信息的地方
 */

const bigNumber = require('bignumber.js');
const UtilRecord = require('./record-log.js');
const db = require('../models');
const { USDMClient, CoinMClient, MainClient } = require('binance');
const { getProxyConfig } = require('./proxy.js');

class ExchangePrecisionManager {
  constructor() {
    // 内存缓存: { exchange: { marketType: { exchangeInfo, timestamp } } }
    this.memoryCache = {};

    // 缓存有效期: 24小时
    this.cacheExpireTime = 24 * 60 * 60 * 1000;

    // API请求重试配置
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * 获取交易所信息(三级缓存:内存→数据库→API)
   * @param {Object} options 配置参数
   * @param {string} options.exchange 交易所名称(binance/okx/gateio)
   * @param {string} options.marketType 市场类型(spot/usdm/coinm)
   * @param {string} options.apiKey API密钥
   * @param {string} options.apiSecret API密钥Secret
   * @param {boolean} [options.forceRefresh=false] 是否强制刷新缓存
   * @returns {Promise<Object>} 交易所信息对象
   */
  async getExchangeInfo(options) {
    const { exchange = 'binance', marketType = 'usdm', apiKey, apiSecret, forceRefresh = false } = options;

    if (!apiKey || !apiSecret) {
      throw new Error('缺少必要的API凭证');
    }

    const cacheKey = `${exchange}_${marketType}`;

    // 第一级:检查内存缓存
    if (!forceRefresh && this.isMemoryCacheValid(exchange, marketType)) {
      const cached = this.memoryCache[exchange][marketType];
      UtilRecord.log(`[精度管理] 从内存缓存获取 ${exchange} ${marketType} 交易所信息(${cached.exchangeInfo.symbols?.length || 0}个交易对)`);
      return cached.exchangeInfo;
    }

    try {
      // 第二级:检查数据库缓存
      if (!forceRefresh) {
        const dbRecord = await this.getFromDatabase(exchange, marketType);
        if (dbRecord) {
          // 更新内存缓存
          this.updateMemoryCache(exchange, marketType, dbRecord);

          UtilRecord.log(`[精度管理] 从数据库缓存获取 ${exchange} ${marketType} 交易所信息(${dbRecord.symbols?.length || 0}个交易对)`);

          // 检查是否需要后台更新
          const needsUpdate = await this.checkNeedsUpdate(exchange, marketType);
          if (needsUpdate) {
            UtilRecord.log(`[精度管理] ${exchange} ${marketType} 数据库缓存已过期,启动后台更新任务`);
            this.updateInBackground(exchange, marketType, apiKey, apiSecret);
          }

          return dbRecord;
        }
      }

      // 第三级:从API获取
      UtilRecord.log(`[精度管理] 内存和数据库均无有效缓存,从 ${exchange} API获取 ${marketType} 交易所信息`);
      const exchangeInfo = await this.fetchFromAPI(exchange, marketType, apiKey, apiSecret);

      if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
        // 更新内存缓存
        this.updateMemoryCache(exchange, marketType, exchangeInfo);

        // 更新数据库缓存(异步,不阻塞主流程)
        this.saveToDatabase(exchange, marketType, exchangeInfo).catch(err => {
          UtilRecord.error(`[精度管理] 保存 ${exchange} ${marketType} 交易所信息到数据库失败:`, err?.message || err);
        });

        return exchangeInfo;
      }

      // 所有方式都失败
      UtilRecord.error(`[精度管理] 无法通过任何方式获取 ${exchange} ${marketType} 交易所信息`);
      return { symbols: [] };

    } catch (error) {
      UtilRecord.error(`[精度管理] 获取 ${exchange} ${marketType} 交易所信息过程出错:`, error?.message || error);
      return { symbols: [] };
    }
  }

  /**
   * 检查内存缓存是否有效
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @returns {boolean} 是否有效
   */
  isMemoryCacheValid(exchange, marketType) {
    if (!this.memoryCache[exchange] || !this.memoryCache[exchange][marketType]) {
      return false;
    }

    const cached = this.memoryCache[exchange][marketType];
    const now = Date.now();

    return cached.exchangeInfo &&
      cached.exchangeInfo.symbols &&
      cached.exchangeInfo.symbols.length > 0 &&
      (now - cached.timestamp) < this.cacheExpireTime;
  }

  /**
   * 更新内存缓存
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @param {Object} exchangeInfo 交易所信息
   */
  updateMemoryCache(exchange, marketType, exchangeInfo) {
    if (!this.memoryCache[exchange]) {
      this.memoryCache[exchange] = {};
    }

    this.memoryCache[exchange][marketType] = {
      exchangeInfo,
      timestamp: Date.now()
    };
  }

  /**
   * 从数据库获取交易所信息
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @returns {Promise<Object|null>} 交易所信息或null
   */
  async getFromDatabase(exchange, marketType) {
    try {
      const record = await db.binance_exchange_info.findOne({
        where: {
          exchange: exchange,
          market_type: marketType
        },
        order: [['updated_at', 'DESC']],
        limit: 1
      });

      if (!record || !record.exchange_info) {
        return null;
      }

      try {
        const exchangeInfo = typeof record.exchange_info === 'string'
          ? JSON.parse(record.exchange_info)
          : record.exchange_info;

        if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
          return exchangeInfo;
        }
      } catch (parseError) {
        UtilRecord.error(`[精度管理] 解析数据库中的交易所信息失败:`, parseError?.message || parseError);
      }

      return null;
    } catch (error) {
      UtilRecord.error(`[精度管理] 从数据库获取交易所信息失败:`, error?.message || error);
      return null;
    }
  }

  /**
   * 检查数据库缓存是否需要更新
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @returns {Promise<boolean>} 是否需要更新
   */
  async checkNeedsUpdate(exchange, marketType) {
    try {
      const record = await db.binance_exchange_info.findOne({
        where: {
          exchange: exchange,
          market_type: marketType
        },
        order: [['updated_at', 'DESC']],
        limit: 1
      });

      if (!record) return true;

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      return record.updated_at < oneDayAgo;
    } catch (error) {
      UtilRecord.error(`[精度管理] 检查更新状态失败:`, error?.message || error);
      return true;
    }
  }

  /**
   * 保存交易所信息到数据库
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @param {Object} exchangeInfo 交易所信息
   */
  async saveToDatabase(exchange, marketType, exchangeInfo) {
    try {
      await db.binance_exchange_info.create({
        exchange: exchange,
        market_type: marketType,
        exchange_info: JSON.stringify(exchangeInfo)
      });
      UtilRecord.log(`[精度管理] ${exchange} ${marketType} 交易所信息已保存到数据库`);
    } catch (error) {
      UtilRecord.error(`[精度管理] 保存交易所信息到数据库失败:`, error?.message || error);
      throw error;
    }
  }

  /**
   * 从API获取交易所信息(带重试机制)
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @param {string} apiKey API密钥
   * @param {string} apiSecret API密钥Secret
   * @returns {Promise<Object>} 交易所信息
   */
  async fetchFromAPI(exchange, marketType, apiKey, apiSecret) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          UtilRecord.log(`[精度管理] 第 ${attempt} 次尝试从 ${exchange} API获取 ${marketType} 交易所信息...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }

        let exchangeInfo;

        if (exchange === 'binance') {
          exchangeInfo = await this.fetchFromBinance(marketType, apiKey, apiSecret);
        } else if (exchange === 'okx') {
          throw new Error('OKX交易所暂未实现');
        } else if (exchange === 'gateio') {
          throw new Error('Gate.io交易所暂未实现');
        } else {
          throw new Error(`不支持的交易所: ${exchange}`);
        }

        if (!exchangeInfo || !exchangeInfo.symbols || exchangeInfo.symbols.length === 0) {
          throw new Error('API返回的交易所信息为空或格式异常');
        }

        UtilRecord.log(`[精度管理] 成功从 ${exchange} API获取 ${marketType} 交易所信息(${exchangeInfo.symbols.length}个交易对)`);
        return exchangeInfo;
      } catch (error) {
        if (attempt === this.maxRetries) {
          UtilRecord.error(`[精度管理] 从 ${exchange} API获取 ${marketType} 交易所信息失败(已重试${this.maxRetries}次):`, error?.message || error);
          throw error;
        }
        UtilRecord.log(`[精度管理] 从 ${exchange} API获取 ${marketType} 交易所信息失败(第${attempt}次尝试):`, error?.message || error);
      }
    }
  }

  /**
   * 从币安API获取交易所信息
   * @param {string} marketType 市场类型
   * @param {string} apiKey API密钥
   * @param {string} apiSecret API密钥Secret
   * @returns {Promise<Object>} 交易所信息
   */
  async fetchFromBinance(marketType, apiKey, apiSecret) {
    const options = {
      api_key: apiKey,
      api_secret: apiSecret,
      beautify: true,
    };

    const requestOptions = {
      timeout: 10000,
    };

    if (process.env.NODE_ENV !== 'production') {
      const proxyConfig = getProxyConfig();
      if (proxyConfig) {
        requestOptions.proxy = proxyConfig;
      }
    }

    let client;
    if (marketType === 'usdm') {
      client = new USDMClient(options, requestOptions);
    } else if (marketType === 'coinm') {
      client = new CoinMClient(options, requestOptions);
    } else if (marketType === 'spot') {
      client = new MainClient(options, requestOptions);
    } else {
      throw new Error(`不支持的市场类型: ${marketType}`);
    }

    return await client.getExchangeInfo();
  }

  /**
   * 后台更新交易所信息(不阻塞主流程)
   * @param {string} exchange 交易所名称
   * @param {string} marketType 市场类型
   * @param {string} apiKey API密钥
   * @param {string} apiSecret API密钥Secret
   */
  updateInBackground(exchange, marketType, apiKey, apiSecret) {
    setTimeout(async () => {
      try {
        UtilRecord.log(`[精度管理] 开始后台更新 ${exchange} ${marketType} 交易所信息`);
        const exchangeInfo = await this.fetchFromAPI(exchange, marketType, apiKey, apiSecret);

        if (exchangeInfo && exchangeInfo.symbols && exchangeInfo.symbols.length > 0) {
          // 更新内存缓存
          this.updateMemoryCache(exchange, marketType, exchangeInfo);

          // 更新数据库缓存
          await this.saveToDatabase(exchange, marketType, exchangeInfo);
          UtilRecord.log(`[精度管理] 后台更新 ${exchange} ${marketType} 交易所信息完成`);
        }
      } catch (error) {
        UtilRecord.log(`[精度管理] 后台更新 ${exchange} ${marketType} 交易所信息失败:`, error?.message || error);
      }
    }, 5000); // 延迟5秒执行,避免影响主流程
  }

  /**
   * 调整订单数量精度
   * @param {Object} options 配置参数
   * @param {string} options.exchange 交易所名称
   * @param {string} options.marketType 市场类型
   * @param {string} options.symbol 交易对符号
   * @param {number|string} options.quantity 原始数量
   * @param {string} options.apiKey API密钥
   * @param {string} options.apiSecret API密钥Secret
   * @param {boolean} [options.silent=false] 是否静默模式
   * @param {string} [options.operationType=''] 操作类型(用于日志)
   * @returns {Promise<string>} 调整后的数量
   */
  async adjustQuantity(options) {
    const {
      exchange = 'binance',
      marketType = 'usdm',
      symbol,
      quantity,
      apiKey,
      apiSecret,
      silent = false,
      operationType = ''
    } = options;

    try {
      const exchangeInfo = await this.getExchangeInfo({ exchange, marketType, apiKey, apiSecret });
      return this.smartAdjustQuantity(exchangeInfo, symbol, quantity, { silent, operationType });
    } catch (error) {
      UtilRecord.error(`[精度管理] 调整 ${symbol} 数量精度失败:`, error?.message || error);
      // 回退到默认的精度处理
      return new bigNumber(quantity).toFixed(8);
    }
  }

  /**
   * 智能调整订单数量(基于交易所规则)
   * @param {Object} exchangeInfo 交易所信息
   * @param {string} symbol 交易对符号
   * @param {number|string} quantity 原始数量
   * @param {Object} options 选项 { silent: boolean, operationType: string }
   * @returns {string} 调整后的合规数量
   */
  smartAdjustQuantity(exchangeInfo, symbol, quantity, options = {}) {
    const { silent = false, operationType = '' } = options;
    const originalQuantity = quantity;

    if (!silent) {
      const opType = operationType ? `[${operationType}]` : '';
      const filters = this.getSymbolFilters(exchangeInfo, symbol);
      const lotSizeFilter = filters.find(filter => filter.filterType === 'LOT_SIZE');
      const precision = lotSizeFilter ? this.getDecimalPlaces(lotSizeFilter.stepSize) : 8;
      const precisionInfo = lotSizeFilter ? `, 精度要求: 最小=${lotSizeFilter.minQty}, 最大=${lotSizeFilter.maxQty}, ${precision}位小数` : ', 精度要求: 未知';
      UtilRecord.log(`[精度处理${opType}] ${symbol} 开始调整 - 操作类型: ${operationType || '未指定'}, 交易对: ${symbol}, 原始数量: ${quantity}${precisionInfo}`);
    }

    // 获取交易对的过滤器
    const filters = this.getSymbolFilters(exchangeInfo, symbol);

    // 根据过滤器调整数量
    const adjustedQuantity = this.adjustQuantityByFilters(symbol, quantity, filters, silent);

    // 只在数量有变化或非静默模式时输出结果
    if (!silent || originalQuantity !== adjustedQuantity) {
      const opType = operationType ? `[${operationType}]` : '';
      const lotSizeFilter = filters.find(filter => filter.filterType === 'LOT_SIZE');
      const precision = lotSizeFilter ? this.getDecimalPlaces(lotSizeFilter.stepSize) : 8;

      if (originalQuantity === adjustedQuantity) {
        UtilRecord.log(`[精度无需调整${opType}] ${symbol} 数量符合规范 - 最终数量: ${adjustedQuantity}, 精度要求: ${precision}位小数, 状态: 原始数量已符合交易所规范，无需调整`);
      } else {
        const adjustmentRatio = ((parseFloat(String(adjustedQuantity)) / parseFloat(String(originalQuantity)) - 1) * 100).toFixed(4);
        UtilRecord.log(`[精度调整完成${opType}] ${symbol} 调整总结 - 输入: ${originalQuantity}, 输出: ${adjustedQuantity}, 调整幅度: ${adjustmentRatio}%, 精度要求: ${precision}位小数, 处理结果: 已根据交易所规则成功调整`);
      }
    }

    return adjustedQuantity;
  }

  /**
   * 根据币安交易对过滤器规则调整订单数量
   * @param {string} symbol 交易对符号
   * @param {number|string} quantity 原始数量
   * @param {Array} symbolFilters 交易对过滤器数组
   * @param {boolean} silent 是否静默模式
   * @returns {string} 调整后的合规数量
   */
  adjustQuantityByFilters(symbol, quantity, symbolFilters, silent = false) {
    if (!symbolFilters || !symbolFilters.length) {
      if (!silent) UtilRecord.log(`[精度处理] ${symbol} 缺少过滤器信息，使用默认精度`);
      return new bigNumber(quantity).toFixed(8);
    }

    const lotSizeFilter = symbolFilters.find(filter => filter.filterType === 'LOT_SIZE');

    if (!lotSizeFilter) {
      if (!silent) UtilRecord.log(`[精度处理] ${symbol} 缺少LOT_SIZE过滤器，使用默认精度`);
      return new bigNumber(quantity).toFixed(8);
    }

    const { minQty, maxQty, stepSize } = lotSizeFilter;
    const originalQuantity = quantity;
    let adjustedQuantity = new bigNumber(quantity);
    let hasAdjustment = false;

    // 检查最小数量要求
    if (adjustedQuantity.isLessThan(minQty)) {
      if (!silent) {
        UtilRecord.log(`[精度警告-最小值] ${symbol} 数量不足提示 - 当前: ${quantity}, 最小限制: ${minQty}, 建议: 请使用不少于最小限制的数量`);
      }
    }

    // 检查最大数量要求
    if (adjustedQuantity.isGreaterThan(maxQty)) {
      if (!silent) {
        const precision = this.getDecimalPlaces(stepSize);
        UtilRecord.log(`[精度调整-最大值] ${symbol} 数量超限检测 - 当前: ${quantity}, 最大限制: ${maxQty}, 精度要求: ${precision}位小数, 调整动作: 降低至最大允许数量`);
      }
      adjustedQuantity = new bigNumber(maxQty);
      hasAdjustment = true;
    }

    // 根据精度要求调整数量
    if (stepSize && stepSize !== '0') {
      const precision = this.getDecimalPlaces(stepSize);
      const currentPrecision = adjustedQuantity.toFixed(precision);

      if (adjustedQuantity.toString() !== currentPrecision) {
        const beforePrecisionAdjust = adjustedQuantity.toString();
        adjustedQuantity = new bigNumber(currentPrecision);
        if (!silent) {
          UtilRecord.log(`[精度调整] ${symbol} 精度对齐处理 - 精度要求: ${precision}位小数, 调整前: ${beforePrecisionAdjust}, 调整后: ${adjustedQuantity.toString()}, 调整规则: 按精度要求截取小数位`);
        }
        hasAdjustment = true;
      }
    }

    const precision = this.getDecimalPlaces(stepSize);
    const result = adjustedQuantity.toFixed(precision);

    if (!silent && hasAdjustment) {
      UtilRecord.log(`[精度完成] ${symbol} 数量调整详情 - 原始: ${originalQuantity}, 调整后: ${result}, 最小限制: ${minQty}, 最大限制: ${maxQty}, 精度要求: ${precision}位小数, 调整规则: LOT_SIZE过滤器合规处理`);
    }

    return result;
  }

  /**
   * 获取数字的小数位数
   * @param {string} numberStr 数字字符串
   * @returns {number} 小数位数
   */
  getDecimalPlaces(numberStr) {
    if (!numberStr || numberStr === '0') return 8;

    const parts = numberStr.split('.');
    if (parts.length < 2) return 0;

    const decimals = parts[1].replace(/0+$/, '');
    return decimals.length || 1;
  }

  /**
   * 从交易所信息中获取指定交易对的过滤器
   * @param {Object} exchangeInfo 交易所信息
   * @param {string} symbol 交易对符号
   * @returns {Array} 过滤器数组
   */
  getSymbolFilters(exchangeInfo, symbol) {
    if (!exchangeInfo || !exchangeInfo.symbols) {
      UtilRecord.log('[精度管理] 交易所信息无效');
      return [];
    }

    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
    if (!symbolInfo) {
      UtilRecord.log(`[精度管理] 未找到交易对 ${symbol} 的信息`);
      return [];
    }

    return symbolInfo.filters || [];
  }

  /**
   * 获取交易对的数量精度(从 quantityPrecision 字段)
   * @param {Object} exchangeInfo 交易所信息
   * @param {string} symbol 交易对符号
   * @returns {number} 数量精度
   */
  getQuantityPrecision(exchangeInfo, symbol) {
    if (!exchangeInfo || !exchangeInfo.symbols) {
      UtilRecord.log('[精度管理] 交易所信息无效，使用默认精度 8');
      return 8;
    }

    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
    if (!symbolInfo) {
      UtilRecord.log(`[精度管理] 未找到交易对 ${symbol} 的信息，使用默认精度 8`);
      return 8;
    }

    return symbolInfo.quantityPrecision || 8;
  }

  /**
   * 清除内存缓存
   * @param {string} [exchange] 交易所名称(可选,不传则清除所有)
   * @param {string} [marketType] 市场类型(可选,不传则清除该交易所所有市场)
   */
  clearMemoryCache(exchange, marketType) {
    if (!exchange) {
      this.memoryCache = {};
      UtilRecord.log('[精度管理] 已清除所有内存缓存');
    } else if (!marketType) {
      delete this.memoryCache[exchange];
      UtilRecord.log(`[精度管理] 已清除 ${exchange} 的所有内存缓存`);
    } else {
      if (this.memoryCache[exchange]) {
        delete this.memoryCache[exchange][marketType];
        UtilRecord.log(`[精度管理] 已清除 ${exchange} ${marketType} 的内存缓存`);
      }
    }
  }
}

// 导出单例
const instance = new ExchangePrecisionManager();

module.exports = instance;
