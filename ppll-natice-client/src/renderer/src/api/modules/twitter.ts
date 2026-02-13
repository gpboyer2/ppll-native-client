import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * Twitter API接口
 */
export class TwitterApi {
  private static readonly BASE_PATH = '/api/v1/twitter'

  /**
   * 下载Twitter媒体
   */
  static async downloadMedia(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/download-media`, params)
  }
}
