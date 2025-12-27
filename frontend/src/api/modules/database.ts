import { RequestWrapper } from '../request'
import { Response } from '../../core/response'

/**
 * 数据库管理API接口
 *
 * 注意：后端路由为 /api/v1/database-admin，前端使用 DatabaseApi 简化命名
 */
export class DatabaseApi {
  private static readonly BASE_PATH = '/api/v1/database-admin'

  /**
   * 获取数据库信息
   */
  static async getInfo(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/info`)
  }

  /**
   * 获取所有表
   */
  static async getTables(params?: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/tables`, params)
  }

  /**
   * 获取表详情
   */
  static async getTableDetail(tableName: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/table-detail`, { tableName })
  }

  /**
   * 获取表数据
   */
  static async getTableData(params: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/table-data`, params)
  }

  /**
   * 创建表
   */
  static async createTable(tableName: string, columns: any[]): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/table-create`, { tableName, columns })
  }

  /**
   * 删除表
   */
  static async deleteTable(tableName: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/table-delete`, { data: [tableName] })
  }

  /**
   * 复制表
   */
  static async copyTable(tableName: string, newTableName: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/table-copy`, { tableName, newTableName })
  }

  /**
   * 清空表
   */
  static async truncateTable(tableName: string): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/table-truncate`, { tableName })
  }

  /**
   * 创建数据
   */
  static async createData(tableName: string, data: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/data-create`, { tableName, data })
  }

  /**
   * 更新数据
   */
  static async updateData(tableName: string, data: any): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/data-update`, { tableName, data })
  }

  /**
   * 删除数据
   */
  static async deleteData(tableName: string, data: any): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/data-delete`, { tableName, data })
  }

  /**
   * 创建列
   */
  static async createColumn(tableName: string, column: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/column-create`, { tableName, column })
  }

  /**
   * 删除列
   */
  static async deleteColumn(tableName: string, columnName: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/column-delete`, { tableName, columnName })
  }

  /**
   * 重命名列
   */
  static async renameColumn(tableName: string, oldName: string, newName: string): Promise<Response<any>> {
    return RequestWrapper.put(`${this.BASE_PATH}/column-rename`, { tableName, oldName, newName })
  }

  /**
   * 创建索引
   */
  static async createIndex(tableName: string, index: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/index-create`, { tableName, index })
  }

  /**
   * 删除索引
   */
  static async deleteIndex(tableName: string, indexName: string): Promise<Response<any>> {
    return RequestWrapper.delete(`${this.BASE_PATH}/index-delete`, { tableName, indexName })
  }

  /**
   * 执行查询
   */
  static async executeQuery(sql: string, queryParams?: any): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/query`, { sql, queryParams })
  }
}
