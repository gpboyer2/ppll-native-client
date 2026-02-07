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
 * @param {string} api_secret - API密钥Secret
 * @returns {USDMClient} 币安客户端实例
 */
const createClient = (api_key, api_secret) => {
  const options = {
    api_key: api_key,
    api_secret: api_secret,
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
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<Object>} 账户信息
 */
const getAccountInfo = async (api_key, api_secret) => {
  try {
    const client = createClient(api_key, api_secret);
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
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<Object>} 交易对信息
 */
const getExchangeInfo = async (api_key, api_secret) => {
  try {
    const client = createClient(api_key, api_secret);
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
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<Array>} 价格信息列表
 */
const getPriceInfo = async (api_key, api_secret) => {
  try {
    const client = createClient(api_key, api_secret);
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
 * @param {string} api_secret - API密钥Secret
 * @param {string|Array} customPositions - 自定义交易对列表（JSON字符串或数组）
 * @returns {Promise<Array>} USDT交易对列表
 */
const getUsdtTradingList = async (api_key, api_secret, customPositions = null) => {
  try {
    const priceInfo = await getPriceInfo(api_key, api_secret);
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
 * U本位合约开仓
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Array} params.positions - 开仓位置列表 [{ symbol, side, amount }]
 * @returns {Promise<Object>} 执行结果
 */
const umOpenPosition = async (params) => {
  let { api_key, api_secret, positions } = params;
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    if (typeof positions === 'string') {
      positions = JSON.parse(positions);
    }

    // 检查账户余额
    const account_info = await getAccountInfo(api_key, api_secret);
    if (new bigNumber(account_info.availableBalance).isLessThan(10)) {
      throw new Error(`当前合约账户余额${account_info.availableBalance}, 不足10u, 请充值`);
    }
    const exchangeInfo = await getExchangeInfo(api_key, api_secret);
    const priceInfo = await getPriceInfo(api_key, api_secret);

    // 立即返回响应数据，不等待for循环执行
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length
    };

    // 异步执行开仓操作，不阻塞函数返回
    setImmediate(async () => {
      const results = [];

      try {
        for (let i = 0; i < positions.length; i++) {
          const { symbol, side, amount } = positions[i];

          // 验证参数
          if (!symbol || !side || !amount) {
            results.push({ symbol, side, amount, success: false, error: '参数不完整' });
            continue;
          }

          // 验证 side
          if (!['LONG', 'SHORT'].includes(side)) {
            results.push({ symbol, side, amount, success: false, error: 'side 必须是 LONG 或 SHORT' });
            continue;
          }

          const theCurrency = priceInfo.find(item => item.symbol === symbol);
          const price = theCurrency?.price;

          if (!price) {
            results.push({ symbol, side, amount, success: false, error: '价格信息不存在' });
            continue;
          }

          try {
            const rawQuantity = new bigNumber(amount).div(price);
            const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity.toString());

            const client = createClient(api_key, api_secret);
            await client.submitNewOrder({
              symbol,
              side: side === 'LONG' ? 'BUY' : 'SELL',
              type: 'MARKET',
              quantity: parseFloat(quantity),
              positionSide: side
            });

            console.log(`--- 币种${symbol} 新增${side}持仓 ${amount} usdt`);
            results.push({ symbol, side, amount, success: true });
          } catch (error) {
            console.log(error);
            results.push({ symbol, side, amount, success: false, error: error?.message || JSON.stringify(error) });
          }

          await executeDelay('MEDIUM');
        }

        // 记录最终执行结果
        UtilRecord.log('U本位开仓后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPositions: positions.length,
          results: results
        });
      } catch (error) {
        // 移除throw，确保异步流程不被中断，只记录日志
        UtilRecord.log('U本位开仓后台执行错误:', error?.message || JSON.stringify(error));
      }
    });

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }
};

/**
 * U本位合约平仓
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Array} params.positions - 平仓位置列表 [{ symbol, side, amount?, quantity?, percentage? }]
 * @returns {Promise<Object>} 执行结果
 */
const umClosePosition = async (params) => {
  const { api_key, api_secret, positions } = params;
  try {
    if (!positions) {
      throw new Error('positions is not defined');
    }

    // 获取交易所信息用于精度处理和验证
    const exchangeInfo = await getExchangeInfo(api_key, api_secret);
    const account_info = await getAccountInfo(api_key, api_secret);

    // 过滤有效的平仓请求
    const validPositions = [];
    const skippedPositions = [];

    for (const pos of positions) {
      const { symbol, side, amount, quantity, percentage } = pos;

      // 验证参数
      if (!symbol || !side) {
        skippedPositions.push({ ...pos, reason: '参数不完整' });
        continue;
      }

      // 验证 side
      if (!['LONG', 'SHORT'].includes(side)) {
        skippedPositions.push({ ...pos, reason: 'side 必须是 LONG 或 SHORT' });
        continue;
      }

      // 跳过非USDT交易对
      if (!symbol.endsWith('USDT')) {
        skippedPositions.push({ ...pos, reason: '非USDT交易对' });
        continue;
      }

      // 验证至少有一个平仓方式
      if (!amount && !quantity && !percentage) {
        skippedPositions.push({ ...pos, reason: '必须指定 amount、quantity 或 percentage 之一' });
        continue;
      }

      // 查找持仓
      const position = account_info.positions.find(
        p => p.symbol === symbol && p.positionSide === side
      );

      if (!position || parseFloat(position.positionAmt) === 0) {
        skippedPositions.push({ ...pos, reason: '未找到持仓' });
        continue;
      }

      validPositions.push({ ...pos, positionAmt: parseFloat(position.positionAmt) });
    }

    UtilRecord.log(`[U本位平仓] 数据过滤完成 - 总数: ${positions.length}, 有效: ${validPositions.length}, 跳过: ${skippedPositions.length}`);

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
        const client = createClient(api_key, api_secret);
        const priceInfo = await getPriceInfo(api_key, api_secret);

        for (let i = 0; i < validPositions.length; i++) {
          const { symbol, side, amount, quantity, percentage, positionAmt } = validPositions[i];

          try {
            await executeDelay('SHORT');

            let closeQuantity;
            const positionSide = side;

            // 计算平仓数量
            if (percentage) {
              // 按百分比平仓
              closeQuantity = Math.abs(positionAmt) * (percentage / 100);
            } else if (quantity) {
              // 按币数量平仓
              closeQuantity = quantity;
            } else {
              // 按USDT金额平仓
              const theCurrency = priceInfo.find(item => item.symbol === symbol);
              const price = theCurrency?.price;
              if (!price) {
                results.push({ symbol, side, success: false, error: '价格信息不存在' });
                continue;
              }
              closeQuantity = new bigNumber(amount).div(price).toNumber();
            }

            // 精度调整
            const adjustedQuantity = binancePrecision.smartAdjustQuantity(
              exchangeInfo,
              symbol,
              closeQuantity.toString(),
              { silent: true }
            );

            // 下单
            const orderParams = {
              symbol,
              side: positionSide === 'LONG' ? 'SELL' : 'BUY',
              type: 'MARKET',
              quantity: parseFloat(adjustedQuantity),
              positionSide
            };

            const orderResult = await client.submitNewOrder(orderParams);
            results.push({
              symbol,
              side,
              quantity: adjustedQuantity,
              success: true,
              orderId: orderResult.orderId
            });
          } catch (error) {
            results.push({
              symbol,
              side,
              success: false,
              error: error?.message || JSON.stringify(error)
            });
          }
        }

        // 记录最终执行结果
        UtilRecord.log('U本位平仓后台执行完成:', {
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
        UtilRecord.error('U本位平仓后台执行错误:', error?.message || JSON.stringify(error));
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
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Array} params.positions - 持仓列表 [{symbol, stopPrice, closeRatio}]
 * @returns {Promise<Object>} 设置结果
 */
const setShortTakeProfit = async (params) => {
  const { api_key, api_secret, positions } = params;
  try {
    const exchangeInfo = await getExchangeInfo(api_key, api_secret);
    const account_info = await getAccountInfo(api_key, api_secret);

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
        const client = createClient(api_key, api_secret);

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
  umOpenPosition,
  umClosePosition,
  setShortTakeProfit,
};