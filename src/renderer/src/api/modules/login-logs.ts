import { RequestWrapper } from '../request'
import { Response } from '../../core/response'
import { PageData, PageRequest } from '../../types/common'

/**
 * 登录日志API接口
 */
export class LoginLogsApi {
  private static readonly BASE_PATH = '/api/v1/login-logs'

  /**
   * 获取登录日志列表（单用户系统）
   */
  static async list(
    params?: PageRequest & {
      username?: string
      ip?: string
      status?: string
      login_system?: string
      start?: string
      end?: string
    }
  ): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 获取登录日志详情
   */
  static async detail(params: { id: string }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, params)
  }

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
   * 删除登录日志
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data)
  }
}
