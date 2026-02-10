// 插件系统类型定义

// 导入通用类型
import type { Timestamp } from './common';

// 插件元数据
export interface PluginMetadata {
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

// 插件状态
export enum PluginStatus {
  Installed = 'installed',
  Active = 'active',
  Inactive = 'inactive',
  Error = 'error',
  Updating = 'updating'
}

// 插件配置项
export interface PluginConfigItem {
  key: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'file' | 'directory'
  label: string
  description?: string
  default?: any
  required?: boolean
  options?: Array<{ label: string; value: any }>
  validation?: {
    pattern?: string
    min?: number
    max?: number
  }
}

// 插件配置
export interface PluginConfig {
  [key: string]: any
}

// 插件信息
export interface PluginInfo {
  id: string
  metadata: PluginMetadata
  status: PluginStatus
  config?: PluginConfig
  configSchema?: PluginConfigItem[]
  installedAt: Timestamp
  updatedAt: Timestamp
  error?: string
}

// 插件依赖
export interface PluginDependency {
  name: string
  version: string
  optional?: boolean
}

// 插件 API 定义
export interface PluginAPI {
  // 生命周期钩子
  onInstall?(): Promise<void>
  onUninstall?(): Promise<void>
  onActivate?(): Promise<void>
  onDeactivate?(): Promise<void>
  onUpdate?(): Promise<void>

  // 功能接口
  init?(config?: PluginConfig): Promise<void>
  destroy?(): Promise<void>

  // 事件系统
  on?(event: string, handler: (...args: any[]) => void): void
  off?(event: string, handler: (...args: any[]) => void): void
  emit?(event: string, data?: any): void
}

// 插件注册表项
export interface PluginRegistry {
  [pluginId: string]: PluginInfo
}

// 插件市场信息
export interface PluginMarketItem {
  id: string
  metadata: PluginMetadata
  downloadUrl: string
  size: number
  downloads: number
  rating: number
  reviews: number
  tags: string[]
  compatibility: string[]
  lastUpdated: Timestamp
}