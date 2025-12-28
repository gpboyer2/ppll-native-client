/**
 * API模块统一导出
 *
 * 使用方式：
 * import { SystemApi, DatabaseApi, GridStrategyApi } from '@/api'
 * await SystemApi.getInfo()
 * await DatabaseApi.getTables()
 * await GridStrategyApi.optimize()
 */

// ============== API模块（按业务分类） ==============

// 系统管理
export { SystemApi } from './modules/system';
export { SystemLogsApi } from './modules/system-logs';

// 数据库管理
export { DatabaseApi } from './modules/database';

// 网格策略
export { GridStrategyApi } from './modules/grid-strategy';
export { GridTradeHistoryApi } from './modules/grid-trade-history';

// 币安相关
export { BinanceAccountApi } from './modules/binance-account';
export { BinanceApiKeyApi } from './modules/binance-api-key';
export { BinanceExchangeInfoApi } from './modules/binance-exchange-info';
export { BinanceApi } from './binance';

// 插件管理
export { PluginApi } from './modules/plugin';

// 通知管理
export { NotificationApi } from './modules/notification';

// 设置管理
export { SettingsApi } from './modules/settings';

// 数据分析
export { AnalyticsApi } from './modules/analytics';
export { DashboardApi } from './modules/dashboard';

// 日志管理
export { LoginLogsApi } from './modules/login-logs';
export { OperationLogsApi } from './modules/operation-logs';

// 订单管理
export { OrdersApi } from './modules/orders';
export { TemplateApi } from './modules/template';

// 权限管理
export { PermissionApi } from './modules/permission';

// 机器人
export { RobotApi } from './modules/robot';

// 资金流向
export { FundFlowsApi } from './modules/fund-flows';
export { SmartMoneyFlowApi } from './modules/smart-money-flow';

// 交易所信息
export { GateCoinListApi } from './modules/gate-coin-list';
export { MarkPriceApi } from './modules/mark-price';
export { TradingPairsComparisonApi } from './modules/trading-pairs-comparison';
export { InformationApi } from './modules/information';

// IP管理
export { BannedIpApi } from './modules/banned-ip';

// 聊天
export { ChatApi } from './modules/chat';

// Twitter
export { TwitterApi } from './modules/twitter';

// 工具
export { HelloApi } from './modules/hello';
export { UtilsApi } from './modules/utils';

// ============== 基础工具 ==============

// HTTP客户端
export { apiClient } from './client';

// 请求包装器
export { RequestWrapper, RequestQueue, RequestCache } from './request';

// WebSocket管理器
export { wsManager } from './websocket';

// ============== 类型定义 ==============
export * from './core/response';