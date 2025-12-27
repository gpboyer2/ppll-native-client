import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 登录日志API接口
 */
export class LoginLogsApi {
  private static readonly BASE_PATH = '/api/v1/login-logs'

  /**
   * 创建登录日志
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data)
  }

  /**
   * 更新登录日志
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data)
  }

  /**
   * 查询登录日志
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params)
  }

  /**
   * 获取登录日志详情
   */
  static async getDetail(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
  }

  /**
   * 删除登录日志
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }
}
