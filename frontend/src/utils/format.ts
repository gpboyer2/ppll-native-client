// 格式化工具函数
import BigNumber from 'bignumber.js';

/**
 * 数字格式化
 */
export class NumberFormat {
  /**
   * 格式化数字，添加千分位分隔符
   */
  static thousands(num: number | string): string {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return n.toLocaleString('zh-CN');
  }

  /**
   * 格式化价格，保留指定小数位
   */
  static price(price: number, decimals: number = 2): string {
    return price.toFixed(decimals);
  }

  /**
   * 格式化百分比
   */
  static percent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * 格式化大数字（K, M, B）
   */
  static large(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
    return `${(num / 1000000000).toFixed(1)}B`;
  }

  /**
   * 格式化数值，最多保留 8 位小数，向下取整（直接丢弃多余部分）
   * 使用 BigNumber 确保精度
   * @param value 数值，支持 number、string、BigNumber
   * @param maxDecimals 最大小数位数，默认 8
   * @returns 格式化后的字符串
   */
  static truncateDecimal(value: number | string | BigNumber, maxDecimals: number = 8): string {
    // 将 number 类型转换为字符串，避免 BigNumber 对超过 15 位有效数字的 number 类型报错
    // 这是 JavaScript 浮点数精度问题的常见处理方式
    const valueStr = typeof value === 'number' ? value.toString() : value;
    const bn = new BigNumber(valueStr);

    // 如果是整数或小数位数少于最大值，直接返回
    // decimalPlaces() 可能返回 null（当值为 NaN、Infinity 时）
    const decimalPlaces = bn.decimalPlaces();
    if (decimalPlaces === null || decimalPlaces <= maxDecimals) {
      return bn.toFixed();
    }

    // 使用 BigNumber 的向下取整：乘以 10^n，向下取整，再除以 10^n
    const multiplier = new BigNumber(10).pow(maxDecimals);
    const truncated = bn.times(multiplier).integerValue(3).div(multiplier);

    // 移除末尾的 0（可选）
    return truncated.toFixed();
  }
}

/**
 * 字符串格式化
 */
export class StringFormat {
  /**
   * 首字母大写
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 驼峰转下划线
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线转驼峰
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + suffix;
  }

  /**
   * 生成随机字符串
   */
  static random(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * 文件大小格式化
 */
export class FileFormat {
  /**
   * 格式化文件大小
   */
  static size(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// 导入通用类型
import type { KeyValue } from '../types';

/**
 * 数据格式化
 */
export class DataFormat {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => DataFormat.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const cloned = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = DataFormat.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  /**
   * 扁平化对象
   */
  static flatten(obj: any, prefix: string = ''): KeyValue {
    const flattened: KeyValue = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, DataFormat.flatten(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  /**
   * 反扁平化对象
   */
  static unflatten(obj: KeyValue): any {
    const result: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const keys = key.split('.');
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = obj[key];
      }
    }

    return result;
  }
}