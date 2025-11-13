// 性能优化工具函数

/**
 * 性能监控类
 */
export class Performance {
  private static timers: Map<string, number> = new Map()

  /**
   * 开始计时
   */
  static startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  /**
   * 结束计时并返回耗时
   */
  static endTimer(name: string): number {
    const startTime = this.timers.get(name)
    if (startTime === undefined) {
      console.warn(`Timer "${name}" not found`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)
    console.log(`Timer "${name}": ${duration.toFixed(2)}ms`)
    return duration
  }

  /**
   * 测量函数执行时间
   */
  static measure<T>(fn: () => T, name?: string): T {
    const timerName = name || fn.name || 'anonymous'
    this.startTimer(timerName)
    const result = fn()
    this.endTimer(timerName)
    return result
  }

  /**
   * 异步测量函数执行时间
   */
  static async measureAsync<T>(fn: () => Promise<T>, name?: string): Promise<T> {
    const timerName = name || fn.name || 'anonymous'
    this.startTimer(timerName)
    const result = await fn()
    this.endTimer(timerName)
    return result
  }

  /**
   * 函数执行次数统计
   */
  static createCounter<T extends (...args: any[]) => any>(
    fn: T,
    name: string = fn.name
  ): T {
    let count = 0
    const wrapped = (...args: Parameters<T>) => {
      count++
      console.log(`${name} called ${count} times`)
      return fn(...args)
    }
    return wrapped as T
  }

  /**
   * 内存使用情况
   */
  static getMemoryUsage(): any {
    if ('memory' in performance) {
      return (performance as any).memory
    }
    return null
  }

  /**
   * 获取性能指标
   */
  static getMetrics(): PerformanceEntryList {
    return performance.getEntriesByType('measure')
  }

  /**
   * 清除性能指标
   */
  static clearMetrics(): void {
    performance.clearMeasures()
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: number | null = null

  return function debounced(this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) {
        func.apply(this, args)
      }
    }, wait)

    if (callNow) {
      func.apply(this, args)
    }
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  let previous = 0
  const { leading = true, trailing = true } = options

  return function throttled(this: any, ...args: Parameters<T>) {
    const now = Date.now()

    if (!previous && !leading) {
      previous = now
    }

    const remaining = limit - (now - previous)

    if (remaining <= 0 || remaining > limit) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(this, args)
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0
        timeout = null
        func.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * 缓存函数结果
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = func(...args)
    cache.set(key, result)
    return result
  } as T
}

/**
 * 批处理函数
 */
export class BatchProcessor<T> {
  private items: T[] = []
  private timer: number | null = null
  private readonly batchSize: number
  private readonly waitTime: number
  private readonly processor: (items: T[]) => void

  constructor(
    processor: (items: T[]) => void,
    batchSize: number = 100,
    waitTime: number = 100
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.waitTime = waitTime
  }

  /**
   * 添加项目到批处理队列
   */
  add(item: T): void {
    this.items.push(item)

    if (this.items.length >= this.batchSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.waitTime)
    }
  }

  /**
   * 立即处理所有项目
   */
  flush(): void {
    if (this.items.length === 0) return

    const items = this.items.splice(0)
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    this.processor(items)
  }
}

/**
 * 懒加载类
 */
export class LazyLoader<T> {
  private loaded = false
  private value: T | undefined
  private readonly loader: () => T | Promise<T>

  constructor(loader: () => T | Promise<T>) {
    this.loader = loader
  }

  /**
   * 获取值（懒加载）
   */
  async get(): Promise<T> {
    if (!this.loaded) {
      this.value = await this.loader()
      this.loaded = true
    }
    return this.value!
  }

  /**
   * 重置（强制重新加载）
   */
  reset(): void {
    this.loaded = false
    this.value = undefined
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loaded
  }
}

/**
 * 请求合并器
 */
export class RequestMerger<T, R> {
  private pending: Map<string, Promise<R>> = new Map()

  constructor(
    private readonly merger: (requests: T[]) => Promise<R[]>,
    private readonly getKey: (request: T) => string
  ) {}

  /**
   * 合并请求
   */
  async request(request: T): Promise<R> {
    const key = this.getKey(request)

    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    const promise = this.doRequest(request)
    this.pending.set(key, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.pending.delete(key)
    }
  }

  private async doRequest(request: T): Promise<R> {
    // 收集同一时间窗口内的所有请求
    const allRequests = Array.from(this.pending.keys())
      .filter(k => !this.pending.get(k))
      .map(() => request) // 简化处理，实际应该缓存请求

    if (allRequests.length === 0) {
      allRequests.push(request)
    }

    const results = await this.merger(allRequests)
    return results[0] // 返回第一个结果
  }
}

/**
 * 资源池
 */
export class ResourcePool<T> {
  private available: T[] = []
  private inUse = new Set<T>()
  private readonly factory: () => T
  private readonly destroyer?: (resource: T) => void
  private readonly maxSize: number

  constructor(
    factory: () => T,
    destroyer?: (resource: T) => void,
    maxSize: number = 10
  ) {
    this.factory = factory
    this.destroyer = destroyer
    this.maxSize = maxSize
  }

  /**
   * 获取资源
   */
  acquire(): T {
    let resource: T

    if (this.available.length > 0) {
      resource = this.available.pop()!
    } else {
      resource = this.factory()
    }

    this.inUse.add(resource)
    return resource
  }

  /**
   * 释放资源
   */
  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      return
    }

    this.inUse.delete(resource)

    if (this.available.length < this.maxSize) {
      this.available.push(resource)
    } else if (this.destroyer) {
      this.destroyer(resource)
    }
  }

  /**
   * 清空资源池
   */
  clear(): void {
    if (this.destroyer) {
      [...this.available, ...this.inUse].forEach(resource => {
        this.destroyer!(resource)
      })
    }

    this.available = []
    this.inUse.clear()
  }
}