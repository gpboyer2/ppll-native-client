import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 系统日志API接口
 */
export class SystemLogsApi {
  private static readonly BASE_PATH = '/api/v1/system-logs'

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
    return RequestWrapper.post(`${this.BASE_PATH}/batch-create`, data)
  }

  /**
   * 查询系统日志
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params)
  }

  /**
   * 获取系统日志详情
   */
  static async getDetail(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
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
