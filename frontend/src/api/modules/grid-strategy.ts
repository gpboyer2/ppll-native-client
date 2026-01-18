import { RequestWrapper } from '../request';
import { Response } from '../../core/response';
import { PageData, PageRequest } from '../../types/common';

/**
 * 网格策略API接口
 */
export class GridStrategyApi {
  private static readonly BASE_PATH = '/api/v1/grid-strategy';

  /**
   * 获取网格策略列表
   */
  static async list(params?: PageRequest & {
    api_key?: string
    secret_key?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`, params);
  }

  /**
   * 查询网格策略
   */
  static async query(params?: PageRequest & {
    api_key?: string
    secret_key?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params);
  }

  /**
   * 创建网格策略
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data);
  }

  /**
   * 创建做多网格策略
   */
  static async createLong(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create-long`, data);
  }

  /**
   * 更新网格策略
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data);
  }

  /**
   * 删除网格策略
   */
  static async delete(data: number | number[]): Promise<Response<any>> {
    const id_list = Array.isArray(data) ? data : [data];
    return RequestWrapper.post(`${this.BASE_PATH}/deletes`, { data: id_list });
  }

  /**
   * 暂停网格策略
   */
  static async pause(id: number): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/paused`, { id });
  }

  /**
   * 恢复网格策略
   */
  static async resume(id: number): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/resume`, { id });
  }

  /**
   * 智能配置优化
   */
  static async optimize(data: {
    symbol: string
    total_capital: number
    optimize_target: string
    min_trade_value: number
    max_trade_value: number
    interval: string
    api_key: string
    secret_key: string
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/optimize`, data);
  }

  /**
   * 获取插件日志列表
   */
  static async getPluginLogs(params: PageRequest & {
    strategy_id?: number
    trading_pair?: string
    event_type?: string
    level?: string
    start_time?: string
    end_time?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get('/api/v1/usd-m-futures-plugin-log/list', params);
  }

  /**
   * 获取插件日志统计
   */
  static async getPluginLogStatistics(strategy_id?: number): Promise<Response<any>> {
    return RequestWrapper.get('/api/v1/usd-m-futures-plugin-log/statistics', { strategy_id });
  }
}
