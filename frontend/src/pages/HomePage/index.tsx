import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifications } from '../../notifications/store';
import { PluginList } from '../../../wailsjs/go/main/App';
import type { Response } from '../../core/response';

function HomePage() {
    const [notifyList, setNotifyList] = useState(notifications.list);
    const [pluginList, setPluginList] = useState<{ id: string; name: string; enable: boolean; version: string }[]>([]);
    const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);

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
            {/* 快速状态卡片 */}
            <div className="flex gap-16 mb-16" style={{ flexWrap: 'wrap' }}>
                <div className="flex gap-16" style={{ flex: '2', }}>
                    <div className="card" style={{ flex: '1', minWidth: '200px' }}>
                        <div className="card-content">
                            <div className="flex items-center space-between">
                                <div>
                                    <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>已启用插件</div>
                                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-primary)' }}>{enabledPlugins.length}</div>
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
                                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-warning)' }}>{totalNotifications}</div>
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
                <div className="card" style={{ flex: '2', minWidth: '300px' }}>
                    <div className="card-header">
                        <div className="flex items-center space-between">
                            <span>插件快捷入口</span>
                            <button
                                className={`btn ${isEditingShortcuts ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ height: '28px', padding: '0 8px', fontSize: 'var(--text-sm)' }}
                                onClick={() => setIsEditingShortcuts(!isEditingShortcuts)}
                            >
                                {isEditingShortcuts ? '完成' : '编辑'}
                            </button>
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
                                        <div className="flex gap-8">
                                            {isEditingShortcuts && (
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ height: '32px', padding: '0 12px' }}
                                                    onClick={() => {
                                                        // 这里可以添加从快捷入口移除插件的逻辑
                                                        console.log('移除插件快捷入口:', plugin.id);
                                                    }}
                                                >
                                                    移除
                                                </button>
                                            )}
                                            <Link to={`/plugins/${plugin.id}`} className="btn btn-primary" style={{ height: '32px', padding: '0 12px' }}>
                                                打开
                                            </Link>
                                        </div>
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

            {/* 全部插件区域 */}
            <section className="surface p-16 mt-16">
                <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-lg)' }}>全部插件</h3>
                <div className="horizontal-scroll">
                    {pluginList.length > 0 ? (
                        pluginList.map(plugin => (
                            <Link
                                key={plugin.id}
                                to={`/plugins/${plugin.id}`}
                                className={`card ${!plugin.enable ? 'card-disabled' : ''}`}
                                style={{
                                    textDecoration: 'none',
                                    minWidth: '160px',
                                    flexShrink: 0,
                                    transition: 'transform 0.2s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => plugin.enable && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => plugin.enable && (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                {!plugin.enable && <div className="permission-tooltip">插件无权限</div>}
                                <div className="card-content" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                                        {plugin.id === 'u-contract-market' ? '📊' :
                                            plugin.id.includes('grid') ? '🔄' :
                                                plugin.id.includes('needle') ? '⚡' :
                                                    plugin.id.includes('setting') ? '⚙️' : '🔌'}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{plugin.name || plugin.id}</div>
                                    <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>v{plugin.version}</div>
                                    <div className={`tag ${plugin.enable ? 'success' : ''}`} style={{ marginTop: '4px', fontSize: '10px' }}>
                                        {plugin.enable ? '已启用' : '无权限'}
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-muted" style={{ textAlign: 'center', padding: '24px', width: '100%' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔌</div>
                            <div>暂无插件</div>
                            <Link to="/plugins" className="btn btn-outline mt-8">前往管理</Link>
                        </div>
                    )}
                </div>
                {/* 横向滚动提示 */}
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
