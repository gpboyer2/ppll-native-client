import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 标记价格API接口
 */
export class MarkPriceApi {
  private static readonly BASE_PATH = '/api/v1/mark-price';

  /**
   * 创建标记价格
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 删除标记价格
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data);
  }

  /**
   * 更新标记价格
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 查询标记价格
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params);
  }
}
