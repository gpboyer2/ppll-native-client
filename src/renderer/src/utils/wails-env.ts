/**
 * 应用环境检测工具
 *
 * 统一检测 Wails 客户端和 Node.js 后端服务是否可用
 */

import { SystemApi } from '../api'

// 检查 Wails 运行时是否可用
export function isWailsRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && (window as any).runtime !== undefined
}

// 检查 Wails Go 后端是否可用
export function isWailsGoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as any).go !== undefined &&
    (window as any).go.main !== undefined &&
    (window as any).go.main.App !== undefined
  )
}

// 检查 Wails 环境是否完全就绪
export function isWailsReady(): boolean {
  return isWailsRuntimeAvailable() && isWailsGoAvailable()
}

// 检查 Node.js 服务是否可用（通过健康检查接口）
export async function isNodejsServiceAvailable(_baseUrl?: string): Promise<boolean> {
  try {
    const response = await SystemApi.healthCheck()
    return response.status === 'success'
  } catch {
    return false
  }
}

// 检查应用环境是否就绪（Wails 或 Node.js 任一可用即可）
export async function isAppReady(nodejsBaseUrl?: string): Promise<boolean> {
  // Wails 可用
  if (isWailsReady()) {
    return true
  }

  // Node.js 服务可用
  if (await isNodejsServiceAvailable(nodejsBaseUrl)) {
    return true
  }

  return false
}

// 等待应用环境就绪（轮询检查）
export function waitForAppReady(
  checkInterval: number = 2000, // 检查间隔（毫秒）
  timeout: number = 60000, // 超时时间（毫秒）
  nodejsBaseUrl?: string // Node.js 服务地址（默认 http://localhost:54321）
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    // 立即检查一次
    isAppReady(nodejsBaseUrl).then((ready) => {
      if (ready) {
        resolve()
        return
      }

      // 轮询检查
      const intervalId = setInterval(async () => {
        const ready = await isAppReady(nodejsBaseUrl)

        if (ready) {
          clearInterval(intervalId)
          resolve()
        } else {
          // 检查是否超时
          if (Date.now() - startTime > timeout) {
            clearInterval(intervalId)
            reject(new Error(`等待应用环境就绪超时（${timeout}ms）`))
          }
        }
      }, checkInterval)
    })
  })
}
