/**
 * 前端日志拦截和上报模块
 * 通过 WebSocket（Socket.IO）批量发送日志
 */

import dayjs from 'dayjs';

// 日志数据接口
interface LogData {
  log_data?: any;
  page_url: string;
  user_agent: string;
  log_timestamp?: number; // 前端日志时间戳（毫秒）
}

// 日志队列
const log_queue: LogData[] = [];
const MAX_QUEUE_SIZE = 200;
const FLUSH_INTERVAL = 3000; // 3秒

// Socket.IO 客户端（延迟加载）
let socketio_logger: any = null;

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
  } catch {
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
 * 批量发送日志
 */
async function flushLogs(): Promise<void> {
  if (log_queue.length === 0) {
    return;
  }

  const logs_to_send = log_queue.splice(0, MAX_QUEUE_SIZE);

  try {
    const connected = await loadSocketIOLogger();
    if (connected) {
      for (const log of logs_to_send) {
        socketio_logger.addLog(log);
      }
    }
  } catch {
    // WebSocket 连接失败，日志将被丢弃
  }
}

/**
 * 添加日志到队列
 */
function addLogToQueue(args: any[]): void {
  const current_timestamp = Date.now();

  const log_data: LogData = {
    log_data: undefined,
    page_url: window.location.hash || window.location.pathname,
    user_agent: navigator.userAgent,
    log_timestamp: current_timestamp, // 记录前端日志的精确时间戳
  };

  // 尝试提取可序列化的数据
  if (args.length > 0) {
    const serializable_args = args.filter(isSerializable);
    if (serializable_args.length > 0) {
      // 在第一条数据前添加时间戳
      log_data.log_data = [`[${dayjs().format('HH:mm:ss.SSS')}]`, ...serializable_args];
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
    addLogToQueue(args);
  };

  // 拦截 console.error
  console.error = (...args: any[]) => {
    original_console.error(...args);
    addLogToQueue(args);
  };

  // 拦截 console.warn
  console.warn = (...args: any[]) => {
    original_console.warn(...args);
    addLogToQueue(args);
  };

  // 拦截 console.info
  console.info = (...args: any[]) => {
    original_console.info(...args);
    addLogToQueue(args);
  };

  // 拦截 console.table
  console.table = (...args: any[]) => {
    original_console.table(...args);
    addLogToQueue(args);
  };

  // 拦截 console.debug
  console.debug = (...args: any[]) => {
    original_console.debug(...args);
    addLogToQueue(args);
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
