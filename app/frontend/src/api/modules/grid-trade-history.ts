import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 网格交易历史API接口
 */
export class GridTradeHistoryApi {
  private static readonly BASE_PATH = '/api/v1/grid-trade-history';

  /**
   * 创建交易历史
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 更新交易历史
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 删除交易历史
   */
  static async delete(ids: string[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/deletes`, { data: ids });
  }

  /**
   * 查询交易历史
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`, params);
  }

  /**
   * 获取交易历史详情
   */
  static async getDetail(id: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/${id}`);
  }
}
