import { create } from 'zustand';
import {
  GetAppDescription,
  GetNodejsServiceURL
} from '../../wailsjs/go/main/App';
import { apiClient } from '../api/client';
import { SystemApi } from '../api';

interface GitInfo {
    branch: string;
    tag: string;
    commit_hash: string;
    commit_author: string;
    commit_date: string;
    commit_message: string;
    timestamp: string;
}

interface HealthData {
    service: {
        is_running?: boolean;
        pid?: number;
        start_time?: string;
        uptime?: string;
    };
    health: {
        is_healthy?: boolean;
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
            user_data?: number;
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
    app_version: string;
    appDescription: string;
    nodejs_url: string;
    environment: string;
    ipv4List: string[];
    databasePath?: string;
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
  app_version: 'unknown',
  appDescription: '',
  nodejs_url: '',
  environment: 'production',
  ipv4List: [],
  gitInfo: undefined
};

const defaultHealthData: HealthData = {
  service: {
    is_running: false,
    pid: 0,
    start_time: '',
    uptime: ''
  },
  health: {
    is_healthy: false,
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
      user_data: 0,
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
    const { initialized, loading } = get();
    if (initialized || loading) return;

    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      set({ loading: true });

      try {
        // 检查 Wails 环境是否可用
        const is_wails_available = typeof window !== 'undefined' &&
                                       (window as any).go &&
                                       (window as any).go.main;

        if (!is_wails_available) {
          console.warn('Wails 环境未就绪，使用浏览器模式初始化');

          // 浏览器模式：使用默认 Node.js 服务地址
          const nodejs_url = 'http://localhost:54321';

          // 设置 staticInfo
          set({
            staticInfo: {
              ...defaultStaticInfo,
              nodejs_url
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
        const [appDescription, nodejs_url] = await Promise.all([
          GetAppDescription(),
          GetNodejsServiceURL()
        ]);

        // 配置 API 客户端的 base_url
        if (nodejs_url) {
          apiClient.configure({ base_url: nodejs_url });
        }

        let ipv4List: string[] = [];
        let gitInfo: GitInfo | undefined;
        let app_version = 'unknown';
        let healthData: HealthData | null = null;
        let databasePath: string | undefined;

        if (nodejs_url) {
          for (let i = 0; i < 60; i++) {
            try {
              const [ipResponse, gitResponse, healthResponse, dbPathResponse] = await Promise.allSettled([
                SystemApi.getIpv4List(),
                SystemApi.getGitInfo(),
                SystemApi.healthCheck(),
                SystemApi.getDatabasePath()
              ]);

              if (ipResponse.status === 'fulfilled' && ipResponse.value) {
                if (ipResponse.value.status === 'success' && Array.isArray(ipResponse.value.data)) {
                  ipv4List = ipResponse.value.data;
                }
              }

              if (gitResponse.status === 'fulfilled' && gitResponse.value) {
                if (gitResponse.value.status === 'success' && gitResponse.value.data) {
                  gitInfo = gitResponse.value.data;
                  app_version = gitInfo?.tag || app_version;
                }
              }

              if (healthResponse.status === 'fulfilled' && healthResponse.value) {
                if (healthResponse.value.status === 'success' && healthResponse.value.data) {
                  healthData = healthResponse.value.data;
                }
              }

              if (dbPathResponse.status === 'fulfilled' && dbPathResponse.value) {
                if (dbPathResponse.value.status === 'success' && typeof dbPathResponse.value.data === 'string') {
                  databasePath = dbPathResponse.value.data;
                }
              }

              if (ipv4List.length > 0 || gitInfo || healthData || databasePath) {
                break;
              }
            } catch {
              // 忽略重试循环中的错误
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const staticInfo: StaticInfo = {
          frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
          app_version,
          appDescription,
          nodejs_url,
          environment: import.meta.env.MODE || 'production',
          ipv4List,
          databasePath,
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
          if (!store.initialized || !store.staticInfo?.nodejs_url) return;

          try {
            const response = await SystemApi.healthCheck();
            if (response.status === 'success' && response.data) {
              set({ dynamicInfo: { health: response.data } });
            }
          } catch {
            // 忽略定期健康检查的错误
          }
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
    if (!store.staticInfo?.nodejs_url) return;

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
  if (!store.initialized && !store.loading && !initPromise) {
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
