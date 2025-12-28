const bigNumber = require('bignumber.js');
const { USDMClient } = require('binance');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require("../utils/record-log.js");
const binancePrecision = require("../utils/binance-precision");
const ApiError = require("../utils/api-error");


// 常量定义
const DELAY_RANGES = {
  SHORT: { min: 200, max: 500 }, // 短延迟范围
  MEDIUM: { min: 300, max: 600 }, // 中延迟范围
  LONG: { min: 500, max: 1000 } // 长延迟范围
};

const SKIP_SYMBOLS = ["USDCUSDT"]; // 跳过的币种


/**
 * 创建币安客户端
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @returns {USDMClient} 币安客户端实例
 */
const createClient = (api_key, secret_key) => {
  const options = {
    api_key: api_key,
    api_secret: secret_key,
    beautify: true,
  };

  const requestOptions = {
    timeout: 10000,
  };

  if (process.env.NODE_ENV !== "production") {
    const proxyConfig = getProxyConfig();
    if (proxyConfig) {
      requestOptions.proxy = proxyConfig;
    }
  }

  return new USDMClient(options, requestOptions);
};

/**
 * 获取账户信息（不检查余额）- 可用于平仓操作
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @returns {Promise<Object>} 账户信息
 */
const getAccountInfo = async (api_key, secret_key) => {
  try {
    const client = createClient(api_key, secret_key);
    return await client.getAccountInformation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    UtilRecord.error('获取账户信息失败:', error?.message || JSON.stringify(error));
    throw new Error('获取账户信息失败，请检查网络连接或稍后重试');
  }
};

/**
 * 获取交易对信息
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @returns {Promise<Object>} 交易对信息
 */
const getExchangeInfo = async (api_key, secret_key) => {
  try {
    const client = createClient(api_key, secret_key);
    return await client.getExchangeInfo();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    UtilRecord.error('获取交易对信息失败:', error?.message || JSON.stringify(error));
    throw new Error('获取交易对信息失败，请检查网络连接或稍后重试');
  }
};

/**
 * 获取价格信息（实时更新）
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @returns {Promise<Array>} 价格信息列表
 */
const getPriceInfo = async (api_key, secret_key) => {
  try {
    const client = createClient(api_key, secret_key);
    return await client.getSymbolPriceTicker();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    UtilRecord.error('获取价格信息失败:', error?.message || JSON.stringify(error));
    throw new Error('获取价格信息失败，请检查网络连接或稍后重试');
  }
};

/**
 * 获取USDT交易对列表
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {string|Array} customPositions - 自定义交易对列表（JSON字符串或数组）
 * @returns {Promise<Array>} USDT交易对列表
 */
