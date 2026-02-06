// 币安合约交易相关类型定义

// API 凭证（使用下划线命名，与后端保持一致）
export interface BinanceCredentials {
  api_key: string
  api_secret: string
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

// 账户详情响应数据（币安API返回的camelCase字段）
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

// 账户资产（币安API返回的camelCase字段）
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

// 账户持仓（币安API返回的camelCase字段）
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

// ==================== 交易所信息 ====================

// 交易所过滤器类型
export type FilterType = 'PRICE_FILTER' | 'LOT_SIZE' | 'MIN_NOTIONAL' | 'MAX_NUM_ORDERS' | 'MAX_NUM_ALGO_ORDERS' | 'PERCENT_PRICE' | 'MARKET_LOT_SIZE'

// 基础过滤器接口
export interface BinanceFilter {
  filterType: FilterType
}

// 价格过滤器
export interface PriceFilter extends BinanceFilter {
  filterType: 'PRICE_FILTER'
  minPrice: string
  maxPrice: string
  tickSize: string
}

// 数量过滤器
export interface LotSizeFilter extends BinanceFilter {
  filterType: 'LOT_SIZE'
  minQty: string
  maxQty: string
  stepSize: string
}

// 最小名义价值过滤器
export interface MinNotionalFilter extends BinanceFilter {
  filterType: 'MIN_NOTIONAL'
  notional: string
}

// 联合过滤器类型
export type ExchangeFilter = PriceFilter | LotSizeFilter | MinNotionalFilter

// 交易对符号信息
export interface BinanceSymbol {
  symbol: string
  baseAsset: string
  quoteAsset: string
  status: string
  contractType?: string
  deliveryDate?: number
  onboardDate?: number
  filters: ExchangeFilter[]
}

// 交易所信息
export interface ExchangeInfo {
  timezone: string
  serverTime: number
  symbols: BinanceSymbol[]
}

// 策略参数验证结果
export interface StrategyValidationResult {
  isValid: boolean
  message?: string
  field?: string
  suggestion?: string
}
