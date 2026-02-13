import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 仪表板API接口
 */
export class DashboardApi {
  private static readonly BASE_PATH = '/api/v1/dashboard'

  /**
   * 获取仪表板数据
   */
  static async getDashboard(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`)
  }

  /**
   * 获取账户数据
   */
  static async getAccount(data?: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/account`, data)
  }
}
