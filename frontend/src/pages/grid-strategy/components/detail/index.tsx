import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import './index.scss';
import { useBinanceStore } from '../../../../stores/binance-store';
import { GridStrategyApi } from '../../../../api';
import { ROUTES } from '../../../../router';
import { showError, showSuccess } from '../../../../utils/api-error';
import {
  IconClock,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
  IconCopy,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconCoins,
  IconChartBar,
  IconSettings
} from '@tabler/icons-react';

interface GridStrategyDetail {
  id: number;
  name?: string;
  trading_pair: string;
  position_side: 'LONG' | 'SHORT';
  leverage: number;
  paused: boolean;
  remark: string;
  grid_price_difference: number;
  grid_long_open_quantity?: number;
  grid_long_close_quantity?: number;
  grid_short_open_quantity?: number;
  grid_short_close_quantity?: number;
  total_open_position_quantity: number;
  total_open_position_value: number;
  total_open_position_entry_price: number;
  total_profit_loss: number;
  total_trades: number;
  total_pairing_times: number;
  total_fee: number;
  funding_fee: number;
  start_time?: string;
  created_at: string;
  updated_at: string;
  exchange?: string;
  exchange_type?: string;
  margin_type?: string;
  liquidation_price?: number;
}

function GridStrategyDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const [strategy, setStrategy] = useState<GridStrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  const { ticker_prices, subscribeTicker, unsubscribeTicker } = useBinanceStore();

  const loadStrategyDetail = useCallback(async () => {
    if (!id) return;

    try {
      const response = await GridStrategyApi.list({});
      if (response.status === 'success' && response.datum && response.datum.list) {
        const strategy_detail = response.datum.list.find((s: any) => s.id === parseInt(id));
        if (strategy_detail) {
          setStrategy(strategy_detail);
        } else {
          showError('策略不存在');
          navigate(ROUTES.GRID_STRATEGY);
        }
      } else {
        showError('加载失败');
        navigate(ROUTES.GRID_STRATEGY);
      }
    } catch (error) {
      showError('加载失败');
      navigate(ROUTES.GRID_STRATEGY);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStrategyDetail();
    setRefreshing(false);
    showSuccess('刷新成功');
  };

  const handleToggleStatus = async () => {
    if (!strategy) return;
    const new_paused = !strategy.paused;
    const api_method = new_paused ? GridStrategyApi.pause : GridStrategyApi.resume;

    try {
      const response = await api_method(strategy.id);
      if (response.status === 'success') {
        showSuccess(new_paused ? '策略已暂停' : '策略已启动');
        await loadStrategyDetail();
      } else {
        showError(response.message || '操作失败');
      }
    } catch (error) {
      showError('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!strategy) return;
    if (!confirm(`确定要删除策略 ${strategy.trading_pair} 吗？`)) return;

    try {
      const response = await GridStrategyApi.delete(strategy.id);
      if (response.status === 'success') {
        showSuccess('删除成功');
        navigate(ROUTES.GRID_STRATEGY);
      } else {
        showError(response.message || '删除失败');
      }
    } catch (error) {
      showError('删除失败');
    }
  };

  const handleCopy = () => {
    if (!strategy) return;
    navigate(`${ROUTES.GRID_STRATEGY_EDIT}?copy_from=${strategy.id}`);
  };

  useEffect(() => {
    if (strategy?.trading_pair) {
      subscribeTicker(strategy.trading_pair);
      return () => unsubscribeTicker(strategy.trading_pair);
    }
  }, [strategy?.trading_pair, subscribeTicker, unsubscribeTicker]);

  useEffect(() => {
    if (strategy?.trading_pair && ticker_prices[strategy.trading_pair]) {
      setCurrentPrice(ticker_prices[strategy.trading_pair]);
    }
  }, [ticker_prices, strategy?.trading_pair]);

  useEffect(() => {
    loadStrategyDetail();
  }, [loadStrategyDetail]);

  if (loading) {
    return (
      <div className="strategy-detail-page">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="strategy-detail-page">
        <div className="error-state">策略不存在</div>
      </div>
    );
  }

  const strategy_status = strategy.paused ? 'paused' : (strategy.remark === 'error' ? 'stopped' : 'running');
  const is_long = strategy.position_side === 'LONG';
  const profit_color = strategy.total_profit_loss >= 0 ? 'var(--color-success)' : 'var(--color-error)';

  const run_days = strategy.start_time
    ? Math.floor((Date.now() - new Date(strategy.start_time).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatRunDuration = (start_time: string): string => {
    const now = Date.now();
    const start = new Date(start_time).getTime();
    const diff = now - start;

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor((diff / (1000 * 60 * 60 * 24)) % 30);
    const months = Math.floor((diff / (1000 * 60 * 60 * 24 * 30)) % 12);
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));

    const parts = [];
    if (years > 0) parts.push(`${years}年`);
    if (months > 0) parts.push(`${months}月`);
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (seconds > 0) parts.push(`${seconds}秒`);

    return parts.length > 0 ? parts.join('') : '0秒';
  };

  const run_duration = strategy.start_time ? formatRunDuration(strategy.start_time) : '未启动';

  const profit_rate = strategy.total_open_position_value > 0
    ? (strategy.total_profit_loss / strategy.total_open_position_value) * 100
    : 0;

  const price_change = currentPrice && strategy.total_open_position_entry_price
    ? ((currentPrice - strategy.total_open_position_entry_price) / strategy.total_open_position_entry_price) * 100
    : 0;

  return (
    <div className="strategy-detail-page">
      <div className="detail-header">
        <div className="detail-header-left">
          <Link to={ROUTES.GRID_STRATEGY} className="back-link">← 返回</Link>
          <div className="strategy-info">
            <div className="strategy-title-row">
              <span className={`position-badge ${is_long ? 'long' : 'short'}`}>
                {is_long ? '做多' : '做空'}
              </span>
              <h1 className="strategy-title">{strategy.trading_pair}</h1>
              <span className="leverage-badge">x{strategy.leverage}</span>
              {strategy.name && <span className="strategy-name">{strategy.name}</span>}
            </div>
            <div className="strategy-meta">
              <span className={`status-dot status-${strategy_status}`}></span>
              <span className="status-text">
                {strategy_status === 'running' ? '运行中' : strategy_status === 'paused' ? '已暂停' : '已停止'}
              </span>
              <span className="divider">|</span>
              <span className="meta-text">创建于 {new Date(strategy.created_at).toLocaleDateString()}</span>
              <span className="divider">|</span>
              <span className="meta-text">累计运行 {run_duration}</span>
            </div>
          </div>
        </div>
        <div className="detail-header-right">
          <button className="action-btn" onClick={handleRefresh} disabled={refreshing}>
            <IconRefresh size={16} />
          </button>
          <Link to={`${ROUTES.GRID_STRATEGY_EDIT}?id=${strategy.id}`} className="action-btn">
            <IconEdit size={16} />
          </Link>
          <button className="action-btn" onClick={handleCopy}>
            <IconCopy size={16} />
          </button>
          {strategy_status === 'running' ? (
            <button className="action-btn warning" onClick={handleToggleStatus}>
              <IconPlayerPause size={16} />
            </button>
          ) : (
            <button className="action-btn success" onClick={handleToggleStatus}>
              <IconPlayerPlay size={16} />
            </button>
          )}
          <button className="action-btn danger" onClick={handleDelete}>
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="profit-card">
            <div className="profit-main">
              <div className="profit-label">总盈亏</div>
              <div className="profit-value" style={{ color: profit_color }}>
                {strategy.total_profit_loss >= 0 ? '+' : ''}{strategy.total_profit_loss.toFixed(2)}
                <span className="profit-unit">USDT</span>
              </div>
              <div className="profit-rate" style={{ color: profit_color }}>
                {profit_rate >= 0 ? '+' : ''}{profit_rate.toFixed(2)}%
              </div>
            </div>
            <div className="profit-divider"></div>
            <div className="profit-stats">
              <div className="profit-stat-item">
                <IconActivity size={14} />
                <span className="stat-label">交易次数</span>
                <span className="stat-value">{strategy.total_trades}</span>
              </div>
              <div className="profit-stat-item">
                <IconChartBar size={14} />
                <span className="stat-label">配对次数</span>
                <span className="stat-value">{strategy.total_pairing_times}</span>
              </div>
              <div className="profit-stat-item">
                <IconCoins size={14} />
                <span className="stat-label">手续费</span>
                <span className="stat-value">{strategy.total_fee.toFixed(2)} USDT</span>
              </div>
            </div>
          </div>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-header">
                <IconTrendingUp size={16} />
                <span>当前持仓</span>
              </div>
              <div className="info-card-body">
                <div className="info-row">
                  <span className="info-label">持仓数量</span>
                  <span className="info-value">{strategy.total_open_position_quantity.toFixed(4)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">持仓价值</span>
                  <span className="info-value">{strategy.total_open_position_value.toFixed(2)} USDT</span>
                </div>
                <div className="info-row">
                  <span className="info-label">成本价格</span>
                  <span className="info-value">{strategy.total_open_position_entry_price.toFixed(2)}</span>
                </div>
                {currentPrice && (
                  <div className="info-row">
                    <span className="info-label">当前价格</span>
                    <span className="info-value">{currentPrice.toFixed(2)}</span>
                  </div>
                )}
                {currentPrice && strategy.total_open_position_entry_price && (
                  <div className="info-row">
                    <span className="info-label">价格变化</span>
                    <span className={`info-value ${price_change >= 0 ? 'positive' : 'negative'}`}>
                      {price_change >= 0 ? '+' : ''}{price_change.toFixed(2)}%
                    </span>
                  </div>
                )}
                {strategy.liquidation_price && (
                  <div className="info-row">
                    <span className="info-label">强平价格</span>
                    <span className="info-value warning">{strategy.liquidation_price.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <IconSettings size={16} />
                <span>网格参数</span>
              </div>
              <div className="info-card-body">
                <div className="info-row">
                  <span className="info-label">网格价差</span>
                  <span className="info-value">{strategy.grid_price_difference}%</span>
                </div>
                {strategy.grid_long_open_quantity && (
                  <div className="info-row">
                    <span className="info-label">做多开仓</span>
                    <span className="info-value">{strategy.grid_long_open_quantity}</span>
                  </div>
                )}
                {strategy.grid_long_close_quantity && (
                  <div className="info-row">
                    <span className="info-label">做多平仓</span>
                    <span className="info-value">{strategy.grid_long_close_quantity}</span>
                  </div>
                )}
                {strategy.grid_short_open_quantity && (
                  <div className="info-row">
                    <span className="info-label">做空开仓</span>
                    <span className="info-value">{strategy.grid_short_open_quantity}</span>
                  </div>
                )}
                {strategy.grid_short_close_quantity && (
                  <div className="info-row">
                    <span className="info-label">做空平仓</span>
                    <span className="info-value">{strategy.grid_short_close_quantity}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">交易所</span>
                  <span className="info-value">{strategy.exchange || 'BINANCE'}</span>
                </div>
                {strategy.margin_type && (
                  <div className="info-row">
                    <span className="info-label">保证金模式</span>
                    <span className="info-value">{strategy.margin_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h3>费用明细</h3>
            </div>
            <div className="detail-card-body">
              <div className="fee-row">
                <span className="fee-label">总手续费</span>
                <span className="fee-value">{strategy.total_fee.toFixed(2)} USDT</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">资金费用</span>
                <span className={`fee-value ${strategy.funding_fee >= 0 ? 'positive' : 'negative'}`}>
                  {strategy.funding_fee >= 0 ? '+' : ''}{strategy.funding_fee.toFixed(2)} USDT
                </span>
              </div>
              <div className="fee-row total">
                <span className="fee-label">总费用</span>
                <span className="fee-value">
                  {(strategy.total_fee + strategy.funding_fee).toFixed(2)} USDT
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="side-section">
          <div className="status-card">
            <div className="status-card-header">
              <h3>策略状态</h3>
            </div>
            <div className="status-card-body">
              <div className="status-row">
                <span className="status-label">运行状态</span>
                <span className={`status-badge status-${strategy_status}`}>
                  {strategy_status === 'running' ? '运行中' : strategy_status === 'paused' ? '已暂停' : '已停止'}
                </span>
              </div>
              <div className="status-row">
                <span className="status-label">持仓方向</span>
                <span className={`status-badge ${is_long ? 'long' : 'short'}`}>
                  {is_long ? '做多' : '做空'}
                </span>
              </div>
              <div className="status-row">
                <span className="status-label">杠杆倍数</span>
                <span className="status-value">x{strategy.leverage}</span>
              </div>
              {strategy.remark && strategy.remark !== 'error' && (
                <div className="status-row">
                  <span className="status-label">备注</span>
                  <span className="status-value">{strategy.remark}</span>
                </div>
              )}
            </div>
          </div>

          <div className="time-card">
            <div className="time-card-header">
              <IconClock size={14} />
              <span>时间信息</span>
            </div>
            <div className="time-card-body">
              <div className="time-row">
                <span className="time-label">创建时间</span>
                <span className="time-value">{new Date(strategy.created_at).toLocaleString()}</span>
              </div>
              {strategy.start_time && (
                <div className="time-row">
                  <span className="time-label">启动时间</span>
                  <span className="time-value">{new Date(strategy.start_time).toLocaleString()}</span>
                </div>
              )}
              <div className="time-row">
                <span className="time-label">更新时间</span>
                <span className="time-value">{new Date(strategy.updated_at).toLocaleString()}</span>
              </div>
              <div className="time-row">
                <span className="time-label">运行时长</span>
                <span className="time-value">{run_duration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GridStrategyDetailPage;
