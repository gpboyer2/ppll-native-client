const bigNumber = require('bignumber.js');
const { USDMClient } = require('binance');
const { getProxyConfig } = require('../utils/proxy.js');
const UtilRecord = require("../utils/record-log.js");
const binancePrecision = require("../utils/binance-precision");
const ApiError = require("../utils/api-error");
const db = require("../models");
const Order = db.orders;
const binanceAccountService = require("../service/binance-account.service.js");


// 常量定义
const DELAY_RANGES = {
  SHORT: { min: 200, max: 500 }, // 短延迟范围
  MEDIUM: { min: 300, max: 600 }, // 中延迟范围
  LONG: { min: 500, max: 1000 } // 长延迟范围
};

const SKIP_SYMBOLS = ["USDCUSDT"]; // 跳过的币种

const formatOpenPositionError = (error) => {
  const rawMessage = typeof error === 'string' ? error : error?.message || '';
  if (!rawMessage) {
    return '开仓失败，请稍后重试';
  }

  // 检测限流错误
  const errorCode = error?.code || error?.body?.code;
  const lowerMessage = rawMessage.toLowerCase();

  if (errorCode === -1003 ||
      errorCode === 429 ||
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many requests') ||
      lowerMessage.includes('ip banned') ||
      lowerMessage.includes('banned')) {
    return '被币安限流，请稍后再试（通常2分钟后恢复）';
  }

  if (/notional must be no smaller than 100/i.test(rawMessage)) {
    return '开仓金额过小，币安要求名义价值不少于 100 USDT，请提高金额后重试';
  }

  if (/insufficient balance|insufficient margin|margin is insufficient/i.test(rawMessage)) {
    return '保证金不足，请检查余额后重试';
  }

  return rawMessage;
};

const formatAmount = (value) => new bigNumber(value).toFixed(2);

const formatQuantity = (value) => new bigNumber(value).toFixed(8).replace(/\.?0+$/, '');

const formatAdjustmentMessage = ({ actionLabel, requestedAmount, adjustedAmount, requestedQuantity, adjustedQuantity }) => {
  const hasAmount = requestedAmount !== undefined && adjustedAmount !== undefined;
  const hasQuantity = requestedQuantity !== undefined && adjustedQuantity !== undefined;
  const amountChanged = hasAmount && !new bigNumber(requestedAmount).isEqualTo(adjustedAmount);
  const quantityChanged = hasQuantity && !new bigNumber(requestedQuantity).isEqualTo(adjustedQuantity);

  if (!amountChanged && !quantityChanged) {
    return '';
  }

  const parts = [];
  if (amountChanged) {
    parts.push(`金额 ${formatAmount(requestedAmount)} → ${formatAmount(adjustedAmount)} USDT`);
  }
  if (quantityChanged) {
    parts.push(`数量 ${formatQuantity(requestedQuantity)} → ${formatQuantity(adjustedQuantity)}`);
  }

  return `因交易所精度限制，${actionLabel}已调整：${parts.join('，')}`;
};


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
 * 执行单个开仓操作
 * @param {Object} params - 参数对象
 * @param {string} params.symbol - 交易对
 * @param {string} params.side - 方向 LONG/SHORT
 * @param {number} params.amount - 金额(USDT)
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Object} params.exchangeInfo - 交易所信息
 * @param {Array} params.priceInfo - 价格信息
 * @param {string} params.source - 订单来源(如QUICK_ORDER)
 * @returns {Promise<Object>} 执行结果
 */
