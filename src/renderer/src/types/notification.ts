// 通知系统类型定义

// 导入通用类型
import type { UUID, Timestamp, KeyValue } from './common'

// 通知类型
export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

// 通知优先级
export enum NotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}

// 通知基础接口
export interface Notification {
  id: UUID
  type: NotificationType
  title: string
  message?: string
  timestamp: Timestamp
  read: boolean
  priority: NotificationPriority
  actions?: NotificationAction[]
  metadata?: KeyValue
}

// 通知操作
export interface NotificationAction {
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'danger'
  handler?: () => void | Promise<void>
}

// 系统通知
export interface SystemNotification extends Notification {
  category: 'system' | 'update' | 'security' | 'maintenance'
}

// 插件通知
export interface PluginNotification extends Notification {
  category: 'plugin'
  pluginId: string
  pluginName: string
}

// 交易通知
export interface TradingNotification extends Notification {
  category: 'trading'
  symbol?: string
  orderId?: string
  tradeId?: string
}

// 通知过滤器
export interface NotificationFilter {
  type?: NotificationType[]
  priority?: NotificationPriority[]
  category?: string[]
  dateRange?: {
    start: Timestamp
    end: Timestamp
  }
  read?: boolean
  keyword?: string
}

// 通知设置
export interface NotificationSettings {
  // 通知显示设置
  enable_sound: boolean
  enable_desktop: boolean
  enable_in_app: boolean

  // 自动清除设置
  auto_clear: boolean
  clear_after: number // 毫秒

  // 保留数量
  max_history: number

  // 类型设置
  type_settings: {
    [key in NotificationType]: {
      enabled: boolean
      sound?: string
      duration?: number
    }
  }
}

// 通知事件
export interface NotificationEvent {
  type: 'created' | 'updated' | 'read' | 'deleted' | 'cleared'
  notification: Notification
  timestamp: Timestamp
}
