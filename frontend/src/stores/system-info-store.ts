import { create } from 'zustand';
import {
    GetAppDescription,
    GetDatabasePath,
    IsDatabaseHealthy,
    GetNodejsServiceURL,
    GetNodejsServiceStatus
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

interface NodejsStatus {
    isRunning: boolean;
    isHealthy: boolean;
    port: number;
    url: string;
    startTime?: string;
    uptime?: string;
    pid?: number;
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
    databaseHealthy: boolean;
    nodejsStatus: NodejsStatus;
}

interface SystemInfoStore {
    // 状态
    staticInfo: StaticInfo | null;
    dynamicInfo: DynamicInfo | null;
    initialized: boolean;
    loading: boolean;

    // Actions（内部使用）
    _init: () => Promise<void>;
    refreshDynamic: () => Promise<void>;
}

// 默认静态信息
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

// 默认动态信息
const defaultDynamicInfo: DynamicInfo = {
    databaseHealthy: false,
    nodejsStatus: {
        isRunning: false,
        isHealthy: false,
        port: 0,
        url: ''
    }
};

// 初始化状态锁
let initPromise: Promise<void> | null = null;

export const useSystemInfoStore = create<SystemInfoStore>((set, get) => ({
    // 初始状态
    staticInfo: null,
    dynamicInfo: null,
    initialized: false,
    loading: false,

    // 内部初始化方法（使用 Promise 锁防止重复调用）
    _init: async () => {
        const { initialized } = get();
        if (initialized) return;

        // 如果已有初始化任务，等待其完成
        if (initPromise) {
            await initPromise;
            return;
        }

        // 创建新的初始化任务
        initPromise = (async () => {
            set({ loading: true });

            try {
                // 基础信息（不依赖 Node.js 服务）
                const [appDescription, databasePath, nodejsUrl] = await Promise.all([
                    GetAppDescription(),
                    GetDatabasePath(),
                    GetNodejsServiceURL()
                ]);

                let ipv4List: string[] = [];
                let gitInfo: GitInfo | undefined;
                let appVersion = 'unknown';

                // 直接调用接口获取 IPv4 和 Git 信息，失败则每秒重试
                if (nodejsUrl) {
                    for (let i = 0; i < 60; i++) {
                        try {
                            const [ipResponse, gitResponse] = await Promise.allSettled([
                                fetch(`${nodejsUrl}/v1/system/ipv4-list`),
                                fetch(`${nodejsUrl}/v1/system/git-info`)
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

                            if (ipv4List.length > 0 || gitInfo) {
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

                // 初始化动态数据
                const [databaseHealthy, nodejsStatus] = await Promise.all([
                    IsDatabaseHealthy(),
                    GetNodejsServiceStatus()
                ]);

                set({
                    staticInfo,
                    dynamicInfo: { databaseHealthy, nodejsStatus: nodejsStatus as NodejsStatus },
                    initialized: true,
                    loading: false
                });

                // 启动动态数据轮询（每10秒）
                setInterval(async () => {
                    const store = get();
                    if (!store.initialized) return;

                    try {
                        const [dbHealthy, nodeStatus] = await Promise.all([
                            IsDatabaseHealthy(),
                            GetNodejsServiceStatus()
                        ]);
                        set({
                            dynamicInfo: {
                                databaseHealthy: dbHealthy,
                                nodejsStatus: nodeStatus as NodejsStatus
                            }
                        });
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

    // 手动刷新动态数据
    refreshDynamic: async () => {
        try {
            const [databaseHealthy, nodejsStatus] = await Promise.all([
                IsDatabaseHealthy(),
                GetNodejsServiceStatus()
            ]);
            set({
                dynamicInfo: { databaseHealthy, nodejsStatus: nodejsStatus as NodejsStatus }
            });
        } catch (error) {
            console.error('刷新动态信息失败:', error);
        }
    }
}));

// 自动初始化（store 创建时执行一次）
setTimeout(() => {
    const store = useSystemInfoStore.getState();
    if (!store.initialized && !initPromise) {
        store._init();
    }
}, 0);

// 获取静态信息的辅助函数（返回默认值避免 null）
export function getStaticInfo(): StaticInfo {
    const store = useSystemInfoStore.getState();
    return store.staticInfo || defaultStaticInfo;
}

// 获取动态信息的辅助函数（返回默认值避免 null）
export function getDynamicInfo(): DynamicInfo {
    const store = useSystemInfoStore.getState();
    return store.dynamicInfo || defaultDynamicInfo;
}

// 导出类型
export type { GitInfo, NodejsStatus, StaticInfo, DynamicInfo };
