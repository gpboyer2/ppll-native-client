import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 聊天API接口
 */
export class ChatApi {
  private static readonly BASE_PATH = '/api/v1/chat';

  /**
   * 聊天
   */
  static async chat(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`, params);
  }

  /**
   * 发送消息
   */
  static async sendMessage(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/send`, data);
  }

  /**
   * 获取消息
   */
  static async getMessage(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/message`, params);
  }
}
