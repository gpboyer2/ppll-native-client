// 日志工具函数

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableStorage: boolean
  storageKey?: string
  maxLogSize?: number
  dateFormat?: string
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  data?: any
  module?: string
  stack?: string
}

/**
 * 日志器类
 */
export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableStorage: false,
    storageKey: 'app_logs',
    maxLogSize: 1000,
    dateFormat: 'YYYY-MM-DD HH:mm:ss'
  };

  private static logs: LogEntry[] = [];

  /**
   * 配置日志器
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置日志级别
   */
  static setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取日志级别名称
   */
  private static getLevelName(level: LogLevel): string {
    return LogLevel[level];
  }

  /**
   * 格式化日志消息
   */
  private static formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = this.getLevelName(entry.level).padEnd(5);
    const module = entry.module ? `[${entry.module}] ` : '';
    return `${timestamp} ${level} ${module}${entry.message}`;
  }

  /**
   * 写入日志
   */
  private static write(level: LogLevel, message: string, data?: any, module?: string, stack?: string): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      module,
      stack
    };

    // 控制台输出
    if (this.config.enableConsole) {
      const formatted = this.formatMessage(entry);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted, data);
          break;
        case LogLevel.INFO:
          console.info(formatted, data);
          break;
        case LogLevel.WARN:
          console.warn(formatted, data);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted, data, stack);
          break;
      }
    }

    // 存储日志
    if (this.config.enableStorage) {
      this.logs.push(entry);
      this.trimLogs();
      this.saveLogs();
    }
  }

  /**
   * 限制日志数量
   */
  private static trimLogs(): void {
    if (this.logs.length > (this.config.maxLogSize || 1000)) {
      this.logs = this.logs.slice(-this.config.maxLogSize!);
    }
  }

  /**
   * 保存日志到本地存储
   */
  private static saveLogs(): void {
    if (this.config.storageKey) {
      try {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.logs));
      } catch (error) {
        console.error('保存日志失败:', error);
      }
    }
  }

  /**
   * 从本地存储加载日志
   */
  private static loadLogs(): void {
    if (this.config.storageKey) {
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      } catch (error) {
        console.error('加载日志失败:', error);
      }
    }
  }

  /**
   * 调试日志
   */
  static debug(message: string, data?: any, module?: string): void {
    this.write(LogLevel.DEBUG, message, data, module);
  }

  /**
   * 信息日志
   */
  static info(message: string, data?: any, module?: string): void {
    this.write(LogLevel.INFO, message, data, module);
  }

  /**
   * 警告日志
   */
  static warn(message: string, data?: any, module?: string): void {
    this.write(LogLevel.WARN, message, data, module);
  }

  /**
   * 错误日志
   */
  static error(message: string, error?: Error | any, module?: string): void {
    const stack = error instanceof Error ? error.stack : undefined;
    this.write(LogLevel.ERROR, message, error, module, stack);
  }

  /**
   * 致命错误日志
   */
  static fatal(message: string, error?: Error | any, module?: string): void {
    const stack = error instanceof Error ? error.stack : undefined;
    this.write(LogLevel.FATAL, message, error, module, stack);
  }

  /**
   * 获取所有日志
   */
  static getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取指定级别的日志
   */
  static getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 获取指定模块的日志
   */
  static getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }

  /**
   * 清空日志
   */
  static clear(): void {
    this.logs = [];
    if (this.config.storageKey) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 导出日志
   */
  static export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导入日志
   */
  static import(json: string): void {
    try {
      const logs = JSON.parse(json) as LogEntry[];
      this.logs = [...this.logs, ...logs];
      this.trimLogs();
      this.saveLogs();
    } catch (error) {
      Logger.error('导入日志失败', error);
    }
  }
}

/**
 * 模块日志器
 */
export class ModuleLogger {
  constructor(private readonly moduleName: string) {}

  debug(message: string, data?: any): void {
    Logger.debug(message, data, this.moduleName);
  }

  info(message: string, data?: any): void {
    Logger.info(message, data, this.moduleName);
  }

  warn(message: string, data?: any): void {
    Logger.warn(message, data, this.moduleName);
  }

  error(message: string, error?: Error | any): void {
    Logger.error(message, error, this.moduleName);
  }

  fatal(message: string, error?: Error | any): void {
    Logger.fatal(message, error, this.moduleName);
  }
}

/**
 * 创建模块日志器
 */
export function createLogger(moduleName: string): ModuleLogger {
  return new ModuleLogger(moduleName);
}

/**
 * 性能日志器
 */
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  /**
   * 开始计时
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  end(name: string, data?: any): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      Logger.warn(`性能计时器 "${name}" 未找到`, { name });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    Logger.debug(`性能统计: ${name} 耗时 ${duration.toFixed(2)}ms`, {
      name,
      duration: Number(duration.toFixed(2)),
      ...data
    }, 'Performance');

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(fn: () => T, name?: string): T {
    const timerName = name || fn.name || 'anonymous';
    this.start(timerName);
    const result = fn();
    this.end(timerName);
    return result;
  }

  /**
   * 异步测量函数执行时间
   */
  async measureAsync<T>(fn: () => Promise<T>, name?: string): Promise<T> {
    const timerName = name || fn.name || 'anonymous';
    this.start(timerName);
    const result = await fn();
    this.end(timerName);
    return result;
  }
}

// 导出默认性能日志器实例
export const performanceLogger = new PerformanceLogger();