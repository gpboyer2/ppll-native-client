import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 存储后端类型
type StorageBackend = 'localStorage' | 'go';

// 存储接口
interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Go 后端存储适配器
class GoStorageAdapter implements StorageAdapter {
  // 检查 Wails 环境是否可用
  private isWailsAvailable(): boolean {
    return typeof window !== 'undefined' &&
           (window as any).go &&
           (window as any).go.main &&
           (window as any).go.main.App;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      // 检查 Wails 环境是否可用
      if (!this.isWailsAvailable()) {
        console.warn(`Wails 环境未就绪，无法获取配置 [${key}]`);
        return null;
      }

      // 调用 Wails 的 Go 方法
      const result = await (window as any).go.main.App.GetConfig(key);
      return result || null;
    } catch (error) {
      console.warn(`获取配置失败 [${key}]:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      // 检查 Wails 环境是否可用
      if (!this.isWailsAvailable()) {
        console.warn(`Wails 环境未就绪，无法保存配置 [${key}]`);
        throw new Error('Wails 环境未就绪');
      }

      await (window as any).go.main.App.SetConfig(key, value);
    } catch (error) {
      console.error(`保存配置失败 [${key}]:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      // 检查 Wails 环境是否可用
      if (!this.isWailsAvailable()) {
        console.warn(`Wails 环境未就绪，无法删除配置 [${key}]`);
        throw new Error('Wails 环境未就绪');
      }

      await (window as any).go.main.App.RemoveConfig(key);
    } catch (error) {
      console.error(`删除配置失败 [${key}]:`, error);
      throw error;
    }
  }
}

// localStorage 适配器
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`localStorage 获取失败 [${key}]:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`localStorage 保存失败 [${key}]:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`localStorage 删除失败 [${key}]:`, error);
      throw error;
    }
  }
}

// 存储适配器工厂
function createStorageAdapter(backend: StorageBackend): StorageAdapter {
  switch (backend) {
    case 'go':
      return new GoStorageAdapter();
    case 'localStorage':
      return new LocalStorageAdapter();
    default:
      throw new Error(`不支持的存储后端: ${backend}`);
  }
}

// 持久化配置
interface PersistConfig {
  key: string;
  backend?: StorageBackend;
  serialize?: (state: any) => string;
  deserialize?: (str: string) => any;
  partialize?: (state: any) => any;
  onRehydrateStorage?: (state: any) => void;
  skipHydration?: boolean;
}

// 提取 actions 的工具类型
type Actions<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

// 提取 state 的工具类型  
type State<T> = Omit<T, Actions<T>>;

// Store 定义函数类型
type StoreDefinition<T> = (set: any, get: any) => T;

/**
 * 创建持久化 Store - Pinia-like API
 * 
 * @param key 持久化存储的键名
 * @param storeDefinition Store 定义函数，接收 set 和 get 参数，返回包含 state 和 actions 的对象
 * @param config 持久化配置选项
 * @returns Zustand store hook
 * 
 * @example
 * ```typescript
 * const useUserStore = createPersistedStore(
 *   'user-settings',
 *   (set, get) => ({
 *     name: '',
 *     age: 0,
 *     setName: (name: string) => set((state) => ({ ...state, name })),
 *     setAge: (age: number) => set((state) => ({ ...state, age })),
 *   }),
 *   { backend: 'go' }
 * );
 * ```
 */
export function createPersistedStore<T extends Record<string, any>>(
  key: string,
  storeDefinition: StoreDefinition<T>,
  config: Omit<PersistConfig, 'key'> = {}
) {
  const persistConfig: PersistConfig = {
    key,
    backend: 'go',
    serialize: JSON.stringify,
    deserialize: JSON.parse,
    partialize: (state) => {
      // 默认只持久化非函数属性（即 state，不包括 actions）
      const result: any = {};
      for (const [k, v] of Object.entries(state)) {
        if (typeof v !== 'function') {
          result[k] = v;
        }
      }
      return result;
    },
    ...config,
  };

  const storage = createStorageAdapter(persistConfig.backend!);

  // 创建 Zustand store
  const useStore = create<T>()(
    subscribeWithSelector((set, get) => {
      // 执行 store 定义函数，传入 set 和 get
      const store = storeDefinition(set, get);
      
      return store;
    })
  );

  // 持久化逻辑
  let hasHydrated = false;

  // 从存储中恢复状态
  const hydrateStore = async () => {
    if (persistConfig.skipHydration || hasHydrated) return;
    
    try {
      const storedValue = await storage.getItem(persistConfig.key);
      if (storedValue) {
        const parsedState = persistConfig.deserialize!(storedValue);
        const currentState = useStore.getState();
        
        // 只恢复 state，保留 actions
        const stateToRestore: any = {};
        for (const [key, value] of Object.entries(parsedState)) {
          if (typeof currentState[key] !== 'function') {
            stateToRestore[key] = value;
          }
        }
        
        useStore.setState(stateToRestore, false);
        
        if (persistConfig.onRehydrateStorage) {
          persistConfig.onRehydrateStorage(useStore.getState());
        }
      }
    } catch (error) {
      console.error(`恢复状态失败 [${persistConfig.key}]:`, error);
    } finally {
      hasHydrated = true;
    }
  };

  // 保存状态到存储
  const persistState = async (state: T) => {
    try {
      const stateToPersist = persistConfig.partialize!(state);
      const serializedState = persistConfig.serialize!(stateToPersist);
      await storage.setItem(persistConfig.key, serializedState);
    } catch (error) {
      console.error(`持久化状态失败 [${persistConfig.key}]:`, error);
    }
  };

  // 订阅状态变化并自动持久化
  useStore.subscribe(
    (state) => state,
    (state) => {
      if (hasHydrated) {
        persistState(state);
      }
    },
    {
      equalityFn: (a, b) => {
        // 只比较非函数属性
        const aState = persistConfig.partialize!(a);
        const bState = persistConfig.partialize!(b);
        return JSON.stringify(aState) === JSON.stringify(bState);
      }
    }
  );

  // 初始化时恢复状态
  hydrateStore();

  // 扩展 store 添加持久化相关方法
  const enhancedStore = useStore as typeof useStore & {
    persist: {
      rehydrate: () => Promise<void>;
      clearStorage: () => Promise<void>;
      getStorageKey: () => string;
    };
  };

  enhancedStore.persist = {
    rehydrate: hydrateStore,
    clearStorage: () => storage.removeItem(persistConfig.key),
    getStorageKey: () => persistConfig.key,
  };

  return enhancedStore;
}

// 导出类型
export type { StorageBackend, PersistConfig };
