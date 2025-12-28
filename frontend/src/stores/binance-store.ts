import { create } from 'zustand';
import { GetNodejsServiceURL, GetConfig } from '../../wailsjs/go/main/App';
import { BinanceApiKeyApi, BinanceExchangeInfoApi } from '../api';

// API Key 信息
export interface BinanceApiKey {
    id: number;
    name: string;
    apiKey: string;
    secretKey: string;
    status: number;
    remark?: string;
    vipExpireAt?: string;
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
    isInitializing: boolean; // 标识是否正在初始化
    activeApiKeyId: string | null; // 当前激活的 API Key ID

    // Actions
    init: () => Promise<void>;
    refreshApiKeys: () => Promise<void>;
    refreshTradingPairs: () => Promise<void>;
    getApiKeyById: (id: number) => BinanceApiKey | undefined;
    setActiveApiKey: (id: string) => void; // 设置当前激活的 API Key
    getActiveApiKey: () => BinanceApiKey | null; // 获取当前激活的 API Key
    getCurrentAuth: () => { apiKey: string; apiSecret: string } | null; // 获取当前认证信息
}

// 获取 auth token
async function getAuthToken(): Promise<string> {
    try {
        // 检查 Wails 环境是否可用
        if (typeof window === 'undefined' || !(window as any).go || !(window as any).go.main) {
            return '';
        }

        const tokenRes = await GetConfig('auth_token') as any;
        if (tokenRes && typeof tokenRes === 'object') {
            if (tokenRes.status === 'success' && tokenRes.data) {
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
        // 检查 Wails 环境是否可用
        if (typeof window === 'undefined' || !(window as any).go || !(window as any).go.main) {
            // 浏览器模式：返回默认 URL（后端服务端口）
            return 'http://localhost:54321';
        }

        return await GetNodejsServiceURL();
    } catch {}
    // 发生错误时返回默认 URL（后端服务端口）
    return 'http://localhost:54321';
}

export const useBinanceStore = create<BinanceStore>((set, get) => ({
    // 初始状态
    apiKeyList: [],
    tradingPairs: [],
    usdtPairs: [],
    initialized: false,
    loading: false,
    isInitializing: false,
    activeApiKeyId: null,

    // 初始化：先获取 API Key 列表，成功且有数据时才获取交易对
    init: async () => {
        const { loading, apiKeyList, usdtPairs, isInitializing } = get();
        // 如果正在加载、正在初始化或已经成功初始化且有数据，则跳过
        if (loading || isInitializing || (apiKeyList.length > 0 && usdtPairs.length > 0)) return;

        set({ loading: true, isInitializing: true });

        try {
            // 先获取 API Key 列表
            await get().refreshApiKeys();

            // 从 localStorage 恢复 activeApiKeyId
            const savedId = localStorage.getItem('activeApiKeyId');
            const afterApiKeys = get().apiKeyList;

            if (afterApiKeys.length > 0) {
                // 优先使用保存的 API Key ID
                if (savedId && afterApiKeys.some(k => String(k.id) === savedId)) {
                    set({ activeApiKeyId: savedId });
                } else {
                    // 如果保存的 ID 不存在，使用第一个 API Key
                    set({ activeApiKeyId: String(afterApiKeys[0].id) });
                    localStorage.setItem('activeApiKeyId', String(afterApiKeys[0].id));
                }

                // 获取交易对信息
                await get().refreshTradingPairs();
            }

            set({ initialized: true, loading: false, isInitializing: false });
        } catch (error) {
            console.error('初始化币安数据失败:', error);
            set({ loading: false, isInitializing: false });
        }
    },

    // 刷新 API Key 列表（静默模式，不显示错误）
    refreshApiKeys: async () => {
        const nodejsUrl = await getNodejsUrl();
        const authToken = await getAuthToken();

        if (!nodejsUrl) return;

        try {
            console.log('[binance-store] 开始查询 API Key 列表');
            const response = await BinanceApiKeyApi.query();

            // 诊断日志：检查响应结构
            console.log('[binance-store] API 响应:', JSON.stringify(response, null, 2));
            console.log('[binance-store] response.status:', response.status);
            console.log('[binance-store] response.data:', response.data);

            // 后端响应直接透传，数据在 response.data.list
            if (response.status === 'success' && response.data?.list) {
                // 转换字段名：下划线命名 -> 驼峰命名
                const convertedList = response.data.list.map((item: any) => ({
                    ...item,
                    apiKey: item.api_key,
                    secretKey: item.secret_key
                }));
                console.log('[binance-store] 转换后的列表:', convertedList);
                set({ apiKeyList: convertedList });
            } else {
                console.log('[binance-store] 响应格式不符合预期或没有数据');
                console.log('[binance-store] response.status === \'success\':', response.status === 'success');
                console.log('[binance-store] response.data?.list 存在:', !!response.data?.list);
            }
        } catch (error) {
            console.error('[binance-store] 查询 API Key 失败:', error);
        }
    },

    // 刷新交易对列表（静默模式，不显示错误）
    refreshTradingPairs: async () => {
        const nodejsUrl = await getNodejsUrl();
        if (!nodejsUrl) return;

        // 从 apiKeyList 中获取第一个可用的 apiKey
        const apiKeyList = get().apiKeyList;
        if (apiKeyList.length === 0) {
            console.warn('[binance-store] 无可用的 API Key，跳过获取交易对');
            return;
        }

        const apiKey = apiKeyList[0];
        console.log('[binance-store] 使用 API Key:', {
            id: apiKey.id,
            name: apiKey.name,
            apiKey: apiKey.apiKey.substring(0, 8) + '...',  // 脱敏
            hasSecret: !!apiKey.secretKey
        });

        try {
            const params = {
                apiKey: apiKey.apiKey,
                apiSecret: apiKey.secretKey
            };
            console.log('[binance-store] 调用 getExchangeInfo，参数:', {
                apiKey: params.apiKey.substring(0, 8) + '...',
                hasSecret: !!params.apiSecret
            });

            // 传递 apiKey 和 apiSecret 参数
            const response = await BinanceExchangeInfoApi.getExchangeInfo(params);

            // 后端响应直接透传，数据在 response.data.symbols
            if (response.status === 'success' && response.data?.symbols) {
                const symbols = response.data.symbols;
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
            console.error('[binance-store] 获取交易对失败:', error);
        }
    },

    // 根据 ID 获取 API Key
    getApiKeyById: (id: number) => {
        return get().apiKeyList.find(k => k.id === id);
    },

    // 设置当前激活的 API Key
    setActiveApiKey: (id: string) => {
        set({ activeApiKeyId: id });
        localStorage.setItem('activeApiKeyId', id);
    },

    // 获取当前激活的 API Key
    getActiveApiKey: () => {
        const { apiKeyList, activeApiKeyId } = get();
        return apiKeyList.find(key => String(key.id) === activeApiKeyId) || apiKeyList[0] || null;
    },

    // 获取当前认证信息（供 API 请求使用）
    getCurrentAuth: () => {
        const activeKey = get().getActiveApiKey();
        if (!activeKey) return null;
        return {
            apiKey: activeKey.apiKey,
            apiSecret: activeKey.secretKey
        };
    }
}));
