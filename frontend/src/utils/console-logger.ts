/**
 * 前端日志拦截和上报模块
 * 优先使用 WebSocket（Socket.IO）批量发送日志，降级到 HTTP
 */
import { RequestWrapper } from '../api/request';

// 日志级别定义
type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'table' | 'debug';

// 日志数据接口
interface LogData {
  log_level: LogLevel;
  log_message: string;
  log_data?: any;
  page_url: string;
  user_agent: string;
}

// 日志队列
const log_queue: LogData[] = [];
const MAX_QUEUE_SIZE = 200;
const FLUSH_INTERVAL = 3000; // 3秒

// Socket.IO 客户端（延迟加载）
let socketio_logger: any = null;
let use_websocket = true;

/**
 * 动态导入 Socket.IO 客户端
 */
async function loadSocketIOLogger(): Promise<boolean> {
  if (socketio_logger) {
    return socketio_logger.isConnected();
  }

  try {
    const module = await import('./socketio-logger');
    socketio_logger = module.socketio_logger;
    socketio_logger.connect();

    // 等待连接
    await new Promise(resolve => setTimeout(resolve, 500));
    return socketio_logger.isConnected();
  } catch (error) {
    // Socket.IO 不可用，降级到 HTTP
    use_websocket = false;
    return false;
  }
}

/**
 * 判断是否为可序列化的数据
 */
function isSerializable(data: any): boolean {
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * 格式化日志消息
 */
function formatMessage(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * 通过 HTTP 发送单条日志（降级方案）
 */
async function sendLogViaHTTP(log_data: LogData): Promise<void> {
  try {
    await RequestWrapper.post('/api/v1/frontend-logs/create', log_data);
  } catch (error) {
    // 静默失败
  }
}

/**
 * 批量发送日志
 */
async function flushLogs(): Promise<void> {
  if (log_queue.length === 0) {
    return;
  }

  const logs_to_send = log_queue.splice(0, MAX_QUEUE_SIZE);

  // 优先尝试使用 WebSocket
  if (use_websocket) {
    try {
      const connected = await loadSocketIOLogger();
      if (connected) {
        for (const log of logs_to_send) {
          socketio_logger.addLog(log);
        }
        return;
      }
    } catch (error) {
      // WebSocket 失败，降级到 HTTP
      use_websocket = false;
    }
  }

  // 降级到 HTTP
  for (const log_data of logs_to_send) {
    // 不等待完成，避免阻塞
    sendLogViaHTTP(log_data);
  }
}

/**
 * 添加日志到队列
 */
function addLogToQueue(
  log_level: LogLevel,
  args: any[]
): void {
  const log_data: LogData = {
    log_level,
    log_message: formatMessage(args),
    log_data: undefined,
    page_url: window.location.hash || window.location.pathname,
    user_agent: navigator.userAgent,
  };

  // 尝试提取可序列化的数据
  if (args.length > 0) {
    const serializable_args = args.filter(isSerializable);
    if (serializable_args.length > 0) {
      log_data.log_data = serializable_args;
    }
  }

  // 添加到队列
  log_queue.push(log_data);

  // 如果队列超过最大值，立即刷新
  if (log_queue.length >= MAX_QUEUE_SIZE) {
    flushLogs();
  }
}

/**
 * 保存原始 console 方法
 */
const original_console = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  table: console.table,
  debug: console.debug,
};

/**
 * 初始化日志拦截器
 */
export function initConsoleLogger(): void {
  // 拦截 console.log
  console.log = (...args: any[]) => {
    original_console.log(...args);
    addLogToQueue('log', args);
  };

  // 拦截 console.error
  console.error = (...args: any[]) => {
    original_console.error(...args);
    addLogToQueue('error', args);
  };

  // 拦截 console.warn
  console.warn = (...args: any[]) => {
    original_console.warn(...args);
    addLogToQueue('warn', args);
  };

  // 拦截 console.info
  console.info = (...args: any[]) => {
    original_console.info(...args);
    addLogToQueue('info', args);
  };

  // 拦截 console.table
  console.table = (...args: any[]) => {
    original_console.table(...args);
    addLogToQueue('table', args);
  };

  // 拦截 console.debug
  console.debug = (...args: any[]) => {
    original_console.debug(...args);
    addLogToQueue('debug', args);
  };

  // 定期刷新日志队列
  setInterval(flushLogs, FLUSH_INTERVAL);

  // 页面卸载时刷新日志
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });

  original_console.log('[ConsoleLogger] 前端日志拦截器已启动');
}

/**
 * 手动断开 WebSocket 连接（用于清理）
 */
export function disconnectConsoleLogger(): void {
  if (socketio_logger) {
    socketio_logger.disconnect();
  }
}
