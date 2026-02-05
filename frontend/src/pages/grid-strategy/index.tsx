import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './index.scss';
import { TextInput } from '../../components/mantine';
import { ROUTES } from '../../router';
import { NumberFormat } from '../../utils';
import { GridStrategyApi } from '../../api';
import { showSuccess, showError } from '../../utils/api-error';
import { useBinanceStore } from '../../stores/binance-store';
import { getStrategyDisplayStatus, getStrategyStatusText, canTogglePause } from '../../utils/grid-strategy-status';
import { EXECUTION_STATUS } from '../../types/grid-strategy';
import type { GridStrategy, StrategyFilter, StrategyStatus, PositionSide } from '../../types/grid-strategy';

/**
 * 获取当前价格的显示文本
 * @param trading_pair - 交易对
 * @param ticker_prices - ticker 价格数据
 * @returns 当前价格或加载中
 */
function getCurrentPriceText(trading_pair: string, ticker_prices: Record<string, any>): string {
  const ticker = ticker_prices[trading_pair];
  return ticker?.price ? Number(ticker.price).toFixed(2) : '--';
}

/**
 * 使用策略的价格精度格式化价格
 */
function formatPrice(value: number | null | undefined, strategy: GridStrategy): string {
  if (value === undefined || value === null) return '-';
  const precision = strategy.price_precision ?? 2;
  return Number(value).toFixed(precision);
}

/**
 * 网格策略列表页面
 * 显示所有网格策略，支持搜索和筛选功能
 */
