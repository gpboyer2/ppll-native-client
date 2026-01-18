import { IconRefresh, IconAlertCircle, IconInfoCircle, IconCheck, IconBug } from '@tabler/icons-react';
import './index.scss';
import { PluginLog } from '../../../../types/grid-strategy';
import { ICON_SIZE } from '../../../../constants/grid-strategy';

interface PluginLogsCardProps {
  plugin_logs: PluginLog[];
  log_loading: boolean;
  on_refresh_logs: () => void;
}

export function PluginLogsCard({
  plugin_logs,
  log_loading,
  on_refresh_logs
}: PluginLogsCardProps) {
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

  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div className="detail-card-header-left">
          <IconRefresh size={ICON_SIZE.MEDIUM} />
          <h3>插件日志</h3>
        </div>
        <button className="action-btn" onClick={on_refresh_logs} disabled={log_loading}>
          <IconRefresh size={ICON_SIZE.SMALL} />
        </button>
      </div>
      <div className="detail-card-body">
        {log_loading ? (
          <div className="logs-loading">加载中...</div>
        ) : plugin_logs.length === 0 ? (
          <div className="logs-empty">暂无日志</div>
        ) : (
          <div className="logs-list">
            {plugin_logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-item-header">
                  <div className="log-item-left">
                    <span className={`log-icon log-level-${log.level}`}>
                      {getLogIcon(log.level)}
                    </span>
                    <span className="log-type">{getEventTypeName(log.event_type)}</span>
                  </div>
                  <span className="log-time">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="log-message">{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
