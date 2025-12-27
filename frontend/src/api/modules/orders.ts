import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 订单管理API接口
 */
export class OrdersApi {
  private static readonly BASE_PATH = '/api/v1/orders'

  /**
   * 获取订单模板
   */
  static async getTemplate(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`)
  }

  /**
   * 批量建仓
   */
  static async batchBuildPosition(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-build-position`, data)
  }

  /**
   * 自定义建仓
   */
  static async customBuildPosition(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/custom-build-position`, data)
  }

  /**
   * 自定义平仓多个
   */
  static async customCloseMultiple(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/custom-close-multiple-position`, data)
  }

  /**
   * 批量平仓
   */
  static async batchClosePosition(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-close-position`, data)
  }

  /**
   * 自定义平仓
   */
  static async customClosePosition(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/custom-close-position`, data)
  }

  /**
   * 指定平仓
   */
  static async appointClosePosition(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/appoint-close-position`, data)
  }

  /**
   * 批量检查
   */
  static async batchInspect(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-inspect`, data)
  }

  /**
   * 设置做空止盈
   */
  static async setShortTakeProfit(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/set-short-take-profit`, data)
  }
}
