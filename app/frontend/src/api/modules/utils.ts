import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 工具API接口
 */
export class UtilsApi {
  private static readonly BASE_PATH = '/api/v1/utils';

  /**
   * 定时任务
   */
  static async timed(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/timed`, data);
  }
}
