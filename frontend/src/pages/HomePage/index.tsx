import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifications } from '../../notifications/store';
import { PluginList } from '../../../wailsjs/go/main/App';
import type { Response } from '../../core/response';

function HomePage() {
    const [notifyList, setNotifyList] = useState(notifications.list);
    const [pluginList, setPluginList] = useState<{ id: string; name: string; enable: boolean; version: string }[]>([]);

    // 通知系统初始化
    useEffect(() => {
        notifications.init();
        const timer = setInterval(() => setNotifyList([...notifications.list]), 500);
        return () => clearInterval(timer);
    }, []);

    // 获取插件状态
    useEffect(() => {
        async function fetchPlugins() {
            const res: Response<{ pluginList: any[] }> = await PluginList();
            if (res.code === 0 && res.data) {
                setPluginList(res.data.pluginList);
            }
        }
        fetchPlugins();
    }, []);

    // 快速统计数据
    const enabledPlugins = pluginList.filter(p => p.enable);
    const totalNotifications = notifyList.length;
    const recentNotifications = notifyList.slice(0, 3);

    return (
        <div className="container">
            {/* 欢迎区域 */}
            <section className="surface p-16 mb-16">
                <div className="flex items-center space-between mb-12">
                    <div>
                        <h1 style={{ margin: 0, color: 'var(--color-primary)' }}>PPLL 量化交易客户端</h1>
                        <p className="text-muted" style={{ margin: '4px 0 0' }}>专业的量化交易桌面解决方案</p>
                    </div>
                    <div className="flex gap-8">
                        <Link to="/settings" className="btn btn-outline">系统设置</Link>
                        <Link to="/plugins" className="btn btn-primary">插件管理</Link>
                    </div>
                </div>
            </section>

            {/* 快速状态卡片 */}
            <div className="flex gap-16 mb-16" style={{ flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                    <div className="card-content">
                        <div className="flex items-center space-between">
                            <div>
                                <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>已启用插件</div>
                                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-primary)' }}>{enabledPlugins.length}</div>
                            </div>
                            <div style={{ fontSize: '24px' }}>🔧</div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                    <div className="card-content">
                        <div className="flex items-center space-between">
                            <div>
                                <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>系统通知</div>
                                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-warning)' }}>{totalNotifications}</div>
                            </div>
                            <div style={{ fontSize: '24px' }}>📢</div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                    <div className="card-content">
                        <div className="flex items-center space-between">
                            <div>
                                <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>运行状态</div>
                                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-success)' }}>正常</div>
                            </div>
                            <div style={{ fontSize: '24px' }}>✅</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主要功能区域 */}
            <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
                {/* 插件快捷入口 */}
                <div className="card" style={{ flex: '2', minWidth: '300px' }}>
                    <div className="card-header">
                        <div className="flex items-center space-between">
                            <span>插件快捷入口</span>
                            <Link to="/plugins" className="btn btn-ghost" style={{ height: '28px', padding: '0 8px', fontSize: 'var(--text-sm)' }}>查看全部</Link>
                        </div>
                    </div>
                    <div className="card-content">
                        {enabledPlugins.length > 0 ? (
                            <div className="flex flex-col gap-8">
                                {enabledPlugins.map(plugin => (
                                    <div key={plugin.id} className="flex items-center space-between p-8 rounded border">
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{plugin.name || plugin.id}</div>
                                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>v{plugin.version}</div>
                                        </div>
                                        <Link to={`/plugins/${plugin.id}`} className="btn btn-primary" style={{ height: '32px', padding: '0 12px' }}>
                                            打开
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔌</div>
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
                        {recentNotifications.length > 0 ? (
                            <div className="flex flex-col gap-8">
                                {recentNotifications.map(notification => (
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
                                {totalNotifications > 3 && (
                                    <div className="text-muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                                        还有 {totalNotifications - 3} 条通知...
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

            {/* 快速操作区域 */}
            <section className="surface p-16 mt-16">
                <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-lg)' }}>快速操作</h3>
                <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
                    <Link to="/plugins/u-contract-market" className="card" style={{ textDecoration: 'none', minWidth: '160px', transition: 'transform 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                            <div style={{ fontWeight: 600 }}>合约超市</div>
                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>策略模板管理</div>
                        </div>
                    </Link>

                    <Link to="/plugins/u-grid-t" className="card" style={{ textDecoration: 'none', minWidth: '160px', transition: 'transform 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
                            <div style={{ fontWeight: 600 }}>做T网格</div>
                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>网格交易策略</div>
                        </div>
                    </Link>

                    <Link to="/plugins/u-grid-tdz" className="card" style={{ textDecoration: 'none', minWidth: '160px', transition: 'transform 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                            <div style={{ fontWeight: 600 }}>天地针网格</div>
                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>高频网格策略</div>
                        </div>
                    </Link>

                    <Link to="/settings" className="card" style={{ textDecoration: 'none', minWidth: '160px', transition: 'transform 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className="card-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
                            <div style={{ fontWeight: 600 }}>系统设置</div>
                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>配置与更新</div>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
