// 币安合约交易相关类型定义

// API 凭证（使用下划线命名，与后端保持一致）
export interface BinanceCredentials {
  api_key: string
  secret_key: string
}

// 统一API响应结构
export interface BinanceApiResponse<T = any> {
  status: 'success' | 'error'
  code: number
  message?: string
  data?: T
  fromCache?: boolean
}

// 错误响应
export interface BinanceErrorResponse {
  status: 'error'
  code: number
  message: string
}

// ==================== 账户相关 ====================

// 账户详情请求
export type AccountInfoRequest = BinanceCredentials;

// 账户详情响应数据（具体结构根据币安API返回调整）
export interface AccountInfo {
  // 账户余额信息
  total_wallet_balance?: string
  total_unrealized_profit?: string
  total_margin_balance?: string
  total_position_initial_margin?: string
  total_open_order_initial_margin?: string
  total_cross_wallet_balance?: string
  total_cross_un_pnl?: string
  available_balance?: string
  max_withdraw_amount?: string

  // 资产列表
  assets?: AccountAsset[]

  // 持仓列表
  positions?: AccountPosition[]

  // 其他账户信息
  can_trade?: boolean
  can_deposit?: boolean
  can_withdraw?: boolean
  fee_tier?: number
  update_time?: number
}

// 账户资产
export interface AccountAsset {
  asset: string
  wallet_balance: string
  unrealized_profit: string
  margin_balance: string
  maint_margin: string
  initial_margin: string
  position_initial_margin: string
  open_order_initial_margin: string
  cross_wallet_balance: string
  cross_un_pnl: string
  available_balance: string
  max_withdraw_amount: string
  margin_available: boolean
  update_time: number
}

// 账户持仓
export interface AccountPosition {
  symbol: string
  initial_margin: string
  maint_margin: string
  unrealized_profit: string
  position_initial_margin: string
  open_order_initial_margin: string
  leverage: string
  isolated: boolean
  entry_price: string
  max_notional: string
  position_side: 'BOTH' | 'LONG' | 'SHORT'
  position_amt: string
  notional: string
  isolated_wallet: string
  update_time: number
  bid_notional: string
  ask_notional: string
}

// ==================== 建仓相关 ====================

// 建仓位置配置
export interface PositionConfig {
  symbol: string
  long_amount: number
  short_amount: number
}

// 自定义建仓请求
export interface CustomBuildPositionRequest extends BinanceCredentials {
  positions: PositionConfig[]
}

// 操作结果
export interface OperationResult {
  success: boolean
  processed_count: number
  total_positions: number
  results: string[]
}

// ==================== 平仓相关 ====================

// 批量平仓请求
export interface BatchClosePositionRequest extends BinanceCredentials {
  positions: string[] // 交易对列表
}

// 平仓响应数据
export interface ClosePositionResponse {
  message: string
}

// ==================== 通用类型 ====================

// 交易对
export type TradingPair = string

// 订单方向
export type OrderSide = 'BUY' | 'SELL'

// 持仓方向
export type PositionSideBinance = 'BOTH' | 'LONG' | 'SHORT'

// 订单类型
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'TAKE_PROFIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET'

// 订单状态
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'
