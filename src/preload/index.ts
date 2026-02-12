/**
 * Electron 预加载脚本
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  checkBackendStatus: () => ipcRenderer.invoke('check-backend-status'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  getBackendLogs: () => ipcRenderer.invoke('get-backend-logs'),
  onBackendLog: (callback: (data: { type: string; message: string }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { type: string; message: string }
    ) => {
      callback(data)
    }
    ipcRenderer.on('backend-log', listener)
    return () => {
      ipcRenderer.removeListener('backend-log', listener)
    }
  },
  getPlatform: () => process.platform,
  getVersion: () => process.versions,
  isDev: () => process.env.NODE_ENV === 'development' || !process.defaultApp
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electronAPI = electronAPI
  window.api = api
}
