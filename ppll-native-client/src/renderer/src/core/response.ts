// 统一响应类型，前后端一致
export type Response<T> = {
  status: 'success' | 'error'
  message: string
  datum: T
}

export const ok = <T>(datum: T): Response<T> => ({ status: 'success', message: '操作成功', datum })

export const err = <T>(message: string): Response<T> => ({
  status: 'error',
  message,
  datum: undefined as any
})
