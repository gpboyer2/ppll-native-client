import { RequestWrapper } from '../request'
import { Response } from '../../core/response'
import { PageData, PageRequest } from '../../types/common'

/**
 * 系统日志API接口
 */
export class SystemLogsApi {
  private static readonly BASE_PATH = '/api/v1/system-logs'

  /**
   * 获取系统日志列表
   */
  static async list(params?: PageRequest & {
    user_id?: string
    module?: string
    api_endpoint?: string
    http_method?: string
    status_code?: string
    error_code?: string
    ip?: string
    location?: string
    start?: string
    end?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 获取系统日志详情
   */
  static async detail(params: { id: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
  }

  /**
   * 创建系统日志
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data)
  }

  /**
   * 批量创建系统日志
   */
  static async batchCreate(data: any[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-create`, { logs: data })
  }

  /**
   * 删除系统日志
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }

  /**
   * 下载日志文件
   */
  static async downloadLog(logId: string): Promise<void> {
    return RequestWrapper.downloadBlob(`/api/logs/${logId}/download`, `log-${logId}.log`)
  }
}
