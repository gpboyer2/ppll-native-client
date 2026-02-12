import { useState, useEffect, useRef, useCallback } from 'react'
import {
  IconRefresh,
  IconAlertCircle,
  IconInfoCircle,
  IconCheck,
  IconBug,
  IconChevronDown,
  IconChevronRight,
  IconFilter,
  IconChevronLeft,
  IconChevronRight as IconChevronRightPage
} from '@tabler/icons-react'
import './index.scss'
import { PluginLog } from '../../../../types/grid-strategy'
import { ICON_SIZE } from '../../../../constants/grid-strategy'

interface PluginLogsCardProps {
  plugin_logs: PluginLog[]
  log_loading: boolean
  on_refresh_logs: (params?: {
    current_page?: number
    event_type?: string
    start_time?: string
    end_time?: string
  }) => void
  pagination?: {
    current_page: number
    page_size: number
    total: number
  }
}

const AUTO_REFRESH_INTERVAL = 10000 // 10秒自动刷新

type EventFilterType = 'all' | 'init' | 'grid' | 'trade' | 'error' | 'warn'
type TimeFilterType = 'all' | 'today' | 'week' | 'month'

export function PluginLogsCard({
  plugin_logs,
  log_loading,
  on_refresh_logs,
  pagination
}: PluginLogsCardProps) {
  const [event_filter, setEventFilter] = useState<EventFilterType>('all')
  const [time_filter, setTimeFilter] = useState<TimeFilterType>('all')
  const [collapsed_groups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [next_refresh_countdown, setNextRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL / 1000)
  const interval_ref = useRef<number | null>(null)
  const countdown_ref = useRef<number | null>(null)

  // 使用 ref 存储回调，避免 useEffect 依赖变化
  const on_refresh_logs_ref = useRef(on_refresh_logs)

  useEffect(() => {
    on_refresh_logs_ref.current = on_refresh_logs
  }, [on_refresh_logs])

  // 计算时间过滤参数
  const getTimeFilterParams = useCallback((): { start_time?: string; end_time?: string } => {
    if (time_filter === 'all') return {}

    const now = new Date()
    const today_start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const week_start = new Date(today_start)
    week_start.setDate(week_start.getDate() - 7)
    const month_start = new Date(today_start)
    month_start.setDate(month_start.getDate() - 30)

    switch (time_filter) {
      case 'today':
        return { start_time: today_start.toISOString() }
      case 'week':
        return { start_time: week_start.toISOString() }
      case 'month':
        return { start_time: month_start.toISOString() }
      default:
        return {}
    }
  }, [time_filter])

  // 计算事件类型过滤参数
  const getEventFilterParams = useCallback((): { event_type?: string } => {
    if (event_filter === 'all') return {}
    if (event_filter === 'trade') return {} // 交易类型需要特殊处理（包含 open_position 和 close_position）
    return { event_type: event_filter }
  }, [event_filter])

  // 手动刷新处理函数，重置倒计时并应用当前过滤条件
  const handleManualRefresh = useCallback(() => {
    const params = {
      current_page: 1,
      ...getTimeFilterParams(),
      ...getEventFilterParams()
    }
    on_refresh_logs(params)
    setNextRefreshCountdown(AUTO_REFRESH_INTERVAL / 1000)
  }, [on_refresh_logs, getTimeFilterParams, getEventFilterParams])

  // 页码变化处理
  const handlePageChange = useCallback(
    (new_page: number) => {
      const params = {
        current_page: new_page,
        ...getTimeFilterParams(),
        ...getEventFilterParams()
      }
      on_refresh_logs(params)
    },
    [on_refresh_logs, getTimeFilterParams, getEventFilterParams]
  )

  // 过滤条件变化处理
  const handleFilterChange = useCallback(() => {
    const params = {
      current_page: 1,
      ...getTimeFilterParams(),
      ...getEventFilterParams()
    }
    on_refresh_logs(params)
  }, [on_refresh_logs, getTimeFilterParams, getEventFilterParams])

  useEffect(() => {
    if (!log_loading) {
      interval_ref.current = window.setInterval(() => {
        on_refresh_logs_ref.current()
        setNextRefreshCountdown(AUTO_REFRESH_INTERVAL / 1000)
      }, AUTO_REFRESH_INTERVAL)

      countdown_ref.current = window.setInterval(() => {
        setNextRefreshCountdown((prev) => {
          if (prev <= 1) {
            return AUTO_REFRESH_INTERVAL / 1000
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current)
        interval_ref.current = null
      }
      if (countdown_ref.current) {
        clearInterval(countdown_ref.current)
        countdown_ref.current = null
      }
    }
  }, [log_loading])

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <IconAlertCircle size={ICON_SIZE.SMALL} />
      case 'warn':
        return <IconInfoCircle size={ICON_SIZE.SMALL} />
      case 'info':
        return <IconCheck size={ICON_SIZE.SMALL} />
      default:
        return <IconBug size={ICON_SIZE.SMALL} />
    }
  }

  const getEventTypeName = (event_type: string) => {
    const type_map: Record<string, string> = {
      init: '初始化',
      grid: '网格',
      error: '错误',
      warn: '警告',
      info: '信息',
      success: '成功',
      pause: '暂停',
      resume: '恢复',
      open_position: '开仓',
      close_position: '平仓'
    }
    return type_map[event_type] || event_type
  }

  const getEventTypeColor = (event_type: string) => {
    const color_map: Record<string, string> = {
      init: 'rgb(16, 185, 129)',
      grid: 'rgb(59, 130, 246)',
      error: 'rgb(239, 68, 68)',
      warn: 'rgb(234, 179, 8)',
      success: 'rgb(16, 185, 129)',
      pause: 'rgb(245, 158, 11)',
      resume: 'rgb(16, 185, 129)',
      open_position: 'rgb(139, 92, 246)',
      close_position: 'rgb(236, 72, 153)'
    }
    return color_map[event_type] || 'rgb(107, 114, 128)'
  }

  const groupLogs = (logs: PluginLog[]) => {
    const groups: Map<string, PluginLog[]> = new Map()

    logs.forEach((log) => {
      const date = new Date(log.created_at)
      const date_key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      if (!groups.has(date_key)) {
        groups.set(date_key, [])
      }
      groups.get(date_key)!.push(log)
    })

    return Array.from(groups.entries())
      .map(([date_key, logs]) => ({
        date_key,
        logs: logs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }))
      .sort((a, b) => b.date_key.localeCompare(a.date_key))
  }

  const toggleGroup = (group_key: string) => {
    setCollapsedGroups((prev) => {
      const new_set = new Set(prev)
      if (new_set.has(group_key)) {
        new_set.delete(group_key)
      } else {
        new_set.add(group_key)
      }
      return new_set
    })
  }

  const grouped_logs = groupLogs(plugin_logs)

  const total_pages = pagination ? Math.ceil(pagination.total / pagination.page_size) : 1
  const current_page = pagination?.current_page || 1

  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div className="detail-card-header-left">
          <IconRefresh size={ICON_SIZE.MEDIUM} />
          <h3>插件日志</h3>
          {!log_loading && (
            <span className="auto-refresh-countdown">{next_refresh_countdown}s 后刷新</span>
          )}
        </div>
        <div className="detail-card-header-right">
          <button className="action-btn" onClick={handleManualRefresh} disabled={log_loading}>
            <IconRefresh size={ICON_SIZE.SMALL} className={log_loading ? 'rotating' : ''} />
          </button>
        </div>
      </div>

      <div className="detail-card-filters">
        <div className="filter-group">
          <div className="filter-label">
            <IconFilter size={ICON_SIZE.SMALL} />
            <span>事件类型</span>
          </div>
          <div className="filter-buttons">
            {(['all', 'init', 'grid', 'trade', 'error', 'warn'] as EventFilterType[]).map(
              (filter) => (
                <button
                  key={filter}
                  className={`filter-button ${event_filter === filter ? 'active' : ''}`}
                  onClick={() => {
                    setEventFilter(filter)
                    setTimeout(() => handleFilterChange(), 0)
                  }}
                >
                  {filter === 'all'
                    ? '全部'
                    : filter === 'init'
                      ? '初始化'
                      : filter === 'grid'
                        ? '网格'
                        : filter === 'trade'
                          ? '交易'
                          : filter === 'error'
                            ? '错误'
                            : '警告'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">
            <IconFilter size={ICON_SIZE.SMALL} />
            <span>时间范围</span>
          </div>
          <div className="filter-buttons">
            {(['all', 'today', 'week', 'month'] as TimeFilterType[]).map((filter) => (
              <button
                key={filter}
                className={`filter-button ${time_filter === filter ? 'active' : ''}`}
                onClick={() => {
                  setTimeFilter(filter)
                  setTimeout(() => handleFilterChange(), 0)
                }}
              >
                {filter === 'all'
                  ? '全部时间'
                  : filter === 'today'
                    ? '今天'
                    : filter === 'week'
                      ? '最近7天'
                      : '最近30天'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card-body">
        {log_loading ? (
          <div className="logs-loading">加载中...</div>
        ) : plugin_logs.length === 0 ? (
          <div className="logs-empty">暂无日志</div>
        ) : (
          <>
            <div className="logs-list">
              {grouped_logs.map((group) => (
                <div key={group.date_key} className="log-group">
                  <div className="log-group-header" onClick={() => toggleGroup(group.date_key)}>
                    {collapsed_groups.has(group.date_key) ? (
                      <IconChevronRight size={ICON_SIZE.SMALL} />
                    ) : (
                      <IconChevronDown size={ICON_SIZE.SMALL} />
                    )}
                    <span className="log-group-date">{group.date_key}</span>
                    <span className="log-group-count">{group.logs.length} 条日志</span>
                  </div>
                  {!collapsed_groups.has(group.date_key) && (
                    <div className="log-group-items">
                      {group.logs.map((log) => (
                        <div key={log.id} className="log-item">
                          <div className="log-item-header">
                            <div className="log-item-left">
                              <span className={`log-icon log-level-${log.level}`}>
                                {getLogIcon(log.level)}
                              </span>
                              <span
                                className="log-type"
                                style={{ color: getEventTypeColor(log.event_type) }}
                              >
                                {getEventTypeName(log.event_type)}
                              </span>
                            </div>
                            <span className="log-time">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="log-message">{log.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination && pagination.total > 0 && (
              <div className="logs-pagination">
                <div className="pagination-info">
                  共 {pagination.total} 条记录，第 {current_page}/{total_pages} 页
                </div>
                <div className="pagination-buttons">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(current_page - 1)}
                    disabled={current_page <= 1 || log_loading}
                  >
                    <IconChevronLeft size={ICON_SIZE.SMALL} />
                  </button>
                  <span className="pagination-current">{current_page}</span>
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(current_page + 1)}
                    disabled={current_page >= total_pages || log_loading}
                  >
                    <IconChevronRightPage size={ICON_SIZE.SMALL} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
