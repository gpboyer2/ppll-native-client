/**
 * 运行环境检测工具
 *
 * 检测当前应用运行在 Electron 客户端还是浏览器 Web 环境
 * 在应用启动时调用，打印完整的环境信息
 */

export interface envInfo {
  /** 运行平台：electron | browser */
  runtime: 'electron' | 'browser'
  /** 操作系统平台（仅 Electron 可用） */
  platform: string | null
  /** Node.js 版本（仅 Electron 可用） */
  node_version: string | null
  /** Electron 版本（仅 Electron 可用） */
  electron_version: string | null
  /** Chrome 版本（仅 Electron 可用） */
  chrome_version: string | null
  /** 是否为开发模式 */
  is_dev: boolean
  /** 浏览器 User-Agent */
  user_agent: string
  /** 当前页面 URL */
  url: string
  /** 视口宽度 */
  viewport_width: number
  /** 视口高度 */
  viewport_height: number
  /** 设备像素比 */
  device_pixel_ratio: number
}

/**
 * 检测是否运行在 Electron 环境中
 */
export function isElectron(): boolean {
  // 检查 window.electronAPI 是否存在（preload 脚本注入）
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true
  }

  // 检查 navigator.userAgent 是否包含 Electron
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) {
    return true
  }

  return false
}

/**
 * 收集完整的环境信息
 */
export function getEnvInfo(): envInfo {
  const in_electron = isElectron()

  let platform: string | null = null
  let node_version: string | null = null
  let electron_version: string | null = null
  let chrome_version: string | null = null
  let is_dev = false

  if (in_electron && window.api) {
    try {
      platform = window.api.getPlatform()
    } catch { /* preload 未就绪 */ }

    try {
      const versions = window.api.getVersion()
      node_version = versions?.node || null
      electron_version = versions?.electron || null
      chrome_version = versions?.chrome || null
    } catch { /* preload 未就绪 */ }

    try {
      is_dev = window.api.isDev()
    } catch { /* preload 未就绪 */ }
  } else {
    // 浏览器环境下，通过 Vite 环境变量判断开发模式
    is_dev = import.meta.env?.DEV ?? false
  }

  return {
    runtime: in_electron ? 'electron' : 'browser',
    platform,
    node_version,
    electron_version,
    chrome_version,
    is_dev,
    user_agent: navigator.userAgent,
    url: window.location.href,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio
  }
}

/**
 * 打印环境信息到控制台
 * 在应用启动时调用
 */
export function printEnvInfo(): void {
  const info = getEnvInfo()

  const runtime_label = info.runtime === 'electron' ? 'Electron 客户端' : '浏览器 Web'
  const mode_label = info.is_dev ? '开发模式' : '生产模式'

  console.log(`[环境检测] 运行环境: ${runtime_label} | ${mode_label}`)

  if (info.runtime === 'electron') {
    console.log(`[环境检测] 系统平台: ${info.platform}`)
    console.log(`[环境检测] Electron: v${info.electron_version} | Node: v${info.node_version} | Chrome: v${info.chrome_version}`)
  }

  console.log(`[环境检测] 视口: ${info.viewport_width}x${info.viewport_height} | 像素比: ${info.device_pixel_ratio}`)
  console.log(`[环境检测] URL: ${info.url}`)
  console.log(`[环境检测] UA: ${info.user_agent}`)
}
