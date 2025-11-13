import { useState, useEffect } from 'react';
import { UpdateSaveConfig, UpdateCheckNow } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime';
import type { Response } from '../core/response';
import { feedURLExamples } from '../router';

interface ApiKeyItem {
    id: string;
    name: string;
    apiKey: string;
    secretKey: string;
    isTestnet: boolean;
    createdAt: string;
}

function SettingsPage() {
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
        secretKey: '',
        isTestnet: false
    });
    const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

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
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (error) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
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
            secretKey: '',
            isTestnet: false
        });
        setEditingApiKey(null);
        setShowAddApiKey(false);
    }

    function handleAddApiKey() {
        setApiKeyForm({
            name: '',
            apiKey: '',
            secretKey: '',
            isTestnet: false
        });
        setEditingApiKey(null);
        setShowAddApiKey(true);
    }

    function handleEditApiKey(apiKey: ApiKeyItem) {
        setEditingApiKey(apiKey);
        setApiKeyForm({
            name: apiKey.name,
            apiKey: apiKey.apiKey,
            secretKey: apiKey.secretKey,
            isTestnet: apiKey.isTestnet
        });
        setShowAddApiKey(true);
    }

    async function handleSaveApiKey() {
        if (!apiKeyForm.name.trim() || !apiKeyForm.apiKey.trim() || !apiKeyForm.secretKey.trim()) {
            setApiKeyStatus('error');
            setTimeout(() => setApiKeyStatus('idle'), 3000);
            return;
        }

        setApiKeyStatus('saving');
        try {
            // 模拟保存 API Key 的逻辑
            await new Promise(resolve => setTimeout(resolve, 1000));

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
            }, 2000);
        } catch (error) {
            setApiKeyStatus('error');
            setTimeout(() => setApiKeyStatus('idle'), 3000);
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
                                            <div className="binance-apikey-item-badges">
                                                <span className={`tag ${item.isTestnet ? 'warn' : 'success'}`}>
                                                    {item.isTestnet ? '测试网' : '主网'}
                                                </span>
                                            </div>
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

                                    <div className="binance-apikey-form-field binance-apikey-form-checkbox">
                                        <label className="flex items-center gap-8">
                                            <input
                                                type="checkbox"
                                                checked={apiKeyForm.isTestnet}
                                                onChange={e => setApiKeyForm(prev => ({ ...prev, isTestnet: e.target.checked }))}
                                            />
                                            <span>测试网环境</span>
                                        </label>
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
