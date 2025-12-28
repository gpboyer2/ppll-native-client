import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 权限管理API接口
 */
export class PermissionApi {
  private static readonly BASE_PATH = '/api/v1/permissions';

  /**
   * 创建权限
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 删除权限
   */
  static async delete(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/delete`, data);
  }

  /**
   * 更新权限
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 查询权限
   */
  static async query(params?: any): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params);
  }

  /**
   * 获取权限树
   */
  static async getTree(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/tree`);
  }

  /**
   * 获取菜单树
   */
  static async getMenuTree(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/menu-tree`);
  }

  /**
   * 按类型获取权限
   */
  static async getByType(type: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/type/${type}`);
  }

  /**
   * 按代码获取权限
   */
  static async getByCode(code: string): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/code/${code}`);
  }
}
