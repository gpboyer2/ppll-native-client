import { notifications } from '@mantine/notifications'
import type { Response } from '../core/response'

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public traceID?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 错误提示配置
 */
interface NotifyOptions {
  title?: string
  description?: string
  show?: boolean
}

/**
 * 默认错误消息映射
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请重新登录',
  403: '没有权限访问',
  404: '请求的资源不存在',
  408: '请求超时',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂时不可用',
  504: '网关超时'
}

/**
 * 获取错误消息
 */
function getErrorMessage(code: number, message?: string): string {
  return message || DEFAULT_ERROR_MESSAGES[code] || `请求失败 (错误码: ${code})`
}

/**
 * 显示成功提示
 */
export function showSuccess(message: string, options?: NotifyOptions) {
  notifications.show({
    color: 'green',
    title: options?.title || '操作成功',
    message: options?.description || message,
    withBorder: true
  })
}

/**
 * 显示错误提示
 */
export function showError(code: number, message: string, options?: NotifyOptions) {
  const errorMessage = getErrorMessage(code, message)
  notifications.show({
    color: 'red',
    title: options?.title || '操作失败',
    message: options?.description || errorMessage,
    withBorder: true
  })
}

/**
 * 显示警告提示
 */
export function showWarning(message: string, options?: NotifyOptions) {
  notifications.show({
    color: 'yellow',
    title: options?.title || '警告',
    message: options?.description || message,
    withBorder: true
  })
}

/**
 * 处理 API 响应
 * - 如果 code !== 200，显示错误提示并抛出异常
 * - 返回 data 或 undefined
 */
export function handleResponse<T>(response: Response<T>, options?: NotifyOptions): T {
  if (response.code !== 200) {
    if (options?.show !== false) {
      showError(response.code, response.message, options)
    }
    throw new ApiError(response.code, response.message, response.traceID)
  }
  return response.data as T
}

/**
 * 静默处理 API 响应（不显示提示）
 * - 如果 code !== 200，抛出异常但不显示提示
 * - 返回 data 或 undefined
 */
export function handleResponseSilent<T>(response: Response<T>): T {
  if (response.code !== 200) {
    throw new ApiError(response.code, response.message, response.traceID)
  }
  return response.data as T
}

/**
 * 捕获并显示错误
 */
export function catchError(error: unknown, options?: NotifyOptions): void {
  if (error instanceof ApiError) {
    showError(error.code, error.message, options)
  } else if (error instanceof Error) {
    notifications.show({
      color: 'red',
      title: options?.title || '操作失败',
      message: error.message,
      withBorder: true
    })
  } else {
    notifications.show({
      color: 'red',
      title: options?.title || '操作失败',
      message: '未知错误',
      withBorder: true
    })
  }
}

/**
 * 包装异步函数，自动处理错误
 */
export async function withErrorHandling<T>(
  fn: () => Promise<Response<T>>,
  options?: NotifyOptions
): Promise<T | undefined> {
  try {
    return handleResponse(await fn(), options)
  } catch (error) {
    if (options?.show !== false) {
      catchError(error, options)
    }
    return undefined
  }
}
