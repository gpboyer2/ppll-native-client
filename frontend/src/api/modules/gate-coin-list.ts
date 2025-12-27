import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * Gate.io币种列表API接口
 */
export class GateCoinListApi {
  private static readonly BASE_PATH = '/api/v1/gate-coin-list'

  /**
   * 获取涨幅榜
   */
  static async getGainers(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/gainers`, params)
  }

  /**
   * 获取跌幅榜
   */
  static async getLosers(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/losers`, params)
  }

  /**
   * 获取全部排序
   */
  static async getAllSorted(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/all`, params)
  }

  /**
   * 获取缓存状态
   */
  static async getCacheStatus(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/status`)
  }
}
