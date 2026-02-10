import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * Hello测试API接口
 */
export class HelloApi {
  private static readonly BASE_PATH = '/api/v1/hello';

  /**
   * Hello测试
   */
  static async hello(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`);
  }
}
