import { useState, useEffect, useCallback } from 'react';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconAlertCircle,
  IconWallet,
  IconScale,
  IconX
} from '@tabler/icons-react';
import { Button, Select, NumberInput } from '../../components/mantine';
import { useBinanceStore } from '../../stores/binance-store';
import { OrdersApi, BinanceAccountApi } from '../../api';
import type { AccountPosition } from '../../types/binance';
import './index.scss';

const QUICK_AMOUNTS = [1000, 2000, 3000, 4000];
const CLOSE_PERCENTAGES = [25, 50, 75, 100];
const DEFAULT_LEVERAGE = 20;

type CloseSide = 'long' | 'short' | 'both';

/**
 * 获取当前价格的显示文本
 */
function getCurrentPriceText(price: number | string | undefined): string {
  if (!price) return '--';
  return Number(price).toFixed(2);
}

/**
 * 快捷开单独立页面
 * 支持快速开仓、平仓、持平操作
 */
function QuickOrderPage() {
  const [trading_pair, setTradingPair] = useState('BTCUSDT');
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [loading, setLoading] = useState(false);
  const [account_loading, setAccountLoading] = useState(false);
  const [error_msg, setErrorMsg] = useState<string | null>(null);
  const [custom_close_long_amount, setCustomCloseLongAmount] = useState('');
  const [custom_close_short_amount, setCustomCloseShortAmount] = useState('');

  const usdt_pairs = useBinanceStore(state => state.usdt_pairs);
  const get_active_api_key = useBinanceStore(state => state.get_active_api_key);
  const ticker_prices = useBinanceStore(state => state.ticker_prices);
  const subscribeTicker = useBinanceStore(state => state.subscribeTicker);

  const current_price = ticker_prices[trading_pair]?.price || 0;

  const [account_data, setAccountData] = useState<{
    available_balance: number;
    positions: AccountPosition[];
  }>({ available_balance: 0, positions: [] });

  const loadAccountData = useCallback(async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      setErrorMsg('请先配置 API Key');
      return;
    }

    setAccountLoading(true);
    setErrorMsg(null);

    try {
      const response = await BinanceAccountApi.getUSDMFutures({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        include_positions: true
      });

      if (response.status === 'success' && response.datum) {
        const data = response.datum.data || response.datum;
        setAccountData({
          available_balance: parseFloat(data.available_wallet_balance || data.total_wallet_balance || '0'),
          positions: data.positions || []
        });
      } else {
        setErrorMsg(response.message || '获取账户信息失败');
      }
    } catch (err) {
      console.error('获取账户信息失败:', err);
      setErrorMsg('获取账户信息失败');
    } finally {
      setAccountLoading(false);
    }
  }, [get_active_api_key]);

  const subscribeCurrentSymbol = useCallback(() => {
    subscribeTicker(trading_pair, 'usdm');
  }, [trading_pair, subscribeTicker]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  useEffect(() => {
    subscribeCurrentSymbol();
  }, [subscribeCurrentSymbol]);

  const long_positions = account_data.positions.filter(
    p => parseFloat(p.position_amt) > 0 && (p.position_side === 'LONG' || p.position_side === 'BOTH')
  );
  const short_positions = account_data.positions.filter(
    p => parseFloat(p.position_amt) < 0 && (p.position_side === 'SHORT' || p.position_side === 'BOTH')
  );

  const total_long_amount = long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const total_short_amount = short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const net_position = total_long_amount - total_short_amount;

  const handleOpenPosition = async (side: 'long' | 'short', amount: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      setErrorMsg('请先配置 API Key');
      return;
    }

    if (account_data.available_balance < amount) {
      setErrorMsg(`可用保证金不足，当前: ${account_data.available_balance.toFixed(2)} USDT`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const position_config = {
        symbol: trading_pair,
        long_amount: side === 'long' ? amount : 0,
        short_amount: side === 'short' ? amount : 0
      };

      const response = await OrdersApi.customBuildPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: [position_config]
      });

      if (response.status === 'success') {
        await loadAccountData();
      } else {
        setErrorMsg(response.message || '开仓失败');
      }
    } catch (err) {
      console.error('开仓失败:', err);
      setErrorMsg('开仓失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBalancePosition = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      setErrorMsg('请先配置 API Key');
      return;
    }

    const diff = total_long_amount - total_short_amount;
    if (Math.abs(diff) < 1) {
      setErrorMsg('多空仓位已平衡');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const side = diff > 0 ? 'short' : 'long';
      const amount = Math.abs(diff);

      const position_config = {
        symbol: trading_pair,
        long_amount: side === 'long' ? amount : 0,
        short_amount: side === 'short' ? amount : 0
      };

      const response = await OrdersApi.customBuildPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: [position_config]
      });

      if (response.status === 'success') {
        await loadAccountData();
      } else {
        setErrorMsg(response.message || '持平失败');
      }
    } catch (err) {
      console.error('持平失败:', err);
      setErrorMsg('持平失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseByPercentage = async (side: CloseSide, percentage: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      setErrorMsg('请先配置 API Key');
      return;
    }

    const target_positions = side === 'long'
      ? long_positions
      : side === 'short'
        ? short_positions
        : [...long_positions, ...short_positions];

    if (target_positions.length === 0) {
      setErrorMsg('当前没有对应持仓');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.position_amt);
        const close_quantity = Math.abs(position_amt) * (percentage / 100);
        return {
          symbol: p.symbol,
          type: position_amt > 0 ? 'CLOSE_LONG' : 'CLOSE_SHORT',
          quantity: close_quantity.toString()
        };
      });

      const response = await OrdersApi.customClosePosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: close_positions
      });

      if (response.status === 'success') {
        await loadAccountData();
      } else {
        setErrorMsg(response.message || '平仓失败');
      }
    } catch (err) {
      console.error('平仓失败:', err);
      setErrorMsg('平仓失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseByAmount = async (side: CloseSide, amount: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      setErrorMsg('请先配置 API Key');
      return;
    }

    const target_amount = side === 'long'
      ? total_long_amount
      : side === 'short'
        ? total_short_amount
        : total_long_amount + total_short_amount;

    if (target_amount < amount) {
      setErrorMsg(`持仓金额不足，当前: ${target_amount.toFixed(2)} USDT`);
      return;
    }

    if (target_amount === 0) {
      setErrorMsg('当前没有对应持仓');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const target_positions = side === 'long'
        ? long_positions
        : side === 'short'
          ? short_positions
          : [...long_positions, ...short_positions];

      const ratio = amount / target_amount;
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.position_amt);
        const close_quantity = Math.abs(position_amt) * ratio;
        return {
          symbol: p.symbol,
          type: position_amt > 0 ? 'CLOSE_LONG' : 'CLOSE_SHORT',
          quantity: close_quantity.toString()
        };
      });

      const response = await OrdersApi.customClosePosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: close_positions
      });

      if (response.status === 'success') {
        await loadAccountData();
        if (side === 'long') setCustomCloseLongAmount('');
        if (side === 'short') setCustomCloseShortAmount('');
      } else {
        setErrorMsg(response.message || '平仓失败');
      }
    } catch (err) {
      console.error('平仓失败:', err);
      setErrorMsg('平仓失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const is_balance_low = account_data.available_balance < 1000;

  const trading_pair_options = usdt_pairs.slice(0, 20).map(pair => ({
    value: pair,
    label: pair
  }));

  return (
    <div className="container">
      <div className="surface p-16 mb-16">
        <div className="flex items-center gap-8">
          <IconWallet size={24} color="var(--color-primary)" />
          <h1 className="quick-order-page-title">快捷开单</h1>
        </div>
        <p className="text-muted quick-order-page-desc">快速开仓、平仓、持平操作</p>
      </div>

      {error_msg && (
        <div className="quick-order-error">
          <IconAlertCircle size={16} />
          <span>{error_msg}</span>
        </div>
      )}

      <div className="quick-order-card">
        <div className="quick-order-card-header">
          <div className="flex items-center gap-8">
            <span className="quick-order-card-title">交易设置</span>
          </div>
          <Button
            className="btn-icon"
            onClick={loadAccountData}
            disabled={account_loading}
            title="刷新账户信息"
          >
            <IconRefresh size={18} className={account_loading ? 'spinning' : ''} />
          </Button>
        </div>

        <div className="quick-order-card-content">
          <div className="quick-order-controls">
            <div className="quick-order-control-group">
              <label className="quick-order-control-label">交易对</label>
              <Select
                placeholder="选择交易对"
                value={trading_pair}
                onChange={(value) => setTradingPair(value || 'BTCUSDT')}
                data={trading_pair_options}
                className="quick-order-select"
              />
            </div>

            <div className="quick-order-control-group">
              <label className="quick-order-control-label">杠杆</label>
              <NumberInput
                placeholder="杠杆"
                value={leverage}
                onChange={(value) => setLeverage(Math.max(1, Math.min(125, parseInt(String(value)) || 1)))}
                min={1}
                max={125}
                className="quick-order-number-input"
              />
              <span className="quick-order-control-suffix">x</span>
            </div>
          </div>

          <div className="quick-order-display">
            <div className="quick-order-display-item">
              <span className="quick-order-display-label">当前价格</span>
              <span className="quick-order-display-value">{getCurrentPriceText(current_price)}</span>
            </div>
            <div className="quick-order-display-item">
              <span className="quick-order-display-label">可用保证金</span>
              <span className={`quick-order-display-value ${is_balance_low ? 'quick-order-display-value-warning' : ''}`}>
                {account_data.available_balance.toFixed(2)} U
              </span>
            </div>
            <div className="quick-order-display-item">
              <span className="quick-order-display-label">净仓</span>
              <span className={`quick-order-display-value ${net_position > 0 ? 'quick-order-display-value-long' : net_position < 0 ? 'quick-order-display-value-short' : ''}`}>
                {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
              </span>
            </div>
            <div className="quick-order-display-item">
              <span className="quick-order-display-label">多单</span>
              <span className="quick-order-display-value quick-order-display-value-long">
                {total_long_amount.toFixed(2)} U
              </span>
            </div>
            <div className="quick-order-display-item">
              <span className="quick-order-display-label">空单</span>
              <span className="quick-order-display-value quick-order-display-value-short">
                {total_short_amount.toFixed(2)} U
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-order-sections">
        <div className="quick-order-section quick-order-section-long">
          <div className="quick-order-section-header">
            <div className="quick-order-section-label">
              <IconTrendingUp size={16} />
              <span>开多</span>
            </div>
            <div className="quick-order-section-amount">{total_long_amount.toFixed(2)} U</div>
          </div>
          <div className="quick-order-buttons">
            {QUICK_AMOUNTS.map(amount => (
              <Button
                key={`long-${amount}`}
                className="quick-order-button quick-order-button-long"
                onClick={() => handleOpenPosition('long', amount)}
                disabled={loading || account_loading}
              >
                {amount}U
              </Button>
            ))}
          </div>
        </div>

        <div className="quick-order-section quick-order-section-short">
          <div className="quick-order-section-header">
            <div className="quick-order-section-label">
              <IconTrendingDown size={16} />
              <span>开空</span>
            </div>
            <div className="quick-order-section-amount">{total_short_amount.toFixed(2)} U</div>
          </div>
          <div className="quick-order-buttons">
            {QUICK_AMOUNTS.map(amount => (
              <Button
                key={`short-${amount}`}
                className="quick-order-button quick-order-button-short"
                onClick={() => handleOpenPosition('short', amount)}
                disabled={loading || account_loading}
              >
                {amount}U
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-order-balance">
        <Button
          className="quick-order-balance-btn"
          onClick={handleBalancePosition}
          disabled={loading || account_loading}
          title="一键将多空仓位调整为相等"
        >
          <IconScale size={16} />
          <span>快速持平</span>
        </Button>
      </div>

      <div className="quick-order-sections quick-order-sections-close">
        <div className="quick-order-section quick-order-section-long quick-order-section-close">
          <div className="quick-order-section-header">
            <div className="quick-order-section-label">
              <IconTrendingUp size={14} />
              <span>平多</span>
            </div>
            <div className="quick-order-section-amount">{total_long_amount.toFixed(2)} U</div>
          </div>
          <div className="quick-order-buttons quick-order-buttons-close">
            {CLOSE_PERCENTAGES.map(pct => (
              <Button
                key={pct}
                className="quick-order-button quick-order-button-long quick-order-button-close"
                onClick={() => handleCloseByPercentage('long', pct)}
                disabled={loading || account_loading}
              >
                {pct}%
              </Button>
            ))}
          </div>
          <div className="quick-order-close-custom">
            <NumberInput
              placeholder="自定义金额"
              value={custom_close_long_amount}
              onChange={(value) => setCustomCloseLongAmount(String(value))}
              disabled={loading || account_loading}
              min={0}
              className="quick-order-close-amount-input"
            />
            <Button
              className="quick-order-button quick-order-button-long quick-order-button-close"
              onClick={() => {
                const amount = parseFloat(custom_close_long_amount);
                if (amount > 0) {
                  handleCloseByAmount('long', amount);
                }
              }}
              disabled={loading || account_loading || !custom_close_long_amount}
            >
              平多
            </Button>
          </div>
          <Button
            className="quick-order-button quick-order-button-long quick-order-button-all-close"
            onClick={() => handleCloseByPercentage('long', 100)}
            disabled={loading || account_loading || long_positions.length === 0}
          >
            <IconX size={14} />
            <span>一键全平多单</span>
          </Button>
        </div>

        <div className="quick-order-section quick-order-section-short quick-order-section-close">
          <div className="quick-order-section-header">
            <div className="quick-order-section-label">
              <IconTrendingDown size={14} />
              <span>平空</span>
            </div>
            <div className="quick-order-section-amount">{total_short_amount.toFixed(2)} U</div>
          </div>
          <div className="quick-order-buttons quick-order-buttons-close">
            {CLOSE_PERCENTAGES.map(pct => (
              <Button
                key={pct}
                className="quick-order-button quick-order-button-short quick-order-button-close"
                onClick={() => handleCloseByPercentage('short', pct)}
                disabled={loading || account_loading}
              >
                {pct}%
              </Button>
            ))}
          </div>
          <div className="quick-order-close-custom">
            <NumberInput
              placeholder="自定义金额"
              value={custom_close_short_amount}
              onChange={(value) => setCustomCloseShortAmount(String(value))}
              disabled={loading || account_loading}
              min={0}
              className="quick-order-close-amount-input"
            />
            <Button
              className="quick-order-button quick-order-button-short quick-order-button-close"
              onClick={() => {
                const amount = parseFloat(custom_close_short_amount);
                if (amount > 0) {
                  handleCloseByAmount('short', amount);
                }
              }}
              disabled={loading || account_loading || !custom_close_short_amount}
            >
              平空
            </Button>
          </div>
          <Button
            className="quick-order-button quick-order-button-short quick-order-button-all-close"
            onClick={() => handleCloseByPercentage('short', 100)}
            disabled={loading || account_loading || short_positions.length === 0}
          >
            <IconX size={14} />
            <span>一键全平空单</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuickOrderPage;
