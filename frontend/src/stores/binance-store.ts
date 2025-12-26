import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';
import type { Response } from '../core/response';

// API Key 信息
export interface BinanceApiKey {
    id: number;
    name: string;
    apiKey: string;
    secretKey: string;
    status: number;
    remark?: string;
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
    apiKeyList: BinanceApiKey[];
    tradingPairs: string[];
    usdtPairs: string[];
    initialized: boolean;
    loading: boolean;

    // Actions
    init: () => Promise<void>;
    refreshApiKeys: () => Promise<void>;
    refreshTradingPairs: () => Promise<void>;
    getApiKeyById: (id: number) => BinanceApiKey | undefined;
}

// 获取 auth token
async function getAuthToken(): Promise<string> {
    try {
        const tokenRes = await GetConfig('auth_token');
        if (tokenRes && typeof tokenRes === 'object' && 'code' in tokenRes) {
            const res = tokenRes as Response<any>;
            if (res.code === 0 && res.data) {
                return String(res.data);
            }
        } else if (typeof tokenRes === 'string') {
            return tokenRes;
        }
    } catch {}
    return '';
}

// 获取 Node.js URL
async function getNodejsUrl(): Promise<string> {
    try {
        return await GetNodejsServiceURL();
    } catch {}
    return '';
}

export const useBinanceStore = create<BinanceStore>((set, get) => ({
    // 初始状态
    apiKeyList: [],
    tradingPairs: [],
    usdtPairs: [],
    initialized: false,
    loading: false,

    // 初始化
    init: async () => {
        const { initialized, loading, apiKeyList, usdtPairs } = get();
        // 如果正在加载或已经成功初始化且有数据，则跳过
        if (loading || (initialized && apiKeyList.length > 0 && usdtPairs.length > 0)) return;

        set({ loading: true });

        try {
            // 并行获取 API Key 列表和交易对
            await Promise.all([
                get().refreshApiKeys(),
                get().refreshTradingPairs()
            ]);

            set({ initialized: true, loading: false });
        } catch (error) {
            console.error('初始化币安数据失败:', error);
            set({ loading: false });
        }
    },

    // 刷新 API Key 列表
    refreshApiKeys: async () => {
        const nodejsUrl = await getNodejsUrl();
        const authToken = await getAuthToken();

        if (!nodejsUrl || !authToken) return;

        try {
            const response = await fetch(`${nodejsUrl}/v1/binance-api-key/query`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();
            if (result.status === 'success' && result.data?.list) {
                set({ apiKeyList: result.data.list });
            }
        } catch (error) {
            console.error('获取 API Key 列表失败:', error);
        }
    },

    // 刷新交易对列表
    refreshTradingPairs: async () => {
        const nodejsUrl = await getNodejsUrl();
        if (!nodejsUrl) return;

        try {
            // 获取交易所信息
            const response = await fetch(`${nodejsUrl}/v1/binance-exchange-info`);
            const result = await response.json();

            if (result.code === 200 && result.data?.exchangeInfo?.symbols) {
                const symbols = result.data.exchangeInfo.symbols;
                // 过滤状态为 TRADING 的交易对
                const tradingSymbols = symbols.filter((s: any) => s.status === 'TRADING');
                // 提取所有交易对 symbol
                const allPairs = tradingSymbols.map((s: any) => s.symbol);
                // 提取 USDT 交易对
                const usdtPairs = tradingSymbols
                    .filter((s: any) => s.quoteAsset === 'USDT')
                    .map((s: any) => s.symbol)
                    .sort();

                set({
                    tradingPairs: allPairs,
                    usdtPairs
                });
            }
        } catch (error) {
            console.error('获取交易对列表失败:', error);
        }
    },

    // 根据 ID 获取 API Key
    getApiKeyById: (id: number) => {
        return get().apiKeyList.find(k => k.id === id);
    }
}));

// 自动初始化
setTimeout(() => {
    const store = useBinanceStore.getState();
    if (!store.initialized && !store.loading) {
        store.init();
    }
}, 100);
