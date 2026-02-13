import { RequestWrapper } from './request'
import { PageRequest, PageData, PluginInfo, Notification, UUID } from '../types'
import { SystemLogsApi } from './modules/system-logs'

/**
 * API端点定义
 */
export class ApiEndpoints {
  // ==================== 系统相关 ====================

  /**
   * 获取系统信息
   */
  static async getSystemInfo() {
    return RequestWrapper.get('/api/system/info')
  }

  /**
   * 健康检查
   */
  static async healthCheck() {
    return RequestWrapper.get('/api/system/health')
  }

  // ==================== 插件相关 ====================

  /**
   * 获取插件列表
   */
  static async getPluginList(params?: PageRequest & { status?: string; category?: string }) {
    return RequestWrapper.get<PageData<PluginInfo>>('/api/plugins', params)
  }

  /**
   * 获取插件详情
   */
  static async getPluginDetail(id: UUID) {
    return RequestWrapper.get<PluginInfo>(`/api/plugins/${id}`)
  }

  /**
   * 安装插件
   */
  static async installPlugin(data: { file?: File; url?: string; id?: string }) {
    if (data.file) {
      return RequestWrapper.upload('/api/plugins/install', data.file)
    }
    return RequestWrapper.post('/api/plugins/install', { url: data.url, id: data.id })
  }

  /**
   * 卸载插件
   */
  static async uninstallPlugin(id: UUID) {
    return RequestWrapper.delete(`/api/plugins/${id}`)
  }

  /**
   * 启用插件
   */
  static async enablePlugin(id: UUID) {
    return RequestWrapper.post(`/api/plugins/${id}/enable`)
  }

  /**
   * 禁用插件
   */
  static async disablePlugin(id: UUID) {
    return RequestWrapper.post(`/api/plugins/${id}/disable`)
  }

  /**
   * 更新插件
   */
  static async updatePlugin(id: UUID) {
    return RequestWrapper.post(`/api/plugins/${id}/update`)
  }

  /**
   * 获取插件配置
   */
  static async getPluginConfig(id: UUID) {
    return RequestWrapper.get(`/api/plugins/${id}/config`)
  }

  /**
   * 更新插件配置
   */
  static async updatePluginConfig(id: UUID, config: any) {
    return RequestWrapper.put(`/api/plugins/${id}/config`, config)
  }

  /**
   * 获取插件市场列表
   */
  static async getPluginMarket(params?: PageRequest & { keyword?: string; category?: string }) {
    return RequestWrapper.get('/api/plugins/market', params)
  }

  // ==================== 通知相关 ====================

