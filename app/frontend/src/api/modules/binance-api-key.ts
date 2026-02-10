import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 币安API密钥管理API接口
 */
export class BinanceApiKeyApi {
  private static readonly BASE_PATH = '/api/v1/binance-api-key';

  /**
   * 创建API密钥
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 删除API密钥
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data);
  }

  /**
   * 更新API密钥
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 查询API密钥
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params);
  }
}
