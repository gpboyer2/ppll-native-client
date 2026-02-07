import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Button } from '../../components/mantine';
import { useBinanceStore } from '../../stores/binance-store';
import { OrdersApi, BinanceAccountApi } from '../../api';
import type { AccountPosition } from '../../types/binance';
import type { PositionOperationResponse } from '../../api/modules/orders';
import { ROUTES } from '../../router';
import { AccountInfoCard } from './components/account-info-card';
import { TradingPairInfoCard } from './components/trading-pair-info-card';
import { ApiKeySelector } from './components/api-key-selector';
import { OpenPositionSection } from './components/open-position-section';
import { ClosePositionSection } from './components/close-position-section';
import { BalanceButton } from './components/balance-button';
import './index.scss';

const DEFAULT_LEVERAGE = 20;

// 账户数据轮询间隔（毫秒）- 币安价格波动不会触发 User Data Stream 推送
const ACCOUNT_POLL_INTERVAL = 5000;

type CloseSide = 'long' | 'short' | 'both';

type MessageStatus = 'error' | 'success';

/**
 * 统一处理持仓操作响应反馈
 * 单交易对场景显示订单ID或错误信息，多交易对场景显示汇总消息
 */
function handlePositionResponse(
  datum: PositionOperationResponse,
  showMessage: (msg: string, status: MessageStatus) => void,
  defaultSuccessMsg: string
) {
  if (datum.totalPositions === 1 && datum.results.length > 0) {
    const result = datum.results[0];
    if (result.success) {
      const msg = `${datum.message}${result.orderId ? ` (订单ID: ${result.orderId})` : ''}`;
      showMessage(msg, 'success');
    } else {
      const msg = `${datum.message}: ${result.error || '未知错误'}`;
      showMessage(msg, 'error');
    }
  } else {
    const msg = datum.message || defaultSuccessMsg;
    const status = datum.success ? 'success' : 'error';
    showMessage(msg, status);
  }
}

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
  const switchTicker = useBinanceStore(state => state.switchTicker);
  const unsubscribeTicker = useBinanceStore(state => state.unsubscribeTicker);
  const initialized = useBinanceStore(state => state.initialized);
  const connectSocket = useBinanceStore(state => state.connectSocket);
  const handle_account_update_ref = useRef<((data: any) => void) | null>(null);
  const account_poll_timer_ref = useRef<NodeJS.Timeout | null>(null);

  const current_price = ticker_prices[trading_pair]?.price || 0;

  // 使用 WebSocket 实时数据，如果没有数据则使用空默认值
  const [account_data, setAccountData] = useState<{
    available_balance: number;
    positions: AccountPosition[];
  }>({ available_balance: 0, positions: [] });

  const navigateToSettings = useCallback(() => {
    navigate(ROUTES.SETTINGS);
  }, [navigate]);

  const showMessage = useCallback((msg: string, status: MessageStatus = 'error') => {
    if (status === 'success') {
      notifications.show({
        title: '操作成功',
        message: msg,
        color: 'green',
      });
    } else {
      notifications.show({
        title: '操作失败',
        message: msg,
        color: 'red',
      });
    }
  }, []);

  // 初始化加载账户数据（使用 HTTP 获取一次）
  const loadAccountData = useCallback(async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    setAccountLoading(true);

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
        showMessage(response.message || '获取账户信息失败', 'error');
      }
    } catch (err) {
      console.error('获取账户信息失败:', err);
      showMessage('获取账户信息失败', 'error');
    } finally {
      setAccountLoading(false);
    }
  }, [get_active_api_key, navigateToSettings, showMessage]);

  // 跟踪上一次的交易对，用于切换 ticker 订阅
  const prev_trading_pair_ref = useRef<string | null>(null);

  const subscribeCurrentSymbol = useCallback(() => {
    const prev_pair = prev_trading_pair_ref.current;
    // 先取消旧订阅，再订阅新交易对
    if (prev_pair && prev_pair !== trading_pair) {
      unsubscribeTicker(prev_pair, 'usdm');
    }
    subscribeTicker(trading_pair, 'usdm');
    prev_trading_pair_ref.current = trading_pair;
  }, [trading_pair, subscribeTicker, unsubscribeTicker]);

  // 订阅用户数据流（直接使用 Socket.IO，不经过 Store）
  useEffect(() => {
    // 如果未完成初始化，等待完成
    if (!initialized) {
      console.log('[QuickOrder] 等待 Binance Store 初始化完成');
      return;
    }

    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    console.log('[QuickOrder] 开始订阅用户数据流, API Key:', active_api_key.name || active_api_key.api_key?.substring(0, 8) + '...');

    let is_subscribed = true;

    // 连接 WebSocket 并订阅用户数据流
    const initUserDataStream = async () => {
      try {
        await connectSocket();

        // 从 Store 获取 socket 实例
        const store = useBinanceStore.getState();
        if (!is_subscribed || !store.socket) {
          console.log('[QuickOrder] 组件已卸载或 socket 不可用，跳过订阅');
          return;
        }

        console.log('[QuickOrder] Socket 已连接，准备绑定事件监听器');

        // 监听所有 socket 消息（调试用）
        store.socket.onAny((event: string, ...args: any[]) => {
          const firstArg = args[0];
          console.log('[QuickOrder] ===== Socket 收到任何事件 =====', {
            event,
            argsCount: args.length,
            firstArgSummary: firstArg ? {
              hasEventType: !!firstArg.eventType,
              eventType: firstArg.eventType,
              hasAccounts: !!firstArg.accounts,
              hasPositions: !!firstArg.positions,
              accountsCount: firstArg.accounts?.length || 0,
              positionsCount: firstArg.positions?.length || 0,
              keys: Object.keys(firstArg)
            } : 'undefined',
            firstArgString: firstArg ? JSON.stringify(firstArg, null, 2) : 'undefined',
            timestamp: new Date().toISOString()
          });
        });

        // 监听订阅成功确认
        store.socket.on('subscribed_user_stream', (data: any) => {
          console.log('[QuickOrder] ===== 订阅成功确认 =====', data);
        });

        // 监听 user_stream_status 事件（订阅状态响应）
        store.socket.on('user_stream_status', (data: any) => {
          console.log('[QuickOrder] ===== user_stream_status 事件 =====', JSON.stringify(data, null, 2));
        });

        // 监听订阅失败
        store.socket.on('subscribe_error', (data: any) => {
          console.error('[QuickOrder] ===== 订阅失败 =====', data);
        });

        // 监听连接状态变化
        store.socket.on('connect', () => {
          console.log('[QuickOrder] ===== Socket 连接成功 =====', { socketId: store.socket?.id });
        });

        store.socket.on('disconnect', (reason: string) => {
          console.warn('[QuickOrder] ===== Socket 断开连接 =====', reason);
        });

        store.socket.on('error', (err: any) => {
          console.error('[QuickOrder] ===== Socket 错误 =====', err);
        });

        // 检查 socket 连接状态
        console.log('[QuickOrder] 当前 Socket 连接状态:', {
          connected: store.socket.connected,
          socketId: store.socket.id,
          engine: store.socket.io?.engine?.transport?.name
        });

        // 先绑定事件监听器（关键修复：必须在订阅前绑定，否则会错过消息）
        const handleAccountUpdate = (data: any) => {
          console.log('[QuickOrder] ===== account_update 事件收到数据 =====');
          console.log('[QuickOrder] eventType:', data?.eventType);
          console.log('[QuickOrder] 完整数据结构:', JSON.stringify(data, null, 2));
          console.log('[QuickOrder] 数据摘要:', {
            hasData: !!data,
            accountsCount: data?.accounts?.length || 0,
            positionsCount: data?.positions?.length || 0,
            timestamp: new Date().toISOString()
          });

          if (!data) {
            console.warn('[QuickOrder] account_update 收到空数据');
            return;
          }

          // ACCOUNT_UPDATE 事件结构
          if (data.eventType === 'ACCOUNT_UPDATE') {
            // 币安推送的数据结构是 updateData.updatedBalances 和 updateData.updatedPositions
            const accounts = data.updateData?.updatedBalances || data.accounts || [];
            const positions = data.updateData?.updatedPositions || data.positions || [];

            // 提取可用余额（使用 crossWalletBalance 或 walletBalance）
            let available_balance = 0;
            if (accounts && accounts.length > 0) {
              const usdt_account = accounts.find((acc: any) => acc.asset === 'USDT');
              if (usdt_account) {
                available_balance = parseFloat(usdt_account.crossWalletBalance || usdt_account.walletBalance || usdt_account.availableBalance || '0');
              }
            }

            // 过滤有效持仓（持仓数量不为0）
            const valid_positions = (positions || []).filter((p: any) => {
              const amt = parseFloat(p.positionAmount || p.positionAmt || '0');
              return amt !== 0;
            }).map((p: any) => ({
              ...p,
              positionAmt: p.positionAmount !== undefined ? p.positionAmount : p.positionAmt,
              unrealizedProfit: p.unrealisedPnl !== undefined ? p.unrealisedPnl : (p.unrealizedProfit || '0'),
              breakEvenPrice: p.bep !== undefined ? p.bep : p.breakEvenPrice,
            }));

            console.log('[QuickOrder] 更新账户数据:', {
              available_balance,
              valid_positions_count: valid_positions.length
            });

            // 直接更新本地 state
            setAccountData({
              available_balance,
              positions: valid_positions
            });
            setAccountLoading(false);
          }
        };

        // 保存监听器引用到 ref，用于 cleanup
        handle_account_update_ref.current = handleAccountUpdate;

        // 绑定事件监听器
        store.socket.on('account_update', handleAccountUpdate);
        console.log('[QuickOrder] account_update 事件监听器已绑定');

        // 再发送订阅请求（关键修复：先绑定监听器，再订阅）
        store.socket.emit('subscribe_user_stream', {
          apiKey: active_api_key.api_key,
          apiSecret: active_api_key.api_secret,
          market: 'usdm'
        });
        console.log('[QuickOrder] subscribe_user_stream 请求已发送');
      } catch (err) {
        console.error('[QuickOrder] 订阅用户数据流失败:', err);
      }
    };

    // 初始加载一次数据（避免 WebSocket 初始延迟）
    loadAccountData();
    initUserDataStream();

    // 启动定时轮询账户数据
    // 原因：币安 User Data Stream 只在执行交易、资金划转等事件时推送
    // 价格波动不会触发 ACCOUNT_UPDATE，因此需要定时轮询来更新持仓盈亏
    account_poll_timer_ref.current = setInterval(() => {
      loadAccountData();
    }, ACCOUNT_POLL_INTERVAL);

    // cleanup 函数
    return () => {
      console.log('[QuickOrder] 组件卸载，清理订阅');
      is_subscribed = false;

      // 清理定时轮询
      if (account_poll_timer_ref.current) {
        clearInterval(account_poll_timer_ref.current);
        account_poll_timer_ref.current = null;
        console.log('[QuickOrder] 账户数据轮询已停止');
      }

      const store = useBinanceStore.getState();
      if (store.socket) {
        // 只移除当前组件的监听器，不影响其他组件
        if (handle_account_update_ref.current) {
          store.socket.off('account_update', handle_account_update_ref.current);
          console.log('[QuickOrder] account_update 事件监听器已移除');
        }
        store.socket.emit('unsubscribe_user_stream', {
          apiKey: active_api_key.api_key,
          market: 'usdm'
        });
        console.log('[QuickOrder] unsubscribe_user_stream 请求已发送');
      }
    };
  }, [active_api_key_id, initialized, connectSocket, get_active_api_key, navigateToSettings, loadAccountData]);

  // 切换交易对时更新 ticker 订阅
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

  // 计算多单实时盈亏（基于当前价格）
  const long_profit = useMemo(() => {
    if (!current_price) return null;
    const long_pos = current_pair_positions.find(
      p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
    );
    if (!long_pos) return null;

    const entryPrice = parseFloat(long_pos.entryPrice);
    const positionAmt = parseFloat(long_pos.positionAmt);
    const unrealizedProfit = (current_price - entryPrice) * positionAmt;

    return unrealizedProfit;
  }, [current_price, current_pair_positions]);

  // 计算空单实时盈亏（基于当前价格）
  const short_profit = useMemo(() => {
    if (!current_price) return null;
    const short_pos = current_pair_positions.find(
      p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
    );
    if (!short_pos) return null;

    const entryPrice = parseFloat(short_pos.entryPrice);
    const positionAmt = parseFloat(short_pos.positionAmt);
    const unrealizedProfit = (entryPrice - current_price) * Math.abs(positionAmt);

    return unrealizedProfit;
  }, [current_price, current_pair_positions]);

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
      showMessage(`可用保证金不足，当前: ${account_data.available_balance.toFixed(2)} USDT`, 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await OrdersApi.umOpenPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: [{
          symbol: trading_pair,
          side: side === 'long' ? 'LONG' : 'SHORT',
          amount
        }]
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓操作已提交');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
      } else {
        showMessage(response.message || '开仓失败', 'error');
      }
    } catch (err) {
      console.error('[handleOpenPosition] 开仓异常:', err);
      showMessage('开仓失败，请重试', 'error');
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
      showMessage('当前没有对应持仓', 'error');
      return;
    }

    setLoading(true);

    try {
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.positionAmt);
        return {
          symbol: p.symbol,
          side: (position_amt > 0 ? 'LONG' : 'SHORT') as 'LONG' | 'SHORT',
          percentage
        };
      });

      const response = await OrdersApi.umClosePosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: close_positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓操作已提交');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
      } else {
        showMessage(response.message || '平仓失败', 'error');
      }
    } catch (err) {
      console.error('[handleCloseByPercentage] 平仓异常:', err);
      showMessage('平仓失败，请重试', 'error');
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
      showMessage(`持仓金额不足，当前: ${target_amount.toFixed(2)} USDT`, 'error');
      return;
    }

    if (target_amount === 0) {
      showMessage('当前没有对应持仓', 'error');
      return;
    }

    setLoading(true);

    try {
      const target_positions = side === 'long'
        ? current_pair_long_positions
        : side === 'short'
          ? current_pair_short_positions
          : [...current_pair_long_positions, ...current_pair_short_positions];

      const ratio = amount / target_amount;
      const close_positions = target_positions.map(p => {
        const position_amt = parseFloat(p.positionAmt);
        return {
          symbol: p.symbol,
          side: (position_amt > 0 ? 'LONG' : 'SHORT') as 'LONG' | 'SHORT',
          percentage: ratio * 100
        };
      });

      const response = await OrdersApi.umClosePosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: close_positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓操作已提交');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
        if (side === 'long') {
          setCustomCloseLongAmount('');
        }
        if (side === 'short') {
          setCustomCloseShortAmount('');
        }
      } else {
        showMessage(response.message || '平仓失败', 'error');
      }
    } catch (err) {
      console.error('[handleCloseByAmount] 平仓异常:', err);
      showMessage('平仓失败，请重试', 'error');
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
      showMessage(`可用保证金不足，当前: ${account_data.available_balance.toFixed(2)} USDT`, 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await OrdersApi.umOpenPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: [{
          symbol: trading_pair,
          side: side === 'long' ? 'LONG' : 'SHORT',
          amount
        }]
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓操作已提交');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
        if (side === 'long') {
          setCustomOpenLongAmount('');
        }
        if (side === 'short') {
          setCustomOpenShortAmount('');
        }
      } else {
        showMessage(response.message || '开仓失败', 'error');
      }
    } catch (err) {
      console.error('[handleOpenByAmount] 开仓异常:', err);
      showMessage('开仓失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceByOpenPosition = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    const long_amount = current_pair_total_long_amount;
    const short_amount = current_pair_total_short_amount;
    const diff = Math.abs(long_amount - short_amount);

    if (diff === 0) {
      showMessage('多空仓位已平衡，无需调整', 'error');
      return;
    }

    setLoading(true);

    try {
      const positions = [];
      if (long_amount < short_amount) {
        positions.push({
          symbol: trading_pair,
          side: 'LONG' as const,
          amount: diff
        });
      }
      if (short_amount < long_amount) {
        positions.push({
          symbol: trading_pair,
          side: 'SHORT' as const,
          amount: diff
        });
      }

      const response = await OrdersApi.umOpenPosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓持平完成');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
      } else {
        showMessage(response.message || '开仓持平失败', 'error');
      }
    } catch (err) {
      console.error('[handleBalanceByOpenPosition] 开仓持平异常:', err);
      showMessage('开仓持平失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceByClosePosition = async () => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    const long_amount = current_pair_total_long_amount;
    const short_amount = current_pair_total_short_amount;
    const diff = Math.abs(long_amount - short_amount);

    if (diff === 0) {
      showMessage('多空仓位已平衡，无需调整', 'error');
      return;
    }

    const max_amount = Math.max(long_amount, short_amount);
    if (max_amount === 0) {
      showMessage('当前没有持仓，无法通过平仓方式持平', 'error');
      return;
    }

    const close_percentage = (diff / max_amount) * 100;

    setLoading(true);

    try {
      const close_positions: Array<{
        symbol: string;
        side: 'LONG' | 'SHORT';
        percentage: number;
      }> = [];

      if (long_amount > short_amount) {
        current_pair_long_positions.forEach(p => {
          close_positions.push({
            symbol: p.symbol,
            side: 'LONG' as const,
            percentage: close_percentage
          });
        });
      }

      if (short_amount > long_amount) {
        current_pair_short_positions.forEach(p => {
          close_positions.push({
            symbol: p.symbol,
            side: 'SHORT' as const,
            percentage: close_percentage
          });
        });
      }

      if (close_positions.length === 0) {
        showMessage('没有可平仓的持仓', 'error');
        setLoading(false);
        return;
      }

      const response = await OrdersApi.umClosePosition({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        positions: close_positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓持平完成');
        // WebSocket 会自动更新账户数据，无需手动调用 loadAccountData
      } else {
        showMessage(response.message || '平仓持平失败', 'error');
      }
    } catch (err) {
      console.error('[handleBalanceByClosePosition] 平仓持平异常:', err);
      showMessage('平仓持平失败，请重试', 'error');
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

    try {
      const response = await BinanceAccountApi.setLeverage({
        api_key: active_api_key.api_key,
        api_secret: active_api_key.api_secret,
        leverage_list: [{ symbol: trading_pair, leverage: value }]
      });

      if (response.status === 'success') {
        setLeverage(value);
      } else {
        showMessage(response.message || '设置杠杆失败', 'error');
      }
    } catch (err) {
      console.error('设置杠杆失败:', err);
      showMessage('设置杠杆失败，请重试', 'error');
    }
  };

  const handleTradingPairChange = (value: string) => {
    setTradingPair(value);
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
              current_pair_positions={current_pair_positions}
              long_profit={long_profit}
              short_profit={short_profit}
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
        disabled={loading}
        on_balance_by_open_click={handleBalanceByOpenPosition}
        on_balance_by_close_click={handleBalanceByClosePosition}
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
