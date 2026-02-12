import { createPersistedStore } from '../lib/createPersistedStore'

// 数据管理相关的类型定义
interface DataManagementState {
  // 清理历史记录
  last_clear_time: string | null
  clear_count: number

  // 数据备份设置
  auto_backup_enabled: boolean
  backup_interval: number // 小时
  max_backup_files: number

  // 清理偏好设置
  confirm_before_clear: boolean
  clear_api_keys: boolean
  clear_user_settings: boolean
  clear_strategy_configs: boolean
}

// 创建数据管理 Store
export const useDataManagementStore = createPersistedStore(
  'data-management', // 持久化存储的键名
  (set, get) => ({
    // ===== State =====
    last_clear_time: null,
    clear_count: 0,

    auto_backup_enabled: false,
    backup_interval: 24, // 24小时
    max_backup_files: 5,

    confirm_before_clear: true,
    clear_api_keys: true,
    clear_user_settings: true,
    clear_strategy_configs: true,

    // ===== Actions =====

    // 记录清理操作
    recordClearOperation: () => {
      const now = new Date().toISOString()
      set((state: DataManagementState) => ({
        ...state,
        last_clear_time: now,
        clear_count: state.clear_count + 1
      }))
    },

    // 备份设置 Actions
    toggleAutoBackup: () => {
      set((state: DataManagementState) => ({
        ...state,
        auto_backup_enabled: !state.auto_backup_enabled
      }))
    },

    setBackupInterval: (hours: number) => {
      const clamped_hours = Math.max(1, Math.min(168, hours)) // 1小时到1周
      set((state: DataManagementState) => ({
        ...state,
        backup_interval: clamped_hours
      }))
    },

    setMaxBackupFiles: (count: number) => {
      const clamped_count = Math.max(1, Math.min(50, count))
      set((state: DataManagementState) => ({
        ...state,
        max_backup_files: clamped_count
      }))
    },

    // 清理偏好 Actions
    toggleConfirmBeforeClear: () => {
      set((state: DataManagementState) => ({
        ...state,
        confirm_before_clear: !state.confirm_before_clear
      }))
    },

    setClearOptions: (options: {
      clear_api_keys?: boolean
      clear_user_settings?: boolean
      clear_strategy_configs?: boolean
    }) => {
      set((state: DataManagementState) => ({
        ...state,
        ...options
      }))
    },

    // 批量更新设置
    updateSettings: (settings: Partial<DataManagementState>) => {
      set((state: DataManagementState) => ({ ...state, ...settings }))
    },

    // 重置为默认设置
    resetToDefaults: () => {
      set(() => ({
        last_clear_time: null,
        clear_count: 0,
        auto_backup_enabled: false,
        backup_interval: 24,
        max_backup_files: 5,
        confirm_before_clear: true,
        clear_api_keys: true,
        clear_user_settings: true,
        clear_strategy_configs: true
      }))
    },

    // 获取清理统计信息
    getClearStats: (): {
      totalClears: number
      last_clear: string
      days_since_last_clear: number
    } => {
      const state = get() as DataManagementState

      let days_since_last_clear = 0
      let last_clear = '从未清理'

      if (state.last_clear_time) {
        const lastClearDate = new Date(state.last_clear_time)
        const now = new Date()
        days_since_last_clear = Math.floor(
          (now.getTime() - lastClearDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        last_clear = lastClearDate.toLocaleString()
      }

      return {
        totalClears: state.clear_count,
        last_clear,
        days_since_last_clear
      }
    },

    // 获取备份配置摘要
    getBackupSummary: (): string => {
      const state = get() as DataManagementState

      if (!state.auto_backup_enabled) {
        return '自动备份已禁用'
      }

      return `每 ${state.backup_interval} 小时备份一次，保留 ${state.max_backup_files} 个文件`
    },

    // 获取清理选项摘要
    getClearOptionsSummary: (): string[] => {
      const state = get() as DataManagementState
      const options: string[] = []

      if (state.clear_api_keys) options.push('API Keys')
      if (state.clear_user_settings) options.push('用户设置')
      if (state.clear_strategy_configs) options.push('策略配置')

      return options
    }
  })
)

// 导出类型供其他地方使用
export type { DataManagementState }
