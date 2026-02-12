import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 封禁IP管理API接口
 */
export class BannedIpApi {
  private static readonly BASE_PATH = '/api/v1/banned-ips'

  /**
   * 获取封禁IP列表
   */
  static async getList(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`, params)
  }

  /**
   * 封禁IP
   */
  static async banIP(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/`, data)
  }

  /**
   * 解封IP
   */
  static async unbanIP(ip: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/unban`, { data: [ip] })
  }

  /**
   * 获取IP封禁详情
   */
  static async getDetail(ip: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/detail`, { ip })
  }

  /**
   * 批量解封IP
   */
  static async batchUnban(ips: string[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-unban`, { data: ips })
  }

  /**
   * 清理过期封禁
   */
  static async cleanup(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/cleanup`)
  }

  /**
   * 紧急清理内存
   */
  static async emergencyCleanup(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/memory/cleanup`)
  }

  /**
   * 获取信任IP列表
   */
  static async getTrustedIPs(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/trusted-ips`)
  }

  /**
   * 添加信任IP
   */
  static async addTrustedIP(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/trusted-ips`, data)
  }

  /**
   * 移除信任IP
   */
  static async removeTrustedIP(ip: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/trusted-ips/remove`, { data: [ip] })
  }
}
