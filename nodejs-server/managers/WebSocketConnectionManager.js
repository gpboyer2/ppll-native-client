/*
 * WebSocketConnectionManager
 *  - 统一管理 Binance WebSocket 连接
 *  - 订阅去重与引用计数，事件统一分发
 *  - 非生产环境支持代理
 *  - 超时保护和错误恢复机制
 */

const { WebsocketClient } = require('binance');
const EventEmitter = require('events');
const { SocksProxyAgent } = require('socks-proxy-agent');
const UtilRecord = require('../utils/record-log.js');
const { getProxyUrlString } = require('../utils/proxy.js');

// 生产环境标识
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 连接超时时间（毫秒）- 超过此时间会强制重连
const CONNECTION_TIMEOUT = 30000;
// 重连延迟时间（毫秒）
const RECONNECT_DELAY = 5000;

class WebSocketConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.inited = false;
    // 连接统计
    this.stats = { active: 0, total: 0 };
    // key: `${market}:${scope}` -> wsClient
    this.clients = new Map();
    // 订阅去重与引用计数
    // key 示例：`um:public:markPrice:DOGEUSDT`
    this.subRefs = new Map();

    // User Data Streams
    // key: `user:${apiKey}` -> { client, listenKey, timer, refCount, apiKey, apiSecret }
    this.userDataSubs = new Map();

    // 连接状态跟踪
    this.connectionStates = new Map(); // key -> { lastConnectedAt, reconnectTimer }

    this.options = {
      enableProxyNonProd: true,
    };
    // 允许通过注入方式覆盖底层 WebsocketClient 创建逻辑（便于测试）
    this.clientFactory = null;
  }

  init(options = {}) {
    if (this.inited) return;
    this.options = { ...this.options, ...options };
    this.inited = true;
    UtilRecord.log('[WSManager] 初始化完成');
  }

  /**
   * 创建 WebSocket 配置选项（内部使用）
   * @param {boolean} verbose - 是否输出详细日志
   * @returns {Object} wsOptions 和 logger 配置
   */
  _createWsConfig(verbose = true) {
    // 获取代理URL并转换为socks代理
    const proxyUrl = getProxyUrlString();
    const ws_proxy = proxyUrl ? proxyUrl.replace('http://', 'socks://').replace('https://', 'socks://') : '';

    // 添加连接超时配置
    const wsOptions = (!IS_PRODUCTION && this.options.enableProxyNonProd && ws_proxy)
      ? {
        agent: new SocksProxyAgent(ws_proxy),
        handshakeTimeout: CONNECTION_TIMEOUT,
      }
      : {
        handshakeTimeout: CONNECTION_TIMEOUT,
      };

    // 生产环境或非详细模式时静默部分日志
    const silentLogger = () => { };
    const logger = {
      info: verbose ? (...args) => UtilRecord.log('[WSClient] info:', ...args) : silentLogger,
      error: (...args) => UtilRecord.trace('[WSClient] error:', ...args), // 改为 trace 避免日志刷屏
      warn: (...args) => UtilRecord.trace('[WSClient] warn:', ...args),   // 改为 trace 避免日志刷屏
      silly: (...args) => UtilRecord.trace('[WSClient] silly:', ...args),
      debug: IS_PRODUCTION ? silentLogger : (...args) => UtilRecord.debug('[WSClient] debug:', ...args),
      trace: (...args) => UtilRecord.trace('[WSClient] trace:', ...args),
    };

    return { wsOptions, logger };
  }

  /**
   * 检查连接是否超时
   * @param {string} clientKey - 客户端键
   */
  _checkConnectionTimeout(clientKey) {
    const state = this.connectionStates.get(clientKey);
    if (!state) return;

    const elapsed = Date.now() - state.lastConnectedAt;
    if (elapsed > CONNECTION_TIMEOUT && !state.reconnectTimer) {
      UtilRecord.log(`[WSManager] 连接可能已超时 (${clientKey})，上次连接: ${elapsed}ms 前`);
    }
  }

  /**
   * 清理客户端连接状态
   * @param {string} clientKey - 客户端键
   */
  _clearConnectionState(clientKey) {
    const state = this.connectionStates.get(clientKey);
    if (state && state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    this.connectionStates.delete(clientKey);
  }

  // 获取或创建 WS Client
  /**
   * @param {object} params 参数对象
   * @param {string} params.market 市场标识
   * @param {string} params.scope 作用域
   * @param {string} [params.apiKey] API密钥
   * @param {string} [params.apiSecret] API密钥
   * @param {string} [params.wsKey] WebSocket密钥
   */
  _getClient({ market = 'um', scope = 'public', apiKey, apiSecret, wsKey } = {}) {
    const clientKey = `${market}:${scope}${wsKey ? ':' + wsKey : ''}`;

    if (this.clients.has(clientKey)) {
      // 检查现有连接是否超时
      this._checkConnectionTimeout(clientKey);
      return this.clients.get(clientKey);
    }

    // 更新连接统计
    this.stats.total++;
    this.stats.active++;

    const { wsOptions, logger } = this._createWsConfig(true);

    const createDefault = () => new WebsocketClient(
      {
        api_key: apiKey,
        api_secret: apiSecret,
        beautify: true,
        wsOptions,
      },
      logger
    );

    const client = this.clientFactory ? this.clientFactory({ market, scope, apiKey, apiSecret, wsOptions }) : createDefault();

    // 初始化连接状态
    this.connectionStates.set(clientKey, {
      lastConnectedAt: Date.now(),
      reconnectTimer: null,
    });

    // 绑定事件，统一向外分发
    client.on('open', (data) => {
      const state = this.connectionStates.get(clientKey);
      if (state) {
        state.lastConnectedAt = Date.now();
      }
      UtilRecord.log(`[WSClient] 连接已建立 ${clientKey}`);
    });

    client.on('reconnecting', (data) => {
      UtilRecord.log(`[WSClient] 正在重新连接 ${clientKey}`);
    });

    client.on('reconnected', (data) => {
      const state = this.connectionStates.get(clientKey);
      if (state) {
        state.lastConnectedAt = Date.now();
        if (state.reconnectTimer) {
          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = null;
        }
      }
      UtilRecord.log(`[WSClient] 已重新连接 ${clientKey}`);
    });

    client.on('error', (data) => {
      // 静默处理错误，避免日志刷屏
      // SDK 会自动重连
      UtilRecord.trace(`[WSClient] 错误 ${clientKey}:`, data?.raw?.message || 'unknown');
      this.emit('error', { key: clientKey, data });
    });

    client.on('formattedMessage', (data) => {
      try {
        // 处理数组格式的数据（全市场标记价格流返回的是数组）
        const messageList = Array.isArray(data) ? data : [data];

        messageList.forEach((message) => {
          if (!message || !message.eventType) {
            return;
          }

          // 统一转换为上层可消费的事件
          if (message.eventType === 'markPriceUpdate') {
            const { symbol, markPrice } = message;
            // market 使用 'usdm' 与前端保持一致
            // 频繁的 tick 事件日志使用 trace 级别
            UtilRecord.trace(`[WSManager] emit tick event: ${symbol} @ ${markPrice}`);
            this.emit('tick', { market: 'usdm', eventType: 'markPrice', symbol, latestPrice: markPrice, raw: message });
          } else if (message.eventType === 'continuous_kline') {
            const { symbol } = message;
            const { close } = message.kline || {};
            this.emit('kline', { market: 'um', eventType: 'continuous_kline', symbol, latestPrice: close, raw: message });
          } else if (message.eventType === 'ACCOUNT_UPDATE' || message.eventType === 'ORDER_TRADE_UPDATE') {
            // User Data Stream events
            // 需要识别是哪个用户的事件，通过 listenKey 关联
            // 但 formattedMessage 中可能没有 listenKey，我们需要在创建 client 时关联
            // 由于我们是每个 listenKey 创建一个 client，并且在下面 handle 中处理
            // 这里先简单 emit，附带 raw data，由监听者根据 context 处理
            // 但为了更好的分发，我们可以在 subscribeUserData 中单独监听 client 的消息
          } else {
            // 其他事件可按需扩展
          }
        });
      } catch (e) {
        UtilRecord.log(`[WSManager] formattedMessage dispatch error: ${e.message}`);
      }
    });

    this.clients.set(clientKey, client);
    return client;
  }

  // 测试/自定义：注入客户端工厂
  setClientFactory(factory) {
    this.clientFactory = typeof factory === 'function' ? factory : null;
  }

  _subKey(parts) { return parts.join(':'); }

  _incrRef(key) {
    const c = this.subRefs.get(key) || 0;
    this.subRefs.set(key, c + 1);
    return c + 1;
  }

  _decrRef(key) {
    const c = this.subRefs.get(key) || 0;
    const next = Math.max(0, c - 1);
    if (next === 0) this.subRefs.delete(key); else this.subRefs.set(key, next);
    return next;
  }

  // 订阅 UM 标记价格（公共流）
  subscribeMarkPrice(symbol) {
    const market = 'um';
    const scope = 'public';
    const subKey = this._subKey([market, scope, 'markPrice', symbol]);
    const ref = this._incrRef(subKey);
    if (ref > 1) {
      UtilRecord.log(`[WSManager] skip duplicate subscribe ${subKey} (ref=${ref})`);
      return;
    }
    const client = this._getClient({ market, scope });
    client.subscribeMarkPrice(symbol, 'usdm');
    UtilRecord.log(`[WSManager] subscribed ${subKey}`);
  }

  // 订阅 UM 连续合约 K 线（公共流）
  subscribeContinuousKlines(symbol, interval = '1m', contractType = 'perpetual') {
    const market = 'um';
    const scope = 'public';
    const subKey = this._subKey([market, scope, 'continuous_kline', symbol, interval, contractType]);
    const ref = this._incrRef(subKey);
    if (ref > 1) {
      UtilRecord.log(`[WSManager] skip duplicate subscribe ${subKey} (ref=${ref})`);
      return;
    }
    const client = this._getClient({ market, scope });
    client.subscribeContinuousContractKlines(symbol, contractType, interval, 'usdm');
    UtilRecord.log(`[WSManager] subscribed ${subKey}`);
  }

  // 取消订阅（仅在引用计数为 0 时真正退订）
  unsubscribeMarkPrice(symbol) {
    const subKey = this._subKey(['um', 'public', 'markPrice', symbol]);
    const currentRef = this.subRefs.get(subKey) || 0;
    const left = this._decrRef(subKey);
    UtilRecord.log(`[WSManager] unsubscribeMarkPrice 引用计数`, { symbol, subKey, before: currentRef, after: left });
    if (left > 0) {
      UtilRecord.log(`[WSManager] 跳过取消订阅，仍有其他订阅者`, { symbol, remaining: left });
      return;
    }
    const client = this._getClient({ market: 'um', scope: 'public' });
    try {
      // binance 包使用通用的 unsubscribe 方法，topic 格式与 subscribeMarkPrice 一致
      const topic = `${symbol.toLowerCase()}@markPrice`;
      client.unsubscribe(topic, 'usdm');
      UtilRecord.log(`[WSManager] unsubscribed ${subKey} (topic: ${topic})`);
    } catch (e) {
      UtilRecord.log(`[WSManager] unsubscribeMarkPrice failed: ${e.message}`);
    }
  }

  unsubscribeContinuousKlines(symbol, interval = '1m', contractType = 'perpetual') {
    const subKey = this._subKey(['um', 'public', 'continuous_kline', symbol, interval, contractType]);
    const left = this._decrRef(subKey);
    if (left > 0) return;
    const client = this._getClient({ market: 'um', scope: 'public' });
    try {
      // binance 包使用通用的 unsubscribe 方法
      const topic = `${symbol.toLowerCase()}_${contractType}@continuousKline_${interval}`;
      client.unsubscribe(topic, 'usdm');
      UtilRecord.log(`[WSManager] unsubscribed ${subKey} (topic: ${topic})`);
    } catch (e) {
      UtilRecord.log(`[WSManager] unsubscribeContinuousKlines failed: ${e.message}`);
    }
  }

  closeAll() {
    for (const [key, client] of this.clients.entries()) {
      this.stats.active--;
      try {
        client.closeAll(true);
      } catch (e) {
        UtilRecord.trace(`[WSManager] 关闭客户端失败 ${key}:`, e.message);
      }
      // 清理连接状态
      this._clearConnectionState(key);
      UtilRecord.log(`[WSManager] 已关闭客户端 ${key}`);
    }
    this.clients.clear();
    this.subRefs.clear();
    // 清理用户数据流订阅
    for (const [key, sub] of this.userDataSubs.entries()) {
      if (sub.timer) clearInterval(sub.timer);
      if (sub.client) {
        try {
          sub.client.closeAll(true);
        } catch (e) {
          UtilRecord.trace(`[WSManager] 关闭用户数据流失败 ${key}:`, e.message);
        }
      }
    }
    this.userDataSubs.clear();
  }

  /**
   * 订阅用户数据流（U本位合约）
   * 支持多用户共享连接（引用计数）
   * @param {string} apiKey - 币安 API Key（作为用户标识）
   * @param {string} apiSecret - 币安 API Secret
   * @param {string} market - 市场类型：usdm（默认）、coinm、spot
   */
  async subscribeUserData(apiKey, apiSecret, market = 'usdm') {
    const subKey = `user:${apiKey}:${market}`;
    UtilRecord.log(`[WSManager] 开始订阅用户数据流, apiKey: ${apiKey.substring(0, 8)}..., market: ${market}`);

    // 检查是否已存在订阅
    if (this.userDataSubs.has(subKey)) {
      const sub = this.userDataSubs.get(subKey);
      sub.refCount += 1;
      UtilRecord.log(`[WSManager] 复用已有用户数据流订阅 ${subKey} (refCount=${sub.refCount})`);
      return;
    }

    const { wsOptions, logger } = this._createWsConfig(false);

    // 为每个用户创建独立的 WebsocketClient 实例
    const websocketClient = new WebsocketClient(
      {
        api_key: apiKey,
        api_secret: apiSecret,
        beautify: true,
        wsOptions,
      },
      logger
    );

    // 监听用户数据流事件
    websocketClient.on('formattedMessage', (data) => {
      try {
        // 添加日志，记录所有收到的消息（包括非 ACCOUNT_UPDATE 事件）
        UtilRecord.log(`[WSManager] 收到 formattedMessage: ${subKey}, eventType: ${data.eventType || 'undefined'}`);

        // ACCOUNT_UPDATE: 账户余额和持仓更新
        // ORDER_TRADE_UPDATE: 订单更新
        // listenKeyExpired: listenKey 过期
        if (data.eventType === 'ACCOUNT_UPDATE' || data.eventType === 'ORDER_TRADE_UPDATE') {
          UtilRecord.log(`[WSManager] 用户数据更新 ${subKey}: ${data.eventType}`);
          UtilRecord.log(`[WSManager] 转发 userDataUpdate 事件, apiKey: ${apiKey.substring(0, 8)}..., market: ${market}`);
          this.emit('userDataUpdate', { apiKey, market, data });
        } else if (data.eventType === 'listenKeyExpired') {
          UtilRecord.log(`[WSManager] listenKey 已过期 ${subKey}，需要重新订阅`);
        }
      } catch (e) {
        UtilRecord.log(`[WSManager] 用户数据处理错误: ${e.message}`);
      }
    });

    websocketClient.on('open', (data) => {
      UtilRecord.log(`[WSManager] 用户数据流 WebSocket 已打开: ${subKey}, wsKey=${data?.wsKey || ''}`);
    });

    websocketClient.on('reconnecting', (data) => {
      UtilRecord.log(`[WSManager] 用户数据流 WebSocket 重连中: ${subKey}`);
    });

    websocketClient.on('reconnected', (data) => {
      UtilRecord.log(`[WSManager] 用户数据流 WebSocket 已重连: ${subKey}`);
    });

    websocketClient.on('error', (data) => {
      UtilRecord.log(`[WSManager] 用户数据流 WebSocket 错误: ${subKey}, error:`, data);
      this.emit('error', { key: subKey, data });
    });

    // 市场类型与订阅方法的映射
    const subscribeMethodMap = {
      usdm: 'subscribeUsdFuturesUserDataStream',
      coinm: 'subscribeCoinFuturesUserDataStream',
      spot: 'subscribeSpotUserDataStream'
    };

    // 根据市场类型订阅对应的用户数据流
    try {
      const subscribeMethod = subscribeMethodMap[market];
      if (!subscribeMethod) {
        throw new Error(`不支持的市场类型: ${market}`);
      }
      await websocketClient[subscribeMethod]();

      // 存储订阅信息
      this.userDataSubs.set(subKey, {
        client: websocketClient,
        refCount: 1,
        apiKey,
        apiSecret,
        market,
        created_at: Date.now()
      });

      UtilRecord.log(`[WSManager] 用户数据流订阅成功 ${subKey}`);
    } catch (e) {
      UtilRecord.log(`[WSManager] 用户数据流订阅失败 ${subKey}: ${e?.message || e}`);
      throw e;
    }
  }

  /**
   * 取消订阅用户数据流
   * @param {string} apiKey - 币安 API Key（作为用户标识）
   * @param {string} market - 市场类型：usdm（默认）、coinm、spot
   */
  unsubscribeUserData(apiKey, market = 'usdm') {
    const subKey = `user:${apiKey}:${market}`;

    if (!this.userDataSubs.has(subKey)) {
      UtilRecord.log(`[WSManager] 用户数据流订阅不存在 ${subKey}`);
      return;
    }

    const sub = this.userDataSubs.get(subKey);
    sub.refCount -= 1;

    if (sub.refCount <= 0) {
      // 引用计数为0，关闭连接
      if (sub.client) {
        try {
          // 直接关闭所有连接，不调用 unsubscribe 方法
          // 因为 unsubscribe 方法在连接未完全建立时会抛出异常
          sub.client.closeAll(true);
        } catch (e) {
          UtilRecord.log(`[WSManager] 关闭用户数据流失败 ${subKey}: ${e.message}`);
        }
      }
      this.userDataSubs.delete(subKey);
      UtilRecord.log(`[WSManager] 用户数据流已取消订阅 ${subKey}`);
    } else {
      UtilRecord.log(`[WSManager] 用户数据流引用计数减少 ${subKey} (refCount=${sub.refCount})`);
    }
  }

  /**
   * 获取用户数据流订阅状态
   * @param {string} apiKey - 币安 API Key（作为用户标识）
   * @param {string} market - 市场类型
   * @returns {object|null} 订阅信息
   */
  getUserDataSubStatus(apiKey, market = 'usdm') {
    const subKey = `user:${apiKey}:${market}`;
    return this.userDataSubs.get(subKey) || null;
  }

  /**
   * 获取连接统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      active: this.clients.size + this.userDataSubs.size,
      public: this.clients.size,
      userData: this.userDataSubs.size,
      total: this.stats.total
    };
  }
}

module.exports = WebSocketConnectionManager;
