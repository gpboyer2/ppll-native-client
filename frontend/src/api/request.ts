import { apiClient } from './client'
import { Response, ok } from '../core/response'
import { getStaticInfo } from '../stores/system-info-store'

/**
 * 获取 Node.js 服务 URL
 * 优先从 system-info-store 获取，如果未初始化则使用默认值
 */
function getNodejsUrl(): string {
  try {
    const staticInfo = getStaticInfo()
    if (staticInfo?.nodejsUrl) {
      return staticInfo.nodejsUrl
    }
  } catch {}
  // 默认回退到 54321 端口
  return 'http://localhost:54321'
}

/**
 * 请求包装器 - 统一处理后端响应格式
 * 自动从 Wails 获取 Node.js 服务 URL
 */
export class RequestWrapper {
  /**
   * 包装请求，统一处理响应格式
   */
  private static async wrapRequest<T>(request: Promise<any>): Promise<Response<T>> {
    try {
      const response = await request

      // 如果后端返回的是 Response 格式
      if (response && typeof response === 'object' && 'code' in response) {
        return response as Response<T>
      }

      // 如果是 fetch 的 ApiResponse 格式
      if (response && 'success' in response) {
        if (response.success) {
          return ok(response.data)
        } else {
          return {
            code: response.code || 500,
            msg: response.message || '请求失败',
            data: undefined
          }
        }
      }

      // 其他情况直接返回成功
      return ok(response)
    } catch (error: any) {
      return {
        code: error.code || 500,
        msg: error.message || '网络请求失败',
        data: undefined
      }
    }
  }

  /**
   * 发起原生 fetch 请求到 Node.js 服务
   */
  private static async fetchNodejs<T>(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<Response<T>> {
    const nodejsUrl = getNodejsUrl()
    const url = `${nodejsUrl}${path}`

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()

      if (result && typeof result === 'object' && 'code' in result) {
        return result as Response<T>
      }

      return ok(result)
    } catch (error: any) {
      return {
        code: 500,
        msg: error.message || '网络请求失败',
        data: undefined
      }
    }
  }

  /**
   * GET请求
   */
  static async get<T = any>(url: string, params?: Record<string, any>): Promise<Response<T>> {
    // 如果是 api/v1 开头的路径，使用 Node.js 服务
    if (url.startsWith('/api/v1/')) {
      return this.fetchNodejs<T>('GET', url, params)
    }
    return this.wrapRequest<T>(apiClient.get<T>(url, params))
  }

  /**
   * POST请求
   */
  static async post<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果是 api/v1 开头的路径，使用 Node.js 服务
    if (url.startsWith('/api/v1/')) {
      return this.fetchNodejs<T>('POST', url, data)
    }
    return this.wrapRequest<T>(apiClient.post<T>(url, data))
  }

  /**
   * PUT请求
   */
  static async put<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果是 api/v1 开头的路径，使用 Node.js 服务
    if (url.startsWith('/api/v1/')) {
      return this.fetchNodejs<T>('PUT', url, data)
    }
    return this.wrapRequest<T>(apiClient.put<T>(url, data))
  }

  /**
   * DELETE请求
   */
  static async delete<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果是 api/v1 开头的路径，使用 Node.js 服务
    if (url.startsWith('/api/v1/')) {
      return this.fetchNodejs<T>('DELETE', url, data)
    }
    return this.wrapRequest<T>(apiClient.delete<T>(url, { data }))
  }

  /**
   * PATCH请求
   */
  static async patch<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果是 api/v1 开头的路径，使用 Node.js 服务
    if (url.startsWith('/api/v1/')) {
      return this.fetchNodejs<T>('PATCH', url, data)
    }
    return this.wrapRequest<T>(apiClient.patch<T>(url, data))
  }

  /**
   * 文件上传
   */
  static async upload<T = any>(url: string, file: File): Promise<Response<T>> {
    return this.wrapRequest<T>(apiClient.upload<T>(url, file))
  }

  /**
   * 批量上传文件
   */
  static async uploadMultiple<T = any>(url: string, files: File[]): Promise<Response<T>> {
    return this.wrapRequest<T>(apiClient.uploadMultiple<T>(url, files))
  }
}

/**
 * 请求队列管理器
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private running = false
  private maxConcurrent = 5
  private currentRequests = 0

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 添加请求到队列
   */
  add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    if (this.running || this.currentRequests >= this.maxConcurrent) {
      return
    }

    this.running = true

    while (this.queue.length > 0 && this.currentRequests < this.maxConcurrent) {
      const request = this.queue.shift()
      if (request) {
        this.currentRequests++

        // 不等待请求完成，让请求并发执行
        request()
          .finally(() => {
            this.currentRequests--
            // 递归处理剩余请求
            setTimeout(() => this.process(), 0)
          })
      }
    }

    this.running = false
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = []
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.queue.length
  }

  /**
   * 获取当前请求数
   */
  get activeRequests(): number {
    return this.currentRequests
  }
}

/**
 * 请求缓存器
 */
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private defaultTTL = 5 * 60 * 1000 // 5分钟

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // 自动清理过期缓存
    setTimeout(() => {
      this.delete(key)
    }, ttl)
  }

  /**
   * 获取缓存
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 缓存装饰器
   */
  cached<T extends (...args: any[]) => any>(
    fn: T,
    getKey: (...args: Parameters<T>) => string,
    ttl: number = this.defaultTTL
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = getKey(...args)

      // 尝试从缓存获取
      const cached = this.get(key)
      if (cached !== null) {
        return cached
      }

      // 执行函数并缓存结果
      const result = await fn(...args)
      this.set(key, result, ttl)
      return result
    }) as T
  }
}

// 创建默认实例
export const requestQueue = new RequestQueue()
export const requestCache = new RequestCache()
