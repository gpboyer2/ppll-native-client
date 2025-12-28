import { RequestWrapper } from '../request'
import { Response } from '../../core/response'
import { PageData, PageRequest } from '../../types/common'

/**
 * 操作日志API接口
 */
export class OperationLogsApi {
  private static readonly BASE_PATH = '/api/v1/operation-logs'

  /**
   * 获取操作日志列表（单用户系统）
   */
  static async list(params?: PageRequest & {
    action?: string
    description?: string
    page_path?: string
    ip?: string
    start?: string
    end?: string
    module?: string
    operator?: string
    status?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 获取操作日志详情
   */
  static async detail(params: { id: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
  }

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
    return RequestWrapper.post(`${this.BASE_PATH}/batch-create`, { logs: data })
  }

  /**
   * 删除操作日志
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }
}
