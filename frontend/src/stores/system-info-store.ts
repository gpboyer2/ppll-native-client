import { create } from 'zustand';
import {
    GetAppDescription,
    GetDatabasePath,
    GetNodejsServiceURL
} from '../../wailsjs/go/main/App';

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
        isRunning: boolean;
        pid: number;
        startTime: string;
        uptime: string;
    };
    health: {
        isHealthy: boolean;
        database: {
            healthy: boolean;
        };
    };
    resources: {
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        cpu: {
            user: number;
            system: number;
        };
    };
    connections: {
        websocket: {
            active: number;
            public: number;
            userData: number;
            total: number;
        };
        socketio: {
            active: number;
            total: number;
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

const defaultDynamicInfo: DynamicInfo = {
    health: null
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
                const [appDescription, databasePath, nodejsUrl] = await Promise.all([
                    GetAppDescription(),
                    GetDatabasePath(),
                    GetNodejsServiceURL()
                ]);

                let ipv4List: string[] = [];
                let gitInfo: GitInfo | undefined;
                let appVersion = 'unknown';
                let healthData: HealthData | null = null;

                if (nodejsUrl) {
                    for (let i = 0; i < 60; i++) {
                        try {
                            const [ipResponse, gitResponse, healthResponse] = await Promise.allSettled([
                                fetch(`${nodejsUrl}/v1/system/ipv4-list`),
                                fetch(`${nodejsUrl}/v1/system/git-info`),
                                fetch(`${nodejsUrl}/v1/system/health`)
                            ]);

                            if (ipResponse.status === 'fulfilled' && ipResponse.value) {
                                const ipData = await ipResponse.value.json();
                                if (ipData.code === 200 && Array.isArray(ipData.data)) {
                                    ipv4List = ipData.data;
                                }
                            }

                            if (gitResponse.status === 'fulfilled' && gitResponse.value) {
                                const gitData = await gitResponse.value.json();
                                if (gitData.code === 200 && gitData.data) {
                                    gitInfo = gitData.data;
                                    appVersion = gitInfo?.tag || appVersion;
                                }
                            }

                            if (healthResponse.status === 'fulfilled' && healthResponse.value) {
                                const healthResult = await healthResponse.value.json();
                                if (healthResult.code === 200 && healthResult.data) {
                                    healthData = healthResult.data;
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
                        const response = await fetch(`${store.staticInfo.nodejsUrl}/v1/system/health`);
                        if (response.ok) {
                            const result = await response.json();
                            if (result.code === 200 && result.data) {
                                set({ dynamicInfo: { health: result.data } });
                            }
                        }
                    } catch {}
                }, 10000);
            } catch (error) {
                console.error('初始化系统信息失败:', error);
                set({ loading: false });
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
            const response = await fetch(`${store.staticInfo.nodejsUrl}/v1/system/health`);
            if (response.ok) {
                const result = await response.json();
                if (result.code === 200 && result.data) {
                    set({ dynamicInfo: { health: result.data } });
                }
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

export type { GitInfo, HealthData, StaticInfo, DynamicInfo };
