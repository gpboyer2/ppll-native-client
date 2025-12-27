/**
 * API模块统一导出
 *
 * 推荐使用方式：
 * import { SystemApi, DatabaseApi, AuthApi } from '@/api'
 * await SystemApi.getInfo()
 * await DatabaseApi.getTables()
 */

// ============== 新的模块化API（推荐） ==============
export { SystemApi } from './modules/system'
export { AuthApi } from './modules/auth'
export { DatabaseApi } from './modules/database'
export { PluginApi } from './modules/plugin'
export { NotificationApi } from './modules/notification'
export { SettingsApi } from './modules/settings'
export { GridStrategyApi } from './modules/grid-strategy'

// ============== 原有API（兼容保留） ==============
export * from './client'
export * from './request'
export * from './websocket'
export * from './endpoints'
export * from './binance'

// 导出API实例
export { apiClient } from './client'
export { wsManager } from './websocket'