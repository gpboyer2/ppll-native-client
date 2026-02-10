import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 币安账户API接口
 */
export class BinanceAccountApi {
  private static readonly BASE_PATH = '/api/v1/binance-account';

  /**
   * 获取U本位合约账户
   */
  static async getUSDMFutures(params: { api_key: string; api_secret: string; include_positions?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/usdm-futures`, params);
  }

  /**
   * 获取现货账户
   */
  static async getSpot(params: { api_key: string; api_secret: string; include_empty_balances?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/spot`, params);
  }

  /**
   * 获取币本位合约账户
   */
  static async getCoinMFutures(params: { api_key: string; api_secret: string; include_positions?: boolean }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/coinm-futures`, params);
  }

  /**
   * 设置杠杆
   */
  static async setLeverage(data: {
    api_key: string;
    api_secret: string;
    leverage_list: Array<{ symbol: string; leverage: number }>;
    delay?: number;
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/set-leverage`, data);
  }

  /**
   * 生成监听密钥
   */
  static async generateListenKey(params: { api_key: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/generate-listen-key`, params);
  }

  /**
   * 保持监听密钥活跃
   */
  static async keepAliveListenKey(params: { api_key: string }): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/keep-alive-listen-key`, params);
  }

  /**
   * 获取指定交易对的当前杠杆倍数
   */
  static async getPositionRisk(params: {
    api_key: string;
    api_secret: string;
    symbol: string;
  }): Promise<Response<{ symbol: string; leverage: number }>> {
    return RequestWrapper.get(`${this.BASE_PATH}/position-risk`, params);
  }
}
