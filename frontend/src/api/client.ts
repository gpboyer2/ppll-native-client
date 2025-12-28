import { ApiConfig, RequestConfig, RequestMethod, ApiResponse, ApiError } from '../types'
import { useBinanceStore } from '../stores/binance-store'

/**
 * API客户端类
 */
export class ApiClient {
  private config: ApiConfig
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = []
  private responseInterceptors: Array<(response: ApiResponse) => ApiResponse | Promise<ApiResponse>> = []

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL: '',
      timeout: 10000,
      retryCount: 3,
      retryDelay: 1000,
      ...config
    }
  }

  /**
   * 配置API客户端
   */
  configure(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>): number {
    this.requestInterceptors.push(interceptor)
    return this.requestInterceptors.length - 1
  }

  /**
   * 移除请求拦截器
   */
  removeRequestInterceptor(index: number): void {
    this.requestInterceptors.splice(index, 1)
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>): number {
    this.responseInterceptors.push(interceptor)
    return this.responseInterceptors.length - 1
  }

  /**
   * 移除响应拦截器
   */
  removeResponseInterceptor(index: number): void {
    this.responseInterceptors.splice(index, 1)
  }

  /**
   * 构建完整URL
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    return `${this.config.baseURL}${url}`
  }

  /**
   * 执行请求拦截器
   */
  private async executeRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig)
    }
    return processedConfig
  }

  /**
   * 执行响应拦截器
   */
  private async executeResponseInterceptors(response: ApiResponse): Promise<ApiResponse> {
    let processedResponse = response
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse)
    }
    return processedResponse
  }

  /**
   * 发起HTTP请求
   */
  private async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    try {
      // 执行请求拦截器
      const processedConfig = await this.executeRequestInterceptors(config)

      // 构建请求选项
      const options: RequestInit = {
        method: processedConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...processedConfig.headers
        },
        credentials: processedConfig.withCredentials ? 'include' : 'same-origin'
      }

      // 处理请求体
      if (processedConfig.data && processedConfig.method !== RequestMethod.GET) {
        options.body = JSON.stringify(processedConfig.data)
      }

      // 构建URL（包含查询参数）
      let url = this.buildUrl(processedConfig.url)
      if (processedConfig.params) {
        const searchParams = new URLSearchParams()
        Object.entries(processedConfig.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
        const queryString = searchParams.toString()
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString
        }
      }

      // 设置超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), processedConfig.timeout || this.config.timeout)
      options.signal = controller.signal

      // 发起请求
      const response = await fetch(url, options)
      clearTimeout(timeoutId)

      // 解析响应
      let responseData: any
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      // 构建响应对象
      const apiResponse: ApiResponse<T> = {
        success: response.ok,
        data: responseData,
        code: response.status,
        message: response.statusText
      }

      // 执行响应拦截器
      return await this.executeResponseInterceptors(apiResponse)

    } catch (error: any) {
      // 处理错误
      const apiError: ApiError = {
        code: error.name === 'AbortError' ? 408 : 500,
        message: error.message || '请求失败'
      }

      // 如果启用重试且错误允许重试
      const retryCount = (config as any).__retryCount || 0
      if (retryCount < (this.config.retryCount || 0) && this.shouldRetry(error)) {
        // 延迟后重试
        await this.delay((config as any).__retryDelay || this.config.retryDelay || 1000)
        const retryConfig = {
          ...config,
          __retryCount: retryCount + 1,
          __retryDelay: (config as any).__retryDelay || this.config.retryDelay || 1000
        }
        return this.request<T>(retryConfig)
      }

      return {
        success: false,
        data: null as any,
        code: apiError.code,
        message: apiError.message
      }
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误或超时错误可以重试
    return error.name === 'TypeError' || error.name === 'AbortError'
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, params?: Record<string, any>, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: RequestMethod.GET,
      params,
      ...config
    })
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: RequestMethod.POST,
      data,
      ...config
    })
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: RequestMethod.PUT,
      data,
      ...config
    })
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: RequestMethod.DELETE,
      ...config
    })
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: RequestMethod.PATCH,
      data,
      ...config
    })
  }

  /**
   * 文件上传
   */
  async upload<T = any>(url: string, file: File, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<T>({
      url,
      method: RequestMethod.POST,
      data: formData,
      headers: {
        // 不设置Content-Type，让浏览器自动设置（包含boundary）
      },
      ...config
    })
  }

  /**
   * 批量上传文件
   */
  async uploadMultiple<T = any>(url: string, files: File[], config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file)
    })

    return this.request<T>({
      url,
      method: RequestMethod.POST,
      data: formData,
      headers: {},
      ...config
    })
  }
}

// 创建默认API客户端实例
export const apiClient = new ApiClient()

// 添加请求拦截器，自动注入当前激活的 API Key
apiClient.addRequestInterceptor((config: RequestConfig) => {
  // 只对 /api/v1/ 开头的接口注入 API Key
  if (config.url.startsWith('/api/v1/')) {
    const activeApiKey = useBinanceStore.getState().getActiveApiKey()

    if (activeApiKey) {
      // 自动注入 apiKey 和 apiSecret，不覆盖已存在的值
      config.data = {
        ...config.data,
        apiKey: activeApiKey.apiKey,
        apiSecret: activeApiKey.secretKey,
      }
    }
  }

  return config
})