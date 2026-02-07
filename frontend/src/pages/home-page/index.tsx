import './index.scss';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifications } from '../../notifications/store';
import { getPluginList, type PluginItem, ROUTES } from '../../router';

function HomePage() {
  const [notifyList, setNotifyList] = useState(notifications.list);
  const [pluginList] = useState<PluginItem[]>(() => getPluginList());

  // 通知系统初始化
  useEffect(() => {
    notifications.init();
    const timer = setInterval(() => setNotifyList([...notifications.list]), 500);
    return () => clearInterval(timer);
  }, []);

  // 快速统计数据
  const enabled_plugin_list = pluginList.filter(p => p.enable && p.status !== 'coming-soon');
  const total_notifications = notifyList.length;
  const recent_notifications = notifyList.slice(0, 3);

  return (
    <div className="container">
      {/* 快速状态卡片 */}
      <div className="flex gap-16 mb-16" style={{ flexWrap: 'wrap' }}>
        <div className="flex gap-16" style={{ flex: '2', }}>
          <div className="card" style={{ flex: '1', minWidth: '200px' }}>
            <div className="card-content">
              <div className="flex items-center space-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>已启用插件</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-primary)' }}>{enabled_plugin_list.length}</div>
                </div>
                <div style={{ fontSize: '24px' }}>
                  {/*  */}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ flex: '1', minWidth: '200px' }}>
            <div className="card-content">
              <div className="flex items-center space-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>系统通知</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-warning)' }}>{total_notifications}</div>
                </div>
                <div style={{ fontSize: '24px' }}>
                  {/*  */}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '1', }}>
          <div className="card" >
            <div className="card-content">
              <div className="flex items-center space-between">
                <div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>运行状态</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-success)' }}>正常</div>
                </div>
                <div style={{ fontSize: '24px' }}>
                  {/*  */}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 主要功能区域 */}
      <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
        {/* 插件快捷入口 */}
        <div className="card shortcut-card">
          <div className="card-header">
            <span>插件快捷入口</span>
          </div>
          <div className="card-content">
            {enabled_plugin_list.length > 0 ? (
              <div className="flex flex-col gap-8">
                {enabled_plugin_list.map(plugin => (
                  <div key={plugin.id} className="flex items-center space-between p-8 rounded border">
                    <div className="plugin-info">
                      <div className="plugin-name">{plugin.name || plugin.id}</div>
                      <div className="text-muted plugin-version">v{plugin.version}</div>
                    </div>
                    <Link to={`/plugins/${plugin.id}`} className="btn btn-primary btn-open">
                      打开
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted empty-state">
                <div className="empty-icon">🔌</div>
                <div>暂无启用的插件</div>
                <Link to="/plugins" className="btn btn-outline mt-8">前往启用</Link>
              </div>
            )}
          </div>
        </div>

        {/* 系统通知 */}
        <div className="card" style={{ flex: '1', minWidth: '280px' }}>
          <div className="card-header">
            <span>系统通知</span>
          </div>
          <div className="card-content">
            {recent_notifications.length > 0 ? (
              <div className="flex flex-col gap-8">
                {recent_notifications.map(notification => (
                  <div key={notification.id} className="p-8 rounded" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                    <div className="flex items-center gap-8 mb-4">
                      <span className={`tag ${notification.level === 'error' ? 'danger' : notification.level === 'warn' ? 'warn' : 'success'}`}>
                        {notification.level}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{notification.title}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>{notification.content}</div>
                  </div>
                ))}
                {total_notifications > 3 && (
                  <div className="text-muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                                        还有 {total_notifications - 3} 条通知...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔔</div>
                <div>暂无系统通知</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 全部插件区域 */}
      <section className="surface p-16 mt-16">
        <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-lg)' }}>全部插件</h3>
        <div className="horizontal-scroll">
          {pluginList.map(plugin => {
            const is_coming_soon = plugin.status === 'coming-soon';
            const is_disabled = !plugin.enable || is_coming_soon;
            return (
              <Link
                key={plugin.id}
                to={is_coming_soon ? '#' : `/plugins/${plugin.id}`}
                className={`card ${is_disabled ? 'card-disabled' : ''}`}
                style={{
                  textDecoration: 'none',
                  minWidth: '160px',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  position: 'relative',
                  pointerEvents: is_coming_soon ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => !is_disabled && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !is_disabled && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {is_disabled && !is_coming_soon && <div className="permission-tooltip">插件无权限</div>}
                <div className="card-content" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{plugin.icon}</div>
                  <div style={{ fontWeight: 600 }}>{plugin.name}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>v{plugin.version}</div>
                  <div className={`tag ${is_coming_soon ? 'warn' : plugin.enable ? 'success' : ''}`} style={{ marginTop: '4px', fontSize: '10px' }}>
                    {is_coming_soon ? '即将推出' : plugin.enable ? '已启用' : '无权限'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {pluginList.length > 4 && (
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center', marginTop: '8px' }}>
                        ← 左右滑动查看更多插件 →
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
