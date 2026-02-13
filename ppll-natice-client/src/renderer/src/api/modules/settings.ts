import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 设置管理API接口
 */
export class SettingsApi {
  private static readonly BASE_PATH = '/api/v1/settings'

  /**
   * 获取应用设置
   */
  static async getAppSettings(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/app`)
  }

  /**
   * 更新应用设置
   */
  static async updateAppSettings(settings: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/app`, settings)
  }

  /**
   * 重置应用设置
   */
  static async resetAppSettings(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/app/reset`)
  }

  /**
   * 导出设置
   */
  static async exportSettings(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/export`)
  }

  /**
   * 导入设置
   */
  static async importSettings(file: File): Promise<Response<any>> {
    return RequestWrapper.upload(`${this.BASE_PATH}/import`, file)
  }
}
