import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 币安交易所信息API接口
 */
export class BinanceExchangeInfoApi {
  private static readonly BASE_PATH = '/api/v1/binance-exchange-info'

  /**
   * 获取交易所信息
   */
  static async getExchangeInfo(params?: { apiKey?: string; apiSecret?: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 强制更新
   */
  static async forceUpdate(params?: { apiKey?: string; apiSecret?: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/force-update`, params)
  }

  /**
   * 获取状态
   */
  static async getStatus(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/status`)
  }

  /**
   * 获取溢价指数
   */
  static async getPremiumIndex(params: { apiKey: string; apiSecret: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/premium-index`, params)
  }

  /**
   * 获取下市永续合约
   */
  static async getDelistingPerpetualContracts(params: { apiKey: string; apiSecret: string; daysAhead?: number }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/delisting-perpetual-contracts`, params)
  }

  /**
   * 获取下市计划测试
   */
  static async getDelistScheduleTest(params?: { apiKey?: string; apiSecret?: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/delist-schedule-test`, params)
  }
}
