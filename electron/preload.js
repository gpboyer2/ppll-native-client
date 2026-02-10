/**
 * Electron 预加载脚本
 * 在渲染进程中暴露安全的 API
 */
const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露给渲染进程的安全 API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 获取后端服务状态
   */
  checkBackendStatus: () => ipcRenderer.invoke('check-backend-status'),

  /**
   * 重启后端服务
   */
  restartBackend: () => ipcRenderer.invoke('restart-backend'),

  /**
   * 获取后端日志
   */
  getBackendLogs: () => ipcRenderer.invoke('get-backend-logs'),

  /**
   * 监听后端日志
   */
  onBackendLog: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('backend-log', listener);
    // 返回取消监听的函数
    return () => ipcRenderer.removeListener('backend-log', listener);
  },

  /**
   * 获取平台信息
   */
  getPlatform: () => process.platform,

  /**
   * 获取版本信息
   */
  getVersion: () => process.versions,

  /**
   * 是否为开发模式
   */
  isDev: () => process.env.NODE_ENV === 'development' || !process.defaultApp,
});