  /**
   * 获取通知列表
   */
  static async getNotificationList(params?: PageRequest & { type?: string; read?: boolean }) {
    return RequestWrapper.get<PageData<Notification>>('/api/notifications', params)
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationRead(id: UUID) {
    return RequestWrapper.post(`/api/notifications/${id}/read`)
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllNotificationsRead() {
    return RequestWrapper.post('/api/notifications/read-all')
  }

  /**
   * 删除通知
   */
  static async deleteNotification(id: UUID) {
    return RequestWrapper.delete(`/api/notifications/${id}`)
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadNotificationCount() {
    return RequestWrapper.get('/api/notifications/unread-count')
  }

  /**
   * 清空所有通知
   */
  static async clearAllNotifications() {
    return RequestWrapper.delete('/api/notifications')
  }

  /**
   * 获取通知设置
   */
  static async getNotificationSettings() {
    return RequestWrapper.get('/api/notifications/settings')
  }

  /**
   * 更新通知设置
   */
  static async updateNotificationSettings(settings: any) {
    return RequestWrapper.put('/api/notifications/settings', settings)
  }

  // ==================== 设置相关 ====================

  /**
   * 获取应用设置
   */
  static async getAppSettings() {
    return RequestWrapper.get('/api/settings')
  }

  /**
   * 更新应用设置
   */
  static async updateAppSettings(settings: any) {
    return RequestWrapper.put('/api/settings', settings)
  }

  /**
   * 重置应用设置
   */
  static async resetAppSettings() {
    return RequestWrapper.post('/api/settings/reset')
  }

  /**
   * 导出设置
   */
  static async exportSettings() {
    return RequestWrapper.get('/api/settings/export')
  }

  /**
   * 导入设置
   */
  static async importSettings(file: File) {
    return RequestWrapper.upload('/api/settings/import', file)
  }

  // ==================== 日志相关 ====================

  /**
   * 获取系统日志
   */
  static async getSystemLogs(params?: PageRequest & { level?: string; module?: string }) {
    return RequestWrapper.get('/api/logs/system', params)
  }

  /**
   * 获取插件日志
   */
  static async getPluginLogs(pluginId: UUID, params?: PageRequest) {
    return RequestWrapper.get(`/api/logs/plugins/${pluginId}`, params)
  }

  /**
   * 下载日志文件
   */
  static async downloadLog(logId: UUID) {
    return SystemLogsApi.downloadLog(logId)
  }

  // ==================== 更新相关 ====================

  /**
   * 检查更新
   */
  static async checkUpdate() {
    return RequestWrapper.get('/api/update/check')
  }

  /**
   * 获取更新信息
   */
  static async getUpdateInfo() {
    return RequestWrapper.get('/api/update/info')
  }

  /**
   * 下载更新
   */
  static async downloadUpdate() {
    return RequestWrapper.post('/api/update/download')
  }

  /**
   * 安装更新
   */
  static async installUpdate() {
    return RequestWrapper.post('/api/update/install')
  }

  // ==================== 数据统计 ====================

  /**
   * 获取使用统计
   */
  static async getUsageStats(params?: { startDate?: string; endDate?: string }) {
    return RequestWrapper.get('/api/stats/usage', params)
  }

  /**
   * 获取性能统计
   */
  static async getPerformanceStats() {
    return RequestWrapper.get('/api/stats/performance')
  }

  /**
   * 获取插件统计
   */
  static async getPluginStats() {
    return RequestWrapper.get('/api/stats/plugins')
  }

  // ==================== 数据库管理 ====================

  /**
   * 获取数据库概览信息
   */
  static async getDatabaseInfo() {
    return RequestWrapper.get('/api/v1/database-admin/info')
  }

  /**
   * 获取表列表
   */
  static async getDatabaseTables(params: {
    currentPage?: number
    pageSize?: number
    keyword?: string
  }) {
    return RequestWrapper.post('/api/v1/database-admin/tables', params)
  }

  /**
   * 获取表结构详情
   */
  static async getTableDetail(tableName: string) {
    return RequestWrapper.post('/api/v1/database-admin/table-detail', { tableName })
  }

  /**
   * 获取表数据
   */
  static async getTableData(params: {
    tableName: string
    currentPage?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
  }) {
    return RequestWrapper.post('/api/v1/database-admin/table-data', params)
  }

  /**
   * 创建数据
   */
  static async createData(tableName: string, data: any[]) {
    return RequestWrapper.post('/api/v1/database-admin/data-create', { tableName, data })
  }

  /**
   * 更新数据
   */
  static async updateData(tableName: string, data: any[]) {
    return RequestWrapper.put('/api/v1/database-admin/data-update', { tableName, data })
  }

  /**
   * 删除数据
   */
  static async deleteData(tableName: string, data: any[]) {
    return RequestWrapper.delete('/api/v1/database-admin/data-delete', { tableName, data })
  }

  /**
   * 执行 SQL 查询
   */
  static async executeQuery(sql: string, queryParams?: any[]) {
    return RequestWrapper.post('/api/v1/database-admin/query', { sql, queryParams })
  }

  /**
   * 创建表
   */
  static async createTable(tableName: string, columns: any[]) {
    return RequestWrapper.post('/api/v1/database-admin/table-create', { tableName, columns })
  }

  /**
   * 删除表
   */
  static async deleteTable(data: string[]) {
    return RequestWrapper.delete('/api/v1/database-admin/table-delete', { data })
  }

  /**
   * 添加列
   */
  static async createColumn(params: {
    tableName: string
    columnName: string
    type: string
    nullable?: boolean
    defaultValue?: any
  }) {
    return RequestWrapper.post('/api/v1/database-admin/column-create', params)
  }

  /**
   * 删除列
   */
  static async deleteColumn(tableName: string, columnName: string) {
    return RequestWrapper.delete('/api/v1/database-admin/column-delete', { tableName, columnName })
  }

  /**
   * 重命名表
   */
  static async renameTable(tableName: string, newName: string) {
    return RequestWrapper.post('/api/v1/database-admin/table-rename', { tableName, newName })
  }

  /**
   * 复制表
   */
  static async copyTable(tableName: string, newName: string, copyData: boolean = true) {
    return RequestWrapper.post('/api/v1/database-admin/table-copy', {
      tableName,
      newName,
      copyData
    })
  }

  /**
   * 清空表
   */
  static async truncateTable(data: string[]) {
    return RequestWrapper.post('/api/v1/database-admin/table-truncate', { data })
  }

  /**
   * 重命名列
   */
  static async renameColumn(tableName: string, oldName: string, newName: string) {
    return RequestWrapper.post('/api/v1/database-admin/column-rename', {
      tableName,
      oldName,
      newName
    })
  }

  /**
   * 创建索引
   */
  static async createIndex(params: {
    tableName: string
    indexName: string
    columns: string[]
    unique?: boolean
  }) {
    return RequestWrapper.post('/api/v1/database-admin/index-create', params)
  }

  /**
   * 删除索引
   */
  static async deleteIndex(data: string[]) {
    return RequestWrapper.delete('/api/v1/database-admin/index-delete', { data })
  }
}
