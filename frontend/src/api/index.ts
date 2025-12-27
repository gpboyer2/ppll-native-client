/**
 * API模块统一导出
 *
 * 推荐使用方式：
 * import { SystemApi, DatabaseApi, AuthApi } from '@/api'
 * await SystemApi.getInfo()
 * await DatabaseApi.getTables()
 */

// ============== 新的模块化API（推荐） ==============
// 系统相关
export { SystemApi } from './modules/system'

// 认证相关
export { AuthApi } from './modules/auth'

// 数据库管理
export { DatabaseApi } from './modules/database'

// 插件管理
export { PluginApi } from './modules/plugin'

// 通知管理
export { NotificationApi } from './modules/notification'

// 设置管理
export { SettingsApi } from './modules/settings'

// 网格策略
export { GridStrategyApi } from './modules/grid-strategy'

// 数据分析
export { AnalyticsApi } from './modules/analytics'

// 封禁IP管理
export { BannedIpApi } from './modules/banned-ip'

// 币安账户
export { BinanceAccountApi } from './modules/binance-account'

// 币安API密钥
export { BinanceApiKeyApi } from './modules/binance-api-key'

// 币安交易所信息
export { BinanceExchangeInfoApi } from './modules/binance-exchange-info'

// 聊天
export { ChatApi } from './modules/chat'

// 仪表板
export { DashboardApi } from './modules/dashboard'

// 资金流向
export { FundFlowsApi } from './modules/fund-flows'

// Gate.io币种列表
export { GateCoinListApi } from './modules/gate-coin-list'

// 网格交易历史
export { GridTradeHistoryApi } from './modules/grid-trade-history'

// 信息查询
export { InformationApi } from './modules/information'

// 登录日志
export { LoginLogsApi } from './modules/login-logs'

// 标记价格
export { MarkPriceApi } from './modules/mark-price'

// 操作日志
export { OperationLogsApi } from './modules/operation-logs'

// 订单管理
export { OrdersApi } from './modules/orders'

// 权限管理
export { PermissionApi } from './modules/permission'

// 机器人
export { RobotApi } from './modules/robot'

// 智能资金流向
export { SmartMoneyFlowApi } from './modules/smart-money-flow'

// 系统日志
export { SystemLogsApi } from './modules/system-logs'

// 模板
export { TemplateApi } from './modules/template'

// 交易对对比
export { TradingPairsComparisonApi } from './modules/trading-pairs-comparison'

// Hello测试
export { HelloApi } from './modules/hello'

// 工具
export { UtilsApi } from './modules/utils'

// ============== 原有API（兼容保留） ==============
export * from './client'
export * from './request'
export * from './websocket'
export * from './endpoints'
export * from './binance'

// 导出API实例
export { apiClient } from './client'
export { wsManager } from './websocket'