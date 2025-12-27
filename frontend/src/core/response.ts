// 统一响应类型，前后端一致
export type Response<T> = {
  status: 'success' | 'error'
  message: string
  data?: T
}

export const ok = <T>(data?: T): Response<T> => ({ status: 'success', message: '操作成功', data })

export const err = <T>(message: string): Response<T> => ({ status: 'error', message, data: undefined })

