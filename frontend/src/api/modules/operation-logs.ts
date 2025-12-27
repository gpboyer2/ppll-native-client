import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 操作日志API接口
 */
export class OperationLogsApi {
  private static readonly BASE_PATH = '/api/v1/operation-logs'

  /**
   * 创建操作日志
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data)
  }

  /**
   * 批量创建操作日志
   */
  static async batchCreate(data: any[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-create`, data)
  }

  /**
   * 查询操作日志
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params)
  }

  /**
   * 获取操作日志详情
   */
  static async getDetail(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
  }

  /**
   * 删除操作日志
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }
}
