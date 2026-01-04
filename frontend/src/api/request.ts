import { apiClient } from './client';
import { Response, ok } from '../core/response';
import { getStaticInfo } from '../stores/system-info-store';
import { useBinanceStore } from '../stores/binance-store';
import dayjs from 'dayjs';

/**
 * 获取 Node.js 服务 URL
 * 优先从 system-info-store 获取，如果未初始化则使用默认值
 */
function getNodejsUrl(): string {
  try {
    const staticInfo = getStaticInfo();
    if (staticInfo?.nodejs_url) {
      return staticInfo.nodejs_url;
    }
  } catch {
    // 静默失败，使用默认值
  }
  // 默认回退到 54321 端口
  return 'http://localhost:54321';
}

/**
 * 请求日志工具
 */
class RequestLogger {
  private static requestId = 0;
  private static readonly ENABLED = true; // 可通过环境变量控制

  /**
   * 过滤敏感字段
   */
  private static filterSensitive(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'pwd', 'token', 'secret', 'api_key', 'secret_key', 'authorization'];
    const filtered = { ...data };

    for (const key of Object.keys(filtered)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        filtered[key] = '***FILTERED***';
      } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
        filtered[key] = this.filterSensitive(filtered[key]);
      }
    }

    return filtered;
  }

  /**
   * 记录请求开始
   */
  static logStart(method: string, url: string, params?: any, data?: any): number {
    if (!this.ENABLED) return 0;

    const requestId = ++this.requestId;
    const timestamp = dayjs().format('HH:mm:ss.SSS');

    console.log(
      `%c[${timestamp}] %c[请求 #${requestId}]`,
      'color: #999',
      'color: #0066cc; font-weight: bold',
      `\n${method} ${url}`
    );

    console.log(`%c #${requestId} Params:`, 'color: #666; font-weight: bold', this.truncateLog(params));
    console.log(`%c #${requestId} Body:`, 'color: #666; font-weight: bold', this.truncateLog(data));

    return requestId;
  }

  /**
   * 记录请求成功
   */
  static logSuccess(requestId: number, response: any, startTime: number): void {
    if (!this.ENABLED) return;

    const duration = Date.now() - startTime;
    const timestamp = dayjs().format('HH:mm:ss.SSS');

    console.log(
      `%c[${timestamp}] %c[响应 #${requestId}]`,
      'color: #999',
      'color: #009966; font-weight: bold',
      `耗时: ${duration}ms`
    );

    if (response) {
      const logData: any = {};

      if (response.status !== undefined) {
        logData.status = response.status;
      }
      if (response.message) {
        logData.message = response.message;
      }
      if (response.datum !== undefined) {
        logData.datum = this.filterSensitive(response.datum);
      }

      console.log(`#${requestId} API 响应:`, this.truncateLog(logData));
    }
  }

  /**
   * 记录请求失败
   */
  static logError(requestId: number, error: any, startTime: number): void {
    if (!this.ENABLED) return;

    const duration = Date.now() - startTime;
    const timestamp = dayjs().format('HH:mm:ss.SSS');

    console.error(
      `%c[${timestamp}] %c[错误 #${requestId}]`,
      'color: #999',
      'color: #cc0000; font-weight: bold',
      `耗时: ${duration}ms`,
      '\n错误:',
      error
    );
  }

  /**
   * 截断日志内容到指定长度
   */
  private static truncateLog(data: any, maxLength: number = 1000): string {
    try {
      const logStr = JSON.stringify(data, null, 2);
      if (logStr.length <= maxLength) {
        return logStr;
      }
      return logStr.substring(0, maxLength) + `\n... (省略 ${logStr.length - maxLength} 字符)`;
    } catch {
      return data;
    }
  }
}


/**
 * 请求包装器 - 统一处理后端响应格式
 * 自动从 Wails 获取 Node.js 服务 URL
 */
export class RequestWrapper {
  // 跟踪当前的 baseURL 状态
  private static currentBaseURL = '';

  /**
   * 不需要 API Key 的 URL 列表（API Key 管理接口）
   */
  private static readonly NO_API_KEY_URLS = [
    '/api/v1/binance-api-key/query',
    '/api/v1/binance-api-key/create',
    '/api/v1/binance-api-key/update',
    '/api/v1/binance-api-key/delete'
  ];

  /**
   * 判断是否应该使用 Node.js 服务
   */
  private static shouldUseNodejs(url: string): boolean {
    return url.startsWith('/api/v1/');
  }

  /**
   * 判断 URL 是否需要 API Key
   */
  private static needsApiKey(url: string): boolean {
    return this.shouldUseNodejs(url) && !this.NO_API_KEY_URLS.some(noApiKeyUrl => url.startsWith(noApiKeyUrl));
  }

  /**
   * 获取当前激活的 API Key 参数
   * 从 binance-store 获取当前激活的 API Key
   */
  private static getApiKeyParams(): Record<string, string> {
    try {
      const currentKey = useBinanceStore.getState().getCurrentApiKey();
      if (currentKey) {
        return {
          api_key: currentKey.api_key,
          secret_key: currentKey.secret_key
        };
      }
    } catch (error) {
      console.warn('[RequestWrapper] 获取 API Key 失败:', error);
    }
    return {};
  }

  /**
   * 包装请求，统一处理响应格式
   * 后端统一返回 {status: 'success'|'error', message: string, data: any}
   */
  private static async wrapRequest<T>(
    request: Promise<any>,
    requestId: number,
    startTime: number
  ): Promise<Response<T>> {
    try {
      const apiResponse = await request;

      // 记录响应日志
      RequestLogger.logSuccess(requestId, apiResponse, startTime);

      // apiClient 返回 ApiResponse<T> 格式: {success, data, code, message}
      // 其中 data 字段才是后端返回的标准 Response<T> 格式
      return apiResponse.data as Response<T>;
    } catch (error: any) {
      // 记录错误日志
      RequestLogger.logError(requestId, error, startTime);

      return {
        status: 'error',
        message: error.message || '网络请求失败',
        data: undefined
      };
    }
  }

