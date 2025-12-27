import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 智能资金流向API接口
 */
export class SmartMoneyFlowApi {
  private static readonly BASE_PATH = '/api/v1/smart-money-flow'

  /**
   * 获取KOL/VC持仓
   */
  static async getKolVcHoldings(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/kol-vc-holdings`, params)
  }

  /**
   * 获取Twitter共鸣信号
   */
  static async getTwitterResonanceSignal(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/twitter-resonance-signal`, params)
  }

  /**
   * 获取KOL/VC排行榜
   */
  static async getKolVcTopList(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/kol-vc-top-list`, params)
  }

  /**
   * 获取24小时交易量
   */
  static async get24hTradeVolume(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/24h-trade-volume`, params)
  }

  /**
   * 获取30天利润分布
   */
  static async get30dProfitDistribution(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/30d-profit-distribution`, params)
  }
}
