import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';
import type { Response } from '../core/response';
import { showError, showWarning } from '../utils/api-error';

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

    // 刷新 API Key 列表
    refreshApiKeys: async () => {
        const nodejsUrl = await getNodejsUrl();
        const authToken = await getAuthToken();

        if (!nodejsUrl) {
            showWarning('无法获取服务地址');
            return;
        }
        if (!authToken) {
            showError(401, '未授权，请先登录');
            return;
        }

        try {
            const response = await fetch(`${nodejsUrl}/v1/binance-api-key/query`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                showError(response.status, `获取 API Key 列表失败: ${response.statusText}`);
                return;
            }

            const result = await response.json();
            if (result.status === 'success' && result.data?.list) {
                set({ apiKeyList: result.data.list });
            } else if (result.code && result.code !== 0) {
                showError(result.code, result.msg || '获取 API Key 列表失败');
            } else {
                showError(500, '获取 API Key 列表失败: 响应格式错误');
            }
        } catch (error: any) {
            console.error('获取 API Key 列表失败:', error);
            showError(500, error.message || '获取 API Key 列表失败');
        }
    },

    // 刷新交易对列表
    refreshTradingPairs: async () => {
        const nodejsUrl = await getNodejsUrl();
        if (!nodejsUrl) {
            showWarning('无法获取服务地址');
            return;
        }

        try {
            // 获取交易所信息
            const response = await fetch(`${nodejsUrl}/v1/binance-exchange-info`);

            if (!response.ok) {
                showError(response.status, `获取交易对列表失败: ${response.statusText}`);
                return;
            }

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
            } else if (result.code && result.code !== 200) {
                showError(result.code, result.msg || '获取交易对列表失败');
            } else {
                showError(500, '获取交易对列表失败: 响应格式错误');
            }
        } catch (error: any) {
            console.error('获取交易对列表失败:', error);
            showError(500, error.message || '获取交易对列表失败');
        }
    },

    // 根据 ID 获取 API Key
    getApiKeyById: (id: number) => {
        return get().apiKeyList.find(k => k.id === id);
    }
}));