const executeSingleOpen = async ({ symbol, side, amount, api_key, api_secret, exchangeInfo, priceInfo, source }) => {
  // 验证参数
  if (!symbol || !side || !amount) {
    return { symbol, side, amount, success: false, error: '参数不完整' };
  }

  // 验证 side
  if (!['LONG', 'SHORT'].includes(side)) {
    return { symbol, side, amount, success: false, error: 'side 必须是 LONG 或 SHORT' };
  }

  const theCurrency = priceInfo.find(item => item.symbol === symbol);
  const price = theCurrency?.price;

  if (!price) {
    return { symbol, side, amount, success: false, error: '价格信息不存在' };
  }

  try {
    const rawQuantity = new bigNumber(amount).div(price);

    // 校验最小名义价值（第一次：金额校验）
    const MIN_NOTIONAL = 100;
    if (new bigNumber(amount).isLessThan(MIN_NOTIONAL)) {
      return { symbol, side, amount, success: false, error: `开仓金额不能小于 ${MIN_NOTIONAL} USDT` };
    }

    const quantity = binancePrecision.smartAdjustQuantity(exchangeInfo, symbol, rawQuantity.toString());

    // 校验最小名义价值（第二次：精度调整后校验）
    const adjustedNotional = new bigNumber(quantity).multipliedBy(price);
    if (adjustedNotional.isLessThan(MIN_NOTIONAL)) {
      return { symbol, side, amount, success: false, error: `由于精度调整，开仓金额需至少 ${MIN_NOTIONAL} USDT，当前计算名义价值为 ${adjustedNotional.toFixed(2)} USDT` };
    }

    const adjustmentMessage = formatAdjustmentMessage({
      actionLabel: '开仓',
      requestedAmount: amount,
      adjustedAmount: adjustedNotional.toNumber(),
      requestedQuantity: rawQuantity,
      adjustedQuantity: quantity
    });
    const adjustment = adjustmentMessage ? {
      requestedAmount: amount,
      adjustedAmount: adjustedNotional.toNumber(),
      requestedQuantity: rawQuantity.toString(),
      adjustedQuantity: quantity,
      message: adjustmentMessage
    } : undefined;

    const client = createClient(api_key, api_secret);
    const orderResult = await client.submitNewOrder({
      symbol,
      side: side === 'LONG' ? 'BUY' : 'SELL',
      type: 'MARKET',
      quantity: parseFloat(quantity),
      positionSide: side
    });

    UtilRecord.log(`--- 币种${symbol} 新增${side}持仓 ${amount} usdt`);

    // 写入订单记录（如果指定了source）
    if (source && orderResult) {
      try {
        // 计算实际成交均价
        const avgPrice = orderResult.avgPrice;
        const cumQuote = orderResult.cumQuote;
        const executedQty = orderResult.executedQty || orderResult.cumQty;

        let executedPrice;
        if (avgPrice && parseFloat(avgPrice) > 0) {
          executedPrice = parseFloat(avgPrice);
        } else if (cumQuote && executedQty && parseFloat(executedQty) > 0) {
          // 使用 cumQuote / executedQty 计算实际成交均价
          executedPrice = parseFloat(cumQuote) / parseFloat(executedQty);
        } else {
          // 最后回退到下单前的价格
          executedPrice = parseFloat(price) || 0;
        }
        await Order.create({
          api_key,
          api_secret,
          order_id: String(orderResult.orderId || ''),
          client_order_id: orderResult.clientOrderId || '',
          symbol,
          side: side === 'LONG' ? 'BUY' : 'SELL',
          position_side: side,
          type: 'MARKET',
          quantity,
          price,
          status: 'FILLED',
          executed_qty: quantity,
          executed_price: executedPrice,
          executed_amount: amount,
          source,
          execution_type: 'WEBSOCKET'
        });
        UtilRecord.log(`--- 订单记录已写入: ${symbol} ${side} ${amount} USDT, 开仓价: ${executedPrice}`);
      } catch (dbError) {
        UtilRecord.error('写入订单记录失败:', dbError);
      }
    }

    return {
      symbol,
      side,
      amount,
      quantity,
      success: true,
      orderId: orderResult.orderId,
      adjustment
    };
  } catch (error) {
    UtilRecord.error('开仓失败:', error);
    const friendlyMessage = formatOpenPositionError(error);
    return { symbol, side, amount, success: false, error: friendlyMessage };
  }
};

/**
 * U本位合约开仓
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Array} params.positions - 开仓位置列表 [{ symbol, side, amount }]
 * @param {string} params.source - 订单来源(如QUICK_ORDER)
 * @returns {Promise<Object>} 执行结果
 */
