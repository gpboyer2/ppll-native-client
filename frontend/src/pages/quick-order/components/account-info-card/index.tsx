import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { BinanceAccountApi } from '../../../../api';
import { useBinanceStore } from '../../../../stores/binance-store';
import type { AccountPosition } from '../../../../types/binance';
import './index.scss';

export interface AccountInfoCardRef {
  refresh: () => Promise<void>;
}

export interface AccountInfoData {
  available_balance: number;
  positions: AccountPosition[];
  today_profit_loss: number;
  margin_balance: number;
  wallet_balance: number;
  unrealized_profit: number;
}

export interface AccountInfoCardProps {
  externalData?: AccountInfoData;
  onRefreshRequest?: () => Promise<void>;
}

export const AccountInfoCard = forwardRef<AccountInfoCardRef, AccountInfoCardProps>((props, ref) => {
  const { externalData, onRefreshRequest } = props;
  const navigate = useNavigate();

  const get_active_api_key = useBinanceStore(state => state.get_active_api_key);
  const active_api_key_id = useBinanceStore(state => state.active_api_key_id);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AccountInfoData>({
    available_balance: 0,
    positions: [],
    today_profit_loss: 0,
    margin_balance: 0,
    wallet_balance: 0,
    unrealized_profit: 0
  });

  const loadAccountData = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigate('/settings');
      return;
    }

    setLoading(true);

    try {
      const response = await BinanceAccountApi.getUSDMFutures({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        include_positions: true
      });

      if (response.status === 'success' && response.datum) {
        const datum = response.datum;
        setData({
          available_balance: parseFloat(datum.availableBalance || datum.totalWalletBalance || '0'),
          positions: datum.positions || [],
          today_profit_loss: 0,
          margin_balance: parseFloat(datum.totalMarginBalance || '0'),
          wallet_balance: parseFloat(datum.totalWalletBalance || '0'),
          unrealized_profit: parseFloat(datum.totalUnrealizedProfit || '0')
        });
      }
    } catch (err) {
      console.error('[AccountInfoCard] 获取账户信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: onRefreshRequest ?? loadAccountData
  }));

  useEffect(() => {
    loadAccountData();
  }, [active_api_key_id]);

  const displayData = externalData ?? data;

  const long_positions = displayData.positions.filter(
    p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
  );
  const short_positions = displayData.positions.filter(
    p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
  );

  const total_long_amount = long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const total_short_amount = short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const net_position = total_long_amount - total_short_amount;

  const is_balance_low = displayData.available_balance < 1000;

  return (
    <div className="account-info-card">
      <div className="account-info-card-header">
        <span className="account-info-card-title">账户信息</span>
      </div>
      <div className="account-info-card-content">
        <div className="account-info-card-row">
          <div className="account-info-card-item">
            <span className="account-info-card-label">可用保证金</span>
            <span className={`account-info-card-value ${is_balance_low ? 'account-info-card-value-warning' : ''}`}>
              {displayData.available_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局多单仓位</span>
            <span className="account-info-card-value account-info-card-value-long">
              {total_long_amount.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局空单仓位</span>
            <span className="account-info-card-value account-info-card-value-short">
              {total_short_amount.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局净仓</span>
            <span className={`account-info-card-value ${net_position > 0 ? 'account-info-card-value-long' : net_position < 0 ? 'account-info-card-value-short' : ''}`}>
              {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
            </span>
          </div>
        </div>
        <div className="account-info-card-row">
          <div className="account-info-card-item">
            <span className="account-info-card-label">今日盈亏</span>
            <span className={`account-info-card-value ${displayData.today_profit_loss > 0 ? 'account-info-card-value-long' : displayData.today_profit_loss < 0 ? 'account-info-card-value-short' : ''}`}>
              {displayData.today_profit_loss > 0 ? '+' : ''}{displayData.today_profit_loss.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">保证金余额</span>
            <span className="account-info-card-value">
              {displayData.margin_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">钱包余额</span>
            <span className="account-info-card-value">
              {displayData.wallet_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">未实现盈亏</span>
            <span className={`account-info-card-value ${displayData.unrealized_profit > 0 ? 'account-info-card-value-long' : displayData.unrealized_profit < 0 ? 'account-info-card-value-short' : ''}`}>
              {displayData.unrealized_profit > 0 ? '+' : ''}{displayData.unrealized_profit.toFixed(2)} U
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