function GridStrategyListPage() {
  // 策略列表状态
  const [strategyList, setStrategyList] = useState<GridStrategy[]>([]);
  const [loading, setLoading] = useState(false);

  // 防止 StrictMode 双重渲染导致重复请求
  const has_loaded_ref = useRef(false);
  // 定时刷新引用
  const interval_ref = useRef<NodeJS.Timeout | null>(null);

  // 获取 binance-store 初始化状态和 ticker 数据
  const { initialized: binance_initialized, ticker_prices, connectSocket, subscribeTicker, unsubscribeTicker } = useBinanceStore();

  // 筛选状态
  const [filter, setFilter] = useState<StrategyFilter>({
    keyword: '',
    position_side: 'all',
    status: 'all',
    api_key_id: 'all'
  });

  // 加载策略列表
  useEffect(() => {
    // 防止 StrictMode 双重渲染导致重复请求
    if (has_loaded_ref.current) {
      return;
    }

    // 等待 binance-store 初始化完成后再加载策略列表
    if (!binance_initialized) {
      return;
    }

    has_loaded_ref.current = true;
    loadStrategyList();

    // 设置定时刷新，每 5 秒刷新一次策略状态
    interval_ref.current = setInterval(() => {
      loadStrategyListInternal();
    }, 5000);

    // 组件卸载时清除定时器
    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
        interval_ref.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binance_initialized]);

  // 监听策略状态更新事件（WebSocket 推送）
  useEffect(() => {
    const handleStrategyStatusUpdate = (event: CustomEvent) => {
      const { strategy_id, execution_status } = event.detail;
      console.log('[GridStrategyList] 收到策略状态更新:', strategy_id, execution_status);

      // 更新本地策略列表中对应策略的状态
      setStrategyList(prev => prev.map(strategy => {
        if (String(strategy.id) === String(strategy_id)) {
          return {
            ...strategy,
            execution_status: execution_status,
            status: getStrategyDisplayStatus({ ...strategy, execution_status: execution_status })
          };
        }
        return strategy;
      }));
    };

    // 添加事件监听
    window.addEventListener('strategy-status-update', handleStrategyStatusUpdate as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('strategy-status-update', handleStrategyStatusUpdate as EventListener);
    };
  }, []);

  // 从后端 API 加载策略列表（内部实现，不显示 loading）
  async function loadStrategyListInternal() {
    try {
      // 获取所有 API Key
      const { api_key_list } = useBinanceStore.getState();

      // 如果没有 API Key,直接返回
      if (!api_key_list || api_key_list.length === 0) {
        return;
      }

      // 并发请求所有 API Key 的策略列表，同时记录每个请求对应的 api_key
      const requests_with_key = api_key_list.map(api_key => ({
        api_key_value: api_key.api_key,
        api_key_id: String(api_key.id),
        api_key_name: api_key.name,
        request: GridStrategyApi.list({
          current_page: 1,
          page_size: 100,
          api_key: api_key.api_key,
          api_secret: api_key.api_secret
        })
      }));

      const responses = await Promise.all(requests_with_key.map(r => r.request));

      // 合并所有策略列表，使用 api_key 值匹配而不是索引
      const all_strategies: GridStrategy[] = [];
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const { api_key_id, api_key_name } = requests_with_key[i];

        if (response.status === 'success' && response.datum) {
          const list = response.datum.list || [];
          // 为每个策略添加 api_key_id 信息,方便后续操作
          const strategies_with_key = list.map((item: any): GridStrategy => ({
            ...item,
            _api_key_id: api_key_id,
            _api_key_name: api_key_name,
            status: getStrategyDisplayStatus(item),
          }));
          all_strategies.push(...strategies_with_key);
        }
      }

      setStrategyList(all_strategies);
    } catch (error) {
      // 定时刷新失败时静默处理，不显示错误提示
      console.error('刷新策略列表失败:', error);
    }
  }

  // 从后端 API 加载策略列表（显示 loading 状态）
  async function loadStrategyList() {
    setLoading(true);
    try {
      await loadStrategyListInternal();
    } catch (error) {
      console.error('加载策略列表失败:', error);
      showError('加载策略列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  // 订阅所有策略的交易对 ticker，用于显示当前价格
  useEffect(() => {
    if (strategyList.length === 0) return;

    // 连接 WebSocket 并订阅所有交易对
    connectSocket().then(() => {
      const unique_pairs = Array.from(new Set(strategyList.map(s => s.trading_pair)));
      unique_pairs.forEach(pair => {
        subscribeTicker(pair, 'usdm');
      });
    }).catch(error => {
      console.error('[GridStrategyList] WebSocket 连接失败:', error);
    });

    // 组件卸载时取消订阅
    return () => {
      const unique_pairs = Array.from(new Set(strategyList.map(s => s.trading_pair)));
      unique_pairs.forEach(pair => {
        unsubscribeTicker(pair, 'usdm');
      });
    };
  }, [strategyList, connectSocket, subscribeTicker, unsubscribeTicker]);

  // 删除策略
  async function handleDeleteStrategy(id: string) {
    if (!confirm('确认删除此策略？')) return;

    try {
      const response = await GridStrategyApi.delete([Number(id)]);
      if (response.status === 'success') {
        showSuccess('策略删除成功');
        await loadStrategyList();
      } else {
        showError(response.message || '策略删除失败');
      }
    } catch (error) {
      console.error('删除策略失败:', error);
      showError('删除策略失败，请稍后重试');
    }
  }

  // 切换策略状态
  async function handleToggleStatus(id: string, currentStatus: StrategyStatus) {
    const new_status = currentStatus === 'running' ? 'paused' : 'running';
    const api_method = new_status === 'paused' ? GridStrategyApi.pause : GridStrategyApi.resume;

    try {
      const response = await api_method(Number(id));
      if (response.status === 'success') {
        showSuccess(new_status === 'paused' ? '策略已暂停' : '策略已恢复');
        await loadStrategyList();
      } else {
        showError(response.message || '状态更新失败');
      }
    } catch (error) {
      console.error('更新策略状态失败:', error);
      showError('更新策略状态失败，请稍后重试');
    }
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
        if (!(strategy.trading_pair || '').toLowerCase().includes(keyword)) {
          return false;
        }
      }

      // 持仓方向筛选
      if (filter.position_side !== 'all' && strategy.position_side !== filter.position_side) {
        return false;
      }

      // 状态筛选
      if (filter.status !== 'all' && strategy.status !== filter.status) {
        return false;
      }

      // API Key 筛选
      if (filter.api_key_id !== 'all' && strategy._api_key_id !== filter.api_key_id) {
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

  // 获取 API Key 筛选器的数量统计
  function getApiKeyFilterCount() {
    const api_key_list = useBinanceStore.getState().api_key_list;
    const counts: Record<string, number> = {
      'all': strategyList.length
    };

    api_key_list.forEach(api_key => {
      const count = strategyList.filter(s => s._api_key_id === String(api_key.id)).length;
      counts[String(api_key.id)] = count;
    });

    return counts;
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
  function getStatusText(item: GridStrategy): string {
    return getStrategyStatusText(item.execution_status);
  }

  const filtered_list = getFilteredStrategyList();
  const statistics = getStatistics();
  const api_key_counts = getApiKeyFilterCount();

  return (
    <div className="container">
      {/* 页面标题 */}
      <div className="surface p-16 mb-16">
        <div className="flex items-center space-between">
          <div>
            <h1 className="grid-strategy-page-title">网格策略管理</h1>
            <p className="text-muted grid-strategy-page-desc">管理您的网格交易策略配置</p>
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
              className="grid-strategy-search-input"
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
                    className={`grid-strategy-filter-button ${filter.position_side === value ? 'active' : ''}`}
                    onClick={() => updateFilter('position_side', value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <span className="text-muted label grid-strategy-filter-label">状态：</span>
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

            <span className="text-muted label grid-strategy-filter-label">API Key：</span>
            <div className="flex gap-4">
              <button
                className={`grid-strategy-filter-button ${filter.api_key_id === 'all' ? 'active' : ''}`}
                onClick={() => updateFilter('api_key_id', 'all')}
              >
                全部({api_key_counts['all']})
              </button>
              {useBinanceStore.getState().api_key_list.map(api_key => (
                <button
                  key={api_key.id}
                  className={`grid-strategy-filter-button ${filter.api_key_id === String(api_key.id) ? 'active' : ''}`}
                  onClick={() => updateFilter('api_key_id', String(api_key.id))}
                >
                  {api_key.name}({api_key_counts[String(api_key.id)]})
                </button>
              ))}
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
          <div className="grid-strategy-stat-value grid-strategy-stat-value--success">
            {statistics.running}
          </div>
          <div className="text-muted label">运行中</div>
        </div>
        <div className="grid-strategy-stat-item">
          <div className="grid-strategy-stat-value grid-strategy-stat-value--warning">
            {statistics.paused}
          </div>
          <div className="text-muted label">已暂停</div>
        </div>
        <div className="grid-strategy-stat-item">
          <div className="grid-strategy-stat-value grid-strategy-stat-value--muted">
            {statistics.stopped}
          </div>
          <div className="text-muted label">已停止</div>
        </div>
      </div>

      {/* 策略列表 */}
      {loading ? (
        <div className="text-muted grid-strategy-loading">
                    加载中...
        </div>
      ) : filtered_list.length > 0 ? (
        <div className="grid-strategy-list">
          {filtered_list.map(strategy => (
            <div key={strategy.id} className="card grid-strategy-card">
              <div className="card-content">
                {/* 策略头部 */}
                <div className="flex items-center space-between mb-12">
                  <div className="flex items-center gap-8">
                    <span
                      className={`grid-strategy-position-badge ${(strategy.position_side || '').toLowerCase()}`}
                    >
                      {getPositionSideText(strategy.position_side)}
                    </span>
                    <span className="grid-strategy-pair-name">
                      {strategy.trading_pair}
                    </span>
                    <span className="text-muted grid-strategy-label-text">
                                            x{strategy.leverage}
                    </span>
                  </div>
                  <span
                    className={`grid-strategy-status-badge ${(strategy.status || 'stopped').toLowerCase()}`}
                  >
                    {getStatusText(strategy)}
                  </span>
                </div>

                {/* 策略参数 */}
                <div className="flex flex-col gap-6 mb-12">
                  {strategy._api_key_name && (
                    <div className="flex items-center gap-8">
                      <span className="grid-strategy-param-label">API Key:</span>
                      <span className="grid-strategy-param-value">
                        {strategy._api_key_name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-8">
                    <span className="grid-strategy-param-label">网格差价:</span>
                    <span className="grid-strategy-param-value">
                      {formatPrice(strategy.grid_price_difference, strategy)}
                    </span>
                    <span className="grid-strategy-unit-label">USDT</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="grid-strategy-param-label">交易数量:</span>
                    <span className="grid-strategy-param-value">
                      {(() => {
                        const quantity = strategy.position_side === 'LONG'
                          ? (strategy.grid_long_open_quantity || strategy.grid_trade_quantity)
                          : (strategy.grid_short_open_quantity || strategy.grid_trade_quantity);
                        return quantity ? NumberFormat.truncateDecimal(quantity) : '-';
                      })()}
                    </span>
                    <span className="grid-strategy-unit-label">{strategy.trading_pair?.replace('USDT', '')}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="grid-strategy-param-label">持仓均价:</span>
                    <span className="grid-strategy-param-value">
                      {formatPrice(strategy.total_open_position_entry_price, strategy)}
                    </span>
                    <span className="grid-strategy-unit-label">USDT</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="grid-strategy-param-label">当前价格:</span>
                    <span className="grid-strategy-param-value">
                      {getCurrentPriceText(strategy.trading_pair, ticker_prices)}
                    </span>
                    <span className="grid-strategy-unit-label">USDT</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="grid-strategy-param-label">保本价:</span>
                    <span className="grid-strategy-param-value">
                      {formatPrice(strategy.break_even_price, strategy)}
                    </span>
                    <span className="grid-strategy-unit-label">USDT</span>
                  </div>
                  {strategy.gt_limitation_price && (
                    <div className="flex items-center gap-8">
                      <span className="grid-strategy-param-label">价格上限:</span>
                      <span className="grid-strategy-param-value">
                        {formatPrice(strategy.gt_limitation_price, strategy)}
                      </span>
                      <span className="grid-strategy-unit-label">USDT</span>
                    </div>
                  )}
                  {strategy.lt_limitation_price && (
                    <div className="flex items-center gap-8">
                      <span className="grid-strategy-param-label">价格下限:</span>
                      <span className="grid-strategy-param-value">
                        {formatPrice(strategy.lt_limitation_price, strategy)}
                      </span>
                      <span className="grid-strategy-unit-label">USDT</span>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-8 grid-strategy-actions">
                  <Link
                    to={`/grid-strategy/detail?id=${strategy.id}`}
                    className="btn btn-ghost grid-strategy-detail-btn"
                  >
                    查看详情
                  </Link>
                  <button
                    className="btn btn-ghost grid-strategy-toggle-btn"
                    onClick={() => handleToggleStatus(strategy.id, strategy.status ?? 'stopped')}
                    disabled={!canTogglePause(strategy.execution_status)}
                  >
                    {strategy.execution_status === EXECUTION_STATUS.PAUSED_MANUAL ? '启动' : '暂停'}
                  </button>
                  <Link
                    to={`/grid-strategy/edit?id=${strategy.id}`}
                    className="btn btn-outline grid-strategy-edit-btn"
                  >
                    编辑
                  </Link>
                  <button
                    className="btn btn-danger grid-strategy-delete-btn"
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

export default GridStrategyListPage;
