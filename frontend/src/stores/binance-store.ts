import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';

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
        const tokenRes = await GetConfig('auth_token') as any;
        if (tokenRes && typeof tokenRes === 'object') {
            if (tokenRes.code === 0 && tokenRes.data) {
                return String(tokenRes.data);
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

    // 初始化：先获取 API Key 列表，成功且有数据时才获取交易对
    init: async () => {
        const { loading, apiKeyList, usdtPairs } = get();
        // 如果正在加载或已经成功初始化且有数据，则跳过
        if (loading || (apiKeyList.length > 0 && usdtPairs.length > 0)) return;

        set({ loading: true });

        try {
            // 先获取 API Key 列表
            await get().refreshApiKeys();

            // 只有 API Key 列表存在且有数据时，才获取交易对信息
            const afterApiKeys = get().apiKeyList;
            if (afterApiKeys.length > 0) {
                await get().refreshTradingPairs();
            }

            set({ initialized: true, loading: false });
        } catch (error) {
            console.error('初始化币安数据失败:', error);
            set({ loading: false });
        }
    },

    // 刷新 API Key 列表（静默模式，不显示错误）
    refreshApiKeys: async () => {
        const nodejsUrl = await getNodejsUrl();
        const authToken = await getAuthToken();

        if (!nodejsUrl) return;

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${nodejsUrl}/v1/binance-api-key/query`, {
                method: 'GET',
                headers
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.status === 'success' && result.data?.list) {
                set({ apiKeyList: result.data.list });
            }
        } catch (error) {
            // 静默处理错误
        }
    },

    // 刷新交易对列表（静默模式，不显示错误）
    refreshTradingPairs: async () => {
        const nodejsUrl = await getNodejsUrl();
        if (!nodejsUrl) return;

        try {
            const response = await fetch(`${nodejsUrl}/v1/binance-exchange-info`);
            if (!response.ok) return;

            const result = await response.json();
            if (result.code === 200 && result.data?.exchangeInfo?.symbols) {
                const symbols = result.data.exchangeInfo.symbols;
                const tradingSymbols = symbols.filter((s: any) => s.status === 'TRADING');
                const allPairs = tradingSymbols.map((s: any) => s.symbol);
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
            // 静默处理错误
        }
    },

    // 根据 ID 获取 API Key
    getApiKeyById: (id: number) => {
        return get().apiKeyList.find(k => k.id === id);
    }
}));
