import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 交易对对比API接口
 */
export class TradingPairsComparisonApi {
  private static readonly BASE_PATH = '/api/v1/trading-pairs-comparison'

  /**
   * 获取仅合约交易对
   */
  static async getFuturesOnly(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/futures-only`, params)
  }

  /**
   * 获取仅现货交易对
   */
  static async getSpotOnly(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/spot-only`, params)
  }

  /**
   * 获取综合报告
   */
  static async getComprehensiveReport(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/comprehensive-report`, params)
  }

  /**
   * 分析交易对可用性
   */
  static async analyzeAvailability(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/analyze`, params)
  }

  /**
   * 获取现货交易对
   */
  static async getSpotPairs(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/spot-pairs`, params)
  }

  /**
   * 获取合约交易对
   */
  static async getFuturesPairs(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/futures-pairs`, params)
  }

  /**
   * 获取币本位合约交易对
   */
  static async getCoinMFuturesPairs(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/coin-m-futures-pairs`, params)
  }
}
