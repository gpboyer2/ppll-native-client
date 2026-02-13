import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 插件管理API接口
 */
export class PluginApi {
  private static readonly BASE_PATH = '/api/v1/plugins'

  /**
   * 获取插件列表
   */
  static async getList(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 获取插件详情
   */
  static async getDetail(id: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/${id}/detail`)
  }

  /**
   * 安装插件
   */
  static async install(data: { file?: File; url?: string; id?: string }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/install`, data)
  }

  /**
   * 卸载插件
   */
  static async uninstall(id: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/${id}/uninstall`)
  }

  /**
   * 启用插件
   */
  static async enable(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/${id}/enable`)
  }

  /**
   * 禁用插件
   */
  static async disable(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/${id}/disable`)
  }

  /**
   * 更新插件
   */
  static async update(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/${id}/update`)
  }

  /**
   * 获取插件配置
   */
  static async getConfig(id: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/${id}/config`)
  }

  /**
   * 更新插件配置
   */
  static async updateConfig(id: string, config: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/${id}/config`, config)
  }

  /**
   * 获取插件市场
   */
  static async getMarket(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/market`, params)
  }

  /**
   * 获取插件日志
   */
  static async getLogs(pluginId: string, params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/${pluginId}/logs`, params)
  }

  /**
   * 获取插件统计
   */
  static async getStats(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/stats`)
  }
}
