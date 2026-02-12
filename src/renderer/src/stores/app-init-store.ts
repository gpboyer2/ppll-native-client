/**
 * 全局应用初始化 Store
 *
 * 管理应用启动时的初始化状态，等待 Wails 客户端或 Node.js 后端服务就绪
 */
import { create } from 'zustand'
import { waitForAppReady } from '../utils/wails-env'

interface AppInitState {
  // 应用环境是否已就绪（Wails 或 Node.js 任一可用）
  appReady: boolean
  // 是否正在初始化
  initializing: boolean
  // 初始化错误信息
  error: string | null
  // 初始化进度（0-100）
  progress: number

  // 开始初始化
  init: () => Promise<void>
}

export const useAppInitStore = create<AppInitState>((set, get) => ({
  appReady: false,
  initializing: false,
  error: null,
  progress: 0,

  init: async () => {
    const { initializing } = get()

    // 避免重复初始化
    if (initializing) {
      return
    }

    set({ initializing: true, error: null, progress: 10 })

    try {
      // 等待应用环境就绪（Wails 或 Node.js 任一可用）
      await waitForAppReady(
        2000, // 每 2 秒检查一次
        60000, // 最多等待 60 秒
        'http://localhost:54321' // Node.js 服务地址（浏览器模式默认端口）
      )

      set({ appReady: true, progress: 100 })
    } catch (error) {
      const error_message = error instanceof Error ? error.message : '未知错误'
      console.error('应用初始化失败:', error_message)
      set({ error: error_message })
    } finally {
      set({ initializing: false })
    }
  }
}))
