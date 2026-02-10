/**
 * Electron API 类型定义
 * 用于在渲染进程中调用 Electron 主进程功能
 */

/**
 * 后端服务状态
 */
export interface BackendStatus {
  running: boolean;
  pid: number | null;
}

/**
 * 后端日志数据
 */
export interface BackendLogData {
  type: 'stdout' | 'stderr';
  message: string;
}

/**
 * Node.js 版本信息
 */
export interface NodeVersions {
  node: string;
  chrome: string;
  electron: string;
}

/**
 * Electron 暴露给渲染进程的 API
 */
export interface ElectronAPI {
  /**
   * 检查后端服务状态
   */
  checkBackendStatus(): Promise<BackendStatus>;

  /**
   * 重启后端服务
   */
  restartBackend(): Promise<{ success: boolean }>;

  /**
   * 获取后端日志
   */
  getBackendLogs(): Promise<string[]>;

  /**
   * 监听后端日志
   * @param callback 回调函数，接收日志数据
   * @returns 取消监听的函数
   */
  onBackendLog(callback: (data: BackendLogData) => void): () => void;

  /**
   * 获取平台信息
   */
  getPlatform(): string;

  /**
   * 获取版本信息
   */
  getVersion(): NodeVersions;

  /**
   * 是否为开发模式
   */
  isDev(): boolean;
}

/**
 * 全局 window 对象扩展
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
