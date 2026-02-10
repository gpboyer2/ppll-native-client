import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { OrdersApi } from '../../../../api';
import type { QuickOrderRecord, WinRateStats } from '../../../../api';
import { useBinanceStore } from '../../../../stores/binance-store';
import './index.scss';

export interface ProfitStatsCardRef {
  refresh: () => Promise<void>;
}

export interface ProfitStatsData {
  today_profit: number;
  today_trades: number;
  today_win_rate: number;
  total_profit: number;
  total_trades: number;
  total_win_rate: number;
}

export interface ProfitStatsCardProps {
  onRefreshRequest?: () => Promise<void>;
}

export const ProfitStatsCard = forwardRef<ProfitStatsCardRef, ProfitStatsCardProps>((props, ref) => {
  const { onRefreshRequest } = props;

  const get_active_api_key = useBinanceStore(state => state.get_active_api_key);
  const active_api_key_id = useBinanceStore(state => state.active_api_key_id);

  const [loading, setLoading] = useState(false);
  const [orderRecords, setOrderRecords] = useState<QuickOrderRecord[]>([]);
  const [winRateStats, setWinRateStats] = useState<WinRateStats>({
    today_win_rate: 0,
    total_win_rate: 0
  });

  const loadOrderRecords = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      return;
    }

    try {
      const response = await OrdersApi.getQuickOrderRecords({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret
      });

      if (response.status === 'success' && response.datum) {
        setOrderRecords(response.datum.list || []);
      } else {
        setOrderRecords([]);
      }
    } catch (err) {
      console.error('[ProfitStatsCard] 加载订单记录失败:', err);
      setOrderRecords([]);
    }
  };

  const loadWinRateStats = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      return;
    }

    try {
      const response = await OrdersApi.getUmWinRateStats({
        api_key: active_api_key.api_key
      });

      if (response.status === 'success' && response.datum) {
        setWinRateStats(response.datum);
      } else {
        setWinRateStats({ today_win_rate: 0, total_win_rate: 0 });
      }
    } catch (err) {
      console.error('[ProfitStatsCard] 加载胜率统计失败:', err);
      setWinRateStats({ today_win_rate: 0, total_win_rate: 0 });
    }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([loadOrderRecords(), loadWinRateStats()]);
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({
    refresh: onRefreshRequest ?? refresh
  }));

  useEffect(() => {
    refresh();
  }, [active_api_key_id]);

  // 获取今日日期（UTC 0点开始）
  const today_start = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // 从订单记录中计算今日盈亏（过滤今日订单）
  const today_records = useMemo(() => {
    return orderRecords.filter(record => {
      const record_date = new Date(record.created_at);
      return record_date >= today_start;
    });
  }, [orderRecords, today_start]);

  const today_profit = today_records.reduce((sum, record) => {
    const profit = record.realized_pnl ?? 0;
    return sum + profit;
  }, 0);

  const today_trades = today_records.length;
  const today_win_rate = winRateStats.today_win_rate;

  const total_profit = orderRecords.reduce((sum, record) => {
    const profit = record.realized_pnl ?? 0;
    return sum + profit;
  }, 0);
  const total_trades = orderRecords.length;
  const total_win_rate = winRateStats.total_win_rate;

  return (
    <div className="profit-stats-card">
      <div className="profit-stats-card-header">
        <span className="profit-stats-card-title">收益战绩统计</span>
      </div>
      <div className="profit-stats-card-content">
        <div className="profit-stats-card-row">
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日盈亏</span>
            <span className={`profit-stats-card-value ${today_profit > 0 ? 'profit-stats-card-value-long' : today_profit < 0 ? 'profit-stats-card-value-short' : ''}`}>
              {today_profit > 0 ? '+' : ''}{today_profit.toFixed(2)} U
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日交易</span>
            <span className="profit-stats-card-value">
              {today_trades}
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总盈亏</span>
            <span className={`profit-stats-card-value ${total_profit > 0 ? 'profit-stats-card-value-long' : total_profit < 0 ? 'profit-stats-card-value-short' : ''}`}>
              {total_profit > 0 ? '+' : ''}{total_profit.toFixed(2)} U
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总交易</span>
            <span className="profit-stats-card-value">
              {total_trades}
            </span>
          </div>
        </div>
        <div className="profit-stats-card-row">
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日胜率</span>
            <span className={`profit-stats-card-value ${today_win_rate >= 50 ? 'profit-stats-card-value-long' : today_win_rate < 50 ? 'profit-stats-card-value-short' : ''}`}>
              {today_win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总计胜率</span>
            <span className={`profit-stats-card-value ${total_win_rate >= 50 ? 'profit-stats-card-value-long' : total_win_rate < 50 ? 'profit-stats-card-value-short' : ''}`}>
              {total_win_rate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
