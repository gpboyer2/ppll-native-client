/**
 * 判断值是否为空（包括：undefined, null, NaN, 空字符串, 0, "0"）
 *
 * @example
 * isNil(undefined)  // true
 * isNil(null)       // true
 * isNil(NaN)        // true
 * isNil('')         // true
 * isNil(0)          // true
 * isNil('0')        // true
 * isNil('1')        // false
 * isNil(1)          // false
 */
export function isNil(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }
  if (typeof value === 'number' && (isNaN(value) || value === 0)) {
    return true
  }
  if (typeof value === 'string' && (value === '' || value === '0')) {
    return true
  }
  return false
}

/**
 * 将空值转换为 undefined，非空值保持不变
 *
 * @example
 * emptyToUndefined(undefined)  // undefined
 * emptyToUndefined(null)       // undefined
 * emptyToUndefined('')         // undefined
 * emptyToUndefined(0)          // undefined
 * emptyToUndefined('0')        // undefined
 * emptyToUndefined('1')        // '1'
 * emptyToUndefined(1)          // 1
 */
export function emptyToUndefined<T>(value: T | null | undefined | '' | 0): T | undefined {
  return isNil(value) ? undefined : (value as T)
}

/**
 * 将空值转换为 null，非空值保持不变
 *
 * @example
 * emptyToNull(undefined)  // null
 * emptyToNull(null)       // null
 * emptyToNull('')         // null
 * emptyToNull(0)          // null
 * emptyToNull('0')        // null
 * emptyToNull('1')        // '1'
 * emptyToNull(1)          // 1
 */
export function emptyToNull<T>(value: T | null | undefined | '' | 0): T | null {
  return isNil(value) ? null : (value as T)
}
