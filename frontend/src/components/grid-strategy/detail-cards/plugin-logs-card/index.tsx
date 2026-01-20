import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { IconRefresh, IconAlertCircle, IconInfoCircle, IconCheck, IconBug, IconChevronDown, IconChevronRight, IconFilter } from '@tabler/icons-react';
import './index.scss';
import { PluginLog } from '../../../../types/grid-strategy';
import { ICON_SIZE } from '../../../../constants/grid-strategy';

interface PluginLogsCardProps {
  plugin_logs: PluginLog[];
  log_loading: boolean;
  on_refresh_logs: () => void;
}

const AUTO_REFRESH_INTERVAL = 10000; // 10秒自动刷新

type EventFilterType = 'all' | 'init' | 'grid' | 'trade' | 'error' | 'warn';
type TimeFilterType = 'all' | 'today' | 'week' | 'month';

export function PluginLogsCard({
  plugin_logs,
  log_loading,
  on_refresh_logs
}: PluginLogsCardProps) {
  const [event_filter, setEventFilter] = useState<EventFilterType>('all');
  const [time_filter, setTimeFilter] = useState<TimeFilterType>('all');
  const [collapsed_groups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [next_refresh_countdown, setNextRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL / 1000);
  const interval_ref = useRef<NodeJS.Timeout | null>(null);
  const countdown_ref = useRef<NodeJS.Timeout | null>(null);

  // 使用 ref 存储回调，避免 useEffect 依赖变化
  const on_refresh_logs_ref = useRef(on_refresh_logs);
  on_refresh_logs_ref.current = on_refresh_logs;

  // 手动刷新处理函数，重置倒计时
  const handleManualRefresh = useCallback(() => {
    on_refresh_logs();
    setNextRefreshCountdown(AUTO_REFRESH_INTERVAL / 1000);
  }, [on_refresh_logs]);

  useEffect(() => {
    if (!log_loading) {
      interval_ref.current = setInterval(() => {
        on_refresh_logs_ref.current();
        setNextRefreshCountdown(AUTO_REFRESH_INTERVAL / 1000);
      }, AUTO_REFRESH_INTERVAL);

      countdown_ref.current = setInterval(() => {
        setNextRefreshCountdown(prev => {
          if (prev <= 1) {
            return AUTO_REFRESH_INTERVAL / 1000;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
        interval_ref.current = null;
      }
      if (countdown_ref.current) {
        clearInterval(countdown_ref.current);
        countdown_ref.current = null;
      }
    };
  }, [log_loading]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <IconAlertCircle size={ICON_SIZE.SMALL} />;
      case 'warn': return <IconAlertCircle size={ICON_SIZE.SMALL} />;
      case 'success': return <IconCheck size={ICON_SIZE.SMALL} />;
      case 'debug': return <IconBug size={ICON_SIZE.SMALL} />;
      default: return <IconInfoCircle size={ICON_SIZE.SMALL} />;
    }
  };

  const getEventTypeName = (event_type: string) => {
    const type_map: Record<string, string> = {
      'init': '初始化',
      'grid': '网格',
      'error': '错误',
      'warn': '警告',
      'info': '信息',
      'success': '成功',
      'pause': '暂停',
      'resume': '恢复',
      'open_position': '开仓',
      'close_position': '平仓',
      'limit_reached': '限制触发',
      'debug': '调试'
    };
    return type_map[event_type] || event_type;
  };

  const getEventTypeColor = (event_type: string) => {
    const color_map: Record<string, string> = {
      'init': 'rgb(16, 185, 129)',
      'grid': 'rgb(59, 130, 246)',
      'error': 'rgb(239, 68, 68)',
      'warn': 'rgb(234, 179, 8)',
      'success': 'rgb(16, 185, 129)',
      'pause': 'rgb(245, 158, 11)',
      'resume': 'rgb(16, 185, 129)',
      'open_position': 'rgb(139, 92, 246)',
      'close_position': 'rgb(236, 72, 153)'
    };
    return color_map[event_type] || 'rgb(107, 114, 128)';
  };

  const filterByTime = (logs: PluginLog[], filter: TimeFilterType) => {
    if (filter === 'all') return logs;

    const now = new Date();
    const today_start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week_start = new Date(today_start);
    week_start.setDate(week_start.getDate() - 7);
    const month_start = new Date(today_start);
    month_start.setDate(month_start.getDate() - 30);

    return logs.filter(log => {
      const log_date = new Date(log.created_at);
      switch (filter) {
        case 'today':
          return log_date >= today_start;
        case 'week':
          return log_date >= week_start;
        case 'month':
          return log_date >= month_start;
        default:
          return true;
      }
    });
  };

  const filterByEvent = (logs: PluginLog[], filter: EventFilterType) => {
    if (filter === 'all') return logs;
    if (filter === 'trade') {
      return logs.filter(log => ['open_position', 'close_position'].includes(log.event_type));
    }
    return logs.filter(log => log.event_type === filter);
  };

  const groupLogs = (logs: PluginLog[]) => {
    const groups: Map<string, PluginLog[]> = new Map();

    logs.forEach(log => {
      const date = new Date(log.created_at);
      const date_key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!groups.has(date_key)) {
        groups.set(date_key, []);
      }
      groups.get(date_key)!.push(log);
    });

    return Array.from(groups.entries()).map(([date_key, logs]) => ({
      date_key,
      logs: logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })).sort((a, b) => b.date_key.localeCompare(a.date_key));
  };

  const toggleGroup = (group_key: string) => {
    setCollapsedGroups(prev => {
      const new_set = new Set(prev);
      if (new_set.has(group_key)) {
        new_set.delete(group_key);
      } else {
        new_set.add(group_key);
      }
      return new_set;
    });
  };

  const filtered_logs = useMemo(() => {
    let result = plugin_logs;
    result = filterByTime(result, time_filter);
    result = filterByEvent(result, event_filter);
    return result;
  }, [plugin_logs, event_filter, time_filter]);

  const grouped_logs = useMemo(() => groupLogs(filtered_logs), [filtered_logs]);

  const getEventFilterOptions = () => {
    const options = [
      { value: 'all' as EventFilterType, label: '全部', count: plugin_logs.length },
      { value: 'init' as EventFilterType, label: '初始化', count: plugin_logs.filter(l => l.event_type === 'init').length },
      { value: 'grid' as EventFilterType, label: '网格', count: plugin_logs.filter(l => l.event_type === 'grid').length },
      { value: 'trade' as EventFilterType, label: '交易', count: plugin_logs.filter(l => ['open_position', 'close_position'].includes(l.event_type)).length },
      { value: 'error' as EventFilterType, label: '错误', count: plugin_logs.filter(l => l.event_type === 'error').length },
      { value: 'warn' as EventFilterType, label: '警告', count: plugin_logs.filter(l => l.event_type === 'warn').length }
    ];
    return options;
  };

  const getTimeFilterOptions = () => {
    const options = [
      { value: 'all' as TimeFilterType, label: '全部时间' },
      { value: 'today' as TimeFilterType, label: '今天' },
      { value: 'week' as TimeFilterType, label: '最近7天' },
      { value: 'month' as TimeFilterType, label: '最近30天' }
    ];
    return options;
  };

  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div className="detail-card-header-left">
          <IconRefresh size={ICON_SIZE.MEDIUM} />
          <h3>插件日志</h3>
          {!log_loading && (
            <span className="auto-refresh-countdown">
              {next_refresh_countdown}s 后刷新
            </span>
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
            {getEventFilterOptions().map(option => (
              <button
                key={option.value}
                className={`filter-button ${event_filter === option.value ? 'active' : ''}`}
                onClick={() => setEventFilter(option.value)}
              >
                {option.label}
                <span className="filter-count">({option.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">
            <IconFilter size={ICON_SIZE.SMALL} />
            <span>时间范围</span>
          </div>
          <div className="filter-buttons">
            {getTimeFilterOptions().map(option => (
              <button
                key={option.value}
                className={`filter-button ${time_filter === option.value ? 'active' : ''}`}
                onClick={() => setTimeFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-card-body">
        {log_loading ? (
          <div className="logs-loading">加载中...</div>
        ) : filtered_logs.length === 0 && plugin_logs.length === 0 ? (
          <div className="logs-empty">暂无日志</div>
        ) : filtered_logs.length === 0 && plugin_logs.length > 0 ? (
          <div className="logs-empty">当前过滤条件下无日志，请调整过滤条件</div>
        ) : (
          <div className="logs-list">
            {grouped_logs.map(group => (
              <div key={group.date_key} className="log-group">
                <div
                  className="log-group-header"
                  onClick={() => toggleGroup(group.date_key)}
                >
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
                    {group.logs.map(log => (
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
        )}
      </div>
    </div>
  );
}
