import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 币安U本位合约交易对API接口
 */
export class BinanceUmTradingPairsApi {
  private static readonly BASE_PATH = '/api/v1/binance-um-trading-pairs';

  /**
   * 获取交易对列表
   */
  static async getTradingPairs(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`);
  }
}
