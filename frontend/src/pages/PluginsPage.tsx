import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PluginList, PluginEnable, PluginDisable } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime';
import { pluginRegistry } from '../plugins/registry';
import type { Response } from '../core/response';
import { pluginInfo } from '../router';

function PluginsPage() {
    const params = useParams();
    const activePluginId = params.id;
    const pluginContainerRef = useRef<HTMLDivElement>(null);

    const [pluginList, setPluginList] = useState<{id:string;name:string;enable:boolean;version:string}[]>([]);
    const [loading, setLoading] = useState(false);

    // 获取插件列表
    async function refreshPluginList() {
        try {
            const res: Response<{pluginList: any[]}> = await PluginList();
            if (res.code === 0 && res.data) {
                setPluginList(res.data.pluginList);
            }
        } catch (error) {
            console.error('获取插件列表失败:', error);
        }
    }

    useEffect(() => {
        refreshPluginList();
    }, []);

    // 订阅插件事件
    useEffect(() => {
        EventsOn('plugin:enabled', refreshPluginList);
        EventsOn('plugin:disabled', refreshPluginList);
    }, []);

    // 当路由参数变化时，挂载对应插件
    useEffect(() => {
        if (activePluginId && pluginContainerRef.current) {
            const plugin = pluginList.find(p => p.id === activePluginId);
            if (plugin?.enable) {
                pluginRegistry.mount(activePluginId, pluginContainerRef.current);
            }
        }
    }, [activePluginId, pluginList]);

    // 切换插件启用状态
    async function togglePlugin(plugin: {id:string; enable:boolean}) {
        if (loading) return;
        setLoading(true);
        
        try {
            if (plugin.enable) {
                await PluginDisable(plugin.id);
                await pluginRegistry.disable(plugin.id);
            } else {
                await PluginEnable(plugin.id);
                if (pluginContainerRef.current) {
                    await pluginRegistry.enable({ 
                        id: plugin.id, 
                        name: '', 
                        version: '', 
                        enable: true 
                    }, pluginContainerRef.current);
                }
            }
            await refreshPluginList();
        } catch (error) {
            console.error('切换插件状态失败:', error);
        } finally {
            setLoading(false);
        }
    }

    const enabledPlugins = pluginList.filter(p => p.enable);
    const disabledPlugins = pluginList.filter(p => !p.enable);


    return (
        <div className="container">
            <div className="surface p-16 mb-16">
                <h1 style={{margin: '0 0 8px', color: 'var(--color-primary)'}}>插件管理</h1>
                <p className="text-muted" style={{margin: 0}}>管理和配置量化交易插件</p>
            </div>

            <div className="flex gap-16" style={{alignItems: 'flex-start'}}>
                {/* 插件侧栏 */}
                <aside style={{width: '300px', flexShrink: 0}}>
                    {/* 已启用插件 */}
                    <div className="card mb-16">
                        <div className="card-header">
                            <div className="flex items-center space-between">
                                <span>已启用插件</span>
                                <span className="tag success">{enabledPlugins.length}</span>
                            </div>
                        </div>
                        <div className="card-content">
                            {enabledPlugins.length > 0 ? (
                                <div className="flex flex-col gap-8">
                                    {enabledPlugins.map(plugin => {
                                        const info = pluginInfo[plugin.id] || {name: plugin.name || plugin.id, description: '', icon: '🔧'};
                                        const isActive = activePluginId === plugin.id;
                                        
                                        return (
                                            <div key={plugin.id} className={`p-8 rounded border ${isActive ? 'border' : ''}`} 
                                                 style={{backgroundColor: isActive ? 'var(--color-primary-50)' : 'transparent'}}>
                                                <div className="flex items-center space-between mb-8">
                                                    <Link 
                                                        to={`/plugins/${plugin.id}`} 
                                                        className="btn btn-ghost"
                                                        style={{
                                                            height: 'auto', 
                                                            padding: '4px 8px', 
                                                            textAlign: 'left',
                                                            fontWeight: isActive ? 600 : 400,
                                                            color: isActive ? 'var(--color-primary)' : 'inherit'
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-8">
                                                            <span style={{fontSize: '18px'}}>{info.icon}</span>
                                                            <span>{info.name}</span>
                                                        </div>
                                                    </Link>
                                                    <span className="text-muted" style={{fontSize: 'var(--text-xs)'}}>{plugin.version}</span>
                                                </div>
                                                <button 
                                                    className="btn btn-outline btn-danger"
                                                    style={{width: '100%', height: '28px', fontSize: 'var(--text-sm)'}}
                                                    onClick={() => togglePlugin(plugin)}
                                                    disabled={loading}
                                                >
                                                    {loading ? '处理中...' : '禁用'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-muted" style={{textAlign: 'center', padding: '16px 0'}}>
                                    暂无启用的插件
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 可用插件 */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center space-between">
                                <span>可用插件</span>
                                <span className="tag">{disabledPlugins.length}</span>
                            </div>
                        </div>
                        <div className="card-content">
                            {disabledPlugins.length > 0 ? (
                                <div className="flex flex-col gap-8">
                                    {disabledPlugins.map(plugin => {
                                        const info = pluginInfo[plugin.id] || {name: plugin.name || plugin.id, description: '', icon: '🔧'};
                                        
                                        return (
                                            <div key={plugin.id} className="p-8 rounded border">
                                                <div className="flex items-center space-between mb-8">
                                                    <div className="flex items-center gap-8">
                                                        <span style={{fontSize: '18px'}}>{info.icon}</span>
                                                        <div>
                                                            <div style={{fontWeight: 600}}>{info.name}</div>
                                                            <div className="text-muted" style={{fontSize: 'var(--text-xs)'}}>{plugin.version}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {info.description && (
                                                    <div className="text-muted mb-8" style={{fontSize: 'var(--text-sm)'}}>{info.description}</div>
                                                )}
                                                <button 
                                                    className="btn btn-primary"
                                                    style={{width: '100%', height: '28px', fontSize: 'var(--text-sm)'}}
                                                    onClick={() => togglePlugin(plugin)}
                                                    disabled={loading}
                                                >
                                                    {loading ? '处理中...' : '启用'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-muted" style={{textAlign: 'center', padding: '16px 0'}}>
                                    所有插件已启用
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* 插件内容区域 */}
                <section style={{flex: 1}}>
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center space-between">
                                <span>
                                    {activePluginId ? 
                                        `${pluginInfo[activePluginId]?.name || activePluginId} - 插件页面` : 
                                        '插件展示区域'
                                    }
                                </span>
                                {activePluginId && (
                                    <Link to="/plugins" className="btn btn-ghost" style={{height: '28px', padding: '0 8px', fontSize: 'var(--text-sm)'}}>
                                        返回列表
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="card-content">
                            <div 
                                ref={pluginContainerRef} 
                                style={{
                                    minHeight: '400px', 
                                    border: activePluginId ? 'none' : '2px dashed var(--color-border)', 
                                    borderRadius: 'var(--radius-md)',
                                    padding: activePluginId ? '0' : '24px',
                                    display: 'flex',
                                    alignItems: activePluginId ? 'stretch' : 'center',
                                    justifyContent: activePluginId ? 'stretch' : 'center'
                                }}
                            >
                                {!activePluginId && (
                                    <div style={{textAlign: 'center'}}>
                                        <div style={{fontSize: '64px', marginBottom: '16px'}}>🔌</div>
                                        <h3 style={{margin: '0 0 8px'}}>选择一个插件</h3>
                                        <p className="text-muted" style={{margin: '0 0 16px'}}>从左侧菜单选择要查看的插件</p>
                                        <div className="text-muted" style={{fontSize: 'var(--text-sm)'}}>
                                            支持的插件：U本位合约超市、做T网格、天地针网格
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 插件说明 */}
                    {!activePluginId && (
                        <div className="card mt-16">
                            <div className="card-header">
                                <span>插件说明</span>
                            </div>
                            <div className="card-content">
                                <div className="flex flex-col gap-12">
                                    {Object.entries(pluginInfo).map(([id, info]) => (
                                        <div key={id} className="flex items-center gap-12">
                                            <div style={{fontSize: '24px'}}>{info.icon}</div>
                                            <div style={{flex: 1}}>
                                                <div style={{fontWeight: 600}}>{info.name}</div>
                                                <div className="text-muted" style={{fontSize: 'var(--text-sm)'}}>{info.description}</div>
                                            </div>
                                            <Link to={`/plugins/${id}`} className="btn btn-outline">查看</Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default PluginsPage;
