/**
 * API 响应类型定义
 * 统一的后端响应格式
 */

/**
 * 标准响应结构
 */
export interface Response<T = any> {
  status: 'success' | 'error'
  message: string
  data: T
}

/**
 * 创建成功响应
 * @param data 响应数据
 * @returns Response 对象
 */
export function ok<T>(data: T): Response<T> {
  return {
    status: 'success',
    message: '操作成功',
    data
  };
}

/**
 * 创建错误响应
 * @param message 错误信息
 * @returns Response 对象
 */
export function error(message: string): Response<null> {
  return {
    status: 'error',
    message,
    data: null
  };
}
