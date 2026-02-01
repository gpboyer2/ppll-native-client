/**
 * 全市场标记价格流订阅任务
 * 使用全局 WebSocketConnectionManager 统一管理连接
 */
const UtilRecord = require("../utils/record-log.js");
const markPriceService = require("../service/mark-price.service.js");

// 等待全局 wsManager 初始化完成
const waitForWsManager = () => {
  return new Promise((resolve) => {
    if (global.wsManager && global.wsManager.inited) {
      return resolve(global.wsManager);
    }
    const checkInterval = setInterval(() => {
      if (global.wsManager && global.wsManager.inited) {
        clearInterval(checkInterval);
        resolve(global.wsManager);
      }
    }, 100);
  });
};

// 内存缓存对象
const markPriceCache = {};
// 更新间隔(毫秒)
const UPDATE_INTERVAL = 60 * 1000;
// 是否允许更新数据库
let allowDatabaseUpdate = true;
// 重试订阅次数限制
const MAX_SUBSCRIBE_RETRY = 3;
let subscribeRetryCount = 0;

/**
 * 定时更新数据库
 */
const updateDatabase = async () => {
  const records = Object.values(markPriceCache);
  if (records.length === 0) return;

  try {
    await markPriceService.bulkUpdateMarkPrices(records);
    UtilRecord.trace(`已批量更新 ${records.length} 个交易对的标记价格`);
  } catch (error) {
    UtilRecord.error("定时更新数据库失败:", error.message);
  }
};

/**
 * 初始化标记价格流订阅
 */
const initMarkPriceStream = async () => {
  try {
    const wsManager = await waitForWsManager();
    UtilRecord.log('正在初始化全市场标记价格流订阅...');

    // 监听 tick 事件
    wsManager.on('tick', (data) => {
      try {
        // 只输出关注交易对的日志（UNIUSDT）
        if (data?.symbol === 'UNIUSDT') {
          console.log('[markPriceStream] 收到 tick 事件:', data?.symbol, '@', data?.latestPrice);
        }

        if (!data || !data.symbol) {
          return;
        }

        if (!allowDatabaseUpdate) {
          UtilRecord.trace("数据更新逻辑正在节流中，跳过本次更新");
          return;
        }

        // 节流：在指定时间后允许更新数据库
        allowDatabaseUpdate = false;
        setTimeout(() => {
          allowDatabaseUpdate = true;
        }, UPDATE_INTERVAL);

        // 更新内存缓存
        const raw = data.raw;
        markPriceCache[data.symbol] = {
          event_type: raw.eventType,
          event_time: raw.eventTime,
          symbol: raw.symbol,
          mark_price: raw.markPrice,
          index_price: raw.indexPrice,
          estimated_settle_price: raw.settlePriceEstimate,
          funding_rate: raw.fundingRate,
          next_funding_time: raw.nextFundingTime,
        };

        updateDatabase();
      } catch (error) {
        UtilRecord.error("处理 tick 事件时出错:", error.message);
      }
    });

    // 使用 wsManager 订阅全市场标记价格
    // 注意：subscribeAllMarketMarkPrice 是 binance SDK 的方法
    // 我们需要获取底层 client 来调用
    const client = wsManager._getClient({ market: 'um', scope: 'public' });

    // 监听连接状态
    client.on('open', (data) => {
      UtilRecord.log(`✅ 标记价格流 WebSocket 连接已建立: ${data?.wsKey || 'usdm'}`);
      subscribeRetryCount = 0; // 连接成功后重置重试计数
    });

    client.on('reconnecting', (data) => {
      UtilRecord.log(`标记价格流 WebSocket 正在重新连接: ${data?.wsKey || 'usdm'}`);
    });

    client.on('reconnected', (data) => {
      UtilRecord.log(`✅ 标记价格流 WebSocket 已重新连接: ${data?.wsKey || 'usdm'}`);
    });

    client.on('error', (data) => {
      // 静默处理连接错误，SDK 会自动重连
      UtilRecord.trace(`标记价格流 WebSocket 错误 (自动重连中):`, data?.raw?.message || 'unknown');
    });

    // 订阅全市场标记价格流
    client.subscribeAllMarketMarkPrice('usdm', 3000);
    UtilRecord.log('已订阅全市场标记价格流');

  } catch (error) {
    UtilRecord.error('初始化标记价格流失败:', error.message);

    // 重试逻辑
    if (subscribeRetryCount < MAX_SUBSCRIBE_RETRY) {
      subscribeRetryCount++;
      UtilRecord.log(`将在 5 秒后重试初始化 (${subscribeRetryCount}/${MAX_SUBSCRIBE_RETRY})...`);
      setTimeout(() => {
        initMarkPriceStream().catch(err => {
          UtilRecord.error('重试初始化标记价格流失败:', err.message);
        });
      }, 5000);
    } else {
      UtilRecord.error('标记价格流初始化重试次数已达上限，请检查网络连接和代理配置');
    }
  }
};

// 启动订阅
initMarkPriceStream().catch(err => {
  UtilRecord.error('启动标记价格流失败:', err.message);
});

module.exports = {
  initMarkPriceStream,
  getCache: () => markPriceCache
};
