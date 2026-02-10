import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 资金流向API接口
 */
export class FundFlowsApi {
  private static readonly BASE_PATH = '/api/v1/fund-flows';

  /**
   * 获取合约资金流向
   */
  static async getContract(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/contract`, params);
  }

  /**
   * 获取趋势预测
   */
  static async getTrendPrediction(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/trend-prediction`, params);
  }

  /**
   * 获取资金流向分布
   */
  static async getDistribution(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/distribution`, params);
  }

  /**
   * 获取资金流向分析
   */
  static async getAnalysis(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/analysis`, params);
  }

  /**
   * 获取资金流向百分比
   */
  static async getPercentage(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/percentage`, params);
  }

  /**
   * 获取持仓量历史
   */
  static async getOpenInterestHistory(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/open-interest-history`, params);
  }

  /**
   * 获取按交易所分组的持仓量
   */
  static async getOpenInterestByExchange(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/open-interest-by-exchange`, params);
  }
}
