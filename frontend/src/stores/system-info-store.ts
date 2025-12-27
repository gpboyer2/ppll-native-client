import { create } from 'zustand';
import {
    GetAppDescription,
    GetDatabasePath,
    GetNodejsServiceURL
} from '../../wailsjs/go/main/App';
import { apiClient } from '../api/client';
import { SystemApi } from '../api';

interface GitInfo {
    branch: string;
    tag: string;
    commitHash: string;
    commitAuthor: string;
    commitDate: string;
    commitMessage: string;
    timestamp: string;
}

interface HealthData {
    service: {
        isRunning?: boolean;
        pid?: number;
        startTime?: string;
        uptime?: string;
    };
    health: {
        isHealthy?: boolean;
        database?: {
            healthy?: boolean;
        };
    };
    resources?: {
        memory?: {
            used?: number;
            total?: number;
            percentage?: number;
        };
        cpu?: {
            user?: number;
            system?: number;
        };
    };
    connections?: {
        websocket?: {
            active?: number;
            public?: number;
            userData?: number;
            total?: number;
        };
        socketio?: {
            active?: number;
            total?: number;
        };
    };
}

interface StaticInfo {
    frontendUrl: string;
    appVersion: string;
    appDescription: string;
    databasePath: string;
    nodejsUrl: string;
    environment: string;
    ipv4List: string[];
    gitInfo?: GitInfo;
}

interface DynamicInfo {
    health: HealthData | null;
}

interface SystemInfoStore {
    staticInfo: StaticInfo | null;
    dynamicInfo: DynamicInfo | null;
    initialized: boolean;
    loading: boolean;
    _init: () => Promise<void>;
    refreshDynamic: () => Promise<void>;
}

const defaultStaticInfo: StaticInfo = {
    frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
    appVersion: 'unknown',
    appDescription: '',
    databasePath: '',
    nodejsUrl: '',
    environment: 'production',
    ipv4List: [],
    gitInfo: undefined
};

const defaultHealthData: HealthData = {
    service: {
        isRunning: false,
        pid: 0,
        startTime: '',
        uptime: ''
    },
    health: {
        isHealthy: false,
        database: {
            healthy: false
        }
    },
    resources: {
        memory: {
            used: 0,
            total: 0,
            percentage: 0
        },
        cpu: {
            user: 0,
            system: 0
        }
    },
    connections: {
        websocket: {
            active: 0,
            public: 0,
            userData: 0,
            total: 0
        },
        socketio: {
            active: 0,
            total: 0
        }
    }
};

const defaultDynamicInfo: DynamicInfo = {
    health: defaultHealthData
};

let initPromise: Promise<void> | null = null;

