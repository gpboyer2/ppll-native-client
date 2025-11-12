// 统一响应类型，前后端一致
export type Response<T> = {
  code: number
  msg: string
  data?: T
  traceID?: string
}

export const ok = <T>(data?: T): Response<T> => ({ code: 0, msg: 'OK', data })