  /**
   * 通用请求方法 - 自动处理 Node.js 服务的 URL 配置
   */
  private static async request<T>(
    method: string,
    url: string,
    requestFn: () => Promise<any>,
    params?: any,
    data?: any
  ): Promise<Response<T>> {
    // 记录请求开始日志
    const requestId = RequestLogger.logStart(method, url, params, data);
    const startTime = Date.now();

    const originalBaseURL = this.currentBaseURL;

    if (this.shouldUseNodejs(url)) {
      const nodejsUrl = getNodejsUrl();
      this.currentBaseURL = nodejsUrl;
      apiClient.configure({ base_url: nodejsUrl });
    }

    try {
      // 将 requestId 存储到 apiClient 实例上，供拦截器使用
      ;(apiClient as any).__requestId = requestId;
      const result = await this.wrapRequest<T>(requestFn(), requestId, startTime);
      return result;
    } finally {
      if (this.shouldUseNodejs(url)) {
        this.currentBaseURL = originalBaseURL;
        apiClient.configure({ base_url: originalBaseURL });
      }
      // 清理 requestId
      ;(apiClient as any).__requestId = undefined;
    }
  }

  /**
   * GET请求
   */
  static async get<T = any>(url: string, params?: Record<string, any>): Promise<Response<T>> {
    // 如果需要 API Key，自动添加（手动传递的优先）
    const mergedParams = this.needsApiKey(url)
      ? { ...this.getApiKeyParams(), ...params }
      : params;
    return this.request<T>('GET', url, () => apiClient.get<T>(url, mergedParams), mergedParams);
  }

  /**
   * POST请求
   */
  static async post<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果需要 API Key，自动添加到请求体（手动传递的优先）
    const mergedData = this.needsApiKey(url)
      ? { ...this.getApiKeyParams(), ...data }
      : data;
    return this.request<T>('POST', url, () => apiClient.post<T>(url, mergedData), undefined, mergedData);
  }

  /**
   * PUT请求
   */
  static async put<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果需要 API Key，自动添加到请求体（手动传递的优先）
    const mergedData = this.needsApiKey(url)
      ? { ...this.getApiKeyParams(), ...data }
      : data;
    return this.request<T>('PUT', url, () => apiClient.put<T>(url, mergedData), undefined, mergedData);
  }

  /**
   * DELETE请求
   */
  static async delete<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果需要 API Key，自动添加到请求体（手动传递的优先）
    const mergedData = this.needsApiKey(url)
      ? { ...this.getApiKeyParams(), ...data }
      : data;
    return this.request<T>('DELETE', url, () => apiClient.delete<T>(url, { data: mergedData }), undefined, mergedData);
  }

  /**
   * PATCH请求
   */
  static async patch<T = any>(url: string, data?: any): Promise<Response<T>> {
    // 如果需要 API Key，自动添加到请求体（手动传递的优先）
    const mergedData = this.needsApiKey(url)
      ? { ...this.getApiKeyParams(), ...data }
      : data;
    return this.request<T>('PATCH', url, () => apiClient.patch<T>(url, mergedData), undefined, mergedData);
  }

  /**
   * 文件上传
   */
  static async upload<T = any>(url: string, file: File): Promise<Response<T>> {
    const requestId = RequestLogger.logStart('UPLOAD', url, undefined, { fileName: file.name, size: file.size });
    const startTime = Date.now();

    return this.wrapRequest<T>(apiClient.upload<T>(url, file), requestId, startTime);
  }

  /**
   * 批量上传文件
   */
  static async uploadMultiple<T = any>(url: string, files: File[]): Promise<Response<T>> {
    const fileInfos = files.map(f => ({ name: f.name, size: f.size }));
    const requestId = RequestLogger.logStart('UPLOAD-MULTI', url, undefined, { files: fileInfos });
    const startTime = Date.now();

    return this.wrapRequest<T>(apiClient.uploadMultiple<T>(url, files), requestId, startTime);
  }

  /**
   * 下载文件（返回 blob）
   */
  static async downloadBlob(url: string, filename?: string): Promise<void> {
    const nodejsUrl = getNodejsUrl();
    const fullUrl = url.startsWith('/api/v1/') ? `${nodejsUrl}${url}` : url;

    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || `download-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }
}

/**
 * 请求队列管理器
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = false;
  private maxConcurrent = 5;
  private currentRequests = 0;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加请求到队列
   */
  add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    if (this.running || this.currentRequests >= this.maxConcurrent) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0 && this.currentRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (request) {
        this.currentRequests++;

        // 不等待请求完成，让请求并发执行
        request()
          .finally(() => {
            this.currentRequests--;
            // 递归处理剩余请求
            setTimeout(() => this.process(), 0);
          });
      }
    }

    this.running = false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * 获取当前请求数
   */
  get activeRequests(): number {
    return this.currentRequests;
  }
}

/**
 * 请求缓存器
 */
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // 自动清理过期缓存
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  /**
   * 获取缓存
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
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
      const key = getKey(...args);

      // 尝试从缓存获取
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      // 执行函数并缓存结果
      const result = await fn(...args);
      this.set(key, result, ttl);
      return result;
    }) as T;
  }
}

// 创建默认实例
export const requestQueue = new RequestQueue();
export const requestCache = new RequestCache();
