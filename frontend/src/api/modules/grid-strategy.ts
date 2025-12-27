import { RequestWrapper } from '../request'
import { Response } from '../../core/response'
import { PageData, PageRequest } from '../../types/common'

/**
 * 网格策略API接口
 */
export class GridStrategyApi {
  private static readonly BASE_PATH = '/api/v1/grid-strategy'

  /**
   * 获取网格策略列表
   */
  static async list(params?: PageRequest & {
    apiKey?: string
    apiSecret?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`, params)
  }

  /**
   * 查询网格策略
   */
  static async query(params?: PageRequest & {
    apiKey?: string
    apiSecret?: string
  }): Promise<Response<PageData<any>>> {
    return RequestWrapper.get(`${this.BASE_PATH}/query`, params)
  }

  /**
   * 创建网格策略
   */
  static async create(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create`, data)
  }

  /**
   * 创建做多网格策略
   */
  static async createLong(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/create-long`, data)
  }

  /**
   * 更新网格策略
   */
  static async update(data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/update`, data)
  }

  /**
   * 删除网格策略
   */
  static async delete(ids: string[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/deletes`, { data: ids })
  }

  /**
   * 暂停网格策略
   */
  static async pause(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/paused`, { id })
  }

  /**
   * 恢复网格策略
   */
  static async resume(id: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/resume`, { id })
  }

  /**
   * 智能配置优化
   */
  static async optimize(data: {
    symbol: string
    totalCapital: number
    optimizeTarget: string
    minTradeValue: number
    maxTradeValue: number
    interval: string
    apiKey: string
    apiSecret: string
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/optimize`, data)
  }
}
