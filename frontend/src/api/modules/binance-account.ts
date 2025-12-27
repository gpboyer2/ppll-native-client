import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 币安账户API接口
 */
export class BinanceAccountApi {
  private static readonly BASE_PATH = '/api/v1/binance-account'

  /**
   * 获取U本位合约账户
   */
  static async getUSDMFutures(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/usdm-futures`)
  }

  /**
   * 获取现货账户
   */
  static async getSpot(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/spot`)
  }

  /**
   * 获取币本位合约账户
   */
  static async getCoinMFutures(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/coinm-futures`)
  }

  /**
   * 设置杠杆
   */
  static async setLeverage(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/set-leverage`, data)
  }

  /**
   * 生成监听密钥
   */
  static async generateListenKey(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/generate-listen-key`)
  }

  /**
   * 保持监听密钥活跃
   */
  static async keepAliveListenKey(): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/keep-alive-listen-key`)
  }
}
