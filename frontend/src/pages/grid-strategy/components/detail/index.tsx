import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import './index.scss';
import { useBinanceStore } from '../../../../stores/binance-store';
import { GridStrategyApi } from '../../../../api';
import { ROUTES } from '../../../../router';
import { showError, showSuccess } from '../../../../utils/api-error';
import { getStrategyDisplayStatus, getStrategyStatusText } from '../../../../utils/grid-strategy-status';
import { EXECUTION_STATUS } from '../../../../types/grid-strategy';
import {
  IconRefresh,
  IconEdit,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
  IconCopy
} from '@tabler/icons-react';
import {
  ProfitCard,
  PositionInfoCard,
  GridParamsCard,
  PluginLogsCard,
  FeeDetailCard,
  StrategyStatusCard,
  TimeInfoCard
} from '../../../../components/grid-strategy/detail-cards';
import { GridStrategyDetail, PluginLog } from '../../../../types/grid-strategy';

function GridStrategyDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id_str = searchParams.get('id');

  // 一次性转换并验证 ID
  const strategy_id = id_str ? parseInt(id_str) : null;

  const [strategy, setStrategy] = useState<GridStrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [pluginLogs, setPluginLogs] = useState<PluginLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPagination, setLogPagination] = useState<{
    current_page: number;
    page_size: number;
    total: number;
  } | undefined>(undefined);
  const [runDuration, setRunDuration] = useState<string>('未启动');

  // 防止 StrictMode 双重渲染导致重复请求
  const has_loaded_ref = useRef(false);
  const interval_ref = useRef<NodeJS.Timeout | null>(null);

  const { ticker_prices, subscribeTicker, unsubscribeTicker, initialized: binance_initialized, connectSocket, is_initializing } = useBinanceStore();

  const loadStrategyDetail = useCallback(async () => {
    if (!strategy_id) return;

    try {
      // 从 binance-store 获取所有 API Key
      const { api_key_list } = useBinanceStore.getState();

      // 如果正在初始化中，等待完成
      if (is_initializing) {
        return;
      }

      if (!api_key_list || api_key_list.length === 0) {
        showError('请先在币安 API Key 管理中添加 API Key');
        navigate(ROUTES.GRID_STRATEGY);
        return;
      }

      // 并发请求所有 API Key 的策略列表
      const requests = api_key_list.map(api_key =>
        GridStrategyApi.list({
          current_page: 1,
          page_size: 100,
          api_key: api_key.api_key,
          api_secret: api_key.api_secret
        })
      );

      const responses = await Promise.all(requests);

      // 从所有策略列表中查找指定 ID 的策略
      let strategy_detail = null;
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response.status === 'success' && response.datum && response.datum.list) {
          const found = response.datum.list.find((s: any) => s.id === strategy_id);
          if (found) {
            strategy_detail = found;
            break;
          }
        }
      }

      if (strategy_detail) {
        setStrategy(strategy_detail);
      } else {
        showError('策略不存在');
        navigate(ROUTES.GRID_STRATEGY);
      }
    } catch (error) {
      console.error('加载策略详情失败:', error);
      showError('加载失败');
      navigate(ROUTES.GRID_STRATEGY);
    } finally {
      setLoading(false);
    }
  }, [strategy_id, navigate, is_initializing]);

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
      const response = await GridStrategyApi.delete([strategy.id]);
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

  const loadPluginLogs = useCallback(async (params?: {
    current_page?: number;
    event_type?: string;
    start_time?: string;
    end_time?: string;
  }) => {
    if (!strategy_id) return;

    setLogLoading(true);
    try {
      const response = await GridStrategyApi.getPluginLogs({
        strategy_id: strategy_id,
        current_page: params?.current_page || 1,
        page_size: 50,
        event_type: params?.event_type,
        start_time: params?.start_time,
        end_time: params?.end_time
      });
      if (response.status === 'success' && response.datum) {
        setPluginLogs(response.datum.list || []);
        setLogPagination(response.datum.pagination);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    } finally {
      setLogLoading(false);
    }
  }, [strategy_id]);

  useEffect(() => {
    if (strategy?.trading_pair) {
      // 先建立 WebSocket 连接,然后订阅 ticker
      connectSocket().then(() => {
        subscribeTicker(strategy.trading_pair);
      }).catch(error => {
        console.error('WebSocket 连接失败:', error);
      });
      return () => unsubscribeTicker(strategy.trading_pair);
    }
  }, [strategy?.trading_pair, subscribeTicker, unsubscribeTicker, connectSocket]);

  useEffect(() => {
    if (strategy?.trading_pair && ticker_prices[strategy.trading_pair]) {
      setCurrentPrice(ticker_prices[strategy.trading_pair].price);
    }
  }, [ticker_prices, strategy?.trading_pair]);

  useEffect(() => {
    // 防止 StrictMode 双重渲染导致重复请求
    if (has_loaded_ref.current) {
      return;
    }

    // 等待 binance-store 初始化完成后再加载策略详情
    if (!binance_initialized) {
      return;
    }

    has_loaded_ref.current = true;
    loadStrategyDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy_id, binance_initialized]);

  useEffect(() => {
    if (strategy) {
      loadPluginLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy?.id]);

  // 运行时长自动更新
  useEffect(() => {
    if (!strategy) return;

    const start_time = strategy.start_time || strategy.created_at;
    if (!start_time) return;

    // 立即计算一次
    const updateDuration = () => {
      const diff_ms = Date.now() - new Date(start_time).getTime();
      const total_seconds = Math.floor(diff_ms / 1000);

      const seconds = total_seconds % 60;
      const minutes = Math.floor((total_seconds / 60) % 60);
      const hours = Math.floor((total_seconds / 3600) % 24);
      const days = Math.floor((total_seconds / 86400) % 30);
      const months = Math.floor((total_seconds / 2592000) % 12);
      const years = Math.floor(total_seconds / 31536000);

      const parts = [];
      if (years > 0) parts.push(`${years}年`);
      if (months > 0) parts.push(`${months}月`);
      if (days > 0) parts.push(`${days}天`);
      if (hours > 0) parts.push(`${hours}时`);
      if (minutes > 0) parts.push(`${minutes}分`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);

      setRunDuration(parts.join(''));
    };

    updateDuration();

    // 每秒更新一次
    interval_ref.current = setInterval(updateDuration, 1000);

    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
        interval_ref.current = null;
      }
    };
  }, [strategy]);

  if (loading) {
    return (
      <div className="strategy-detail-page container">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="strategy-detail-page container">
        <div className="error-state">策略不存在</div>
      </div>
    );
  }

  // 使用新的状态映射逻辑
  const strategy_status = getStrategyDisplayStatus(strategy);
  const strategy_status_text = getStrategyStatusText(strategy.execution_status);

  return (
    <div className="strategy-detail-page container">
      <div className="detail-header">
        <div className="detail-header-left">
          <Link to={ROUTES.GRID_STRATEGY} className="back-link">← 返回</Link>
          <div className="strategy-info">
            <div className="strategy-title-row">
              <span className={`position-badge ${strategy.position_side === 'LONG' ? 'long' : 'short'}`}>
                {strategy.position_side === 'LONG' ? '做多' : '做空'}
              </span>
              <h1 className="strategy-title">{strategy.trading_pair}</h1>
              <span className="leverage-badge">x{strategy.leverage}</span>
              {strategy.name && <span className="strategy-name">{strategy.name}</span>}
            </div>
            <div className="strategy-meta">
              <span className={`status-dot status-${strategy_status}`}></span>
              <span className="status-text">
                {strategy_status_text}
              </span>
              <span className="divider">|</span>
              <span className="meta-text">创建于 {new Date(strategy.created_at).toLocaleDateString()}</span>
              <span className="divider">|</span>
              <span className="meta-text">累计运行 {runDuration}</span>
            </div>
          </div>
        </div>
        <div className="detail-header-right">
          <div className="header-action-btn" onClick={handleRefresh}>
            <span className="header-action-text">刷新</span>
            <IconRefresh size={14} />
          </div>
          <Link to={`${ROUTES.GRID_STRATEGY_EDIT}?id=${strategy.id}`} className="header-action-btn">
            <span className="header-action-text">编辑</span>
            <IconEdit size={14} />
          </Link>
          <div className="header-action-btn" onClick={handleCopy}>
            <span className="header-action-text">复制</span>
            <IconCopy size={14} />
          </div>
          {strategy.execution_status === EXECUTION_STATUS.PAUSED_MANUAL ? (
            <div className="header-action-btn success" onClick={handleToggleStatus}>
              <span className="header-action-text">启动</span>
              <IconPlayerPlay size={14} />
            </div>
          ) : (
            <div
              className="header-action-btn warning"
              onClick={handleToggleStatus}
              style={{ opacity: strategy_status !== 'running' ? 0.5 : 1 }}
            >
              <span className="header-action-text">暂停</span>
              <IconPlayerPause size={14} />
            </div>
          )}
          <div className="header-action-btn danger" onClick={handleDelete}>
            <span className="header-action-text">删除</span>
            <IconTrash size={14} />
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <ProfitCard
            total_profit_loss={strategy.total_profit_loss}
            total_open_position_value={strategy.total_open_position_value}
            total_trades={strategy.total_trades}
            total_pairing_times={strategy.total_pairing_times}
            total_fee={strategy.total_fee}
          />

          <div className="info-cards">
            <PositionInfoCard
              total_open_position_quantity={strategy.total_open_position_quantity}
              total_open_position_value={strategy.total_open_position_value}
              total_open_position_entry_price={strategy.total_open_position_entry_price}
              current_price={currentPrice}
              liquidation_price={strategy.liquidation_price}
              break_even_price={strategy.break_even_price}
            />

            <GridParamsCard
              grid_price_difference={strategy.grid_price_difference}
              grid_long_open_quantity={strategy.grid_long_open_quantity}
              grid_long_close_quantity={strategy.grid_long_close_quantity}
              grid_short_open_quantity={strategy.grid_short_open_quantity}
              grid_short_close_quantity={strategy.grid_short_close_quantity}
              exchange={strategy.exchange}
              margin_type={strategy.margin_type}
              position_side={strategy.position_side}
              current_price={currentPrice}
            />
          </div>

          <PluginLogsCard
            plugin_logs={pluginLogs}
            log_loading={logLoading}
            on_refresh_logs={loadPluginLogs}
            pagination={logPagination}
          />
        </div>

        <div className="side-section">
          <StrategyStatusCard
            strategy_status={strategy_status}
            position_side={strategy.position_side}
            leverage={strategy.leverage}
            status_text={strategy_status_text}
          />

          <TimeInfoCard
            created_at={strategy.created_at}
            start_time={strategy.start_time}
            updated_at={strategy.updated_at}
            run_duration={runDuration}
          />

          <FeeDetailCard
            total_fee={strategy.total_fee}
            funding_fee={strategy.funding_fee}
          />
        </div>
      </div>
    </div>
  );
}

export default GridStrategyDetailPage;
