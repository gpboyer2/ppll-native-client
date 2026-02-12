/**
 * 预加载脚本类型定义
 */
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    api: {
      checkBackendStatus: () => Promise<{ running: boolean; pid: number | null }>
      restartBackend: () => Promise<{ success: boolean }>
      getBackendLogs: () => Promise<unknown[]>
      onBackendLog: (callback: (data: { type: string; message: string }) => void) => () => void
      getPlatform: () => NodeJS.Platform
      getVersion: () => NodeJS.ProcessVersions
      isDev: () => boolean
    }
  }
}

export {}
