import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 模板API接口
 */
export class TemplateApi {
  private static readonly BASE_PATH = '/api/v1/template'

  /**
   * 创建订单模板
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data)
  }

  /**
   * 删除订单模板
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }

  /**
   * 更新订单模板
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/update`, data)
  }

  /**
   * 查询订单模板
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params)
  }
}
