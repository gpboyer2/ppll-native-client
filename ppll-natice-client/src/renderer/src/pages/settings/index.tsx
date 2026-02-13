import { useState, useEffect } from 'react'
import { feedURLExamples } from '../../router'
import { useDataManagementStore } from '../../stores/data-management-store'
import { useSystemInfoStore } from '../../stores/system-info-store'
import { useBinanceStore } from '../../stores/binance-store'
import { TextInput, PasswordInput, NumberInput } from '../../components/mantine'
import { BinanceApiKeyApi } from '../../api'
import type { BinanceApiKey } from '../../stores/binance-store'
import { showSuccess } from '../../utils/api-error'

function SettingsPage() {
  // 使用系统信息 store
  const { staticInfo: systemStaticInfo, dynamicInfo: systemDynamicInfo } = useSystemInfoStore()

  // 使用数据管理 store
  const { recordClearOperation, getClearStats } = useDataManagementStore()

  // 使用 binance store
  const { init, api_key_list, refreshApiKeys, active_api_key_id, set_active_api_key } =
    useBinanceStore()

  // 更新设置状态
  const [feedURL, setFeedURL] = useState('')
  const [autoCheck, setAutoCheck] = useState(false)
  const [checkIntervalMinute, setCheckIntervalMinute] = useState(30)
  const [autoDownload, setAutoDownload] = useState(true)
  const [silentInstall, setSilentInstall] = useState(true)

  // 更新状态展示
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Binance ApiKey 管理状态
  const [showAddApiKey, setShowAddApiKey] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState<BinanceApiKey | null>(null)
  const [api_key_form, set_api_key_form] = useState({
    name: '',
    api_key: '',
    api_secret: '',
    status: 2,
    remark: ''
  })
  const [api_key_status, set_api_key_status] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle'
  )

  // 数据清理相关状态
  const [dataSize, setDataSize] = useState<any>(null)
  const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // 更新事件监听（Electron 架构暂不支持）
  useEffect(() => {
    // Electron 架构下暂不支持自动更新功能
  }, [])

  // 初始化 binance store
  useEffect(() => {
    init()
  }, [])

  // Electron 架构下暂不支持自动更新功能
  async function saveUpdateConfig() {
    alert('此功能暂不支持')
  }

  // Electron 架构下暂不支持自动更新功能
  async function checkUpdateNow() {
    alert('此功能暂不支持')
  }

  // ApiKey 管理函数
  function resetApiKeyForm() {
    set_api_key_form({
      name: '',
      api_key: '',
      api_secret: '',
      status: 2,
      remark: ''
    })
    setEditingApiKey(null)
    setShowAddApiKey(false)
  }

  function handleAddApiKey() {
    set_api_key_form({
      name: '',
      api_key: '',
      api_secret: '',
      status: 2,
      remark: ''
    })
    setEditingApiKey(null)
    setShowAddApiKey(true)
  }

  function handleEditApiKey(api_key: BinanceApiKey) {
    setEditingApiKey(api_key)
    set_api_key_form({
      name: api_key.name,
      api_key: api_key.api_key,
      api_secret: api_key.api_secret,
      status: api_key.status,
      remark: api_key.remark || ''
    })
    setShowAddApiKey(true)
  }

  async function handleSaveApiKey() {
    if (
      !api_key_form.name.trim() ||
      !api_key_form.api_key.trim() ||
      !api_key_form.api_secret.trim()
    ) {
      set_api_key_status('error')
      setTimeout(() => set_api_key_status('idle'), 500)
      return
    }

    set_api_key_status('saving')
    try {
      const body = editingApiKey
        ? {
            id: editingApiKey.id,
            name: api_key_form.name,
            api_key: api_key_form.api_key, // 下划线命名
            api_secret: api_key_form.api_secret, // 下划线命名
            status: api_key_form.status,
            remark: api_key_form.remark
          }
        : {
            name: api_key_form.name,
            api_key: api_key_form.api_key, // 下划线命名
            api_secret: api_key_form.api_secret, // 下划线命名
            status: api_key_form.status,
            remark: api_key_form.remark
          }

      const response = editingApiKey
        ? await BinanceApiKeyApi.update(body)
        : await BinanceApiKeyApi.create(body)

      if (response.status === 'success') {
        set_api_key_status('success')
        // 刷新列表
        await refreshApiKeys()
        setTimeout(() => {
          set_api_key_status('idle')
          resetApiKeyForm()
        }, 500)
      } else {
        console.error('保存 API Key 失败:', response.message)
        set_api_key_status('error')
        setTimeout(() => set_api_key_status('idle'), 500)
      }
    } catch (error) {
      console.error('保存 API Key 失败:', error)
      set_api_key_status('error')
      setTimeout(() => set_api_key_status('idle'), 500)
    }
  }

  async function handleDeleteApiKey(id: number) {
    if (!confirm('确认删除此 API Key？')) {
      return
    }

    try {
      const response = await BinanceApiKeyApi.delete({ data: [id] })

      if (response.status === 'success') {
        // 刷新列表
        await refreshApiKeys()
      } else {
        console.error('删除 API Key 失败:', response.message)
        alert('删除失败: ' + (response.message || '未知错误'))
      }
    } catch (error) {
      console.error('删除 API Key 失败:', error)
      alert('删除失败，请重试')
    }
  }

  function handleSetActiveApiKey(id: string) {
    set_active_api_key(id)
    showSuccess('已切换 API Key')
  }

  function maskApiKey(key: string | undefined): string {
    if (!key) return ''
    if (key.length <= 8) return key
    return key.substring(0, 4) + '****' + key.substring(key.length - 4)
  }

  // 数据清理相关函数（Electron 架构暂不支持）
  async function loadDataSize() {
    // Electron 架构暂不支持此功能
  }

  async function handleClearAllData() {
    alert('此功能暂不支持')
  }

  // 组件挂载时加载数据大小
  useEffect(() => {
    loadDataSize()
  }, [])

  return (
    <div className="container">
      {/* Binance ApiKey 管理 */}
      <div className="card mb-16">
        <div className="card-header">
          <div className="binance-apikey-header">
            <h3 style={{ margin: 0 }}>Binance ApiKey 管理</h3>
            <button className="btn btn-primary" onClick={handleAddApiKey}>
              添加 API Key
            </button>
          </div>
        </div>
        <div className="card-content">
          {/* API Key 列表 */}
          {api_key_list.length > 0 && (
            <div className="binance-apikey-list">
              {api_key_list.map((item) => {
                const is_active = String(item.id) === active_api_key_id
                return (
                  <div key={item.id} className="binance-apikey-item">
                    <div className="binance-apikey-item-info">
                      <div className="binance-apikey-item-header">
                        <span className="binance-apikey-item-name">{item.name}</span>
                      </div>
                      <div className="binance-apikey-item-details">
                        <div className="binance-apikey-item-detail">
                          <span className="text-muted">API Key:</span>
                          <span className="binance-apikey-masked">{maskApiKey(item.api_key)}</span>
                        </div>
                        <div className="binance-apikey-item-detail">
                          <span className="text-muted">Secret Key:</span>
                          <span className="binance-apikey-masked">
                            {maskApiKey(item.api_secret)}
                          </span>
                        </div>
                        <div className="binance-apikey-item-detail">
                          <span className="text-muted">创建时间:</span>
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="binance-apikey-item-actions">
                      {is_active ? (
                        <div className="binance-apikey-active-badge">当前使用</div>
                      ) : (
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => handleSetActiveApiKey(String(item.id))}
                        >
                          设为当前
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-small"
                        onClick={() => handleEditApiKey(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteApiKey(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 空状态 - 只在没有 API Key 且没有显示表单时显示 */}
          {api_key_list.length === 0 && !showAddApiKey && (
            <div className="binance-apikey-empty">
              <div className="text-muted">暂无 API Key，点击上方按钮添加</div>
            </div>
          )}

          {/* 添加/编辑 API Key 表单 */}
          {showAddApiKey && (
            <div className="binance-apikey-form">
              <div className="binance-apikey-form-header">
                <h4>{editingApiKey ? '编辑 API Key' : '添加 API Key'}</h4>
                <button className="btn btn-ghost" onClick={resetApiKeyForm}>
                  取消
                </button>
              </div>

              <div className="binance-apikey-form-content">
                <div className="binance-apikey-form-grid">
                  <div className="binance-apikey-form-field">
                    <label className="label">名称</label>
                    <TextInput
                      placeholder="API Key 名称"
                      value={api_key_form.name}
                      onChange={(value: string) =>
                        set_api_key_form((prev) => ({ ...prev, name: value }))
                      }
                    />
                  </div>

                  <div className="binance-apikey-form-field">
                    <label className="label">API Key</label>
                    <TextInput
                      placeholder="Binance API Key"
                      value={api_key_form.api_key}
                      onChange={(value: string) =>
                        set_api_key_form((prev) => ({ ...prev, api_key: value }))
                      }
                    />
                  </div>

                  <div className="binance-apikey-form-field">
                    <label className="label">Secret Key</label>
                    <PasswordInput
                      placeholder="Binance Secret Key"
                      value={api_key_form.api_secret}
                      onChange={(value: string) =>
                        set_api_key_form((prev) => ({ ...prev, api_secret: value }))
                      }
                    />
                  </div>
                </div>

                <div className="binance-apikey-form-actions">
                  <button
                    className={`btn ${api_key_status === 'saving' ? 'btn-outline' : 'btn-primary'}`}
                    onClick={handleSaveApiKey}
                    disabled={api_key_status === 'saving'}
                  >
                    {api_key_status === 'saving' ? '保存中...' : editingApiKey ? '更新' : '保存'}
                  </button>
                </div>

                {api_key_status === 'success' && (
                  <div className="binance-apikey-form-message binance-apikey-form-success">
                    ✅ {editingApiKey ? 'API Key 更新成功' : 'API Key 添加成功'}
                  </div>
                )}

                {api_key_status === 'error' && (
                  <div className="binance-apikey-form-message binance-apikey-form-error">
                    ❌ 操作失败，请检查输入信息并重试
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 更新设置 */}
      <div className="card mb-16">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>自动更新设置</h3>
        </div>
        <div className="card-content">
          <div className="form-row">
            <label className="label">更新源 Feed URL</label>
            <TextInput
              placeholder="请输入更新源地址"
              value={feedURL}
              onChange={(value: string) => setFeedURL(value)}
            />
            <div className="help">
              <div style={{ marginBottom: '8px' }}>常用示例（点击快速填入）：</div>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {feedURLExamples.map((example, index) => (
                  <button
                    key={index}
                    className="btn btn-ghost"
                    style={{ height: '28px', padding: '0 8px', fontSize: 'var(--text-xs)' }}
                    onClick={() => setFeedURL(example.url)}
                    title={example.description}
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
            <label className="flex items-center gap-8">
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={(e) => setAutoCheck(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text)' }}>自动检查更新</span>
            </label>

            <div className="flex items-center gap-8">
              <span className="label">检查间隔（分钟）:</span>
              <NumberInput
                style={{ width: '100px' }}
                value={checkIntervalMinute}
                onChange={(value: string | number) =>
                  setCheckIntervalMinute(
                    typeof value === 'number' ? value : parseFloat(value || '0')
                  )
                }
                min={1}
                max={1440}
              />
            </div>
          </div>

          <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
            <label className="flex items-center gap-8">
              <input
                type="checkbox"
                checked={autoDownload}
                onChange={(e) => setAutoDownload(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text)' }}>自动下载更新</span>
            </label>

            <label className="flex items-center gap-8">
              <input
                type="checkbox"
                checked={silentInstall}
                onChange={(e) => setSilentInstall(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text)' }}>静默安装</span>
            </label>
          </div>

          <div className="flex gap-8">
            <button
              className={`btn ${saveStatus === 'saving' ? 'btn-outline' : 'btn-primary'}`}
              onClick={saveUpdateConfig}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '保存中...' : '保存设置'}
            </button>

            <button className="btn btn-outline" onClick={checkUpdateNow}>
              立即检查更新
            </button>
          </div>

          {saveStatus === 'success' && (
            <div
              className="mt-8 p-8 rounded"
              style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-success)' }}
            >
              ✅ 设置保存成功
            </div>
          )}

          {saveStatus === 'error' && (
            <div
              className="mt-8 p-8 rounded"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))',
                color: 'var(--color-danger)'
              }}
            >
              ❌ 保存失败，请重试
            </div>
          )}
        </div>
      </div>

      {/* 更新状态 */}
      {(updateInfo || progress) && (
        <div className="card mb-16">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>更新状态</h3>
          </div>
          <div className="card-content">
            {updateInfo && (
              <div className="mb-12">
                <div className="flex items-center gap-8 mb-8">
                  <span className={`tag ${updateInfo.available ? 'success' : ''}`}>
                    {updateInfo.available ? '有可用更新' : '已是最新版本'}
                  </span>
                </div>
                {updateInfo.available && (
                  <div>
                    <div>
                      <strong>新版本:</strong> {updateInfo.version}
                    </div>
                    {updateInfo.releaseNotes && (
                      <div className="mt-8">
                        <strong>更新说明:</strong>
                        <div
                          className="mt-4 p-8 rounded border"
                          style={{ fontSize: 'var(--text-sm)' }}
                        >
                          {updateInfo.releaseNotes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {progress && (
              <div>
                <div className="flex items-center space-between mb-8">
                  <span>下载进度</span>
                  <span>{progress.percent?.toFixed?.(2) || 0}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--color-bg-muted)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${progress.percent || 0}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                {progress.percent >= 100 && (
                  <div className="mt-8 text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                    下载完成，准备安装...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据管理 */}
      <div className="card mb-16">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>数据管理</h3>
        </div>
        <div className="card-content">
          {/* 数据大小信息 */}
          {dataSize && (
            <div className="mb-16">
              <div className="flex flex-col gap-8">
                <div className="flex space-between">
                  <span className="text-muted">存储位置</span>
                  <span className="text-sm font-mono">{dataSize.configPath}</span>
                </div>
                <div className="flex space-between">
                  <span className="text-muted">配置项数量</span>
                  <span>{dataSize.totalItems} 项</span>
                </div>
                <div className="flex space-between">
                  <span className="text-muted">数据大小</span>
                  <span>{dataSize.configSize} 字节</span>
                </div>
              </div>

              {/* 清理统计信息 */}
              <div
                className="mt-12 p-8 rounded"
                style={{ backgroundColor: 'var(--color-bg-muted)' }}
              >
                <div className="text-sm text-muted mb-8">清理统计:</div>
                {(() => {
                  const stats = getClearStats()
                  return (
                    <div className="flex flex-col gap-4 text-xs">
                      <div className="flex space-between">
                        <span>总清理次数:</span>
                        <span>{stats.totalClears} 次</span>
                      </div>
                      <div className="flex space-between">
                        <span>上次清理:</span>
                        <span>{stats.last_clear}</span>
                      </div>
                      {stats.totalClears > 0 && (
                        <div className="flex space-between">
                          <span>距今天数:</span>
                          <span>{stats.days_since_last_clear} 天</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* 详细配置项列表 - 但没有必要给用户展示 */}
              {/* {dataSize.itemDetails && Object.keys(dataSize.itemDetails).length > 0 && (
                                <div className="mt-12">
                                    <div className="text-sm text-muted mb-8">当前存储的配置项:</div>
                                    <div className="p-8 rounded" style={{ backgroundColor: 'var(--color-bg-muted)', maxHeight: '120px', overflowY: 'auto' }}>
                                        {Object.keys(dataSize.itemDetails).map((key, index) => (
                                            <div key={index} className="text-xs font-mono mb-4">
                                                <span className="text-primary">{key}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )} */}
            </div>
          )}

          {/* 清理操作区域 */}
          <div
            className="p-12 rounded"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))',
              border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)'
            }}
          >
            <div className="flex items-start gap-12">
              <div className="flex-1">
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-danger)' }}>⚠️ 危险操作</h4>
                <p className="text-sm text-muted mb-12">清理所有应用数据将会删除：</p>
                <ul className="text-sm text-muted mb-12" style={{ paddingLeft: '16px' }}>
                  <li>所有用户设置和偏好</li>
                  <li>策略配置参数</li>
                  <li>API Key 配置信息</li>
                  <li>其他所有持久化数据</li>
                </ul>
                <p className="text-xs text-muted">此操作不可恢复，请谨慎操作！</p>
              </div>

              <div className="flex flex-col gap-8">
                <button
                  className="btn btn-ghost"
                  onClick={loadDataSize}
                  style={{ minWidth: '100px' }}
                >
                  刷新数据
                </button>

                {!showClearConfirm ? (
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowClearConfirm(true)}
                    style={{ minWidth: '100px' }}
                  >
                    清理数据
                  </button>
                ) : (
                  <div className="flex flex-col gap-8">
                    <div className="text-xs text-center text-danger mb-4">确认清理所有数据？</div>
                    <div className="flex gap-4">
                      <button
                        className={`btn btn-danger ${clearDataStatus === 'loading' ? 'btn-outline' : ''}`}
                        onClick={handleClearAllData}
                        disabled={clearDataStatus === 'loading'}
                        style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                      >
                        {clearDataStatus === 'loading' ? '清理中...' : '确认'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setShowClearConfirm(false)}
                        disabled={clearDataStatus === 'loading'}
                        style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作状态提示 */}
            {clearDataStatus === 'success' && (
              <div
                className="mt-12 p-8 rounded"
                style={{
                  backgroundColor: 'var(--color-success-50)',
                  color: 'var(--color-success)'
                }}
              >
                ✅ 数据清理完成！所有配置已重置为默认值。
              </div>
            )}

            {clearDataStatus === 'error' && (
              <div
                className="mt-12 p-8 rounded"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))',
                  color: 'var(--color-danger)'
                }}
              >
                ❌ 数据清理失败，请重试或查看控制台错误信息。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>系统信息</h3>
        </div>
        <div className="card-content">
          <div className="flex flex-col gap-8">
            {systemStaticInfo && (
              <>
                <div className="flex space-between">
                  <span className="text-muted">应用版本</span>
                  <span>v{systemStaticInfo.app_version}</span>
                </div>
                <div className="flex space-between">
                  <span className="text-muted">运行环境</span>
                  <span>{systemStaticInfo.environment}</span>
                </div>
                <div className="flex space-between">
                  <span className="text-muted">Node.js 服务</span>
                  <span
                    className={
                      systemDynamicInfo?.health?.service?.is_running
                        ? 'text-success'
                        : 'text-danger'
                    }
                  >
                    {systemDynamicInfo?.health?.service?.is_running ? '运行中' : '未运行'}
                  </span>
                </div>
                <div className="flex space-between">
                  <span className="text-muted">服务健康状态</span>
                  <span
                    className={
                      systemDynamicInfo?.health?.health?.is_healthy ? 'text-success' : 'text-danger'
                    }
                  >
                    {systemDynamicInfo?.health?.health?.is_healthy ? '健康' : '异常'}
                  </span>
                </div>
                {systemDynamicInfo?.health?.service?.uptime && (
                  <div className="flex space-between">
                    <span className="text-muted">运行时长</span>
                    <span>{systemDynamicInfo.health.service.uptime}</span>
                  </div>
                )}
                <div className="flex space-between">
                  <span className="text-muted">数据库状态</span>
                  <span
                    className={
                      systemDynamicInfo?.health?.health?.database?.healthy
                        ? 'text-success'
                        : 'text-danger'
                    }
                  >
                    {systemDynamicInfo?.health?.health?.database?.healthy ? '正常' : '异常'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 占位 */}
      <div style={{ height: '16px' }}></div>
    </div>
  )
}

export default SettingsPage
