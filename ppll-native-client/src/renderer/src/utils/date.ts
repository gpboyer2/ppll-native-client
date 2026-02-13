// 日期时间工具函数

/**
 * 定时器类型（兼容浏览器和 Node.js）
 */
type TimerId = ReturnType<typeof setTimeout>

/**
 * 日期格式化类
 */
export class DateFormat {
  /**
   * 格式化日期为 YYYY-MM-DD
   */
  static toYYYYMMDD(date: Date | string | number): string {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
   */
  static toYYYYMMDDHHMMSS(date: Date | string | number): string {
    const d = new Date(date)
    const dateStr = this.toYYYYMMDD(d)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${dateStr} ${hours}:${minutes}:${seconds}`
  }

  /**
   * 格式化为相对时间
   */
  static toRelative(date: Date | string | number): string {
    const now = new Date()
    const target = new Date(date)
    const diff = now.getTime() - target.getTime()

    const minute = 60 * 1000
    const hour = minute * 60
    const day = hour * 24
    const week = day * 7
    const month = day * 30
    const year = day * 365

    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`
    } else if (diff < week) {
      return `${Math.floor(diff / day)}天前`
    } else if (diff < month) {
      return `${Math.floor(diff / week)}周前`
    } else if (diff < year) {
      return `${Math.floor(diff / month)}个月前`
    } else {
      return `${Math.floor(diff / year)}年前`
    }
  }

  /**
   * 获取日期的开始时间（00:00:00）
   */
  static startOfDay(date: Date | string | number): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  /**
   * 获取日期的结束时间（23:59:59）
   */
  static endOfDay(date: Date | string | number): Date {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }

  /**
   * 获取本周的开始时间（周一）
   */
  static startOfWeek(date: Date | string | number = new Date()): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return this.startOfDay(new Date(d.setDate(diff)))
  }

  /**
   * 获取本周的结束时间（周日）
   */
  static endOfWeek(date: Date | string | number = new Date()): Date {
    const start = this.startOfWeek(date)
    return this.endOfDay(new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000))
  }

  /**
   * 获取本月的开始时间
   */
  static startOfMonth(date: Date | string | number = new Date()): Date {
    const d = new Date(date)
    return this.startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  /**
   * 获取本月的结束时间
   */
  static endOfMonth(date: Date | string | number = new Date()): Date {
    const d = new Date(date)
    return this.endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  }

  /**
   * 添加天数
   */
  static addDays(date: Date | string | number, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  /**
   * 添加月数
   */
  static addMonths(date: Date | string | number, months: number): Date {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
  }

  /**
   * 计算两个日期之间的天数差
   */
  static daysBetween(start: Date | string | number, end: Date | string | number): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diff = endDate.getTime() - startDate.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * 判断是否是同一天
   */
  static isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  /**
   * 格式化时间戳
   */
  static formatTimestamp(
    timestamp: number,
    format: 'full' | 'date' | 'time' | 'relative' = 'full'
  ): string {
    switch (format) {
      case 'date':
        return this.toYYYYMMDD(timestamp)
      case 'time':
        return new Date(timestamp).toTimeString().split(' ')[0]
      case 'relative':
        return this.toRelative(timestamp)
      default:
        return this.toYYYYMMDDHHMMSS(timestamp)
    }
  }
}

/**
 * 时间工具类
 */
export class TimeUtils {
  /**
   * 睡眠函数
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: TimerId | null = null
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait) as TimerId
    }
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}
