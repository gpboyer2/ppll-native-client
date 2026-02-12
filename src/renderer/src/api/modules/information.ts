import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 信息查询API接口
 */
export class InformationApi {
  private static readonly BASE_PATH = '/api/v1/information'

  /**
   * 获取溢价指数
   */
  static async getPremiumIndex(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/premiumIndex`, data)
  }

  /**
   * 获取价格行情
   */
  static async getTickerPrice(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/ticker/price`, data)
  }
}