export const useSystemInfoStore = create<SystemInfoStore>((set, get) => ({
    staticInfo: null,
    dynamicInfo: null,
    initialized: false,
    loading: false,

    _init: async () => {
        const { initialized } = get();
        if (initialized) return;

        if (initPromise) {
            await initPromise;
            return;
        }

        initPromise = (async () => {
            set({ loading: true });

            try {
                // 检查 Wails 环境是否可用
                const isWailsAvailable = typeof window !== 'undefined' &&
                                       (window as any).go &&
                                       (window as any).go.main;

                if (!isWailsAvailable) {
                    console.warn('Wails 环境未就绪，使用浏览器模式初始化');

                    // 浏览器模式：使用默认 Node.js 服务地址
                    const nodejsUrl = 'http://localhost:54321';

                    // 设置 staticInfo
                    set({
                        staticInfo: {
                            ...defaultStaticInfo,
                            nodejsUrl
                        },
                        loading: false
                    });

                    // 尝试获取健康检查数据
                    try {
                        const response = await SystemApi.healthCheck();
                        if (response.status === 'success' && response.data) {
                            set({
                                dynamicInfo: { health: response.data },
                                initialized: true
                            });
                            return;
                        }
                    } catch (error) {
                        console.warn('获取健康检查数据失败:', error);
                    }

                    // 如果获取健康检查失败，仍然标记为已初始化
                    set({
                        dynamicInfo: defaultDynamicInfo,
                        initialized: true
                    });
                    return;
                }

                // Wails 桌面客户端模式
                const [appDescription, databasePath, nodejsUrl] = await Promise.all([
                    GetAppDescription(),
                    GetDatabasePath(),
                    GetNodejsServiceURL()
                ]);

                // 配置 API 客户端的 baseURL
                if (nodejsUrl) {
                    apiClient.configure({ baseURL: nodejsUrl });
                }

                let ipv4List: string[] = [];
                let gitInfo: GitInfo | undefined;
                let appVersion = 'unknown';
                let healthData: HealthData | null = null;

                if (nodejsUrl) {
                    for (let i = 0; i < 60; i++) {
                        try {
                            const [ipResponse, gitResponse, healthResponse] = await Promise.allSettled([
                                SystemApi.getIpv4List(),
                                SystemApi.getGitInfo(),
                                SystemApi.healthCheck()
                            ]);

                            if (ipResponse.status === 'fulfilled' && ipResponse.value) {
                                if (ipResponse.value.status === 'success' && Array.isArray(ipResponse.value.data)) {
                                    ipv4List = ipResponse.value.data;
                                }
                            }

                            if (gitResponse.status === 'fulfilled' && gitResponse.value) {
                                if (gitResponse.value.status === 'success' && gitResponse.value.data) {
                                    gitInfo = gitResponse.value.data;
                                    appVersion = gitInfo?.tag || appVersion;
                                }
                            }

                            if (healthResponse.status === 'fulfilled' && healthResponse.value) {
                                if (healthResponse.value.status === 'success' && healthResponse.value.data) {
                                    healthData = healthResponse.value.data;
                                }
                            }

                            if (ipv4List.length > 0 || gitInfo || healthData) {
                                break;
                            }
                        } catch {}
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                const staticInfo: StaticInfo = {
                    frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
                    appVersion,
                    appDescription,
                    databasePath,
                    nodejsUrl,
                    environment: import.meta.env.MODE || 'production',
                    ipv4List,
                    gitInfo
                };

                set({
                    staticInfo,
                    dynamicInfo: { health: healthData },
                    initialized: true,
                    loading: false
                });

                setInterval(async () => {
                    const store = get();
                    if (!store.initialized || !store.staticInfo?.nodejsUrl) return;

                    try {
                        const response = await SystemApi.healthCheck();
                        if (response.status === 'success' && response.data) {
                            set({ dynamicInfo: { health: response.data } });
                        }
                    } catch {}
                }, 10000);
            } catch (error) {
                console.error('初始化系统信息失败:', error);
                // 设置默认值，确保应用可以正常运行
                set({
                    staticInfo: defaultStaticInfo,
                    dynamicInfo: defaultDynamicInfo,
                    initialized: true,
                    loading: false
                });
            } finally {
                initPromise = null;
            }
        })();

        await initPromise;
    },

    refreshDynamic: async () => {
        const store = get();
        if (!store.staticInfo?.nodejsUrl) return;

        try {
            const response = await SystemApi.healthCheck();
            if (response.status === 'success' && response.data) {
                set({ dynamicInfo: { health: response.data } });
            }
        } catch (error) {
            console.error('刷新动态信息失败:', error);
        }
    }
}));

setTimeout(() => {
    const store = useSystemInfoStore.getState();
    if (!store.initialized && !initPromise) {
        store._init();
    }
}, 0);

export function getStaticInfo(): StaticInfo {
    const store = useSystemInfoStore.getState();
    return store.staticInfo || defaultStaticInfo;
}

export function getDynamicInfo(): DynamicInfo {
    const store = useSystemInfoStore.getState();
    return store.dynamicInfo || defaultDynamicInfo;
}

export function getHealthData(): HealthData {
    const store = useSystemInfoStore.getState();
    return store.dynamicInfo?.health || defaultHealthData;
}

export type { GitInfo, HealthData, StaticInfo, DynamicInfo };
