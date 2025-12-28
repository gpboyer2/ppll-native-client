import { useEffect } from 'react';
import { useSystemInfoStore, getHealthData } from '../stores/system-info-store';
import { IconNetwork, IconWorld, IconServer, IconDatabase, IconGit, IconActivity, IconCpu } from '../components/icons';
import InfoItem from '../components/InfoItem';

function SystemInfoPage() {
  const { staticInfo, dynamicInfo, loading } = useSystemInfoStore();
  const health = getHealthData();

  if (loading || !staticInfo) {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }}></div>
          <div className="text-muted">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container system-info-page">
      <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>系统信息</h2>

      <div className="grid-2">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconNetwork />
              <span>本机 IPv4 地址</span>
            </div>
          </div>
          <div className="card-content">
            {staticInfo.ipv4List && staticInfo.ipv4List.length > 0 ? (
              <div className="info-item-list">
                {staticInfo.ipv4List.map((ip, index) => (
                  <InfoItem key={index} label={`网卡 ${index + 1}`} value={ip} type="status" status="success" />
                ))}
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>未检测到 IPv4 地址</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconWorld />
              <span>服务地址</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem label="前端地址" value={staticInfo.frontendUrl} />
              <InfoItem label="API 地址" value={staticInfo.nodejs_url} />
              <InfoItem
                label="API 文档"
                value={`${staticInfo.nodejs_url}/api/v1/docs`}
                type="link"
                onClick={() => window.open(`${staticInfo.nodejs_url}/api/v1/docs`, '_blank')}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconServer />
              <span>环境信息</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem label="应用版本" value={staticInfo.app_version} type="status" status="success" />
              <InfoItem
                label="运行环境"
                value={staticInfo.environment}
                type="status"
                status="warning"
                style={{ background: 'color-mix(in srgb, #17a2b8 20%, var(--color-bg))', color: '#17a2b8' }}
              />
              <InfoItem label="应用描述" value={staticInfo.appDescription} style={{ maxWidth: '60%', textAlign: 'right' }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconServer />
              <span>后端服务</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem
                label="Node.js 服务"
                value={health.service.is_running ? '运行中' : '未运行'}
                type="status"
                status={health.service.is_running ? 'success' : 'danger'}
              />
              <InfoItem
                label="服务健康状态"
                value={health.health.is_healthy ? '健康' : '异常'}
                type="status"
                status={health.health.is_healthy ? 'success' : 'danger'}
              />
              <InfoItem label="进程 PID" value={health.service.pid} />
              <InfoItem label="运行时长" value={health.service.uptime} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconDatabase />
              <span>数据存储</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem
                label="数据库状态"
                value={health.health.database?.healthy ? '正常' : '异常'}
                type="status"
                status={health.health.database?.healthy ? 'success' : 'danger'}
              />
              <InfoItem label="数据库路径" value={staticInfo.databasePath} type="path" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconCpu />
              <span>资源使用</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem
                label="内存使用"
                value={health.resources?.memory ? `${health.resources.memory.used} MB / ${health.resources.memory.total} MB` : undefined}
              />
              {health.resources?.memory ? (
                <InfoItem
                  label="内存占比"
                  value={`${health.resources.memory.percentage || 0}%`}
                  type="status"
                  status={(health.resources.memory.percentage || 0) > 80 ? 'danger' : 'success'}
                />
              ) : (
                <InfoItem label="内存占比" value={undefined} />
              )}
              <InfoItem label="CPU 用户态" value={health.resources?.cpu?.user} />
              <InfoItem label="CPU 系统态" value={health.resources?.cpu?.system} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-8">
              <IconActivity />
              <span>连接统计</span>
            </div>
          </div>
          <div className="card-content">
            <div className="info-item-list">
              <InfoItem label="WebSocket 活跃" value={health.connections?.websocket?.active} />
              <InfoItem label="WebSocket 累计" value={health.connections?.websocket?.total} />
              <InfoItem label="Socket.IO 活跃" value={health.connections?.socketio?.active} />
              <InfoItem label="Socket.IO 累计" value={health.connections?.socketio?.total} />
            </div>
          </div>
        </div>

        {staticInfo.gitInfo && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-8">
                <IconGit />
                <span>Git 信息</span>
              </div>
            </div>
            <div className="card-content">
              <div className="info-item-list">
                <InfoItem label="分支" value={staticInfo.gitInfo.branch} />
                <InfoItem label="Tag" value={staticInfo.gitInfo.tag} />
                <InfoItem
                  label="提交哈希"
                  value={staticInfo.gitInfo.commit_hash?.substring(0, 7)}
                  style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}
                />
                <InfoItem label="提交作者" value={staticInfo.gitInfo.commit_author} />
                <InfoItem label="提交日期" value={staticInfo.gitInfo.commit_date} />
                <div className="info-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '4px' }}>
                  <span className="info-label">提交信息</span>
                  <span className="info-value" style={{ width: '100%', textAlign: 'left' }}>
                    {staticInfo.gitInfo.commit_message || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemInfoPage;
