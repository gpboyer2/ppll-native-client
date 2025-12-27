/**
 * API 响应类型定义
 * 统一的后端响应格式
 */

/**
 * 标准响应结构
 */
export interface Response<T = any> {
  code: number
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
    code: 200,
    message: '操作成功',
    data
  }
}

/**
 * 创建错误响应
 * @param code 错误码
 * @param message 错误信息
 * @returns Response 对象
 */
export function error(code: number, message: string): Response<undefined> {
  return {
    code,
    message,
    data: undefined
  }
}
