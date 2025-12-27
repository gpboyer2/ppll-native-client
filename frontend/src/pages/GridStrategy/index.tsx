import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextInput } from '../../components/mantine';
import { ROUTES } from '../../router';
import type { GridStrategy, StrategyFilter, StrategyStatus, PositionSide } from '../../types/grid-strategy';

/**
 * 网格策略列表页面
 * 显示所有网格策略，支持搜索和筛选功能
 */
function GridStrategyListPage() {
    // 策略列表状态
    const [strategyList, setStrategyList] = useState<GridStrategy[]>([]);
    const [loading, setLoading] = useState(false);

    // 筛选状态
    const [filter, setFilter] = useState<StrategyFilter>({
        keyword: '',
        positionSide: 'all',
        status: 'all'
    });

    // 从本地存储加载策略列表
    useEffect(() => {
        loadStrategyList();
    }, []);

    // 加载策略列表
    function loadStrategyList() {
        setLoading(true);
        try {
            const stored = localStorage.getItem('grid-strategy-list');
            if (stored) {
                const list = JSON.parse(stored) as GridStrategy[];
                setStrategyList(list);
            }
        } catch (error) {
            console.error('加载策略列表失败:', error);
        } finally {
            setLoading(false);
        }
    }

    // 保存策略列表到本地存储
    function saveStrategyList(list: GridStrategy[]) {
        localStorage.setItem('grid-strategy-list', JSON.stringify(list));
    }

    // 删除策略
    function handleDeleteStrategy(id: string) {
        if (confirm('确认删除此策略？')) {
            const newList = strategyList.filter(s => s.id !== id);
            setStrategyList(newList);
            saveStrategyList(newList);
        }
    }

    // 切换策略状态
    function handleToggleStatus(id: string) {
        const newList = strategyList.map(s => {
            if (s.id === id) {
                const newStatus: StrategyStatus = s.status === 'running' ? 'paused' : 'running';
                return { ...s, status: newStatus };
            }
            return s;
        });
        setStrategyList(newList);
        saveStrategyList(newList);
    }

    // 更新筛选条件
    function updateFilter<K extends keyof StrategyFilter>(key: K, value: StrategyFilter[K]) {
        setFilter(prev => ({ ...prev, [key]: value }));
    }

    // 获取筛选后的策略列表
    function getFilteredStrategyList(): GridStrategy[] {
        return strategyList.filter(strategy => {
            // 关键词筛选
            if (filter.keyword) {
                const keyword = filter.keyword.toLowerCase();
                if (!strategy.tradingPair.toLowerCase().includes(keyword)) {
                    return false;
                }
            }

            // 持仓方向筛选
            if (filter.positionSide !== 'all' && strategy.positionSide !== filter.positionSide) {
                return false;
            }

            // 状态筛选
            if (filter.status !== 'all' && strategy.status !== filter.status) {
                return false;
            }

            return true;
        });
    }

    // 获取统计数据
    function getStatistics() {
        const total = strategyList.length;
        const running = strategyList.filter(s => s.status === 'running').length;
        const paused = strategyList.filter(s => s.status === 'paused').length;
        const stopped = strategyList.filter(s => s.status === 'stopped').length;
        return { total, running, paused, stopped };
    }

    // 获取状态标签颜色
    function getStatusColor(status: StrategyStatus): string {
        switch (status) {
            case 'running':
                return 'var(--color-success)';
            case 'paused':
                return 'var(--color-warning)';
            case 'stopped':
                return 'var(--color-text-muted)';
            default:
                return 'var(--color-text-muted)';
        }
    }

    // 获取持仓方向标签颜色
    function getPositionSideColor(side: PositionSide): string {
        switch (side) {
            case 'LONG':
                return 'var(--color-success)';
            case 'SHORT':
                return 'var(--color-danger)';
            default:
                return 'var(--color-text-muted)';
        }
    }

    // 获取持仓方向文本
    function getPositionSideText(side: PositionSide): string {
        switch (side) {
            case 'LONG':
                return '做多';
            case 'SHORT':
                return '做空';
            default:
                return '';
        }
    }

    // 获取状态文本
    function getStatusText(status: StrategyStatus): string {
        switch (status) {
            case 'running':
                return '运行中';
            case 'paused':
                return '已暂停';
            case 'stopped':
                return '已停止';
            default:
                return '';
        }
    }

    const filteredList = getFilteredStrategyList();
    const statistics = getStatistics();

    return (
        <div className="container">
            {/* 页面标题 */}
            <div className="surface p-16 mb-16">
                <div className="flex items-center space-between">
                    <div>
                        <h1 style={{ margin: '0 0 4px', color: 'var(--color-primary)' }}>网格策略管理</h1>
                        <p className="text-muted" style={{ margin: 0 }}>管理您的网格交易策略配置</p>
                    </div>
                    <Link to={ROUTES.GRID_STRATEGY_CREATE} className="btn btn-primary">
                        新建策略
                    </Link>
                </div>
            </div>

            {/* 搜索和筛选区域 */}
            <div className="surface p-16 mb-16">
                <div className="flex flex-col gap-12">
                    {/* 搜索框 */}
                    <div className="flex items-center gap-8">
                        <TextInput
                            placeholder="搜索交易对，如：ETHUSDT、BTCUSDT"
                            style={{ flex: 1 }}
                            value={filter.keyword}
                            onChange={(value: string) => updateFilter('keyword', value)}
                        />
                    </div>

                    {/* 筛选按钮 */}
                    <div className="flex items-center gap-8">
                        <span className="text-muted label">持仓方向：</span>
                        <div className="flex gap-4">
                            {(['all', 'LONG', 'SHORT'] as const).map(value => {
                                const label = value === 'all' ? '全部' : (value === 'LONG' ? '做多' : '做空');
                                return (
                                    <button
                                        key={value}
                                        className={`grid-strategy-filter-button ${filter.positionSide === value ? 'active' : ''}`}
                                        onClick={() => updateFilter('positionSide', value)}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <span className="text-muted label" style={{ marginLeft: '24px' }}>状态：</span>
                        <div className="flex gap-4">
                            {(['all', 'running', 'paused', 'stopped'] as const).map(value => {
                                const label = value === 'all' ? '全部' :
                                    value === 'running' ? '运行中' :
                                    value === 'paused' ? '已暂停' : '已停止';
                                return (
                                    <button
                                        key={value}
                                        className={`grid-strategy-filter-button ${filter.status === value ? 'active' : ''}`}
                                        onClick={() => updateFilter('status', value)}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 策略统计 */}
            <div className="grid-strategy-statistics mb-16">
                <div className="grid-strategy-stat-item">
                    <div className="grid-strategy-stat-value">{statistics.total}</div>
                    <div className="text-muted label">总策略数</div>
                </div>
                <div className="grid-strategy-stat-item">
                    <div className="grid-strategy-stat-value" style={{ color: 'var(--color-success)' }}>
                        {statistics.running}
                    </div>
                    <div className="text-muted label">运行中</div>
                </div>
                <div className="grid-strategy-stat-item">
                    <div className="grid-strategy-stat-value" style={{ color: 'var(--color-warning)' }}>
                        {statistics.paused}
                    </div>
                    <div className="text-muted label">已暂停</div>
                </div>
                <div className="grid-strategy-stat-item">
                    <div className="grid-strategy-stat-value" style={{ color: 'var(--color-text-muted)' }}>
                        {statistics.stopped}
                    </div>
                    <div className="text-muted label">已停止</div>
                </div>
            </div>

            {/* 策略列表 */}
            {loading ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: '48px' }}>
                    加载中...
                </div>
            ) : filteredList.length > 0 ? (
                <div className="grid-strategy-list">
                    {filteredList.map(strategy => (
                        <div key={strategy.id} className="card grid-strategy-card">
                            <div className="card-content">
                                {/* 策略头部 */}
                                <div className="flex items-center space-between mb-12">
                                    <div className="flex items-center gap-8">
                                        <span
                                            className="grid-strategy-position-badge"
                                            style={{ backgroundColor: colorMix(getPositionSideColor(strategy.positionSide), 0.1), color: getPositionSideColor(strategy.positionSide) }}
                                        >
                                            {getPositionSideText(strategy.positionSide)}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>
                                            {strategy.tradingPair}
                                        </span>
                                        <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                                            x{strategy.leverage}
                                        </span>
                                    </div>
                                    <span
                                        className="grid-strategy-status-badge"
                                        style={{ backgroundColor: colorMix(getStatusColor(strategy.status || 'stopped'), 0.1), color: getStatusColor(strategy.status || 'stopped') }}
                                    >
                                        {getStatusText(strategy.status || 'stopped')}
                                    </span>
                                </div>

                                {/* 策略参数 */}
                                <div className="flex flex-col gap-6 mb-12">
                                    <div className="flex items-center gap-8">
                                        <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>网格差价:</span>
                                        <span style={{ fontWeight: 500 }}>{strategy.gridPriceDifference}</span>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>交易数量:</span>
                                        <span style={{ fontWeight: 500 }}>
                                            {strategy.gridTradeQuantity || '-'}
                                        </span>
                                    </div>
                                    {strategy.gtLimitationPrice && (
                                        <div className="flex items-center gap-8">
                                            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>价格上限:</span>
                                            <span style={{ fontWeight: 500 }}>{strategy.gtLimitationPrice}</span>
                                        </div>
                                    )}
                                    {strategy.ltLimitationPrice && (
                                        <div className="flex items-center gap-8">
                                            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>价格下限:</span>
                                            <span style={{ fontWeight: 500 }}>{strategy.ltLimitationPrice}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex gap-8">
                                    <button
                                        className="btn btn-ghost"
                                        style={{ flex: 1, height: '32px' }}
                                        onClick={() => handleToggleStatus(strategy.id)}
                                    >
                                        {strategy.status === 'running' ? '暂停' : '启动'}
                                    </button>
                                    <Link
                                        to={`/grid-strategy/edit/${strategy.id}`}
                                        className="btn btn-outline"
                                        style={{ flex: 1, height: '32px', textAlign: 'center', textDecoration: 'none' }}
                                    >
                                        编辑
                                    </Link>
                                    <button
                                        className="btn btn-danger"
                                        style={{ height: '32px', padding: '0 16px' }}
                                        onClick={() => handleDeleteStrategy(strategy.id)}
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // 空状态
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3>暂无网格策略</h3>
                    <p>创建您的第一个网格交易策略开始自动化交易</p>
                    <Link to={ROUTES.GRID_STRATEGY_CREATE} className="btn btn-primary mt-12">
                        创建策略
                    </Link>
                </div>
            )}
        </div>
    );
}

// 辅助函数：颜色混合
function colorMix(color: string, alpha: number): string {
    // 简化处理，实际可以使用更复杂的颜色混合算法
    return color;
}

export default GridStrategyListPage;
