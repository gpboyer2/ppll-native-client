/**
 * Socket.IO 客户端工具类
 * 用于通过 WebSocket 发送请求并接收响应
 */
import { io, Socket } from 'socket.io-client'
import { Response } from '../core/response'

class SocketIOClient {
  private socket: Socket | null = null
  private is_connected = false
  private reconnect_attempts = 0
  private readonly max_reconnect_attempts = 5
  private readonly reconnect_delay = 3000

  /**
   * 连接 Socket.IO 服务器
   */
  connect(): void {
    if (this.socket?.connected) {
      return
    }

    try {
      const nodejs_url = this.getNodejsUrl()
      const socket_url = nodejs_url.replace('http://', 'ws://').replace('https://', 'wss://')

      this.socket = io(socket_url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.max_reconnect_attempts,
        reconnectionDelay: this.reconnect_delay
      })

      this.socket.on('connect', () => {
        this.is_connected = true
        this.reconnect_attempts = 0
      })

      this.socket.on('disconnect', () => {
        this.is_connected = false
      })

      this.socket.on('connect_error', () => {
        this.reconnect_attempts++
      })
    } catch {
      this.is_connected = false
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    this.is_connected = false
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.is_connected && this.socket?.connected === true
  }

  /**
   * 发送请求并等待响应（使用 callback 模式）
   * @param event 事件名称
   * @param data 请求数据
   * @returns Promise<Response<T>>
   */
  async request<T = any>(event: string, data?: any): Promise<Response<T>> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve({ status: 'error', message: 'Socket.IO 未连接', datum: undefined as any })
        return
      }

      const timeout = setTimeout(() => {
        resolve({ status: 'error', message: '请求超时', datum: undefined as any })
      }, 10000)

      this.socket!.emit(event, data, (response: Response<T>) => {
        clearTimeout(timeout)
        resolve(response)
      })
    })
  }

  /**
   * 获取 Node.js 服务 URL
   */
  private getNodejsUrl(): string {
    try {
      const staticInfo = (window as any).__staticInfo
      if (staticInfo?.nodejs_url) {
        return staticInfo.nodejs_url
      }
    } catch {
      // 静默失败
    }
    return 'http://localhost:54321'
  }

  /**
   * 订阅事件
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.socket?.on(event, listener)
  }

  /**
   * 取消订阅事件
   */
  off(event: string, listener?: (...args: any[]) => void): void {
    if (listener) {
      this.socket?.off(event, listener)
    } else {
      this.socket?.off(event)
    }
  }

  /**
   * 发送事件（无需响应）
   */
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data)
  }
}

// 导出单例
export const socketio_client = new SocketIOClient()
