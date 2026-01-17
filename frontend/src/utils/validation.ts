// 验证工具函数

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean
  message?: string
  field?: string
}

/**
 * 基础验证类
 */
export class Validator {
  /**
   * 必填验证
   */
  static required(value: any, field?: string): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        message: field ? `${field}不能为空` : '不能为空',
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 检查长度
   */
  static checkLength(value: string | any[], min: number, max: number, field?: string): ValidationResult {
    const len = value ? value.length : 0;
    if (len < min || len > max) {
      return {
        isValid: false,
        message: field ? `${field}长度必须在${min}-${max}个字符之间` : `长度必须在${min}-${max}个字符之间`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 最小长度验证
   */
  static minLength(value: string | any[], min: number, field?: string): ValidationResult {
    const len = value ? value.length : 0;
    if (len < min) {
      return {
        isValid: false,
        message: field ? `${field}长度不能少于${min}个字符` : `长度不能少于${min}个字符`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 最大长度验证
   */
  static maxLength(value: string | any[], max: number, field?: string): ValidationResult {
    const len = value ? value.length : 0;
    if (len > max) {
      return {
        isValid: false,
        message: field ? `${field}长度不能超过${max}个字符` : `长度不能超过${max}个字符`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 正则表达式验证
   */
  static pattern(value: string, pattern: RegExp, message?: string, field?: string): ValidationResult {
    if (!value) return { isValid: true };
    if (!pattern.test(value)) {
      return {
        isValid: false,
        message: message || (field ? `${field}格式不正确` : '格式不正确'),
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 数值范围验证
   */
  static range(value: number, min: number, max: number, field?: string): ValidationResult {
    if (value < min || value > max) {
      return {
        isValid: false,
        message: field ? `${field}必须在${min}-${max}之间` : `必须在${min}-${max}之间`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 最小值验证
   */
  static min(value: number, min: number, field?: string): ValidationResult {
    if (value < min) {
      return {
        isValid: false,
        message: field ? `${field}不能小于${min}` : `不能小于${min}`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 最大值验证
   */
  static max(value: number, max: number, field?: string): ValidationResult {
    if (value > max) {
      return {
        isValid: false,
        message: field ? `${field}不能大于${max}` : `不能大于${max}`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 邮箱验证
   */
  static email(value: string, field?: string): ValidationResult {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(value, pattern, '请输入有效的邮箱地址', field);
  }

  /**
   * 手机号验证（中国大陆）
   */
  static phone(value: string, field?: string): ValidationResult {
    const pattern = /^1[3-9]\d{9}$/;
    return this.pattern(value, pattern, '请输入有效的手机号码', field);
  }

  /**
   * URL验证
   */
  static url(value: string, field?: string): ValidationResult {
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        message: field ? `${field}不是有效的URL` : '不是有效的URL',
        field
      };
    }
  }

  /**
   * IP地址验证
   */
  static ip(value: string, field?: string): ValidationResult {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return this.pattern(value, pattern, '请输入有效的IP地址', field);
  }

  /**
   * 密码强度验证
   */
  static password(value: string, field?: string): ValidationResult {
    if (!value) return { isValid: true };

    let score = 0;
    const patterns = [
      /[a-z]/,  // 小写字母
      /[A-Z]/,  // 大写字母
      /\d/,     // 数字
      /[!@#$%^&*(),.?":{}|<>]/  // 特殊字符
    ];

    patterns.forEach(pattern => {
      if (pattern.test(value)) score++;
    });

    if (value.length >= 8) score++;
    if (value.length >= 12) score++;

    if (score < 3) {
      return {
        isValid: false,
        message: '密码强度太弱，请包含大小写字母、数字和特殊字符',
        field
      };
    }

    return { isValid: true };
  }

  /**
   * 身份证号验证（中国大陆）
   */
  static idCard(value: string, field?: string): ValidationResult {
    const pattern = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!pattern.test(value)) {
      return {
        isValid: false,
        message: '请输入有效的身份证号码',
        field
      };
    }

    // 18位身份证校验
    if (value.length === 18) {
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const codes = '10X98765432';
      let sum = 0;

      for (let i = 0; i < 17; i++) {
        sum += parseInt(value[i]) * weights[i];
      }

      const checkBit = codes[sum % 11];
      if (value[17].toUpperCase() !== checkBit) {
        return {
          isValid: false,
          message: '身份证号码校验失败',
          field
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 日期验证
   */
  static date(value: string, format?: string, field?: string): ValidationResult {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: field ? `${field}不是有效的日期` : '不是有效的日期',
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 数组验证
   */
  static array(value: any, field?: string): ValidationResult {
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        message: field ? `${field}必须是数组` : '必须是数组',
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 对象验证
   */
  static object(value: any, field?: string): ValidationResult {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        isValid: false,
        message: field ? `${field}必须是对象` : '必须是对象',
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 枚举值验证
   */
  static enum(value: any, enums: any[], field?: string): ValidationResult {
    if (!enums.includes(value)) {
      return {
        isValid: false,
        message: field ? `${field}必须是${enums.join(',')}中的一个` : `必须是${enums.join(',')}中的一个`,
        field
      };
    }
    return { isValid: true };
  }

  /**
   * 自定义验证
   */
  static custom(value: any, validator: (value: any) => boolean, message: string, field?: string): ValidationResult {
    if (!validator(value)) {
      return {
        isValid: false,
        message,
        field
      };
    }
    return { isValid: true };
  }
}

/**
 * 表单验证器
 */
export class FormValidator {
  private results: ValidationResult[] = [];

  /**
   * 添加验证结果
   */
  addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  /**
   * 验证字段
   */
  validateField(value: any, rules: Array<(value: any) => ValidationResult>, _field?: string): void {
    rules.forEach(rule => {
      const result = rule(value);
      if (!result.isValid) {
        this.addResult(result);
      }
    });
  }

  /**
   * 获取所有错误信息
   */
  getErrors(): string[] {
    return this.results
      .filter(r => !r.isValid)
      .map(r => r.message || '验证失败');
  }

  /**
   * 获取第一个错误信息
   */
  getFirstError(): string | undefined {
    const error = this.results.find(r => !r.isValid);
    return error?.message;
  }

  /**
   * 验证是否全部通过
   */
  isValid(): boolean {
    return this.results.every(r => r.isValid);
  }

  /**
   * 清空验证结果
   */
  clear(): void {
    this.results = [];
  }

  /**
   * 获取字段错误
   */
  getFieldErrors(field: string): string[] {
    return this.results
      .filter(r => !r.isValid && r.field === field)
      .map(r => r.message || '验证失败');
  }
}