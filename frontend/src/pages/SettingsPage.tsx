import { useState, useEffect } from 'react';
import { UpdateSaveConfig, UpdateCheckNow, ClearAllData, GetDataSize } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime';
import type { Response } from '../core/response';
import { feedURLExamples } from '../router';
import { useUserStore } from '../stores/user-store';
import { useDataManagementStore } from '../stores/data-management-store';

interface ApiKeyItem {
    id: string;
    name: string;
    apiKey: string;
    secretKey: string;
    createdAt: string;
}

function SettingsPage() {
    // 使用 Pinia-like user store
    const {
        // State
        username, email, theme, language,
        defaultLeverage, defaultSymbol, riskLevel,
        enableNotifications, soundEnabled,
        compactMode, showAdvancedFeatures,
        
        // Actions
        setUsername, setEmail, setTheme, setLanguage,
        setDefaultLeverage, setDefaultSymbol, setRiskLevel,
        toggleNotifications, toggleSound,
        toggleCompactMode, toggleAdvancedFeatures,
        updateSettings, resetToDefaults, getSettingsSummary
    } = useUserStore();

    // 使用数据管理 store
    const {
        recordClearOperation,
        getClearStats,
        confirmBeforeClear,
    } = useDataManagementStore();

    // 更新设置状态
    const [feedURL, setFeedURL] = useState('');
    const [autoCheck, setAutoCheck] = useState(false);
    const [checkIntervalMinute, setCheckIntervalMinute] = useState(30);
    const [autoDownload, setAutoDownload] = useState(true);
    const [silentInstall, setSilentInstall] = useState(true);

    // 更新状态展示
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Binance ApiKey 管理状态
    const [apiKeyList, setApiKeyList] = useState<ApiKeyItem[]>([]);
    const [showAddApiKey, setShowAddApiKey] = useState(false);
    const [editingApiKey, setEditingApiKey] = useState<ApiKeyItem | null>(null);
    const [apiKeyForm, setApiKeyForm] = useState({
        name: '',
        apiKey: '',
        secretKey: ''
    });
    const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // 数据清理相关状态
    const [dataSize, setDataSize] = useState<any>(null);
    const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        // 订阅更新事件
        EventsOn('update:available', (info: any) => setUpdateInfo(info));
        EventsOn('update:progress', (p: any) => setProgress(p));
        EventsOn('update:downloaded', (p: any) => setProgress({ ...p, percent: 100 }));
    }, []);

    async function saveUpdateConfig() {
        setSaveStatus('saving');
        try {
            const cfg = { feedURL, channel: 'stable', autoCheck, checkIntervalMinute, autoDownload, silentInstall, hashAlgo: 'md5' };
            const res: Response<any> = await UpdateSaveConfig(cfg as any);
            if (res.code === 0) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 500);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 500);
            }
        } catch (error) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 500);
        }
    }

    async function checkUpdateNow() {
        try {
            const res: Response<any> = await UpdateCheckNow();
            if (res.code === 0) {
                setUpdateInfo(res.data);
            }
        } catch (error) {
            console.error('检查更新失败:', error);
        }
    }

    // ApiKey 管理函数
    function resetApiKeyForm() {
        setApiKeyForm({
            name: '',
            apiKey: '',
            secretKey: ''
        });
        setEditingApiKey(null);
        setShowAddApiKey(false);
    }

    function handleAddApiKey() {
        setApiKeyForm({
            name: '',
            apiKey: '',
            secretKey: ''
        });
        setEditingApiKey(null);
        setShowAddApiKey(true);
    }

    function handleEditApiKey(apiKey: ApiKeyItem) {
        setEditingApiKey(apiKey);
        setApiKeyForm({
            name: apiKey.name,
            apiKey: apiKey.apiKey,
            secretKey: apiKey.secretKey
        });
        setShowAddApiKey(true);
    }

    async function handleSaveApiKey() {
        if (!apiKeyForm.name.trim() || !apiKeyForm.apiKey.trim() || !apiKeyForm.secretKey.trim()) {
            setApiKeyStatus('error');
            setTimeout(() => setApiKeyStatus('idle'), 500);
            return;
        }

        setApiKeyStatus('saving');
        try {
            // 模拟保存 API Key 的逻辑
            await new Promise(resolve => setTimeout(resolve, 500));

            if (editingApiKey) {
                // 更新现有 API Key
                setApiKeyList(prev => prev.map(item =>
                    item.id === editingApiKey.id
                        ? { ...item, ...apiKeyForm }
                        : item
                ));
            } else {
                // 添加新 API Key
                const newApiKey: ApiKeyItem = {
                    id: Date.now().toString(),
                    ...apiKeyForm,
                    createdAt: new Date().toISOString()
                };
                setApiKeyList(prev => [...prev, newApiKey]);
            }

            setApiKeyStatus('success');
            setTimeout(() => {
                setApiKeyStatus('idle');
                resetApiKeyForm();
            }, 500);
        } catch (error) {
            setApiKeyStatus('error');
            setTimeout(() => setApiKeyStatus('idle'), 500);
        }
    }

    function handleDeleteApiKey(id: string) {
        if (confirm('确认删除此 API Key？')) {
            setApiKeyList(prev => prev.filter(item => item.id !== id));
        }
    }

    function maskApiKey(key: string): string {
        if (key.length <= 8) return key;
        return key.substring(0, 4) + '****' + key.substring(key.length - 4);
    }

    // 数据清理相关函数
    async function loadDataSize() {
        try {
            const size = await GetDataSize();
            setDataSize(size);
        } catch (error) {
            console.error('获取数据大小失败:', error);
        }
    }

    async function handleClearAllData() {
        setClearDataStatus('loading');
        try {
            await ClearAllData();
            
            // 记录清理操作到数据管理 store
            recordClearOperation();
            
            // 清理成功后，重置所有 store 状态
            resetToDefaults();
            
            // 重新加载数据大小
            await loadDataSize();
            
            setClearDataStatus('success');
            setShowClearConfirm(false);
            
            setTimeout(() => {
                setClearDataStatus('idle');
            }, 2000);
        } catch (error) {
            console.error('清理数据失败:', error);
            setClearDataStatus('error');
            setTimeout(() => {
                setClearDataStatus('idle');
            }, 2000);
        }
    }

    // 组件挂载时加载数据大小
    useEffect(() => {
        loadDataSize();
    }, []);


    return (
        <div className="container">
            {/* 更新设置 */}
            <div className="card mb-16">
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>自动更新设置</h3>
                </div>
                <div className="card-content">
                    <div className="form-row">
                        <label className="label">更新源 Feed URL</label>
                        <input
                            className="input"
                            placeholder="请输入更新源地址"
                            value={feedURL}
                            onChange={e => setFeedURL(e.target.value)}
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
                                onChange={e => setAutoCheck(e.target.checked)}
                            />
                            <span>自动检查更新</span>
                        </label>

                        <div className="flex items-center gap-8">
                            <span className="label">检查间隔（分钟）:</span>
                            <input
                                type="number"
                                className="input"
                                style={{ width: '100px' }}
                                value={checkIntervalMinute}
                                onChange={e => setCheckIntervalMinute(Number(e.target.value) || 0)}
                                min="1"
                                max="1440"
                            />
                        </div>
                    </div>

                    <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={autoDownload}
                                onChange={e => setAutoDownload(e.target.checked)}
                            />
                            <span>自动下载更新</span>
                        </label>

                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={silentInstall}
                                onChange={e => setSilentInstall(e.target.checked)}
                            />
                            <span>静默安装</span>
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
                        <div className="mt-8 p-8 rounded" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-success)' }}>
                            ✅ 设置保存成功
                        </div>
                    )}

                    {saveStatus === 'error' && (
                        <div className="mt-8 p-8 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))', color: 'var(--color-danger)' }}>
                            ❌ 保存失败，请重试
                        </div>
                    )}
                </div>
            </div>

            {/* 用户设置 - 使用 Pinia-like Store 演示 */}
            <div className="card mb-16">
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>用户设置 (Pinia-like Store 演示)</h3>
                </div>
                <div className="card-content">
                    {/* 基础设置 */}
                    <div className="form-row">
                        <label className="label">用户名</label>
                        <input
                            className="input"
                            placeholder="请输入用户名"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <label className="label">邮箱</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="请输入邮箱"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    {/* 主题和语言设置 */}
                    <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div className="flex items-center gap-8">
                            <span className="label">主题:</span>
                            <select 
                                className="input" 
                                style={{ width: '120px' }}
                                value={theme}
                                onChange={e => setTheme(e.target.value as 'light' | 'dark')}
                            >
                                <option value="dark">深色</option>
                                <option value="light">浅色</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="label">语言:</span>
                            <select 
                                className="input" 
                                style={{ width: '120px' }}
                                value={language}
                                onChange={e => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                            >
                                <option value="zh-CN">中文</option>
                                <option value="en-US">English</option>
                            </select>
                        </div>
                    </div>

                    {/* 交易设置 */}
                    <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div className="flex items-center gap-8">
                            <span className="label">默认杠杆:</span>
                            <input
                                type="number"
                                className="input"
                                style={{ width: '100px' }}
                                value={defaultLeverage}
                                onChange={e => setDefaultLeverage(Number(e.target.value) || 1)}
                                min="1"
                                max="125"
                            />
                            <span>x</span>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="label">默认币种:</span>
                            <select 
                                className="input" 
                                style={{ width: '100px' }}
                                value={defaultSymbol}
                                onChange={e => setDefaultSymbol(e.target.value as 'BTC' | 'ETH' | 'BNB')}
                            >
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                                <option value="BNB">BNB</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="label">风险等级:</span>
                            <select 
                                className="input" 
                                style={{ width: '100px' }}
                                value={riskLevel}
                                onChange={e => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                            >
                                <option value="low">低</option>
                                <option value="medium">中</option>
                                <option value="high">高</option>
                            </select>
                        </div>
                    </div>

                    {/* 通知和界面设置 */}
                    <div className="flex gap-16" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={enableNotifications}
                                onChange={toggleNotifications}
                            />
                            <span>启用通知</span>
                        </label>

                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={soundEnabled}
                                onChange={toggleSound}
                            />
                            <span>声音提醒</span>
                        </label>

                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={compactMode}
                                onChange={toggleCompactMode}
                            />
                            <span>紧凑模式</span>
                        </label>

                        <label className="flex items-center gap-8">
                            <input
                                type="checkbox"
                                checked={showAdvancedFeatures}
                                onChange={toggleAdvancedFeatures}
                            />
                            <span>显示高级功能</span>
                        </label>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-8 mb-16">
                        <button
                            className="btn btn-outline"
                            onClick={() => updateSettings({
                                username: '演示用户',
                                email: 'demo@ppll.com',
                                defaultLeverage: 10,
                                defaultSymbol: 'ETH'
                            })}
                        >
                            快速设置演示数据
                        </button>

                        <button
                            className="btn btn-ghost"
                            onClick={resetToDefaults}
                        >
                            重置为默认
                        </button>
                    </div>

                    {/* 配置摘要 */}
                    <div className="p-12 rounded" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                        <div className="text-sm text-muted mb-8">当前配置摘要 (实时更新):</div>
                        {(() => {
                            const summary = getSettingsSummary();
                            return (
                                <div className="text-sm">
                                    <div><strong>用户:</strong> {summary.user || '未设置'}</div>
                                    <div><strong>交易:</strong> {summary.trading}</div>
                                    <div><strong>界面:</strong> {summary.ui}</div>
                                    <div><strong>功能:</strong> {summary.features}</div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="mt-12 p-8 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-bg))', color: 'var(--color-primary)' }}>
                        💡 <strong>持久化说明:</strong> 所有设置会自动保存到 <code>~/.config/ppll-client/config.enc.json</code>，页面刷新或重启应用后会自动恢复。
                    </div>
                </div>
            </div>

            {/* Binance ApiKey 管理 */}
            <div className="card mb-16">
                <div className="card-header">
                    <div className="binance-apikey-header">
                        <h3 style={{ margin: 0 }}>Binance ApiKey 管理</h3>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddApiKey}
                        >
                            添加 API Key
                        </button>
                    </div>
                </div>
                <div className="card-content">
                    {/* API Key 列表 */}
                    {apiKeyList.length > 0 && (
                        <div className="binance-apikey-list">
                            {apiKeyList.map((item) => (
                                <div key={item.id} className="binance-apikey-item">
                                    <div className="binance-apikey-item-info">
                                        <div className="binance-apikey-item-header">
                                            <span className="binance-apikey-item-name">{item.name}</span>
                                        </div>
                                        <div className="binance-apikey-item-details">
                                            <div className="binance-apikey-item-detail">
                                                <span className="text-muted">API Key:</span>
                                                <span className="binance-apikey-masked">{maskApiKey(item.apiKey)}</span>
                                            </div>
                                            <div className="binance-apikey-item-detail">
                                                <span className="text-muted">Secret Key:</span>
                                                <span className="binance-apikey-masked">{maskApiKey(item.secretKey)}</span>
                                            </div>
                                            <div className="binance-apikey-item-detail">
                                                <span className="text-muted">创建时间:</span>
                                                <span>{new Date(item.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="binance-apikey-item-actions">
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleEditApiKey(item)}
                                        >
                                            编辑
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => handleDeleteApiKey(item.id)}
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 空状态 - 只在没有 API Key 且没有显示表单时显示 */}
                    {apiKeyList.length === 0 && !showAddApiKey && (
                        <div className="binance-apikey-empty">
                            <div className="text-muted">暂无 API Key，点击上方按钮添加</div>
                        </div>
                    )}

                    {/* 添加/编辑 API Key 表单 */}
                    {showAddApiKey && (
                        <div className="binance-apikey-form">
                            <div className="binance-apikey-form-header">
                                <h4>{editingApiKey ? '编辑 API Key' : '添加 API Key'}</h4>
                                <button
                                    className="btn btn-ghost"
                                    onClick={resetApiKeyForm}
                                >
                                    取消
                                </button>
                            </div>

                            <div className="binance-apikey-form-content">
                                <div className="binance-apikey-form-grid">
                                    <div className="binance-apikey-form-field">
                                        <label className="label">名称</label>
                                        <input
                                            className="input"
                                            placeholder="API Key 名称"
                                            value={apiKeyForm.name}
                                            onChange={e => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    <div className="binance-apikey-form-field">
                                        <label className="label">API Key</label>
                                        <input
                                            className="input"
                                            placeholder="Binance API Key"
                                            value={apiKeyForm.apiKey}
                                            onChange={e => setApiKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                        />
                                    </div>

                                    <div className="binance-apikey-form-field">
                                        <label className="label">Secret Key</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="Binance Secret Key"
                                            value={apiKeyForm.secretKey}
                                            onChange={e => setApiKeyForm(prev => ({ ...prev, secretKey: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="binance-apikey-form-actions">
                                    <button
                                        className={`btn ${apiKeyStatus === 'saving' ? 'btn-outline' : 'btn-primary'}`}
                                        onClick={handleSaveApiKey}
                                        disabled={apiKeyStatus === 'saving'}
                                    >
                                        {apiKeyStatus === 'saving' ? '保存中...' : (editingApiKey ? '更新' : '保存')}
                                    </button>
                                </div>

                                {apiKeyStatus === 'success' && (
                                    <div className="binance-apikey-form-message binance-apikey-form-success">
                                        ✅ {editingApiKey ? 'API Key 更新成功' : 'API Key 添加成功'}
                                    </div>
                                )}

                                {apiKeyStatus === 'error' && (
                                    <div className="binance-apikey-form-message binance-apikey-form-error">
                                        ❌ 操作失败，请检查输入信息并重试
                                    </div>
                                )}
                            </div>
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
                                        <div><strong>新版本:</strong> {updateInfo.version}</div>
                                        {updateInfo.releaseNotes && (
                                            <div className="mt-8">
                                                <strong>更新说明:</strong>
                                                <div className="mt-4 p-8 rounded border" style={{ fontSize: 'var(--text-sm)' }}>
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
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
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
                            <div className="mt-12 p-8 rounded" style={{ backgroundColor: 'var(--color-bg-muted)' }}>
                                <div className="text-sm text-muted mb-8">清理统计:</div>
                                {(() => {
                                    const stats = getClearStats();
                                    return (
                                        <div className="flex flex-col gap-4 text-xs">
                                            <div className="flex space-between">
                                                <span>总清理次数:</span>
                                                <span>{stats.totalClears} 次</span>
                                            </div>
                                            <div className="flex space-between">
                                                <span>上次清理:</span>
                                                <span>{stats.lastClear}</span>
                                            </div>
                                            {stats.totalClears > 0 && (
                                                <div className="flex space-between">
                                                    <span>距今天数:</span>
                                                    <span>{stats.daysSinceLastClear} 天</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* 详细配置项列表 */}
                            {dataSize.itemDetails && Object.keys(dataSize.itemDetails).length > 0 && (
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
                            )}
                        </div>
                    )}

                    {/* 清理操作区域 */}
                    <div className="p-12 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)' }}>
                        <div className="flex items-start gap-12">
                            <div className="flex-1">
                                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-danger)' }}>⚠️ 危险操作</h4>
                                <p className="text-sm text-muted mb-12">
                                    清理所有应用数据将会删除：
                                </p>
                                <ul className="text-sm text-muted mb-12" style={{ paddingLeft: '16px' }}>
                                    <li>• 所有用户设置和偏好</li>
                                    <li>• 策略配置参数</li>
                                    <li>• API Key 配置信息</li>
                                    <li>• 其他所有持久化数据</li>
                                </ul>
                                <p className="text-xs text-muted">
                                    此操作不可恢复，请谨慎操作！
                                </p>
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
                                        <div className="text-xs text-center text-danger mb-4">
                                            确认清理所有数据？
                                        </div>
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
                            <div className="mt-12 p-8 rounded" style={{ backgroundColor: 'var(--color-success-50)', color: 'var(--color-success)' }}>
                                ✅ 数据清理完成！所有配置已重置为默认值。
                            </div>
                        )}

                        {clearDataStatus === 'error' && (
                            <div className="mt-12 p-8 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-bg))', color: 'var(--color-danger)' }}>
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
                        <div className="flex space-between">
                            <span className="text-muted">应用版本</span>
                            <span>v1.0.0</span>
                        </div>
                        <div className="flex space-between">
                            <span className="text-muted">构建时间</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex space-between">
                            <span className="text-muted">运行环境</span>
                            <span>Wails + React</span>
                        </div>
                        <div className="flex space-between">
                            <span className="text-muted">数据目录</span>
                            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>~/.ppll-client</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
