import { useState, useEffect } from 'react'
import {
  IconServer,
  IconDatabase,
  IconActivity,
  IconRefresh,
  IconTerminal,
  IconSettings,
  IconRotate,
  IconClock,
  IconFileText
} from '@tabler/icons-react'
import {
  GetDebugInfo,
  GetDebugLogs,
  WriteDebugLog,
  RestartNodejsService
} from '../../wailsjs/go/main/App'

function DeveloperConsolePage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugLogs, setDebugLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [selectedLogTab, setSelectedLogTab] = useState<'nodejs' | 'go'>('nodejs')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadDebugInfo = async () => {
    try {
      const info = await GetDebugInfo()
      setDebugInfo(info)
    } catch (error) {
      console.error('获取调试信息失败:', error)
      WriteDebugLog('获取调试信息失败: ' + String(error))
    }
  }

  const loadDebugLogs = async () => {
    try {
      const logs = await GetDebugLogs(200)
      setDebugLogs(logs)
    } catch (error) {
      console.error('获取调试日志失败:', error)
      WriteDebugLog('获取调试日志失败: ' + String(error))
    }
  }

  const loadAll = async () => {
    setRefreshing(true)
    await Promise.all([loadDebugInfo(), loadDebugLogs()])
    setRefreshing(false)
    setLoading(false)
  }

  const handleRestartService = async () => {
    setRestarting(true)
    try {
      const result = await RestartNodejsService()
      if (result.status === 'success') {
        WriteDebugLog('Node.js 服务重启成功')
      } else {
        WriteDebugLog('Node.js 服务重启失败: ' + (result.message || '未知错误'))
      }
      await loadAll()
    } catch (error) {
      console.error('重启服务失败:', error)
      WriteDebugLog('重启服务失败: ' + String(error))
    } finally {
      setRestarting(false)
    }
  }

  useEffect(() => {
    loadAll()
    WriteDebugLog('开发者控制台已打开')
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadAll, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  if (loading || !debugInfo) {
    return (
      <div className="container loading-container">
        <div className="loading-content">
          <div className="loading loading-spinner"></div>
          <div className="text-muted">加载中...</div>
        </div>
      </div>
    )
  }

  const nodejsService = debugInfo.nodejs_service

  return (
    <div className="container developer-console-page">
      <div className="page-header">
        <h2 className="page-title">
          <IconTerminal size={24} />
          开发者控制台
        </h2>
        <div className="header-actions">
          <label className="auto-refresh-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="auto-refresh-checkbox"
            />
            自动刷新 (5秒)
          </label>
          <button className="btn btn-outline" onClick={loadAll} disabled={refreshing}>
            <IconRefresh size={16} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* 服务状态卡片 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconServer size={18} />
              <span>后端服务状态</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <div className="info-item">
                <span className="info-label">Go 后端版本</span>
                <span className="info-value">{debugInfo.app_version}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Node.js 服务</span>
                <span className={`info-status ${nodejsService.isRunning ? 'running' : 'stopped'}`}>
                  {nodejsService.isRunning ? '运行中' : '已停止'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">健康状态</span>
                <span
                  className={`info-status ${nodejsService.isHealthy ? 'healthy' : 'unhealthy'}`}
                >
                  {nodejsService.isHealthy ? '健康' : '异常'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">服务地址</span>
                <span className="info-value">{nodejsService.serviceURL}</span>
              </div>
              {nodejsService.processInfo && (
                <div className="info-item">
                  <span className="info-label">进程 PID</span>
                  <span className="info-value">{nodejsService.processInfo.pid}</span>
                </div>
              )}
              {nodejsService.startTime && (
                <div className="info-item">
                  <span className="info-label">启动时间</span>
                  <span className="info-value">{nodejsService.startTime}</span>
                </div>
              )}
              {nodejsService.uptime && (
                <div className="info-item">
                  <span className="info-label">运行时长</span>
                  <span className="info-value">{nodejsService.uptime}</span>
                </div>
              )}
            </div>
            <div className="restart-section">
              <button
                className="btn restart-button"
                onClick={handleRestartService}
                disabled={restarting}
              >
                <IconRotate size={16} />
                {restarting ? '重启中...' : '重启 Node.js 服务'}
              </button>
            </div>
          </div>
        </div>

        {/* 数据库状态卡片 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconDatabase size={18} />
              <span>数据库状态</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <div className="info-item">
                <span className="info-label">数据库路径</span>
                <span className="info-value info-value-path">
                  {debugInfo.environment.SQLITE_PATH || '未设置'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">环境</span>
                <span className="info-value">{debugInfo.environment.NODE_ENV || '未设置'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">日志目录</span>
                <span className="info-value info-value-path">{debugInfo.log_dir || '未设置'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 系统信息卡片 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconSettings size={18} />
              <span>系统信息</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <div className="info-item">
                <span className="info-label">可执行文件路径</span>
                <span className="info-value info-value-path-short">
                  {debugInfo.app_path || '未知'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">工作目录</span>
                <span className="info-value info-value-path-short">
                  {debugInfo.working_dir || '未知'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">服务目录（配置）</span>
                <span className="info-value info-value-monospace">{nodejsService.serverDir}</span>
              </div>
              <div className="info-item">
                <span className="info-label">服务目录（解析）</span>
                <span className="info-value info-value-monospace">{nodejsService.resolvedDir}</span>
              </div>
              <div className="info-item">
                <span className="info-label">操作系统</span>
                <span className="info-value">{debugInfo.system_info?.os || '未知'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">架构</span>
                <span className="info-value">{debugInfo.system_info?.arch || '未知'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 环境变量卡片 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconActivity size={18} />
              <span>环境变量</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              {debugInfo.environment &&
                Object.entries(debugInfo.environment).map(([key, value]: [string, any]) => (
                  <div key={key} className="info-item">
                    <span className="info-label">{key}</span>
                    <span className="info-value-inline">{value || '(空)'}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 日志查看器 */}
      <div className="card log-viewer-card">
        <div className="card-header">
          <div className="log-viewer-header">
            <div className="flex items-center gap-8">
              <IconFileText size={18} />
              <span>实时日志</span>
              {debugLogs && (
                <span className="log-max-lines-hint">(最近 {debugLogs.max_lines} 行)</span>
              )}
            </div>
            <div className="log-tab-group">
              <button
                className={`tab-item ${selectedLogTab === 'nodejs' ? 'active' : ''}`}
                onClick={() => setSelectedLogTab('nodejs')}
              >
                Node.js 日志
              </button>
              <button
                className={`tab-item ${selectedLogTab === 'go' ? 'active' : ''}`}
                onClick={() => setSelectedLogTab('go')}
              >
                Go 后端日志
              </button>
            </div>
          </div>
        </div>
        <div className="card-content log-viewer-content">
          <div className="log-viewer-box">
            {debugLogs ? (
              selectedLogTab === 'nodejs' ? (
                debugLogs.nodejs_logs.length > 0 ? (
                  debugLogs.nodejs_logs.map((line: string, i: number) => (
                    <div key={i} className="log-line">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-muted">暂无 Node.js 日志</div>
                )
              ) : debugLogs.go_logs.length > 0 ? (
                debugLogs.go_logs.map((line: string, i: number) => (
                  <div key={i} className="log-line">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted">暂无 Go 后端日志</div>
              )
            ) : (
              <div className="text-muted">加载中...</div>
            )}
          </div>
        </div>
      </div>

      {/* 最后更新时间 */}
      <div className="last-update">
        <IconClock size={12} className="last-update-icon" />
        最后更新: {debugInfo.timestamp}
      </div>
    </div>
  )
}

export default DeveloperConsolePage
