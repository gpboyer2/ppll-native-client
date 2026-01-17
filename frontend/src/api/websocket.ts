import { WebSocketConfig, WebSocketMessage } from '../types';
import { createLogger } from '../utils';

const logger = createLogger('WebSocket');

/**
 * WebSocket连接状态
 */
export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

/**
 * WebSocket管理器
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private state = WebSocketState.CLOSED;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageHandlers = new Map<string, Array<(data: any) => void>>();
  private stateHandlers: Array<(state: WebSocketState) => void> = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnect_interval: 3000,
      max_reconnect_attempts: 5,
      ...config
    };
  }

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === WebSocketState.OPEN || this.state === WebSocketState.CONNECTING) {
        resolve();
        return;
      }

      this.state = WebSocketState.CONNECTING;
      logger.info('正在连接WebSocket...', { url: this.config.url });

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        // 连接打开
        this.ws.onopen = (_event) => {
          this.state = WebSocketState.OPEN;
          this.reconnectAttempts = 0;
          logger.info('WebSocket连接成功');
          this.startHeartbeat();
          this.notifyStateChange(WebSocketState.OPEN);
          resolve();
        };

        // 接收消息
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            logger.error('解析WebSocket消息失败', error);
          }
        };

        // 连接关闭
        this.ws.onclose = (event) => {
          this.state = WebSocketState.CLOSED;
          this.stopHeartbeat();
          logger.warn('WebSocket连接关闭', { code: event.code, reason: event.reason });
          this.notifyStateChange(WebSocketState.CLOSED);

          // 自动重连
          if (!event.wasClean && this.reconnectAttempts < (this.config.max_reconnect_attempts || 5)) {
            this.scheduleReconnect();
          }
        };

        // 连接错误
        this.ws.onerror = (error) => {
          this.state = WebSocketState.CLOSED;
          logger.error('WebSocket连接错误', error);
          this.notifyStateChange(WebSocketState.CLOSED);
          reject(error);
        };
      } catch (error) {
        this.state = WebSocketState.CLOSED;
        logger.error('创建WebSocket连接失败', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws && this.state !== WebSocketState.CLOSED) {
      this.ws.close(1000, '主动断开');
    }

    this.state = WebSocketState.CLOSED;
    this.reconnectAttempts = 0;
    logger.info('WebSocket连接已断开');
  }

  /**
   * 发送消息
   */
  send(type: string, data: any): void {
    if (this.state !== WebSocketState.OPEN || !this.ws) {
      logger.warn('WebSocket未连接，无法发送消息', { type });
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug('发送WebSocket消息', { type, data });
    } catch (error) {
      logger.error('发送WebSocket消息失败', error);
    }
  }

  /**
   * 订阅消息
   */
  on(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }

    const handlers = this.messageHandlers.get(type)!;
    handlers.push(handler);

    // 返回取消订阅函数
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * 订阅状态变化
   */
  onStateChange(handler: (state: WebSocketState) => void): () => void {
    this.stateHandlers.push(handler);

    // 返回取消订阅函数
    return () => {
      const index = this.stateHandlers.indexOf(handler);
      if (index > -1) {
        this.stateHandlers.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前状态
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state === WebSocketState.OPEN;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WebSocketMessage): void {
    logger.debug('收到WebSocket消息', message);

    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          logger.error('处理WebSocket消息失败', { type: message.type, error });
        }
      });
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(state: WebSocketState): void {
    this.stateHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        logger.error('处理WebSocket状态变化失败', error);
      }
    });
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    logger.info(`${this.config.reconnect_interval}ms后尝试第${this.reconnectAttempts}次重连`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // 连接失败，会继续触发重连
      });
    }, this.config.reconnect_interval);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, 30000); // 30秒心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * WebSocket连接池
 */
export class WebSocketPool {
  private connections = new Map<string, WebSocketManager>();

  /**
   * 获取或创建连接
   */
  get(name: string, config: WebSocketConfig): WebSocketManager {
    if (!this.connections.has(name)) {
      const ws = new WebSocketManager(config);
      this.connections.set(name, ws);
    }
    return this.connections.get(name)!;
  }

  /**
   * 关闭指定连接
   */
  close(name: string): void {
    const ws = this.connections.get(name);
    if (ws) {
      ws.disconnect();
      this.connections.delete(name);
    }
  }

  /**
   * 关闭所有连接
   */
  closeAll(): void {
    this.connections.forEach(ws => {
      ws.disconnect();
    });
    this.connections.clear();
  }
}

/**
 * 创建WebSocket装饰器
 */
export function WebSocketEndpoint(config: WebSocketConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const wsName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const pool: WebSocketPool = (this as any)._wsPool || ((this as any)._wsPool = new WebSocketPool());
      const ws = pool.get(wsName, config);

      // 如果未连接则先连接
      if (!ws.isConnected()) {
        ws.connect().catch(error => {
          console.error('WebSocket连接失败:', error);
        });
      }

      return originalMethod.apply(this, [ws, ...args]);
    };

    return descriptor;
  };
}

// 创建默认WebSocket管理器
export const wsManager = new WebSocketManager({
  url: 'ws://localhost:8080/ws',
  protocols: ['json'],
  reconnect_interval: 3000,
  max_reconnect_attempts: 5
});