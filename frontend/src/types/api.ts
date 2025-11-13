// API 相关类型定义

// API 基础配置
export interface ApiConfig {
  baseURL: string
  timeout: number
  retryCount?: number
  retryDelay?: number
}

// 请求方法
export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// 请求拦截器
export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>
}

// 响应拦截器
export interface ResponseInterceptor<T = any> {
  (response: ApiResponse<T>): ApiResponse<T> | Promise<ApiResponse<T>>
}

// 请求配置
export interface RequestConfig {
  url: string
  method: RequestMethod
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  withCredentials?: boolean
}

// API 响应包装
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  code?: number
}

// 错误响应
export interface ApiError {
  code: number
  message: string
  details?: any
}

// WebSocket 配置
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

// WebSocket 消息
export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
}