import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 机器人API接口
 */
export class RobotApi {
  private static readonly BASE_PATH = '/api/v1/robot';

  /**
   * 获取机器人模板
   */
  static async getTemplate(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`);
  }

  /**
   * 创建机器人
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 删除机器人
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data);
  }

  /**
   * 更新机器人
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 查询机器人
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params);
  }
}
