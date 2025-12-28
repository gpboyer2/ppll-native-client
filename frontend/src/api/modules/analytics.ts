import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 数据分析API接口
 */
export class AnalyticsApi {
  private static readonly BASE_PATH = '/api/v1/analytics';

  /**
   * 获取系统概览
   */
  static async getOverview(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/overview`);
  }

  /**
   * 获取性能指标
   */
  static async getPerformance(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/performance`);
  }

  /**
   * 获取用户行为分析
   */
  static async getUserBehavior(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/user-behavior`);
  }

  /**
   * 获取API使用统计
   */
  static async getApiUsage(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/api-usage`);
  }
}