const umOpenPosition = async (params) => {
  const { api_key, api_secret, positions, source } = params;
  try {
    if (!positions?.length) {
      throw new Error('positions 参数异常');
    }

    // 检查账户余额
    const account_info = await getAccountInfo(api_key, api_secret);
    if (new bigNumber(account_info.availableBalance).isLessThan(10)) {
      throw new Error(`当前合约账户余额${account_info.availableBalance}, 不足10u, 请充值`);
    }
    const exchangeInfo = await getExchangeInfo(api_key, api_secret);
    const priceInfo = await getPriceInfo(api_key, api_secret);

    const isSinglePosition = positions.length === 1;

    // 单交易对：同步执行，返回实际结果
    if (isSinglePosition) {
      const result = await executeSingleOpen({
        ...positions[0],
        api_key,
        api_secret,
        exchangeInfo,
        priceInfo,
        source
      });

      UtilRecord.log('U本位开仓单交易对执行完成:', {
        result,
        totalPositions: 1
      });

      return {
        success: result.success,
        results: [result],
        processedCount: 1,
        totalPositions: 1,
        message: result.success ? '开仓成功' : result.error || '开仓失败'
      };
    }

    // 多交易对：异步执行，立即返回
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length
    };

    setImmediate(async () => {
      const results = [];

      try {
        for (let i = 0; i < positions.length; i++) {
          const result = await executeSingleOpen({
            ...positions[i],
            api_key,
            api_secret,
            exchangeInfo,
            priceInfo,
            source
          });
          results.push(result);
          await executeDelay('MEDIUM');
        }

        UtilRecord.log('U本位开仓后台执行完成:', {
          totalProcessed: results.length,
          success_count: results.filter(r => r.success).length,
          totalPositions: positions.length,
          results: results
        });
      } catch (error) {
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
 * 执行单个平仓操作
 * @param {Object} params - 参数对象
 * @param {string} params.symbol - 交易对
 * @param {string} params.side - 方向 LONG/SHORT
 * @param {number} params.amount - 金额(USDT)
 * @param {number} params.quantity - 币数量
 * @param {number} params.percentage - 百分比
 * @param {number} params.positionAmt - 持仓数量
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Object} params.exchangeInfo - 交易所信息
 * @param {Array} params.priceInfo - 价格信息
 * @param {boolean} params.withDelay - 是否添加延迟
 * @param {string} params.source - 订单来源(如QUICK_ORDER)
 * @returns {Promise<Object>} 执行结果
 */
const executeSingleClose = async ({ symbol, side, amount, quantity, percentage, positionAmt, api_key, api_secret, exchangeInfo, priceInfo, withDelay = true, source }) => {
  try {
    if (withDelay) {
      await executeDelay('SHORT');
    }

    let closeQuantity;
    const positionSide = side;

    // 计算平仓数量
    if (percentage) {
      closeQuantity = Math.abs(positionAmt) * (percentage / 100);
    } else if (quantity) {
      closeQuantity = quantity;
    } else {
      const theCurrency = priceInfo.find(item => item.symbol === symbol);
      const price = theCurrency?.price;
      if (!price) {
        return { symbol, side, success: false, error: '价格信息不存在' };
      }
      closeQuantity = new bigNumber(amount).div(price).toNumber();
    }

    const adjustedQuantity = binancePrecision.smartAdjustQuantity(
      exchangeInfo,
      symbol,
      closeQuantity.toString(),
      { silent: true }
    );

    const client = createClient(api_key, api_secret);
    const orderParams = {
      symbol,
      side: positionSide === 'LONG' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: parseFloat(adjustedQuantity),
      positionSide
    };

    const orderResult = await client.submitNewOrder(orderParams);

    // 更新订单记录（如果指定了source）
    if (source && orderResult) {
      try {
        await Order.update(
          { status: 'CLOSED' },
          {
            where: {
              symbol,
              position_side: side,
              source,
              status: 'FILLED'
            }
          }
        );
        UtilRecord.log(`--- 订单记录已更新为CLOSED: ${symbol} ${side}`);
      } catch (dbError) {
        UtilRecord.error('更新订单记录失败:', dbError);
      }
    }

    return {
      symbol,
      side,
      quantity: adjustedQuantity,
      success: true,
      orderId: orderResult.orderId
    };
  } catch (error) {
    return {
      symbol,
      side,
      success: false,
      error: error?.message || JSON.stringify(error)
    };
  }
};

/**
 * U本位合约平仓
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {string} params.api_secret - API密钥Secret
 * @param {Array} params.positions - 平仓位置列表 [{ symbol, side, amount?, quantity?, percentage? }]
 * @param {string} params.source - 订单来源(如QUICK_ORDER)
 * @returns {Promise<Object>} 执行结果
 */
const umClosePosition = async (params) => {
  const { api_key, api_secret, positions, source } = params;
  try {
    if (!positions) {
      throw new Error('positions is not defined');
    }

    const exchangeInfo = await getExchangeInfo(api_key, api_secret);
    const account_info = await getAccountInfo(api_key, api_secret);

    const validPositions = [];
    const skippedPositions = [];

    for (const pos of positions) {
      const { symbol, side, amount, quantity, percentage } = pos;

      if (!symbol || !side) {
        skippedPositions.push({ ...pos, reason: '参数不完整' });
        continue;
      }

      if (!['LONG', 'SHORT'].includes(side)) {
        skippedPositions.push({ ...pos, reason: 'side 必须是 LONG 或 SHORT' });
        continue;
      }

      if (!symbol.endsWith('USDT')) {
        skippedPositions.push({ ...pos, reason: '非USDT交易对' });
        continue;
      }

      if (!amount && !quantity && !percentage) {
        skippedPositions.push({ ...pos, reason: '必须指定 amount、quantity 或 percentage 之一' });
        continue;
      }

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

    // 如果没有有效仓位，直接返回失败
    if (validPositions.length === 0) {
      return {
        success: false,
        results: [],
        processedCount: 0,
        totalPositions: positions.length,
        validPositions: 0,
        skippedPositions: skippedPositions.length,
        skippedDetails: skippedPositions,
        message: `没有可平仓的仓位，共跳过 ${skippedPositions.length} 个`
      };
    }

    const isSinglePosition = validPositions.length === 1;

    // 单交易对：同步执行，返回实际结果
    if (isSinglePosition) {
      const priceInfo = await getPriceInfo(api_key, api_secret);
      const result = await executeSingleClose({
        ...validPositions[0],
        api_key,
        api_secret,
        exchangeInfo,
        priceInfo,
        withDelay: false,
        source
      });

      UtilRecord.log('U本位平仓单交易对执行完成:', {
        result,
        totalPositions: positions.length,
        validPositions: 1,
        skippedPositions: skippedPositions.length
      });

      return {
        success: result.success,
        results: [result],
        processedCount: 1,
        totalPositions: positions.length,
        validPositions: 1,
        skippedPositions: skippedPositions.length,
        message: result.success ? '平仓成功' : result.error || '平仓失败'
      };
    }

    // 多交易对：异步执行，立即返回
    const responseData = {
      success: true,
      results: [],
      processedCount: 0,
      totalPositions: positions.length,
      validPositions: validPositions.length,
      skippedPositions: skippedPositions.length
    };

    setImmediate(async () => {
      const results = [];

      try {
        const priceInfo = await getPriceInfo(api_key, api_secret);

        for (let i = 0; i < validPositions.length; i++) {
          const result = await executeSingleClose({
            ...validPositions[i],
            api_key,
            api_secret,
            exchangeInfo,
            priceInfo,
            withDelay: true,
            source
          });
          results.push(result);
        }

        UtilRecord.log('U本位平仓后台执行完成:', {
          totalRequested: positions.length,
          validPositions: validPositions.length,
          skippedPositions: skippedPositions.length,
          processed: results.length,
          success_count: results.filter(r => r.success).length,
          failed_count: results.filter(r => !r.success).length
        });

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


/**
 * API限流错误类
 */
class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.isRateLimit = true;
  }
}

/**
 * 检查是否为限流错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为限流错误
 */
const isRateLimitError = (error) => {
  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('too many requests') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('限流');
};

/**
 * 获取近一个月的开仓均价
 * @param {string} api_key - API密钥
 * @param {string} api_secret - API密钥Secret
 * @param {string} symbol - 交易对
 * @param {string} position_side - 持仓方向 LONG/SHORT
 * @returns {Promise<number>} 平均开仓价格
 * @throws {RateLimitError} 当遇到限流错误时抛出
 */
const getAvgEntryPrice = async (api_key, api_secret, symbol, position_side) => {
  try {
    const client = createClient(api_key, api_secret);

    // 计算一个月前的时间戳
    const now = Date.now();
    const one_month_ago = now - 30 * 24 * 60 * 60 * 1000;

    // 币安 userTrades API 最多支持7天时间范围，需要分批查询
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const all_trades = [];

    // 分批查询：近30天分成5段（每段7天）
    for (let i = 0; i < 5; i++) {
      const end_time = one_month_ago + (i + 1) * SEVEN_DAYS;
      const start_time = one_month_ago + i * SEVEN_DAYS;

      // 确保不超过当前时间
      const adjusted_end_time = Math.min(end_time, now);

      if (start_time >= now) {
        break;
      }

      try {
        const trades = await client.getAccountTrades({
          symbol,
          startTime: start_time,
          endTime: adjusted_end_time,
          limit: 1000
        });

        if (trades && Array.isArray(trades)) {
          all_trades.push(...trades);
        }
      } catch (error) {
        if (isRateLimitError(error)) {
          throw new RateLimitError(`获取 ${symbol} 历史交易时触发限流，请稍后再试`);
        }
        UtilRecord.log(`获取 ${symbol} ${start_time}-${adjusted_end_time} 历史交易失败:`, error.message);
      }
    }

    // 根据持仓方向筛选交易并计算均价
    // LONG: 筛选 BUY 交易; SHORT: 筛选 SELL 交易
    const side = position_side === 'LONG' ? 'BUY' : 'SELL';
    const filtered_trades = all_trades.filter(t => t.side === side);

    if (filtered_trades.length === 0) {
      return 0;
    }

    // 计算加权平均价格: sum(price * qty) / sum(qty)
    let total_value = new bigNumber(0);
    let total_qty = new bigNumber(0);

    for (const trade of filtered_trades) {
      const price = new bigNumber(trade.price);
      const qty = new bigNumber(trade.qty);
      total_value = total_value.plus(price.multipliedBy(qty));
      total_qty = total_qty.plus(qty);
    }

    if (total_qty.isZero()) {
      return 0;
    }

    return total_value.dividedBy(total_qty).toNumber();
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    if (isRateLimitError(error)) {
      throw new RateLimitError(`获取 ${symbol} 近一个月开仓均价时触发限流，请稍后再试`);
    }
    UtilRecord.error('获取近一个月开仓均价失败:', error);
    return 0;
  }
};

/**
 * 为快捷订单记录补充额外信息（杠杆、持仓均价）
 * @param {Array} records - 订单记录列表
 * @param {string} api_key - API密钥
 * @param {string} api_secret - API密钥Secret
 * @returns {Promise<Array>} 补充后的订单记录列表
 */
const enrichQuickOrderRecords = async (records, api_key, api_secret) => {
  if (!records || records.length === 0) {
    return records;
  }

  // 为每条记录获取持仓风险信息（包含杠杆和持仓均价）
  const enriched_records = await Promise.all(records.map(async (record) => {
    const executed_amount = parseFloat(record.executed_amount || 0);
    const estimated_fee = executed_amount * 0.001;

    // 获取当前持仓的均价（与币安APP一致）
    let leverage = 20;
    let entry_price = 0;
    try {
      const position_info = await binanceAccountService.getPositionRisk(
        api_key,
        api_secret,
        record.symbol,
        record.position_side
      );
      leverage = position_info?.leverage || 20;
      entry_price = position_info?.entry_price || 0;
    } catch (error) {
      UtilRecord.log(`获取 ${record.symbol} 持仓风险信息失败:`, error.message);
    }

    return {
      ...record.toJSON ? record.toJSON() : record,
      leverage,
      estimated_fee,
      avg_entry_price: entry_price  // 使用当前持仓均价替代历史均价
    };
  }));

  return enriched_records;
};

/**
 * 更新快捷订单折叠状态
 * @param {Object} params - 参数对象
 * @param {string} params.api_key - API密钥
 * @param {number} params.order_id - 订单ID
 * @param {boolean} params.is_collapsed - 是否折叠
 * @returns {Promise<Object>} 更新结果
 */
const updateQuickOrderCollapse = async (params) => {
  const { api_key, order_id, is_collapsed } = params;

  const [updated_count] = await Order.update(
    { is_collapsed },
    {
      where: {
        api_key,
        id: order_id,
        source: 'QUICK_ORDER'
      }
    }
  );

  if (updated_count === 0) {
    throw new Error('订单不存在或无权操作');
  }

  return { success: true };
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
  getAvgEntryPrice,
  enrichQuickOrderRecords,
  updateQuickOrderCollapse,
};