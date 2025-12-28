import { createPersistedStore } from '../lib/createPersistedStore';

// 数据管理相关的类型定义
interface DataManagementState {
  // 清理历史记录
  lastClearTime: string | null;
  clearCount: number;
  
  // 数据备份设置
  autoBackupEnabled: boolean;
  backupInterval: number; // 小时
  maxBackupFiles: number;
  
  // 清理偏好设置
  confirmBeforeClear: boolean;
  clearApiKeys: boolean;
  clearUserSettings: boolean;
  clearStrategyConfigs: boolean;
}

// 创建数据管理 Store
export const useDataManagementStore = createPersistedStore(
  'data-management', // 持久化存储的键名
  (set, get) => ({
    // ===== State =====
    lastClearTime: null,
    clearCount: 0,
    
    autoBackupEnabled: false,
    backupInterval: 24, // 24小时
    maxBackupFiles: 5,
    
    confirmBeforeClear: true,
    clearApiKeys: true,
    clearUserSettings: true,
    clearStrategyConfigs: true,
    
    // ===== Actions =====
    
    // 记录清理操作
    recordClearOperation: () => {
      const now = new Date().toISOString();
      set((state: DataManagementState) => ({
        ...state,
        lastClearTime: now,
        clearCount: state.clearCount + 1,
      }));
    },
    
    // 备份设置 Actions
    toggleAutoBackup: () => {
      set((state: DataManagementState) => ({
        ...state,
        autoBackupEnabled: !state.autoBackupEnabled,
      }));
    },
    
    setBackupInterval: (hours: number) => {
      const clamped_hours = Math.max(1, Math.min(168, hours)); // 1小时到1周
      set((state: DataManagementState) => ({
        ...state,
        backupInterval: clamped_hours,
      }));
    },
    
    setMaxBackupFiles: (count: number) => {
      const clamped_count = Math.max(1, Math.min(50, count));
      set((state: DataManagementState) => ({
        ...state,
        maxBackupFiles: clamped_count,
      }));
    },
    
    // 清理偏好 Actions
    toggleConfirmBeforeClear: () => {
      set((state: DataManagementState) => ({
        ...state,
        confirmBeforeClear: !state.confirmBeforeClear,
      }));
    },
    
    setClearOptions: (options: {
      clearApiKeys?: boolean;
      clearUserSettings?: boolean;
      clearStrategyConfigs?: boolean;
    }) => {
      set((state: DataManagementState) => ({
        ...state,
        ...options,
      }));
    },
    
    // 批量更新设置
    updateSettings: (settings: Partial<DataManagementState>) => {
      set((state: DataManagementState) => ({ ...state, ...settings }));
    },
    
    // 重置为默认设置
    resetToDefaults: () => {
      set(() => ({
        lastClearTime: null,
        clearCount: 0,
        autoBackupEnabled: false,
        backupInterval: 24,
        maxBackupFiles: 5,
        confirmBeforeClear: true,
        clearApiKeys: true,
        clearUserSettings: true,
        clearStrategyConfigs: true,
      }));
    },
    
    // 获取清理统计信息
    getClearStats: (): {
      totalClears: number;
      last_clear: string;
      days_since_last_clear: number;
    } => {
      const state = get() as DataManagementState;
      
      let days_since_last_clear = 0;
      let last_clear = '从未清理';
      
      if (state.lastClearTime) {
        const lastClearDate = new Date(state.lastClearTime);
        const now = new Date();
        days_since_last_clear = Math.floor((now.getTime() - lastClearDate.getTime()) / (1000 * 60 * 60 * 24));
        last_clear = lastClearDate.toLocaleString();
      }
      
      return {
        totalClears: state.clearCount,
        last_clear,
        days_since_last_clear,
      };
    },
    
    // 获取备份配置摘要
    getBackupSummary: (): string => {
      const state = get() as DataManagementState;
      
      if (!state.autoBackupEnabled) {
        return '自动备份已禁用';
      }
      
      return `每 ${state.backupInterval} 小时备份一次，保留 ${state.maxBackupFiles} 个文件`;
    },
    
    // 获取清理选项摘要
    getClearOptionsSummary: (): string[] => {
      const state = get() as DataManagementState;
      const options: string[] = [];
      
      if (state.clearApiKeys) options.push('API Keys');
      if (state.clearUserSettings) options.push('用户设置');
      if (state.clearStrategyConfigs) options.push('策略配置');
      
      return options;
    },
  }),
  {
    backend: 'go', // 使用 Go 后端存储
  }
);

// 导出类型供其他地方使用
export type { DataManagementState };
