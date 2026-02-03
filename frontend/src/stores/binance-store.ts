import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';
import { BinanceApiKeyApi, BinanceExchangeInfoApi } from '../api';
import { io, Socket } from 'socket.io-client';

// API Key 信息 - 字段名与后端完全一致
export interface BinanceApiKey {
    id: number;
    name: string;
    api_key: string;
    api_secret: string;
    status: number;
    remark?: string;
    vip_expire_at?: string;
    created_at: string;
    updated_at: string;
}

// 交易对信息
export interface TradingPair {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    status: string;
    contractType?: string;
}

// Ticker 价格信息
export interface TickerPrice {
    symbol: string;
    price: number;
    market: string;
    timestamp: number;
}

interface BinanceStore {
    // 状态
    api_key_list: BinanceApiKey[];
    trading_pairs: string[];
    usdt_pairs: string[];
    initialized: boolean;
    loading: boolean;
    is_initializing: boolean; // 标识是否正在初始化
    active_api_key_id: string | null; // 当前激活的 API Key ID

    // WebSocket ticker 相关
    socket: Socket | null;
    ticker_prices: Record<string, TickerPrice>; // symbol -> price
    subscribed_tickers: Set<string>; // 已订阅的 ticker

    // Actions
    init: () => Promise<void>;
    refreshApiKeys: () => Promise<void>;
    refreshTradingPairs: () => Promise<void>;
    getApiKeyById: (id: number) => BinanceApiKey | undefined;
    set_active_api_key: (id: string) => void; // 设置当前激活的 API Key
    get_active_api_key: () => BinanceApiKey | null; // 获取当前激活的 API Key
    getCurrentApiKey: () => { api_key: string; api_secret: string } | null; // 获取当前 API Key 信息

    // Ticker 订阅相关
    connectSocket: () => Promise<void>;
    disconnectSocket: () => void;
    subscribeTicker: (symbol: string, market?: string) => void;
    unsubscribeTicker: (symbol: string, market?: string) => void;
    switchTicker: (oldSymbol: string | null, newSymbol: string, market?: string) => void;
    getTickerPrice: (symbol: string) => number | null;
}


// 获取 auth token（当前未使用，保留备用）
async function getAuthToken(): Promise<string> {
  try {
    // 检查 Wails 环境是否可用
    if (typeof window === 'undefined' || !(window as any).go || !(window as any).go.main) {
      return '';
    }

    const token_res = await GetConfig('auth_token') as any;
    if (token_res && typeof token_res === 'object') {
      if (token_res.status === 'success' && token_res.datum) {
        return String(token_res.datum);
      }
    } else if (typeof token_res === 'string') {
      return token_res;
    }
  } catch {
    // 忽略错误，返回空字符串
  }
  return '';
}

// 获取 Node.js URL
async function getNodejsUrl(): Promise<string> {
  try {
    // 检查 Wails 环境是否可用
    if (typeof window === 'undefined' || !(window as any).go || !(window as any).go.main) {
      // 浏览器模式：返回默认 URL（后端服务端口）
      return 'http://localhost:54321';
    }

    return await GetNodejsServiceURL();
  } catch {
    // 忽略错误，返回默认 URL
  }
  // 发生错误时返回默认 URL（后端服务端口）
  return 'http://localhost:54321';
}

