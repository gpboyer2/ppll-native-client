// 币安合约交易相关类型定义

// API 凭证
export interface BinanceCredentials {
  apiKey: string
  apiSecret: string
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
export interface AccountInfoRequest extends BinanceCredentials {}

// 账户详情响应数据（具体结构根据币安API返回调整）
export interface AccountInfo {
  // 账户余额信息
  totalWalletBalance?: string
  totalUnrealizedProfit?: string
  totalMarginBalance?: string
  totalPositionInitialMargin?: string
  totalOpenOrderInitialMargin?: string
  totalCrossWalletBalance?: string
  totalCrossUnPnl?: string
  availableBalance?: string
  maxWithdrawAmount?: string
  
  // 资产列表
  assets?: AccountAsset[]
  
  // 持仓列表
  positions?: AccountPosition[]
  
  // 其他账户信息
  canTrade?: boolean
  canDeposit?: boolean
  canWithdraw?: boolean
  feeTier?: number
  updateTime?: number
}

// 账户资产
export interface AccountAsset {
  asset: string
  walletBalance: string
  unrealizedProfit: string
  marginBalance: string
  maintMargin: string
  initialMargin: string
  positionInitialMargin: string
  openOrderInitialMargin: string
  crossWalletBalance: string
  crossUnPnl: string
  availableBalance: string
  maxWithdrawAmount: string
  marginAvailable: boolean
  updateTime: number
}

// 账户持仓
export interface AccountPosition {
  symbol: string
  initialMargin: string
  maintMargin: string
  unrealizedProfit: string
  positionInitialMargin: string
  openOrderInitialMargin: string
  leverage: string
  isolated: boolean
  entryPrice: string
  maxNotional: string
  positionSide: 'BOTH' | 'LONG' | 'SHORT'
  positionAmt: string
  notional: string
  isolatedWallet: string
  updateTime: number
  bidNotional: string
  askNotional: string
}

// ==================== 建仓相关 ====================

// 建仓位置配置
export interface PositionConfig {
  symbol: string
  longAmount: number
  shortAmount: number
}

// 自定义建仓请求
export interface CustomBuildPositionRequest extends BinanceCredentials {
  positions: PositionConfig[]
}

// 操作结果
export interface OperationResult {
  success: boolean
  processedCount: number
  totalPositions: number
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
export type PositionSide = 'BOTH' | 'LONG' | 'SHORT'

// 订单类型
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'TAKE_PROFIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET'

// 订单状态
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'
