import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Select } from '@mantine/core';
import { ROUTES } from '../../router';
import { useBinanceStore } from '../../stores/binance-store';
import type { GridStrategy, GridStrategyForm, PositionSide } from '../../types/grid-strategy';
import { defaultGridStrategy } from '../../types/grid-strategy';
import { showWarning, showSuccess } from '../../utils/api-error';

/**
 * 网格策略表单页面
 * 新建路由：/grid-strategy/create
 * 编辑路由：/grid-strategy/edit/:id
 */
function GridStrategyEditPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditing = Boolean(id);

    // 使用币安 store
    const { apiKeyList, usdtPairs, init, loading, refreshTradingPairs } = useBinanceStore();

    // 表单数据状态
    const [formData, setFormData] = useState<GridStrategyForm>(defaultGridStrategy);

    // 保存状态
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // 初始化 store
    useEffect(() => {
        init();
    }, [init]);

    // 加载现有策略数据
    useEffect(() => {
        if (isEditing && id) {
            loadStrategy(id);
        }
    }, [isEditing, id]);

    // 当交易对列表加载完成后，设置默认交易对为 BTCUSDT
    useEffect(() => {
        // 只在新建模式下，且交易对列表已加载，且当前交易对为空时设置默认值
        if (!isEditing && usdtPairs.length > 0 && !formData.tradingPair) {
            // 精确匹配 BTCUSDT
            if (usdtPairs.includes('BTCUSDT')) {
                setFormData(prev => ({ ...prev, tradingPair: 'BTCUSDT' }));
                console.log('已设置默认交易对: BTCUSDT');
            }
        }
    }, [usdtPairs, isEditing, formData.tradingPair]);

    // 加载策略数据
    function loadStrategy(strategyId: string) {
        try {
            const stored = localStorage.getItem('grid-strategy-list');
            if (stored) {
                const list = JSON.parse(stored) as GridStrategy[];
                const strategy = list.find(s => s.id === strategyId);
                if (strategy) {
                    setFormData(strategy);
                }
            }
        } catch (error) {
            console.error('加载策略失败:', error);
        }
    }

    // 保存策略数据
    function saveStrategy(data: GridStrategyForm) {
        try {
            const stored = localStorage.getItem('grid-strategy-list');
            let list: GridStrategy[] = stored ? JSON.parse(stored) : [];

            if (isEditing && id) {
                // 更新现有策略
                list = list.map(s => s.id === id ? { ...data, id, status: s.status, createdAt: s.createdAt, updatedAt: new Date().toISOString() } : s);
            } else {
                // 创建新策略
                const newStrategy: GridStrategy = {
                    ...data,
                    id: Date.now().toString(),
                    status: 'stopped',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                list.push(newStrategy);
            }

            localStorage.setItem('grid-strategy-list', JSON.stringify(list));
            return true;
        } catch (error) {
            console.error('保存策略失败:', error);
            return false;
        }
    }

    // 表单提交处理
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // 验证必填字段
        if (!formData.tradingPair.trim()) {
            showWarning('请选择交易对');
            return;
        }
        if (!formData.apiKey.trim()) {
            showWarning('请选择币安API Key');
            return;
        }
        if (!formData.apiSecret.trim()) {
            showWarning('请选择币安API Key');
            return;
        }
        if (!formData.gridPriceDifference || formData.gridPriceDifference <= 0) {
            showWarning('请输入有效的网格价格差价');
            return;
        }

        setSaveStatus('saving');
        setTimeout(() => {
            const success = saveStrategy(formData);
            if (success) {
                showSuccess(isEditing ? '策略已更新' : '策略已创建');
                setTimeout(() => {
                    navigate(ROUTES.GRID_STRATEGY);
                }, 500);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }
        }, 300);
    }

    // 重置表单
    function handleReset() {
        if (isEditing && id) {
            loadStrategy(id);
        } else {
            setFormData(defaultGridStrategy);
        }
    }

    // 更新表单字段
    function updateFormField<K extends keyof GridStrategyForm>(key: K, value: GridStrategyForm[K]) {
        setFormData(prev => ({ ...prev, [key]: value }));
    }

    // 获取持仓方向相关字段的可见性
    function isLongOnlyField() {
        return formData.positionSide === 'LONG';
    }

    function isShortOnlyField() {
        return formData.positionSide === 'SHORT';
    }

    // 选择 API Key 后自动填充 Secret
    function handleApiKeyChange(value: string | null) {
        if (!value) {
            setFormData(prev => ({ ...prev, apiKey: '', apiSecret: '', _apiKeyId: undefined }));
            return;
        }
        const apiKeyId = parseInt(value);
        const selectedKey = apiKeyList.find(k => k.id === apiKeyId);
        if (selectedKey) {
            setFormData(prev => ({
                ...prev,
                apiKey: selectedKey.apiKey,
                apiSecret: selectedKey.secretKey,
                _apiKeyId: selectedKey.id
            }));
            // 选择API Key后自动刷新交易对列表
            refreshTradingPairs();
        } else {
            setFormData(prev => ({
                ...prev,
                apiKey: '',
                apiSecret: '',
                _apiKeyId: undefined
            }));
        }
    }

    // 生成随机测试数据
    function fillMockData() {
        const mockData: Partial<GridStrategyForm> = {
            positionSide: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            tradingPair: usdtPairs[Math.floor(Math.random() * Math.min(usdtPairs.length, 10))] || 'ETHUSDT',
            apiKey: 'mock_api_key_' + Math.random().toString(36).substring(2, 10),
            apiSecret: 'mock_secret_' + Math.random().toString(36).substring(2, 10),
            leverage: 20,
            initialFillPrice: undefined,
            gridPriceDifference: Number((Math.random() * 50 + 10).toFixed(2)),
            gridTradeQuantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
            gridLongOpenQuantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
            gridLongCloseQuantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
            gridShortOpenQuantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
            gridShortCloseQuantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
            maxOpenPositionQuantity: Number((Math.random() * 2 + 0.5).toFixed(3)),
            minOpenPositionQuantity: Number((Math.random() * 0.3 + 0.1).toFixed(3)),
            fallPreventionCoefficient: Math.floor(Math.random() * 10),
            gtLimitationPrice: Math.random() > 0.5 ? Number((Math.random() * 2000 + 3000).toFixed(2)) : undefined,
            ltLimitationPrice: Math.random() > 0.5 ? Number((Math.random() * 1000 + 2000).toFixed(2)) : undefined,
            isAboveOpenPrice: Math.random() > 0.7,
            isBelowOpenPrice: Math.random() > 0.7,
            pollingInterval: 10000,
            avgCostPriceDays: 30,
            enableLog: Math.random() > 0.5,
            priorityCloseOnTrend: Math.random() > 0.7
        };
        setFormData(prev => ({ ...prev, ...mockData }));
    }

    // API Key 下拉选项
    const apiKeyOptions = apiKeyList.map(k => ({
        value: String(k.id),
        label: `${k.name} (${k.apiKey.substring(0, 8)}...)`
    }));

    // 当前选中的 API Key
    const currentApiKeyValue = formData._apiKeyId ? String(formData._apiKeyId) :
        apiKeyList.find(k => k.apiKey === formData.apiKey)?.id.toString() || '';

    return (
        <div className="container">
            {/* 页面头部 */}
            <div className="surface p-12 mb-16">
                <div className="flex items-center space-between">
                    <div className="flex items-center gap-12">
                        <Link to={ROUTES.GRID_STRATEGY} className="btn btn-ghost" style={{ height: '32px', padding: '0 8px' }}>
                            ← 返回列表
                        </Link>
                        <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                        <h1 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
                            {isEditing ? '编辑网格策略' : '新建网格策略'}
                        </h1>
                    </div>
                    <div className="flex gap-8">
                        {!isEditing && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ height: '32px', padding: '0 12px' }}
                                onClick={fillMockData}
                            >
                                Mock
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ height: '32px', padding: '0 12px' }}
                            onClick={handleReset}
                        >
                            重置
                        </button>
                    </div>
                </div>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="grid-strategy-form">
                {/* 基础设置 */}
                <div className="grid-strategy-form-section">
                    <h2 className="grid-strategy-form-section-title">
                        <span className="grid-strategy-form-section-icon">⚙️</span>
                        基础设置
                    </h2>

                    <div className="grid-strategy-form-grid">
                        {/* 持仓方向 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">
                                持仓方向
                                <span className="grid-strategy-form-required">*</span>
                            </label>
                            <Select
                                placeholder="选择持仓方向"
                                data={[
                                    { value: 'LONG', label: '做多 (LONG)' },
                                    { value: 'SHORT', label: '做空 (SHORT)' }
                                ]}
                                value={formData.positionSide}
                                onChange={(value) => value && updateFormField('positionSide', value as PositionSide)}
                                styles={{
                                    input: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        minHeight: '36px'
                                    },
                                    dropdown: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)'
                                    },
                                    option: {
                                        backgroundColor: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-bg-muted)'
                                        }
                                    }
                                }}
                            />
                            <div className="help">选择网格交易的持仓方向，做多或做空</div>
                        </div>

                        {/* 交易对 - 使用 Mantine Select */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">
                                交易对
                                <span className="grid-strategy-form-required">*</span>
                            </label>
                            <Select
                                placeholder="搜索选择交易对"
                                searchable
                                clearable
                                data={usdtPairs}
                                value={formData.tradingPair}
                                onChange={(value) => updateFormField('tradingPair', value || '')}
                                styles={{
                                    input: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        minHeight: '36px'
                                    },
                                    dropdown: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)'
                                    },
                                    option: {
                                        backgroundColor: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-bg-muted)'
                                        }
                                    }
                                }}
                            />
                            <div className="help">选择要交易的USDT币对，如ETHUSDT表示ETH兑换USDT</div>
                        </div>

                        {/* API Key - 使用 Mantine Select */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">
                                币安API Key
                                <span className="grid-strategy-form-required">*</span>
                            </label>
                            <Select
                                placeholder="选择API Key"
                                clearable
                                data={apiKeyOptions}
                                value={currentApiKeyValue}
                                onChange={handleApiKeyChange}
                                styles={{
                                    input: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        minHeight: '36px'
                                    },
                                    dropdown: {
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)'
                                    },
                                    option: {
                                        backgroundColor: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-bg-muted)'
                                        }
                                    }
                                }}
                            />
                            <div className="help">选择已配置的币安API密钥，Secret将自动填充</div>
                        </div>

                        {/* 杠杆倍数 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">杠杆倍数</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.leverage}
                                onChange={e => updateFormField('leverage', Number(e.target.value) || 20)}
                                min="1"
                                max="125"
                            />
                            <div className="help">设置杠杆倍数，默认20倍（不足20的设为最大倍数）</div>
                        </div>

                        {/* 初始建仓价格 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">初始建仓价格</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.initialFillPrice || ''}
                                onChange={e => updateFormField('initialFillPrice', Number(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                                placeholder="0"
                            />
                            <div className="help">初始建仓的价格，为0时自动按当前价格建仓</div>
                        </div>
                    </div>
                </div>

                {/* 网格参数 */}
                <div className="grid-strategy-form-section">
                    <h2 className="grid-strategy-form-section-title">
                        <span className="grid-strategy-form-section-icon">📊</span>
                        网格参数
                    </h2>

                    <div className="grid-strategy-form-grid">
                        {/* 网格价格差价 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">
                                网格价格差价
                                <span className="grid-strategy-form-required">*</span>
                            </label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridPriceDifference || ''}
                                onChange={e => updateFormField('gridPriceDifference', Number(e.target.value) || undefined)}
                                step="0.01"
                                min="0.01"
                                placeholder="例如：10"
                                required
                            />
                            <div className="help">每个网格之间的价格间隔，如10表示每个网格间隔10 USDT</div>
                        </div>

                        {/* 网格交易数量（通用） */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">网格交易数量（通用）</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridTradeQuantity || ''}
                                onChange={e => updateFormField('gridTradeQuantity', Number(e.target.value) || undefined)}
                                step="0.001"
                                min="0.001"
                                placeholder="例如：0.1"
                            />
                            <div className="help">每个网格的交易数量，如果没有设置分离数量则使用此值</div>
                        </div>

                        {/* 做多开仓数量 */}
                        <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
                            <label className="grid-strategy-form-label">做多开仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridLongOpenQuantity || ''}
                                onChange={e => updateFormField('gridLongOpenQuantity', Number(e.target.value) || undefined)}
                                step="0.001"
                                min="0.001"
                                placeholder="例如：0.1"
                            />
                            <div className="help">做多方向：每次增加多单持仓的数量</div>
                        </div>

                        {/* 做多平仓数量 */}
                        <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
                            <label className="grid-strategy-form-label">做多平仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridLongCloseQuantity || ''}
                                onChange={e => updateFormField('gridLongCloseQuantity', Number(e.target.value) || undefined)}
                                step="0.001"
                                min="0.001"
                                placeholder="例如：0.1"
                            />
                            <div className="help">做多方向：每次减少多单持仓的数量</div>
                        </div>

                        {/* 做空开仓数量 */}
                        <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
                            <label className="grid-strategy-form-label">做空开仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridShortOpenQuantity || ''}
                                onChange={e => updateFormField('gridShortOpenQuantity', Number(e.target.value) || undefined)}
                                step="0.001"
                                min="0.001"
                                placeholder="例如：0.1"
                            />
                            <div className="help">做空方向：每次增加空单持仓的数量（开空单）</div>
                        </div>

                        {/* 做空平仓数量 */}
                        <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
                            <label className="grid-strategy-form-label">做空平仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gridShortCloseQuantity || ''}
                                onChange={e => updateFormField('gridShortCloseQuantity', Number(e.target.value) || undefined)}
                                step="0.001"
                                min="0.001"
                                placeholder="例如：0.1"
                            />
                            <div className="help">做空方向：每次减少空单持仓的数量（平空单）</div>
                        </div>
                    </div>
                </div>

                {/* 风险控制 */}
                <div className="grid-strategy-form-section">
                    <h2 className="grid-strategy-form-section-title">
                        <span className="grid-strategy-form-section-icon">🛡️</span>
                        风险控制
                    </h2>

                    <div className="grid-strategy-form-grid">
                        {/* 最大持仓数量 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">最大持仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.maxOpenPositionQuantity || ''}
                                onChange={e => updateFormField('maxOpenPositionQuantity', e.target.value ? Number(e.target.value) : undefined)}
                                step="0.001"
                                min="0"
                                placeholder="例如：1"
                            />
                            <div className="help">限制的最大的持仓数量，为空则不限制，如1个ETH</div>
                        </div>

                        {/* 最小持仓数量 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">最小持仓数量</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.minOpenPositionQuantity || ''}
                                onChange={e => updateFormField('minOpenPositionQuantity', e.target.value ? Number(e.target.value) : undefined)}
                                step="0.001"
                                min="0"
                                placeholder="例如：0.2"
                            />
                            <div className="help">限制的最少的持仓数量，为空则不限制，如0.2个ETH</div>
                        </div>

                        {/* 防跌/防涨系数 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">防跌/防涨系数</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.fallPreventionCoefficient}
                                onChange={e => updateFormField('fallPreventionCoefficient', Number(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                                placeholder="0"
                            />
                            <div className="help">系数越大，价格变动时的触发价格会下放得更低，为0时固定使用网格差价</div>
                        </div>

                        {/* 价格上限 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">价格上限</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.gtLimitationPrice || ''}
                                onChange={e => updateFormField('gtLimitationPrice', e.target.value ? Number(e.target.value) : undefined)}
                                step="0.01"
                                min="0"
                                placeholder="例如：3000"
                            />
                            <div className="help">大于等于此价格时暂停网格，为空则不限制</div>
                        </div>

                        {/* 价格下限 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">价格下限</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.ltLimitationPrice || ''}
                                onChange={e => updateFormField('ltLimitationPrice', e.target.value ? Number(e.target.value) : undefined)}
                                step="0.01"
                                min="0"
                                placeholder="例如：2000"
                            />
                            <div className="help">小于等于此价格时暂停网格，为空则不限制</div>
                        </div>
                    </div>

                    {/* 价格限制开关 */}
                    <div className="grid-strategy-form-toggles">
                        <div className="grid-strategy-form-toggle">
                            <div className="grid-strategy-form-toggle-info">
                                <label className="grid-strategy-form-label">高于开仓价格时暂停</label>
                                <div className="help">当价格大于等于开仓价格时则暂停网格</div>
                            </div>
                            <label className="grid-strategy-toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.isAboveOpenPrice}
                                    onChange={e => updateFormField('isAboveOpenPrice', e.target.checked)}
                                />
                                <span></span>
                            </label>
                        </div>

                        <div className="grid-strategy-form-toggle">
                            <div className="grid-strategy-form-toggle-info">
                                <label className="grid-strategy-form-label">低于开仓价格时暂停</label>
                                <div className="help">当价格低于等于开仓价格时则暂停网格</div>
                            </div>
                            <label className="grid-strategy-toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.isBelowOpenPrice}
                                    onChange={e => updateFormField('isBelowOpenPrice', e.target.checked)}
                                />
                                <span></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 高级选项 */}
                <div className="grid-strategy-form-section">
                    <h2 className="grid-strategy-form-section-title">
                        <span className="grid-strategy-form-section-icon">🔧</span>
                        高级选项
                    </h2>

                    <div className="grid-strategy-form-grid">
                        {/* 轮询间隔 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">轮询间隔（毫秒）</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.pollingInterval}
                                onChange={e => updateFormField('pollingInterval', Number(e.target.value) || 10000)}
                                min="0"
                                step="100"
                            />
                            <div className="help">获得最新价格的轮询间隔时间，设为0则不限制（回测用）</div>
                        </div>

                        {/* 平均成本价天数 */}
                        <div className="grid-strategy-form-field">
                            <label className="grid-strategy-form-label">平均成本价天数</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.avgCostPriceDays}
                                onChange={e => updateFormField('avgCostPriceDays', Number(e.target.value) || 30)}
                                min="1"
                                max="365"
                            />
                            <div className="help">计算平均成本价的默认天数</div>
                        </div>
                    </div>

                    {/* 高级开关 */}
                    <div className="grid-strategy-form-toggles">
                        <div className="grid-strategy-form-toggle">
                            <div className="grid-strategy-form-toggle-info">
                                <label className="grid-strategy-form-label">启用日志输出</label>
                                <div className="help">是否启用日志输出，便于调试和监控</div>
                            </div>
                            <label className="grid-strategy-toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.enableLog}
                                    onChange={e => updateFormField('enableLog', e.target.checked)}
                                />
                                <span></span>
                            </label>
                        </div>

                        <div className="grid-strategy-form-toggle">
                            <div className="grid-strategy-form-toggle-info">
                                <label className="grid-strategy-form-label">顺势仅减仓策略</label>
                                <div className="help">当仓位记录为空但实际持有仓位时，在价格趋势中优先执行平仓</div>
                            </div>
                            <label className="grid-strategy-toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.priorityCloseOnTrend}
                                    onChange={e => updateFormField('priorityCloseOnTrend', e.target.checked)}
                                />
                                <span></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="grid-strategy-form-actions">
                    <Link to={ROUTES.GRID_STRATEGY} className="btn btn-outline" style={{ height: '40px', padding: '0 24px' }}>
                        取消
                    </Link>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ height: '40px', padding: '0 24px' }}
                        onClick={handleReset}
                    >
                        重置表单
                    </button>
                    <button
                        type="submit"
                        className={`btn ${saveStatus === 'saving' ? 'btn-outline' : 'btn-primary'}`}
                        style={{ height: '40px', padding: '0 32px' }}
                        disabled={saveStatus === 'saving'}
                    >
                        {saveStatus === 'saving' ? '保存中...' : '保存策略'}
                    </button>
                </div>

                {/* 保存状态提示 */}
                {saveStatus === 'success' && (
                    <div className="grid-strategy-form-message grid-strategy-form-success">
                        保存成功，正在跳转...
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="grid-strategy-form-message grid-strategy-form-error">
                        保存失败，请重试
                    </div>
                )}
            </form>
        </div>
    );
}

export default GridStrategyEditPage;
