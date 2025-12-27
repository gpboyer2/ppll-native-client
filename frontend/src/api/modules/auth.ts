import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 认证相关API接口
 */
export class AuthApi {
  private static readonly BASE_PATH = '/api/v1/auth'

  /**
   * 登录
   */
  static async login(credentials: { username: string; password: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/login`, credentials)
  }

  /**
   * 登出
   */
  static async logout(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/logout`)
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/refresh-token`)
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/user-info`)
  }

  /**
   * 更新用户信息
   */
  static async updateUserInfo(data: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/user-info`, data)
  }

  /**
   * 修改密码
   */
  static async changePassword(data: { oldPassword: string; newPassword: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/change-password`, data)
  }
}