const getUsdtTradingList = async (api_key, secret_key, customPositions = null) => {
  try {
    const priceInfo = await getPriceInfo(api_key, secret_key);
    let usdt_trading_list = priceInfo.filter(item => item.symbol.endsWith('USDT'));

    // 自定义建仓币种过滤
    if (customPositions) {
      try {
        const positions = typeof customPositions === 'string' ? JSON.parse(customPositions) : customPositions;
        usdt_trading_list = usdt_trading_list.filter(item => {
          return positions.find(p => p.symbol === item.symbol);
        });
      } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        throw new Error(`'positions' 不符合验证规则`);
      }
    }

    return usdt_trading_list;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 执行随机延迟
 * @param {string} range - 延迟范围类型
 */
const executeDelay = async (range = 'MEDIUM') => {
  const delayRange = DELAY_RANGES[range] || DELAY_RANGES.MEDIUM;
  const delayTime = Math.floor(Math.random() * (delayRange.max - delayRange.min + 1)) + delayRange.min;
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

/**
 * 批量建仓（对冲单）
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {number} longAmount - 多单金额
 * @param {number} shortAmount - 空单金额
 * @param {Array} positions - 自定义交易对列表
 * @returns {Promise<Object>} 执行结果
 */
const batchBuildPosition = async (api_key, secret_key, longAmount, shortAmount, positions = null) => {
  try {
    if (!longAmount || !shortAmount) {
      throw new Error('longAmount or shortAmount is not defined');
    }

    // 检查账户余额
    const account_info = await getAccountInfo(api_key, secret_key);
    if (new bigNumber(account_info.availableBalance).isLessThan(10)) {
      throw new Error(`当前合约账户余额${account_info.availableBalance}, 不足10u, 请充值`);
    }
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const usdt_trading_list = await getUsdtTradingList(api_key, secret_key, positions);

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPairs: usdt_trading_list.length
    };

    // 异步执行建仓操作，不阻塞函数返回
    setImmediate(async () => {
      let sufficient = true;
      const results = [];

      try {
        // 遍历交易对执行建仓
        for (let i = 0; i < usdt_trading_list.length && sufficient; i++) {
          const sequence = i + 1;
          const currency = usdt_trading_list[i];

          if (SKIP_SYMBOLS.includes(currency.symbol)) continue;

          const currencyPos = account_info.positions.filter(item => {
            return item.symbol === currency.symbol && item.notional !== '0';
          });

          const logPrefix = `序列 ${sequence}, 币种${currency.symbol}`;

          // 检查已有持仓
          if (currencyPos.length === 2) {
            console.log(`${logPrefix}有对冲单持仓`);
            continue;
          }

          const quantityPrecision = exchangeInfo.symbols.find(item =>
            item.symbol === currency.symbol
          )?.quantityPrecision || 8;

          // 建多单
          if (!currencyPos.find(item => item.positionSide === 'LONG') && longAmount > 0) {
            const rawQuantity = new bigNumber(longAmount).div(currency.price);
            const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, currency.symbol, rawQuantity.toString());

            try {
              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol: currency.symbol,
                side: 'BUY',
                type: 'MARKET',
                quantity: parseFloat(quantity),
                positionSide: 'LONG'
              });

              console.log(`--- 币种${currency.symbol} 新增多单持仓 ${longAmount} usdt`);
              results.push({ symbol: currency.symbol, action: 'BUY_LONG', success: true });
            } catch (error) {
              // 移除throw，确保异步流程不被中断
              if (typeof error === 'string' && error.includes('-2019')) {
                sufficient = false;
              }
              UtilRecord.log(`symbol: ${currency.symbol}`, error);
              results.push({ symbol: currency.symbol, action: 'BUY_LONG', success: false, error: error?.message || JSON.stringify(error) });
            }
          }

          if (!sufficient) break;
          await executeDelay('SHORT');

          // 建空单
          if (!currencyPos.find(item => item.positionSide === 'SHORT') && shortAmount > 0) {
            const rawQuantity = new bigNumber(shortAmount).div(currency.price);
            const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, currency.symbol, rawQuantity.toString());

            try {
              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol: currency.symbol,
                side: 'SELL',
                type: 'MARKET',
                quantity: parseFloat(quantity),
                positionSide: 'SHORT'
              });

              console.log(`--- 币种${currency.symbol} 新增空单持仓 ${shortAmount} usdt`);
              results.push({ symbol: currency.symbol, action: 'SELL_SHORT', success: true });
            } catch (error) {
              // 移除throw，确保异步流程不被中断
              if (typeof error === 'string' && error.includes('-2019')) {
                sufficient = false;
              }
              UtilRecord.log(`symbol: ${currency.symbol}`, error);
              results.push({ symbol: currency.symbol, action: 'SELL_SHORT', success: false, error: error?.message || JSON.stringify(error) });
            }
          }

          await executeDelay('MEDIUM');
        }

        // 记录最终执行结果
        UtilRecord.log('批量建仓后台执行完成:', {
          sufficient,
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPairs: usdt_trading_list.length,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('批量建仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 自定义建仓（对冲单）
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 自定义交易对列表
 * @returns {Promise<Object>} 执行结果
 */
const customBuildPosition = async (api_key, secret_key, positions) => {
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    if (typeof positions === 'string') {
      positions = JSON.parse(positions);
    }

    // 检查账户余额
    const account_info = await getAccountInfo(api_key, secret_key);
    if (new bigNumber(account_info.availableBalance).isLessThan(10)) {
      throw new Error(`当前合约账户余额${account_info.availableBalance}, 不足10u, 请充值`);
    }
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const priceInfo = await getPriceInfo(api_key, secret_key);

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length
    };

    // 异步执行建仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];

      try {
        for (let i = 0; i < positions.length; i++) {
          const { symbol, longAmount, shortAmount } = positions[i];

          const theCurrency = priceInfo.find(item => item.symbol === symbol);
          const price = theCurrency?.price;

          if (!price) {
            results.push({ symbol, action: 'BUILD_POSITION', success: false, error: '价格信息不存在' });
            continue;
          }

          // 建多单（仅当 longAmount > 0 时）
          if (longAmount > 0) {
            try {
              const rawQuantity = new bigNumber(longAmount).div(price);
              const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity.toString());

              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol,
                side: 'BUY',
                type: 'MARKET',
                quantity: parseFloat(quantity),
                positionSide: 'LONG'
              });

              console.log(`--- 币种${symbol} 新增多单持仓 ${longAmount} usdt`);
              results.push({ symbol, action: 'BUY_LONG', success: true });
            } catch (error) {
              console.log(error);
              results.push({ symbol, action: 'BUY_LONG', success: false, error: error?.message || JSON.stringify(error) });
            }

            await executeDelay('SHORT');
          }

          // 建空单（仅当 shortAmount > 0 时）
          if (shortAmount > 0) {
            try {
              const rawQuantity = new bigNumber(shortAmount).div(price);
              const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity.toString());

              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol,
                side: 'SELL',
                type: 'MARKET',
                quantity: parseFloat(quantity),
                positionSide: 'SHORT'
              });

              console.log(`--- 币种${symbol} 新增空单持仓 ${shortAmount} usdt`);
              results.push({ symbol, action: 'SELL_SHORT', success: true });
            } catch (error) {
              console.log(error);
              results.push({ symbol, action: 'SELL_SHORT', success: false, error: error?.message || JSON.stringify(error) });
            }
          }

          await executeDelay('MEDIUM');
        }

        // 记录最终执行结果
        UtilRecord.log('自定义建仓后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPositions: positions.length,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('自定义建仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 指定平仓
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 平仓信息列表
 * @returns {Promise<Object>} 执行结果
 */
const appointClosePosition = async (api_key, secret_key, positions) => {
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    // 获取交易所信息用于精度处理
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length,
      error: null
    };

    // 异步执行平仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];
      let error_msg = null;

      try {
        for (let i = 0; i < positions.length; i++) {
          const { symbol, positionSide, positionAmt } = positions[i];

          try {
            // 处理数量精度
            const rawQuantity = positionSide === 'SHORT' ? new bigNumber(positionAmt).abs().toString() : positionAmt;
            const adjustedQuantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity);

            const orderParams = {
              symbol,
              side: (positionSide === 'LONG' ? 'SELL' : 'BUY'),
              type: 'MARKET',
              quantity: parseFloat(adjustedQuantity),
              positionSide
            };

            const client = createClient(api_key, secret_key);
            await client.submitNewOrder(orderParams);
            UtilRecord.log(`${symbol} 平仓成功`);
            results.push({ symbol, action: `CLOSE_${positionSide}`, success: true });
          } catch (error) {
            // 移除throw，确保异步流程不被中断
            UtilRecord.log(error);
            error_msg = error;
            results.push({ symbol, action: `CLOSE_${positionSide}`, success: false, error: error?.message || JSON.stringify(error) });
          }

          await executeDelay('LONG');
        }

        // 记录最终执行结果
        UtilRecord.log('指定平仓后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPositions: positions.length,
          hasError: !!error_msg,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('指定平仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 批量平仓（对冲单）
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 交易对符号列表
 * @returns {Promise<Object>} 执行结果
 */
const batchClosePositions = async (api_key, secret_key, positions) => {
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    // 获取账户信息（不检查余额，因为是平仓操作）
    const account_info = await getAccountInfo(api_key, secret_key);
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const accountPositions = account_info.positions.filter(poi => positions.includes(poi.symbol));

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: accountPositions.length
    };

    // 异步执行平仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];
      try {
        for (let i = 0; i < accountPositions.length; i++) {
          if (accountPositions[i].processed) continue;

          const symbol = accountPositions[i].symbol;
          if (!symbol.endsWith('USDT')) continue;

          // 获取该交易对当前的持仓信息
          const longPosition = accountPositions.find(poi => poi.symbol === symbol && poi.positionSide === 'LONG');
          const shortPosition = accountPositions.find(poi => poi.symbol === symbol && poi.positionSide === 'SHORT');

          // 平多单
          if (longPosition?.positionAmt) {
            try {
              const adjustedQuantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, longPosition.positionAmt);
              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol,
                side: 'SELL',
                type: 'MARKET',
                quantity: parseFloat(adjustedQuantity),
                positionSide: 'LONG'
              });

              results.push({ symbol, action: 'CLOSE_LONG', success: true });
            } catch (error) {
              // 移除throw，确保异步流程不被中断
              results.push({ symbol, action: 'CLOSE_LONG', success: false, error: error?.message || JSON.stringify(error) });
            }

            await executeDelay('SHORT');
          }

          // 平空单
          if (shortPosition?.positionAmt) {
            try {
              const rawQuantity = new bigNumber(shortPosition.positionAmt).abs().toString();
              const adjustedQuantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity);
              const client = createClient(api_key, secret_key);
              await client.submitNewOrder({
                symbol,
                side: 'BUY',
                type: 'MARKET',
                quantity: parseFloat(adjustedQuantity),
                positionSide: 'SHORT'
              });

              results.push({ symbol, action: 'CLOSE_SHORT', success: true });
            } catch (error) {
              // 移除throw，确保异步流程不被中断
              results.push({ symbol, action: 'CLOSE_SHORT', success: false, error: error?.message || JSON.stringify(error) });
            }

            await executeDelay('SHORT');
          }

          // 标记为已处理
          if (longPosition) longPosition.processed = true;
          if (shortPosition) shortPosition.processed = true;
        }

        // 记录最终执行结果
        UtilRecord.log('批量平仓后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('批量平仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 自定义平仓（多个）- 只平多单
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 交易对符号列表
 * @returns {Promise<Object>} 执行结果
 */
const customCloseMultiplePositions = async (api_key, secret_key, positions) => {
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    // 获取账户信息（不检查余额，因为是平仓操作）
    const account_info = await getAccountInfo(api_key, secret_key);
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const accountPositions = account_info.positions.filter(poi => positions.includes(poi.symbol));

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: accountPositions.length
    };

    // 异步执行平仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];

      try {
        for (let i = 0; i < accountPositions.length; i++) {
          if (accountPositions[i].processed) continue;

          const symbol = accountPositions[i].symbol;
          if (!symbol.endsWith('USDT')) continue;

          // 获取该交易对当前的持仓信息
          const longPosition = accountPositions.find(poi => poi.symbol === symbol && poi.positionSide === 'LONG');
          const shortPosition = accountPositions.find(poi => poi.symbol === symbol && poi.positionSide === 'SHORT');

          if (!(longPosition && shortPosition)) {
            UtilRecord.log(`${symbol} 不是对冲单`);
            continue;
          }

          const rawQuantity = new bigNumber(longPosition.positionAmt).plus(shortPosition.positionAmt).toNumber();
          const adjustedQuantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity.toString());

          // 平多单
          try {
            const client = createClient(api_key, secret_key);
            await client.submitNewOrder({
              symbol,
              side: 'SELL',
              type: 'MARKET',
              quantity: parseFloat(adjustedQuantity),
              positionSide: 'LONG'
            });

            results.push({ symbol, action: 'CLOSE_LONG', success: true });
          } catch (error) {
            // 移除throw，确保异步流程不被中断
            results.push({ symbol, action: 'CLOSE_LONG', success: false, error: error?.message || JSON.stringify(error) });
          }

          await executeDelay('SHORT');

          // 标记为已处理
          longPosition.processed = true;
          shortPosition.processed = true;
        }

        // 记录最终执行结果
        UtilRecord.log('自定义平多单后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPositions: accountPositions.length,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('自定义平多单后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw error;
  }
};

