import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';
import { BinanceApiKeyApi, BinanceExchangeInfoApi } from '../api';

// API Key 信息 - 字段名与后端完全一致
export interface BinanceApiKey {
    id: number;
    name: string;
    api_key: string;
    secret_key: string;
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

interface BinanceStore {
    // 状态
    api_key_list: BinanceApiKey[];
    trading_pairs: string[];
    usdt_pairs: string[];
    initialized: boolean;
    loading: boolean;
    is_initializing: boolean; // 标识是否正在初始化
    active_api_key_id: string | null; // 当前激活的 API Key ID

    // Actions
    init: () => Promise<void>;
    refreshApiKeys: () => Promise<void>;
    refreshTradingPairs: () => Promise<void>;
    getApiKeyById: (id: number) => BinanceApiKey | undefined;
    set_active_api_key: (id: string) => void; // 设置当前激活的 API Key
    get_active_api_key: () => BinanceApiKey | null; // 获取当前激活的 API Key
    getCurrentApiKey: () => { api_key: string; secret_key: string } | null; // 获取当前 API Key 信息
}

// 获取 auth token
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
    const auth_token = await getAuthToken();

    if (!nodejs_url) return;

    try {
      console.log('[binance-store] 开始查询 API Key 列表');
      const response = await BinanceApiKeyApi.query();

      // 后端返回字段名直接使用，不做任何转换
      if (response.status === 'success' && response.datum?.list) {
        set({ api_key_list: response.datum.list });
      }
    } catch (error) {
      console.error('[binance-store] 查询 API Key 失败:', error);
    }
  },

  // 刷新交易对列表（静默模式，不显示错误）
  refreshTradingPairs: async () => {
    const nodejs_url = await getNodejsUrl();
    if (!nodejs_url) return;

    // 从 api_key_list 中获取第一个可用的 api_key
    const api_key_list = get().api_key_list;
    if (api_key_list.length === 0) {
      console.warn('[binance-store] 无可用的 API Key，跳过获取交易对');
      return;
    }

    const api_key = api_key_list[0];
    console.log('[binance-store] 使用 API Key:', {
      id: api_key.id,
      name: api_key.name,
      api_key: api_key.api_key.substring(0, 8) + '...',  // 脱敏
      hasSecret: !!api_key.secret_key
    });

    try {
      const params = {
        api_key: api_key.api_key,
        secret_key: api_key.secret_key
      };
      console.log('[binance-store] 调用 getExchangeInfo，参数:', {
        api_key: params.api_key.substring(0, 8) + '...',
        hasSecret: !!params.secret_key
      });

      // 传递 api_key 和 secret_key 参数
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
      console.error('[binance-store] 获取交易对失败:', error);
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
      secret_key: active_key.secret_key
    };
  }
}));
