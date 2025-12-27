// 通用类型定义

// 分页请求参数
export interface PageRequest {
  currentPage: number
  pageSize: number
}

// 分页信息
export interface Pagination {
  currentPage: number
  pageSize: number
  total: number
}

// 分页响应数据
export interface PageData<T> {
  list: T[]
  pagination: Pagination
}

// 通用键值对
export type KeyValue = Record<string, any>

// 时间戳类型
export type Timestamp = number

// UUID 类型
export type UUID = string

// 状态枚举
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
  Deleted = 'deleted'
}

// 排序方向
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

// 排序配置
export interface SortConfig {
  field: string
  direction: SortDirection
}

// 过滤配置
export interface FilterConfig {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin'
  value: any
}