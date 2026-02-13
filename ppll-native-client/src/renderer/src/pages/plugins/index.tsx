import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pluginRegistry } from '../../plugins/registry'
import { getPluginList, setPluginEnable, type PluginItem } from '../../router'

function PluginsPage() {
  const params = useParams()
  const active_plugin_id = params.id
  const plugin_container_ref = useRef<HTMLDivElement>(null)

  const [pluginList, setPluginList] = useState<PluginItem[]>(() => getPluginList())
  const [loading, setLoading] = useState(false)

  // 刷新插件列表
  function refreshPluginList() {
    setPluginList(getPluginList())
  }

  // 当路由参数变化时，挂载对应插件
  useEffect(() => {
    if (active_plugin_id && plugin_container_ref.current) {
      const plugin = pluginList.find((p) => p.id === active_plugin_id)
      if (plugin?.enable) {
        pluginRegistry.mount(active_plugin_id, plugin_container_ref.current)
      }
    }
  }, [active_plugin_id, pluginList])

  // 切换插件启用状态
  async function togglePlugin(plugin: PluginItem) {
    if (loading || plugin.status === 'coming-soon') return
    setLoading(true)

    try {
      const new_enable = !plugin.enable
      setPluginEnable(plugin.id, new_enable)

      if (!new_enable) {
        await pluginRegistry.disable(plugin.id)
      } else if (plugin_container_ref.current) {
        await pluginRegistry.enable(
          {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            enable: true
          },
          plugin_container_ref.current
        )
      }
      refreshPluginList()
    } catch (error) {
      console.error('切换插件状态失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 过滤插件列表
  const available_plugin_list = pluginList.filter((p) => p.status !== 'coming-soon')
  const enabled_plugin_list = available_plugin_list.filter((p) => p.enable)
  const disabled_plugin_list = available_plugin_list.filter((p) => !p.enable)

  // 插件详情页面
  if (active_plugin_id) {
    const plugin = pluginList.find((p) => p.id === active_plugin_id)
    const info = plugin || { name: active_plugin_id, description: '', icon: '🔧' }

    return (
      <div className="plugin-detail-page">
        <div className="plugin-detail-header">
          <div className="flex items-center space-between">
            <div className="flex items-center gap-12">
              <span style={{ fontSize: '24px' }}>{info.icon}</span>
              <div>
                <h1
                  style={{ margin: '0', fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}
                >
                  {info.name}
                </h1>
                {info.description && (
                  <p
                    className="text-muted"
                    style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)' }}
                  >
                    {info.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-8">
              <Link
                to="/"
                className="btn btn-outline"
                style={{ height: '32px', padding: '0 12px', fontSize: 'var(--text-sm)' }}
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
        <div className="plugin-detail-content">
          <div
            ref={plugin_container_ref}
            style={{ width: '100%', minHeight: 'calc(100vh - 60px)', padding: '0' }}
          >
            {plugin?.enable ? (
              <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 60px)' }} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'calc(100vh - 60px)',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                  <h3 style={{ margin: '0 0 8px' }}>插件无权限</h3>
                  <p className="text-muted" style={{ margin: '0 0 16px' }}>
                    请先启用此插件才能使用
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 插件管理页面
  return (
    <div className="container">
      <div className="surface p-16 mb-16">
        <h1 style={{ margin: '0 0 8px', color: 'var(--color-primary)' }}>插件管理</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          管理和配置量化交易插件
        </p>
      </div>

      <div className="flex gap-16" style={{ alignItems: 'flex-start' }}>
        <aside style={{ width: '300px', flexShrink: 0 }}>
          {/* 已启用插件 */}
          <div className="card mb-16">
            <div className="card-header">
              <div className="flex items-center space-between">
                <span>已启用插件</span>
                <span className="tag success">{enabled_plugin_list.length}</span>
              </div>
            </div>
            <div className="card-content">
              {enabled_plugin_list.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {enabled_plugin_list.map((plugin) => (
                    <div key={plugin.id} className="p-8 rounded border">
                      <div className="flex items-center space-between mb-8">
                        <Link
                          to={`/plugins/${plugin.id}`}
                          className="btn btn-ghost"
                          style={{ height: 'auto', padding: '4px 8px', textAlign: 'left' }}
                        >
                          <div className="flex items-center gap-8">
                            <span style={{ fontSize: '18px' }}>{plugin.icon}</span>
                            <span>{plugin.name}</span>
                          </div>
                        </Link>
                        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                          {plugin.version}
                        </span>
                      </div>
                      <button
                        className="btn btn-outline btn-danger"
                        style={{ width: '100%', height: '28px', fontSize: 'var(--text-sm)' }}
                        onClick={() => togglePlugin(plugin)}
                        disabled={loading}
                      >
                        {loading ? '处理中...' : '禁用'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
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
                <span className="tag">{disabled_plugin_list.length}</span>
              </div>
            </div>
            <div className="card-content">
              {disabled_plugin_list.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {disabled_plugin_list.map((plugin) => (
                    <div key={plugin.id} className="p-8 rounded border">
                      <div className="flex items-center gap-8 mb-8">
                        <span style={{ fontSize: '18px' }}>{plugin.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{plugin.name}</div>
                          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            {plugin.version}
                          </div>
                        </div>
                      </div>
                      {plugin.description && (
                        <div className="text-muted mb-8" style={{ fontSize: 'var(--text-sm)' }}>
                          {plugin.description}
                        </div>
                      )}
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', height: '28px', fontSize: 'var(--text-sm)' }}
                        onClick={() => togglePlugin(plugin)}
                        disabled={loading}
                      >
                        {loading ? '处理中...' : '启用'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
                  所有插件已启用
                </div>
              )}
            </div>
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <div className="card">
            <div className="card-header">
              <span>全部插件</span>
            </div>
            <div className="card-content">
              <div className="flex flex-col gap-12">
                {pluginList.map((plugin) => {
                  const is_coming_soon = plugin.status === 'coming-soon'
                  return (
                    <div key={plugin.id} className="flex items-center gap-12">
                      <div style={{ fontSize: '24px' }}>{plugin.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {plugin.name}
                          {is_coming_soon && (
                            <span className="tag warn" style={{ fontSize: '10px', height: '18px' }}>
                              即将推出
                            </span>
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                          {plugin.description}
                          {plugin.referenceUrl && (
                            <a
                              href={plugin.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginLeft: '8px', fontSize: 'var(--text-xs)' }}
                            >
                              参考设计 ↗
                            </a>
                          )}
                        </div>
                      </div>
                      {is_coming_soon ? (
                        <button className="btn btn-outline" disabled style={{ opacity: 0.5 }}>
                          敬请期待
                        </button>
                      ) : (
                        <Link to={`/plugins/${plugin.id}`} className="btn btn-outline">
                          查看
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PluginsPage