export const useBinanceStore = create<BinanceStore>((set, get) => ({
  // 初始状态
  api_key_list: [],
  trading_pairs: [],
  usdt_pairs: [],
  initialized: false,
  loading: false,
  is_initializing: false,
  active_api_key_id: null,

  // WebSocket 初始状态
  socket: null,
  ticker_prices: {},
  subscribed_tickers: new Set(),

  // 初始化：先获取 API Key 列表，成功且有数据时才获取交易对
  init: async () => {
    const { loading, api_key_list, usdt_pairs, is_initializing } = get();
    // 如果正在加载、正在初始化或已经成功初始化且有数据，则跳过
    if (loading || is_initializing || (api_key_list.length > 0 && usdt_pairs.length > 0)) return;

    set({ loading: true, is_initializing: true });

    try {
      // 先获取 API Key 列表
      await get().refreshApiKeys();

      // 从 localStorage 恢复 active_api_key_id
      const saved_id = localStorage.getItem('active_api_key_id');
      const after_api_keys = get().api_key_list;

      if (after_api_keys.length > 0) {
        // 优先使用保存的 API Key ID
        if (saved_id && after_api_keys.some(k => String(k.id) === saved_id)) {
          set({ active_api_key_id: saved_id });
        } else {
          // 如果保存的 ID 不存在，使用第一个 API Key
          set({ active_api_key_id: String(after_api_keys[0].id) });
          localStorage.setItem('active_api_key_id', String(after_api_keys[0].id));
        }

        // 获取交易对信息
        await get().refreshTradingPairs();
      }

      set({ initialized: true, loading: false, is_initializing: false });
    } catch (error) {
      console.error('初始化币安数据失败:', error);
      set({ loading: false, is_initializing: false });
    }
  },

  // 刷新 API Key 列表（静默模式，不显示错误）
  refreshApiKeys: async () => {
    const nodejs_url = await getNodejsUrl();

    if (!nodejs_url) return;

    try {
      const response = await BinanceApiKeyApi.query();

      // 后端返回字段名直接使用，不做任何转换
      if (response.status === 'success' && response.datum?.list) {
        set({ api_key_list: response.datum.list });
      }
    } catch (error) {
      // 静默模式，不显示错误
    }
  },

  // 刷新交易对列表（静默模式，不显示错误）
  refreshTradingPairs: async () => {
    const nodejs_url = await getNodejsUrl();
    if (!nodejs_url) return;

    // 使用当前激活的 API Key，而不是第一个
    const active_api_key = get().get_active_api_key();
    if (!active_api_key) {
      return;
    }

    try {
      const params = {
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret
      };

      // 传递 api_key 和 api_secret 参数
      const response = await BinanceExchangeInfoApi.getExchangeInfo(params);

      // 后端响应直接透传，数据在 response.datum.symbols
      if (response.status === 'success' && response.datum?.symbols) {
        const symbols = response.datum.symbols;
        const trading_symbols = symbols.filter((s: any) => s.status === 'TRADING');
        const all_pairs = trading_symbols.map((s: any) => s.symbol);
        const usdt_pairs = trading_symbols
          .filter((s: any) => s.quoteAsset === 'USDT')
          .map((s: any) => s.symbol)
          .sort();

        set({
          trading_pairs: all_pairs,
          usdt_pairs
        });
      }
    } catch (error) {
      // 静默模式，不显示错误
    }
  },

  // 根据 ID 获取 API Key
  getApiKeyById: (id: number) => {
    return get().api_key_list.find(k => k.id === id);
  },

  // 设置当前激活的 API Key
  set_active_api_key: (id: string) => {
    set({ active_api_key_id: id });
    localStorage.setItem('active_api_key_id', id);
  },

  // 获取当前激活的 API Key
  get_active_api_key: () => {
    const { api_key_list, active_api_key_id } = get();
    return api_key_list.find(key => String(key.id) === active_api_key_id) || api_key_list[0] || null;
  },

  // 获取当前 API Key 信息（供 API 请求使用）
  getCurrentApiKey: () => {
    const active_key = get().get_active_api_key();
    if (!active_key) return null;
    return {
      api_key: active_key.api_key,
      api_secret: active_key.api_secret
    };
  },

  // 连接 WebSocket
  connectSocket: async () => {
    const { socket } = get();
    if (socket?.connected) {
      return;
    }

    try {
      const nodejs_url = await getNodejsUrl();
      const socket_url = nodejs_url.replace('http://', 'ws://').replace('https://', 'wss://');

      // 等待连接完成的 Promise
      const connectPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket 连接超时'));
        }, 10000); // 10秒超时

        const new_socket = io(socket_url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
        });

        new_socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        new_socket.on('disconnect', () => {
          // WebSocket 断开
        });

        new_socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // 监听 ticker 更新
        new_socket.on('ticker_update', (data: any) => {
          const { symbol, price, market } = data;
          if (symbol && price) {
            set({
              ticker_prices: {
                ...get().ticker_prices,
                [symbol]: {
                  symbol,
                  price: parseFloat(price),
                  market: market || 'usdm',
                  timestamp: Date.now()
                }
              }
            });
          }
        });

        set({ socket: new_socket });
      });

      // 等待连接完成
      await connectPromise;
    } catch (error) {
      console.error('[binance-store] WebSocket 连接失败:', error);
      throw error;
    }
  },

  // 断开 WebSocket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, ticker_prices: {}, subscribed_tickers: new Set() });
    }
  },

  // 订阅 ticker
  subscribeTicker: (symbol: string, market = 'usdm') => {
    const { socket, subscribed_tickers } = get();
    if (!socket?.connected) {
      console.warn('[binance-store] WebSocket 未连接，无法订阅 ticker');
      return;
    }

    const subKey = `${market}:${symbol}`;
    if (subscribed_tickers.has(subKey)) {
      return;
    }

    socket.emit('subscribe_ticker', { symbol, market });
    set({
      subscribed_tickers: new Set([...subscribed_tickers, subKey])
    });
  },

  // 取消订阅 ticker
  unsubscribeTicker: (symbol: string, market = 'usdm') => {
    const { socket, subscribed_tickers } = get();
    if (!socket?.connected) {
      return;
    }

    const subKey = `${market}:${symbol}`;
    if (!subscribed_tickers.has(subKey)) {
      return;
    }

    socket.emit('unsubscribe_ticker', { symbol, market });

    const new_tickers = new Set(subscribed_tickers);
    new_tickers.delete(subKey);

    const new_prices = { ...get().ticker_prices };
    delete new_prices[symbol];

    set({
      subscribed_tickers: new_tickers,
      ticker_prices: new_prices
    });
  },

  // 切换 ticker 订阅
  switchTicker: (oldSymbol: string | null, newSymbol: string, market = 'usdm') => {
    if (oldSymbol && oldSymbol !== newSymbol) {
      get().unsubscribeTicker(oldSymbol, market);
    }
    get().subscribeTicker(newSymbol, market);
  },

  // 获取 ticker 价格
  getTickerPrice: (symbol: string) => {
    const ticker = get().ticker_prices[symbol];
    return ticker ? ticker.price : null;
  }
}));
