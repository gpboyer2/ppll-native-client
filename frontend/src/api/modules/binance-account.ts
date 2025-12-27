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
  static async getUSDMFutures(params: { apiKey: string; apiSecret: string; includePositions?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/usdm-futures`, params)
  }

  /**
   * 获取现货账户
   */
  static async getSpot(params: { apiKey: string; apiSecret: string; includeEmptyBalances?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/spot`, params)
  }

  /**
   * 获取币本位合约账户
   */
  static async getCoinMFutures(params: { apiKey: string; apiSecret: string; includePositions?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/coinm-futures`, params)
  }

  /**
   * 设置杠杆
   */
  static async setLeverage(data: {
    apiKey: string;
    apiSecret: string;
    leverageList: Array<{ symbol: string; leverage: number }>;
    delay?: number;
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/set-leverage`, data)
  }

  /**
   * 生成监听密钥
   */
  static async generateListenKey(params: { apiKey: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/generate-listen-key`, params)
  }

  /**
   * 保持监听密钥活跃
   */
  static async keepAliveListenKey(params: { apiKey: string }): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/keep-alive-listen-key`, params)
  }
}
