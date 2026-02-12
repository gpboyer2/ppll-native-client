// 通知结构（与后端一致）
export type Notification = {
  id: string
  level: 'info' | 'warn' | 'error' | 'success'
  title: string
  content: string
  ts: number
  ttlSeconds?: number
}

// 简易状态：仅维护一个 list
const state = {
  list: [] as Notification[]
}

export const notifications = {
  get list() {
    return state.list
  },
  init() {
    // Electron 架构下暂不支持通知功能
    console.warn('通知系统暂不可用')
  }
}
