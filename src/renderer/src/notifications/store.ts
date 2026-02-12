// 注意：wailsjs 生成在 frontend/wailsjs，因此从 src/notifications 需要 ../../
import { EventsOn } from '../wailsjs/runtime'

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
    try {
      // 检查 Wails 运行时是否可用
      if (typeof window !== 'undefined' && (window as any).runtime) {
        EventsOn('notify:push', (n: Notification) => {
          state.list = [n, ...state.list]
        })
        EventsOn('notify:dismiss', ({ id }: { id: string }) => {
          state.list = state.list.filter((x) => x.id !== id)
        })
      } else {
        console.warn('Wails 运行时未就绪，通知系统暂时不可用')
      }
    } catch (error) {
      console.error('初始化通知系统失败:', error)
    }
  }
}
