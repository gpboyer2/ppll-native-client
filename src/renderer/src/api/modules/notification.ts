import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 通知管理API接口
 */
export class NotificationApi {
  private static readonly BASE_PATH = '/api/v1/notifications'

  /**
   * 获取通知列表
   */
  static async getList(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/list`, params)
  }

  /**
   * 标记通知为已读
   */
  static async markRead(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/${id}/mark-read`)
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllRead(): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/mark-all-read`)
  }

  /**
   * 删除通知
   */
  static async delete(id: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/${id}/delete`)
  }

  /**
   * 清空所有通知
   */
  static async clearAll(): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/clear-all`)
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/unread-count`)
  }

  /**
   * 获取通知设置
   */
  static async getSettings(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/settings`)
  }

  /**
   * 更新通知设置
   */
  static async updateSettings(settings: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/settings`, settings)
  }
}
