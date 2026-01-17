/**
 * Socket.IO 日志客户端
 * 用于通过 WebSocket 批量发送前端日志到后端
 */
import { io, Socket } from 'socket.io-client';

// 日志数据接口
interface LogData {
  log_level: string;
  log_message: string;
  log_data?: any;
  page_url: string;
  user_agent: string;
}

class SocketIOLogger {
  private socket: Socket | null = null;
  private log_queue: LogData[] = [];
  private is_connected = false;
  private reconnect_attempts = 0;
  private max_reconnect_attempts = 5;
  private reconnect_delay = 3000;

  // 批量发送配置
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL = 2000;
  private batch_timer: number | null = null;

  /**
   * 连接 Socket.IO 服务器
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    try {
      // 获取 Node.js 服务 URL
      const nodejs_url = this.getNodejsUrl();
      const socket_url = nodejs_url.replace('http://', 'ws://').replace('https://', 'wss://');

      this.socket = io(socket_url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.max_reconnect_attempts,
        reconnectionDelay: this.reconnect_delay,
      });

      this.socket.on('connect', () => {
        this.is_connected = true;
        this.reconnect_attempts = 0;
        // 连接成功后，发送队列中的日志
        this.flushQueue();
      });

      this.socket.on('disconnect', () => {
        this.is_connected = false;
      });

      this.socket.on('connect_error', () => {
        this.reconnect_attempts++;
      });

      // 启动批量发送定时器
      this.startBatchTimer();
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.batch_timer) {
      clearInterval(this.batch_timer);
      this.batch_timer = null;
    }

    // 发送剩余日志
    this.flushQueue();

    this.socket?.disconnect();
    this.socket = null;
    this.is_connected = false;
  }

  /**
   * 添加日志到队列
   */
  addLog(log: LogData): void {
    this.log_queue.push(log);

    // 如果队列达到批量大小，立即发送
    if (this.log_queue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  /**
   * 获取 Node.js 服务 URL
   */
  private getNodejsUrl(): string {
    try {
      const staticInfo = (window as any).__staticInfo;
      if (staticInfo?.nodejs_url) {
        return staticInfo.nodejs_url;
      }
    } catch {
      // 静默失败
    }
    return 'http://localhost:54321';
  }

  /**
   * 启动批量发送定时器
   */
  private startBatchTimer(): void {
    if (this.batch_timer) {
      return;
    }

    this.batch_timer = window.setInterval(() => {
      this.flushQueue();
    }, this.BATCH_INTERVAL);
  }

  /**
   * 发送队列中的日志
   */
  private flushQueue(): void {
    if (!this.is_connected || !this.socket || this.log_queue.length === 0) {
      return;
    }

    const logs_to_send = this.log_queue.splice(0, this.BATCH_SIZE);

    try {
      this.socket.emit('frontend_logs', { logs: logs_to_send });
    } catch (error) {
      // 发送失败，将日志放回队列
      this.log_queue.unshift(...logs_to_send);
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.is_connected && this.socket?.connected === true;
  }
}

// 导出单例
export const socketio_logger = new SocketIOLogger();
