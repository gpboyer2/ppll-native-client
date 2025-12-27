import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 系统相关API接口
 */
export class SystemApi {
  private static readonly BASE_PATH = '/api/v1/system'

  /**
   * 获取系统信息
   */
  static async getInfo(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/info`)
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/health`)
  }

  /**
   * 获取IPv4列表
   */
  static async getIpv4List(): Promise<Response<string[]>> {
    return RequestWrapper.get(`${this.BASE_PATH}/ipv4-list`)
  }

  /**
   * 获取Git信息
   */
  static async getGitInfo(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/git-info`)
  }

  /**
   * 获取更新信息
   */
  static async getUpdateInfo(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/update/info`)
  }

  /**
   * 检查更新
   */
  static async checkUpdate(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/update/check`)
  }

  /**
   * 下载更新
   */
  static async downloadUpdate(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update/download`)
  }

  /**
   * 安装更新
   */
  static async installUpdate(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update/install`)
  }

  /**
   * 获取系统日志
   */
  static async getLogs(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/logs`, params)
  }

  /**
   * 下载日志
   */
  static async downloadLog(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/logs/download`)
  }

  /**
   * 获取性能统计
   */
  static async getPerformanceStats(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/performance`)
  }

  /**
   * 获取使用统计
   */
  static async getUsageStats(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/usage`)
  }
}