/**
 * 自定义平仓
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 平仓信息列表
 * @returns {Promise<Object>} 执行结果
 */
const customClosePositions = async (api_key, secret_key, positions) => {
  try {
    if (!positions) {
      throw new Error('positions is not defined');
    }

    // 获取交易所信息用于精度处理和验证
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const client = createClient(api_key, secret_key);

    // 过滤有效的平仓请求
    const validPositions = [];
    const skippedPositions = [];

    for (const pos of positions) {
      const { symbol, type, quantity } = pos;

      // 跳过非USDT交易对
      if (!symbol.endsWith('USDT')) {
        skippedPositions.push({ symbol, reason: '非USDT交易对' });
        continue;
      }

      // 跳过数量为0或无效的仓位
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0) {
        skippedPositions.push({ symbol, quantity, reason: '数量为0或无效' });
        continue;
      }

      // 检查是否满足最小数量要求
      const filters = binancePrecision.getSymbolFilters(exchangeInfo, symbol);
      const lotSizeFilter = filters.find(f => f.filterType === 'LOT_SIZE');
      if (lotSizeFilter && qty < parseFloat(lotSizeFilter.minQty)) {
        skippedPositions.push({
          symbol,
          quantity,
          minQty: lotSizeFilter.minQty,
          reason: `数量小于最小限制${lotSizeFilter.minQty}`
        });
        continue;
      }

      validPositions.push(pos);
    }

    UtilRecord.log(`[自定义平仓] 数据过滤完成 - 总数: ${positions.length}, 有效: ${validPositions.length}, 跳过: ${skippedPositions.length}`);

    // 将全部仓位信息写入 trace 日志文件，避免终端输出过多内容
    if (positions.length > 0) {
      UtilRecord.trace(
        `[自定义平仓] 所有请求的仓位详细信息(共${positions.length}个):`,
        JSON.stringify(positions, null, 2)
      );
    }

    if (validPositions.length > 0) {
      UtilRecord.trace(
        `[自定义平仓] 有效的仓位详细信息(共${validPositions.length}个):`,
        JSON.stringify(validPositions, null, 2)
      );
    }

    if (skippedPositions.length > 0) {
      // 终端仅展示部分示例，完整数据写入 trace 日志
      const skippedSampleList = skippedPositions.slice(0, 10);
      UtilRecord.log(
        `[自定义平仓] 跳过的仓位示例(前${skippedSampleList.length}个):`,
        JSON.stringify(skippedSampleList, null, 2)
      );
      UtilRecord.trace(
        `[自定义平仓] 跳过的仓位详细信息(共${skippedPositions.length}个):`,
        JSON.stringify(skippedPositions, null, 2)
      );
    }

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length,
      validPositions: validPositions.length,
      skippedPositions: skippedPositions.length
    };

    // 异步执行平仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];

      try {
        for (let i = 0; i < validPositions.length; i++) {
          const { symbol, type, quantity } = validPositions[i];

          try {
            await executeDelay('SHORT');

            // 精度调整（静默模式，减少日志）
            const adjustedQuantity = binancePrecision.smartAdjustQuantity(
              exchangeInfo,
              symbol,
              quantity.toString(),
              { silent: true }
            );

            // 使用官方binance包下单
            const orderParams = {
              symbol,
              side: (type === "CLOSE_LONG" ? 'SELL' : 'BUY'),
              type: 'MARKET',
              quantity: parseFloat(adjustedQuantity),
              positionSide: type === "CLOSE_LONG" ? 'LONG' : 'SHORT'
            };

            const orderResult = await client.submitNewOrder(orderParams);
            results.push({
              symbol,
              action: type,
              quantity: adjustedQuantity,
              success: true,
              orderId: orderResult.orderId
            });
          } catch (error) {
            results.push({
              symbol,
              action: type,
              success: false,
              error: error?.message || JSON.stringify(error)
            });
          }
        }

        // 记录最终执行结果
        UtilRecord.log('自定义平仓后台执行完成:', {
          totalRequested: positions.length,
          validPositions: validPositions.length,
          skippedPositions: skippedPositions.length,
          processed: results.length,
          success_count: results.filter(r => r.success).length,
          failed_count: results.filter(r => !r.success).length
        });

        // 记录失败的订单
        const failedOrders = results.filter(r => !r.success);
        if (failedOrders.length > 0) {
          UtilRecord.error('平仓失败的订单:', failedOrders);
        }
      } catch (error) {
        UtilRecord.error('自定义平仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }
};


/**
 * 为空单设置原价止盈
 * @param {string} api_key - API密钥
 * @param {string} secret_key - API密钥Secret
 * @param {Array} positions - 持仓列表 [{symbol, stopPrice, closeRatio}]
 * @returns {Promise<Object>} 设置结果
 */
const setShortTakeProfit = async (api_key, secret_key, positions) => {
  try {
    const exchangeInfo = await getExchangeInfo(api_key, secret_key);
    const account_info = await getAccountInfo(api_key, secret_key);

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length
    };

    // 异步执行止盈设置，不阻塞函数返回
    setImmediate(async () => {
      const results = [];
      let success_count = 0;
      let fail_count = 0;

      try {
        const client = createClient(api_key, secret_key);

        for (let i = 0; i < positions.length; i++) {
          const { symbol, stopPrice, closeRatio } = positions[i];

          try {
            await executeDelay('SHORT');

            // 查找空单持仓
            const shortPosition = account_info.positions.find(
              pos => pos.symbol === symbol && pos.positionSide === 'SHORT' && Number(pos.positionAmt) < 0
            );

            if (!shortPosition) {
              results.push({
                symbol,
                success: false,
                message: '未找到空单持仓'
              });
              fail_count++;
              continue;
            }

            // 计算止盈数量 = 持仓数量 * 止盈比例
            const positionAmt = Math.abs(Number(shortPosition.positionAmt));
            const quantity = positionAmt * (closeRatio / 100);

            // 获取开仓价
            const entryPrice = Number(shortPosition.entryPrice);

            if (!entryPrice || entryPrice <= 0) {
              results.push({
                symbol,
                success: false,
                message: '无法获取开仓价'
              });
              fail_count++;
              continue;
            }

            // 使用开仓价的97%作为止盈价
            // 空单：开仓价100，止盈价97，当价格从90涨回97时触发平仓
            const finalStopPrice = entryPrice * 0.97;

            // 调整精度
            const adjustedQuantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, quantity.toString());
            const adjustedStopPrice = binancePrecision.smartAdjustPrice(exchangeInfo, symbol, finalStopPrice.toString());

            // 创建止损市价单（用于反弹止盈保护）
            // 必须使用 submitNewAlgoOrder 接口，否则会报错 "Order type not supported"
            // 空单止盈：当价格上涨(反弹)到 triggerPrice 时，触发市价买入平仓
            const orderParams = {
              symbol,
              side: 'BUY',
              algoType: 'CONDITIONAL',
              type: 'STOP_MARKET',
              quantity: parseFloat(adjustedQuantity),
              triggerPrice: adjustedStopPrice, // Algo接口使用 triggerPrice
              positionSide: 'SHORT',
              workingType: 'MARK_PRICE',
              priceProtect: true
            };

            // 使用算法订单API
            const orderResult = await client.submitNewAlgoOrder(orderParams);

            results.push({
              symbol,
              success: true,
              orderId: orderResult.orderId,
              stopPrice: adjustedStopPrice,
              quantity: adjustedQuantity,
              closeRatio,
              message: '止盈订单设置成功'
            });
            success_count++;

          } catch (error) {
            results.push({
              symbol,
              success: false,
              message: error?.message || JSON.stringify(error)
            });
            fail_count++;
            UtilRecord.error(`设置${symbol}空单止盈失败:`, error?.message || JSON.stringify(error));
          }
        }

        // 记录最终执行结果
        UtilRecord.log('空单止盈设置后台执行完成:', {
          totalProcessed: results.length,
          success_count,
          fail_count,
          totalPositions: positions.length,
          results: results
        });
      } catch (error) {
        UtilRecord.error('空单止盈设置后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    UtilRecord.error('设置空单止盈失败:', error?.message || JSON.stringify(error));
    throw new Error('设置空单止盈失败，请检查网络连接或稍后重试');
  }
};


module.exports = {
  getAccountInfo,
  getExchangeInfo,
  getPriceInfo,
  getUsdtTradingList,
  executeDelay,
  batchBuildPosition,
  customBuildPosition,
  appointClosePosition,
  batchClosePositions,
  customCloseMultiplePositions,
  customClosePositions,
  setShortTakeProfit,
};