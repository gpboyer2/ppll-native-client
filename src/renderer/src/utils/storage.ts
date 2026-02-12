// 本地存储工具函数

/**
 * 存储键名常量
 */
export const StorageKeys = {
  // 用户配置
  USER_CONFIG: 'user_config',

  // 插件配置
  PLUGIN_CONFIG: 'plugin_config',
  PLUGIN_REGISTRY: 'plugin_registry',

  // 通知设置
  NOTIFICATION_SETTINGS: 'notification_settings',

  // 应用设置
  APP_SETTINGS: 'app_settings',

  // 缓存
  CACHE_PREFIX: 'cache_',

  // 临时数据
  TEMP_PREFIX: 'temp_',

  // 快速下单
  QUICK_ORDER_TRADING_PAIR: 'quick_order_trading_pair'
}

/**
 * 本地存储工具类
 */
export class Storage {
  /**
   * 设置存储项
   */
  static set<T>(key: string, value: T): boolean {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now()
      })
      localStorage.setItem(key, serializedValue)
      return true
    } catch (error) {
      console.error('存储失败:', error)
      return false
    }
  }

  /**
   * 获取存储项
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      if (!item) return defaultValue || null

      const parsed = JSON.parse(item)
      return parsed.data
    } catch (error) {
      console.error('读取失败:', error)
      return defaultValue || null
    }
  }

  /**
   * 删除存储项
   */
  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('删除失败:', error)
      return false
    }
  }

  /**
   * 清空所有存储
   */
  static clear(): boolean {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('清空失败:', error)
      return false
    }
  }

  /**
   * 获取存储项大小（字节）
   */
  static size(key: string): number {
    try {
      const item = localStorage.getItem(key)
      return item ? new Blob([item]).size : 0
    } catch {
      return 0
    }
  }

  /**
   * 检查存储项是否存在
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null
  }

  /**
   * 获取所有存储键
   */
  static keys(): string[] {
    return Object.keys(localStorage)
  }

  /**
   * 设置带过期时间的存储项
   */
  static setWithExpiry<T>(key: string, value: T, ttl: number): boolean {
    try {
      const item = {
        data: value,
        expiry: Date.now() + ttl
      }
      localStorage.setItem(key, JSON.stringify(item))
      return true
    } catch (error) {
      console.error('存储失败:', error)
      return false
    }
  }

  /**
   * 获取带过期时间的存储项
   */
  static getWithExpiry<T>(key: string, defaultValue?: T): T | null {
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return defaultValue || null

      const item = JSON.parse(itemStr)
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return defaultValue || null
      }

      return item.data
    } catch (error) {
      console.error('读取失败:', error)
      return defaultValue || null
    }
  }
}

/**
 * 会话存储工具类
 */
export class SessionStorage {
  /**
   * 设置会话存储项
   */
  static set<T>(key: string, value: T): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('存储失败:', error)
      return false
    }
  }

  /**
   * 获取会话存储项
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (error) {
      console.error('读取失败:', error)
      return defaultValue || null
    }
  }

  /**
   * 删除会话存储项
   */
  static remove(key: string): boolean {
    try {
      sessionStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('删除失败:', error)
      return false
    }
  }

  /**
   * 清空所有会话存储
   */
  static clear(): boolean {
    try {
      sessionStorage.clear()
      return true
    } catch (error) {
      console.error('清空失败:', error)
      return false
    }
  }
}

/**
 * 缓存管理器
 */
export class CacheManager {
  /**
   * 设置缓存
   */
  static set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const cacheKey = `${StorageKeys.CACHE_PREFIX}${key}`
    Storage.setWithExpiry(cacheKey, data, ttl)
  }

  /**
   * 获取缓存
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    const cacheKey = `${StorageKeys.CACHE_PREFIX}${key}`
    return Storage.getWithExpiry(cacheKey, defaultValue)
  }

  /**
   * 删除缓存
   */
  static remove(key: string): void {
    const cacheKey = `${StorageKeys.CACHE_PREFIX}${key}`
    Storage.remove(cacheKey)
  }

  /**
   * 清空所有缓存
   */
  static clear(): void {
    const keys = Storage.keys()
    keys.forEach((key) => {
      if (key.startsWith(StorageKeys.CACHE_PREFIX)) {
        Storage.remove(key)
      }
    })
  }
}

/**
 * 配置管理器
 */
export class ConfigManager {
  /**
   * 保存用户配置
   */
  static saveConfig<T>(key: string, config: T): boolean {
    return Storage.set(key, config)
  }

  /**
   * 加载用户配置
   */
  static loadConfig<T>(key: string, defaultConfig: T): T {
    return Storage.get(key, defaultConfig) || defaultConfig
  }

  /**
   * 合并配置
   */
  static mergeConfig<T extends Record<string, any>>(key: string, newConfig: Partial<T>): T {
    const existing = this.loadConfig<T>(key, {} as T)
    const merged = { ...existing, ...newConfig }
    this.saveConfig(key, merged)
    return merged
  }
}
