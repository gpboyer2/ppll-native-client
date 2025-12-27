import { notifications } from '@mantine/notifications'
import type { Response } from '../core/response'

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public status: 'error',
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
export function showError(message: string, options?: NotifyOptions) {
  notifications.show({
    color: 'red',
    title: options?.title || '操作失败',
    message: options?.description || message,
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
 * - 如果 status === 'error'，显示错误提示并抛出异常
 * - 返回 data
 */
export function handleResponse<T>(response: Response<T>, options?: NotifyOptions): T {
  if (response.status === 'error') {
    if (options?.show !== false) {
      showError(response.message, options)
    }
    throw new ApiError(response.status, response.message, response.traceID)
  }
  return response.data as T
}

/**
 * 静默处理 API 响应（不显示提示）
 * - 如果 status === 'error'，抛出异常但不显示提示
 * - 返回 data
 */
export function handleResponseSilent<T>(response: Response<T>): T {
  if (response.status === 'error') {
    throw new ApiError(response.status, response.message, response.traceID)
  }
  return response.data as T
}

/**
 * 捕获并显示错误
 */
export function catchError(error: unknown, options?: NotifyOptions): void {
  if (error instanceof ApiError) {
    showError(error.message, options)
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
