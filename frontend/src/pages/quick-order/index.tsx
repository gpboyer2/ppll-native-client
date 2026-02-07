import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconRefresh,
  IconAlertCircle
} from '@tabler/icons-react';
import { Button } from '../../components/mantine';
import { useBinanceStore } from '../../stores/binance-store';
import { OrdersApi, BinanceAccountApi } from '../../api';
import type { AccountPosition } from '../../types/binance';
import { ROUTES } from '../../router';
import { AccountInfoCard } from './components/account-info-card';
import { TradingPairInfoCard } from './components/trading-pair-info-card';
import { ApiKeySelector } from './components/api-key-selector';
import { OpenPositionSection } from './components/open-position-section';
import { ClosePositionSection } from './components/close-position-section';
import { BalanceButton } from './components/balance-button';
import './index.scss';

const DEFAULT_LEVERAGE = 20;

type CloseSide = 'long' | 'short' | 'both';

/**
 * 快捷开单独立页面
 * 支持快速开仓、平仓、持平操作
 */
function QuickOrderPage() {
  const navigate = useNavigate();
  const [trading_pair, setTradingPair] = useState('BTCUSDT');
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [loading, setLoading] = useState(false);
  const [account_loading, setAccountLoading] = useState(false);
  const [error_msg, setErrorMsg] = useState<string | null>(null);
  const [custom_close_long_amount, setCustomCloseLongAmount] = useState('');
  const [custom_close_short_amount, setCustomCloseShortAmount] = useState('');
  const [custom_open_long_amount, setCustomOpenLongAmount] = useState('');
  const [custom_open_short_amount, setCustomOpenShortAmount] = useState('');

  const usdt_pairs = useBinanceStore(state => state.usdt_pairs);
  const api_key_list = useBinanceStore(state => state.api_key_list);
  const get_active_api_key = useBinanceStore(state => state.get_active_api_key);
  const active_api_key_id = useBinanceStore(state => state.active_api_key_id);
  const set_active_api_key = useBinanceStore(state => state.set_active_api_key);
  const ticker_prices = useBinanceStore(state => state.ticker_prices);
  const subscribeTicker = useBinanceStore(state => state.subscribeTicker);
  const initialized = useBinanceStore(state => state.initialized);
  const binance_loading = useBinanceStore(state => state.loading);

  const current_price = ticker_prices[trading_pair]?.price || 0;

  const [account_data, setAccountData] = useState<{
    available_balance: number;
    positions: AccountPosition[];
  }>({ available_balance: 0, positions: [] });

  const navigateToSettings = useCallback(() => {
    navigate(ROUTES.SETTINGS);
  }, [navigate]);

  const loadAccountData = useCallback(async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
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
        const data = response.datum;
        setAccountData({
          available_balance: parseFloat(data.availableBalance || data.totalWalletBalance || '0'),
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
  }, [get_active_api_key, navigateToSettings]);

  const subscribeCurrentSymbol = useCallback(() => {
    subscribeTicker(trading_pair, 'usdm');
  }, [trading_pair, subscribeTicker]);

  useEffect(() => {
    // 如果未完成初始化，等待完成
    if (!initialized) {
      return;
    }

    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }
    loadAccountData();
  }, [active_api_key_id, get_active_api_key, navigateToSettings, loadAccountData, initialized]);

  useEffect(() => {
    subscribeCurrentSymbol();
  }, [subscribeCurrentSymbol]);

  const long_positions = account_data.positions.filter(
    p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
  );
  const short_positions = account_data.positions.filter(
    p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
  );

  const total_long_amount = long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const total_short_amount = short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const net_position = total_long_amount - total_short_amount;

  // 当前交易对的持仓数据
  const current_pair_positions = useMemo(() => {
    return account_data.positions.filter(p => p.symbol === trading_pair);
  }, [account_data.positions, trading_pair]);

  const current_pair_leverage = useMemo(() => {
    const position = current_pair_positions.find(p => p.leverage);
    return position ? parseInt(position.leverage) : leverage;
  }, [current_pair_positions, leverage]);

  const current_pair_long_amount = useMemo(() => {
    return current_pair_positions
      .filter(p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH'))
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_positions]);

  const current_pair_short_amount = useMemo(() => {
    return current_pair_positions
      .filter(p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH'))
      .reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_positions]);

  // 当前交易对的多头持仓（用于平仓）
  const current_pair_long_positions = useMemo(() => {
    return current_pair_positions.filter(
      p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
    );
  }, [current_pair_positions]);

  // 当前交易对的空头持仓（用于平仓）
  const current_pair_short_positions = useMemo(() => {
    return current_pair_positions.filter(
      p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
    );
  }, [current_pair_positions]);

  // 当前交易对的多头总金额（用于平仓）
  const current_pair_total_long_amount = useMemo(() => {
    return current_pair_long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_long_positions]);

  // 当前交易对的空头总金额（用于平仓）
  const current_pair_total_short_amount = useMemo(() => {
    return current_pair_short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_short_positions]);

  const handleOpenPosition = async (side: 'long' | 'short', amount: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
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

  const handleCloseByPercentage = async (side: CloseSide, percentage: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    const target_positions = side === 'long'
      ? current_pair_long_positions
      : side === 'short'
        ? current_pair_short_positions
        : [...current_pair_long_positions, ...current_pair_short_positions];

    if (target_positions.length === 0) {
      setErrorMsg('当前没有对应持仓');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.positionAmt);
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
      navigateToSettings();
      return;
    }

    const target_amount = side === 'long'
      ? current_pair_total_long_amount
      : side === 'short'
        ? current_pair_total_short_amount
        : current_pair_total_long_amount + current_pair_total_short_amount;

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
        ? current_pair_long_positions
        : side === 'short'
          ? current_pair_short_positions
          : [...current_pair_long_positions, ...current_pair_short_positions];

      const ratio = amount / target_amount;
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.positionAmt);
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
        if (side === 'long') {
          setCustomCloseLongAmount('');
        }
        if (side === 'short') {
          setCustomCloseShortAmount('');
        }
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

  const handleOpenByAmount = async (side: 'long' | 'short', amount: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
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
        if (side === 'long') {
          setCustomOpenLongAmount('');
        }
        if (side === 'short') {
          setCustomOpenShortAmount('');
        }
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
      navigateToSettings();
      return;
    }

    // 使用当前交易对的多空金额进行持平
    const long_amount = current_pair_total_long_amount;
    const short_amount = current_pair_total_short_amount;
    const diff = Math.abs(long_amount - short_amount);

    if (diff === 0) {
      setErrorMsg('多空仓位已平衡，无需调整');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const position_config = {
        symbol: trading_pair,
        long_amount: long_amount < short_amount ? diff : 0,
        short_amount: short_amount < long_amount ? diff : 0
      };

      const response = await OrdersApi.customBuildPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: [position_config]
      });

      if (response.status === 'success') {
        await loadAccountData();
      } else {
        setErrorMsg(response.message || '持仓失败');
      }
    } catch (err) {
      console.error('持仓失败:', err);
      setErrorMsg('持仓失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const trading_pair_options = usdt_pairs.slice(0, 20).map(pair => ({
    value: pair,
    label: pair
  }));
  
  if (!trading_pair_options.some(o => o.value === 'BTCUSDT')) {
    trading_pair_options.unshift({ value: 'BTCUSDT', label: 'BTCUSDT' });
  }

  const handleLeverageChange = async (value: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    setErrorMsg(null);

    try {
      const response = await BinanceAccountApi.setLeverage({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        leverage_list: [{ symbol: trading_pair, leverage: value }]
      });

      if (response.status === 'success') {
        setLeverage(value);
      } else {
        setErrorMsg(response.message || '设置杠杆失败');
      }
    } catch (err) {
      console.error('设置杠杆失败:', err);
      setErrorMsg('设置杠杆失败，请重试');
    }
  };

  const handleTradingPairChange = (value: string) => {
    setTradingPair(value);
  };

  const handleApiKeySelect = (id: string) => {
    set_active_api_key(id);
  };

  return (
    <div className="container">
      <div className="surface p-16 mb-16">
        <div className="flex items-center space-between">
          <div>
            <h1 className="quick-order-page-title">快捷开单</h1>
            <p className="text-muted quick-order-page-desc">快速开仓、平仓、持平操作</p>
          </div>
        </div>
      </div>

      {error_msg && (
        <div className="quick-order-error">
          <IconAlertCircle size={16} />
          <span>{error_msg}</span>
        </div>
      )}

      <div className="quick-order-card">
        <div className="quick-order-card-header">
          <div className="quick-order-card-header-left">
            <div>
              <span className="quick-order-card-title">交易设置</span>
              <ApiKeySelector
                api_key_list={api_key_list}
                active_api_key_id={active_api_key_id}
                on_key_select={set_active_api_key}
              />
            </div>
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
          <div className="quick-order-card-left">
            <TradingPairInfoCard
              trading_pair={trading_pair}
              leverage={leverage}
              trading_pair_options={trading_pair_options}
              current_price={current_price}
              current_pair_long_amount={current_pair_long_amount}
              current_pair_short_amount={current_pair_short_amount}
              on_trading_pair_change={handleTradingPairChange}
              on_leverage_change={handleLeverageChange}
            />
          </div>

          <div className="quick-order-card-right">
            <AccountInfoCard
              available_balance={account_data.available_balance}
              net_position={net_position}
              total_long_amount={total_long_amount}
              total_short_amount={total_short_amount}
            />
          </div>
        </div>
      </div>

      <div className="quick-order-sections">
        <OpenPositionSection
          side="long"
          loading={loading}
          account_loading={account_loading}
          custom_amount={custom_open_long_amount}
          on_amount_click={(amount) => handleOpenPosition('long', amount)}
          on_custom_amount_change={setCustomOpenLongAmount}
          on_open_click={() => {
            const amount = parseFloat(custom_open_long_amount);
            if (amount > 0) {
              handleOpenByAmount('long', amount);
            }
          }}
        />

        <OpenPositionSection
          side="short"
          loading={loading}
          account_loading={account_loading}
          custom_amount={custom_open_short_amount}
          on_amount_click={(amount) => handleOpenPosition('short', amount)}
          on_custom_amount_change={setCustomOpenShortAmount}
          on_open_click={() => {
            const amount = parseFloat(custom_open_short_amount);
            if (amount > 0) {
              handleOpenByAmount('short', amount);
            }
          }}
        />
      </div>

      <BalanceButton
        disabled={loading || account_loading}
        on_balance_click={handleBalancePosition}
      />

      <div className="quick-order-sections quick-order-sections-close">
        <ClosePositionSection
          side="long"
          loading={loading}
          account_loading={account_loading}
          position_count={current_pair_long_positions.length}
          custom_amount={custom_close_long_amount}
          on_amount_click={(amount) => handleCloseByAmount('long', amount)}
          on_custom_amount_change={setCustomCloseLongAmount}
          on_close_click={() => {
            const amount = parseFloat(custom_close_long_amount);
            if (amount > 0) {
              handleCloseByAmount('long', amount);
            }
          }}
          on_close_all_click={() => handleCloseByPercentage('long', 100)}
        />

        <ClosePositionSection
          side="short"
          loading={loading}
          account_loading={account_loading}
          position_count={current_pair_short_positions.length}
          custom_amount={custom_close_short_amount}
          on_amount_click={(amount) => handleCloseByAmount('short', amount)}
          on_custom_amount_change={setCustomCloseShortAmount}
          on_close_click={() => {
            const amount = parseFloat(custom_close_short_amount);
            if (amount > 0) {
              handleCloseByAmount('short', amount);
            }
          }}
          on_close_all_click={() => handleCloseByPercentage('short', 100)}
        />
      </div>
    </div>
  );
}

export default QuickOrderPage;
