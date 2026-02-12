/**
 * API 全局配置
 * 统一管理所有 API 相关配置
 */

/**
 * API 基础路径配置
 *
 * 开发环境: 使用代理,前端请求 /api/v1/xxx → vite代理 → 后端 http://localhost:PORT/api/v1/xxx
 * 生产环境: Electron 打包后直接请求 /api/v1/xxx
 */
export const API_CONFIG = {
  // API 版本前缀
  VERSION: 'v1',

  // API 基础路径 (包含 /api 前缀)
  BASE_PATH: '/api',

  // 完整的 API 基础路径
  get BASE_URL() {
    return `${this.BASE_PATH}/${this.VERSION}`
  }
} as const

/**
 * 构建完整的 API 路径
 * @param path - 相对路径,如 'grid-strategy/list'
 * @returns 完整路径,如 '/api/v1/grid-strategy/list'
 */
export function buildApiPath(path: string): string {
  // 移除开头的斜杠,避免双斜杠
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_CONFIG.BASE_URL}/${cleanPath}`
}
