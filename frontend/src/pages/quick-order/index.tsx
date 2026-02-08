import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconRefresh, IconList, IconHistory } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Button } from '../../components/mantine';
import { ConfirmModal } from '../../components/mantine/Modal';
import { useBinanceStore } from '../../stores/binance-store';
import { OrdersApi, BinanceAccountApi } from '../../api';
import type { QuickOrderRecord } from '../../api';
import type { AccountPosition } from '../../types/binance';
import type { PositionOperationResponse } from '../../api/modules/binance-um-orders';
import { ROUTES } from '../../router';
import { AccountInfoCard } from './components/account-info-card';
import { TradingPairInfoCard } from './components/trading-pair-info-card';
import { ProfitStatsCard } from './components/profit-stats-card';
import { ApiKeySelector } from './components/api-key-selector';
import { OpenPositionSection } from './components/open-position-section';
import { ClosePositionSection } from './components/close-position-section';
import { BalanceButton } from './components/balance-button';
import PositionFloatingPanel from './components/position-floating-panel';
import OrderRecordsFloatingPanel from './components/order-records-floating-panel';
import type { OrderRecordsFloatingPanelRef } from './components/order-records-floating-panel';
import './index.scss';

const DEFAULT_LEVERAGE = 20;
const MIN_POSITION_AMOUNT = 100;

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
      // datum.message 已经是友好的错误信息，直接使用
      // result.error 是原始错误信息，不需要额外拼接
      showMessage(datum.message || '操作失败', 'error');
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
  const [show_position_panel, setShowPositionPanel] = useState(false);
  const [show_order_records_panel, setShowOrderRecordsPanel] = useState(false);
  const [close_confirm_modal, setCloseConfirmModal] = useState<{
    opened: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
  }>({
    opened: false,
    title: '',
    content: '',
    onConfirm: () => { },
  });

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
  const order_records_panel_ref = useRef<OrderRecordsFloatingPanelRef>(null);
  const ticker_log_ref = useRef(0);
  const account_log_ref = useRef(0);

  // 收益统计数据
  const [order_records, setOrderRecords] = useState<QuickOrderRecord[]>([]);

  const current_price = ticker_prices[trading_pair]?.price || 0;
  const mark_price = ticker_prices[trading_pair]?.mark_price;
  const index_price = ticker_prices[trading_pair]?.index_price;

  useEffect(() => {
    const now = Date.now();
    if (now - ticker_log_ref.current < 2000) {
      return;
    }
    ticker_log_ref.current = now;
    const store = useBinanceStore.getState();
  }, [trading_pair, current_price, mark_price, index_price]);


  // 使用 WebSocket 实时数据，如果没有数据则使用空默认值
  const [account_data, setAccountData] = useState<{
    available_balance: number;
    positions: AccountPosition[];
    today_profit_loss: number;
    margin_balance: number;
    wallet_balance: number;
    unrealized_profit: number;
  }>({
    available_balance: 0,
    positions: [],
    today_profit_loss: 0,
    margin_balance: 0,
    wallet_balance: 0,
    unrealized_profit: 0
  });

  useEffect(() => {
    const now = Date.now();
    if (now - account_log_ref.current < 2000) {
      return;
    }
    account_log_ref.current = now;
    console.log('[QuickOrder] Account snapshot', {
      available_balance: account_data.available_balance,
      margin_balance: account_data.margin_balance,
      wallet_balance: account_data.wallet_balance,
      unrealized_profit: account_data.unrealized_profit,
      positions_count: account_data.positions.length
    });
  }, [
    account_data.available_balance,
    account_data.margin_balance,
    account_data.wallet_balance,
    account_data.unrealized_profit,
    account_data.positions.length
  ]);

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

  const showCloseConfirm = useCallback((title: string, content: string, onConfirm: () => void) => {
    setCloseConfirmModal({
      opened: true,
      title,
      content,
      onConfirm: () => {
        onConfirm();
        setCloseConfirmModal(prev => ({ ...prev, opened: false }));
      },
    });
  }, []);

  const handleCloseConfirmModal = useCallback(() => {
    setCloseConfirmModal(prev => ({ ...prev, opened: false }));
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
          positions: data.positions || [],
          today_profit_loss: 0,
          margin_balance: parseFloat(data.totalMarginBalance || '0'),
          wallet_balance: parseFloat(data.totalWalletBalance || '0'),
          unrealized_profit: parseFloat(data.totalUnrealizedProfit || '0')
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

  // 加载订单记录用于计算收益统计
  const loadOrderRecords = useCallback(async () => {
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
      console.error('[QuickOrder] 加载订单记录失败:', err);
      setOrderRecords([]);
    }
  }, [get_active_api_key]);

  // 刷新所有数据（账户信息和订单记录）
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadAccountData(),
      loadOrderRecords()
    ]);
  }, [loadAccountData, loadOrderRecords]);

  // 跟踪上一次的交易对，用于切换 ticker 订阅
  const prev_trading_pair_ref = useRef<string | null>(null);

  const subscribeCurrentSymbol = useCallback(() => {
    const prev_pair = prev_trading_pair_ref.current;
    const store = useBinanceStore.getState();
    console.log('[QuickOrder] Subscribe ticker', {
      trading_pair,
      prev_pair,
      socket_connected: store.socket?.connected,
      subscribed_count: store.subscribed_tickers.size
    });
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
      return;
    }

    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    let is_subscribed = true;

    // 连接 WebSocket 并订阅用户数据流
    const initUserDataStream = async () => {
      try {
        await connectSocket();

        // 从 Store 获取 socket 实例
        const store = useBinanceStore.getState();
        if (!is_subscribed || !store.socket) {
          return;
        }

        // 监听订阅失败
        store.socket.on('subscribe_error', (data: any) => {
          console.error('[QuickOrder] 订阅失败:', data);
        });

        console.log('[Account Update] 准备绑定 account_update 事件监听器');
        // 先绑定事件监听器（关键修复：必须在订阅前绑定，否则会错过消息）
        const handleAccountUpdate = (data: any) => {
          console.log('[Account Update] 收到 WebSocket 消息:', JSON.stringify(data));
          if (!data) {
            console.log('[Account Update] 数据为空，跳过处理');
            return;
          }

          // ACCOUNT_UPDATE 事件结构
          if (data.eventType === 'ACCOUNT_UPDATE') {
            console.log('[Account Update] 确认为 ACCOUNT_UPDATE 事件，开始处理');
            // 币安推送的数据结构是 updateData.updatedBalances 和 updateData.updatedPositions
            const accounts = data.updateData?.updatedBalances || data.accounts || [];
            const positions = data.updateData?.updatedPositions || data.positions || [];
            console.log('[Account Update] 账户数量:', accounts.length, '持仓数量:', positions.length);

            // 提取可用余额（使用 crossWalletBalance 或 walletBalance）
            let available_balance = 0;
            let margin_balance = 0;
            let wallet_balance = 0;
            let unrealized_profit = 0;

            if (accounts && accounts.length > 0) {
              const usdt_account = accounts.find((acc: any) => acc.asset === 'USDT');
              if (usdt_account) {
                available_balance = parseFloat(usdt_account.crossWalletBalance || usdt_account.walletBalance || usdt_account.availableBalance || '0');
                margin_balance = parseFloat(usdt_account.marginBalance || usdt_account.balance || '0');
                wallet_balance = parseFloat(usdt_account.walletBalance || usdt_account.balance || '0');
                console.log('[Account Update] USDT 账户信息:', { available_balance, margin_balance, wallet_balance });
              }
            }

            // 从持仓中计算未实现盈亏
            if (positions && positions.length > 0) {
              unrealized_profit = positions.reduce((sum: number, p: any) => {
                const profit = parseFloat(p.unrealisedPnl || p.unrealizedProfit || '0');
                return sum + profit;
              }, 0);
              console.log('[Account Update] 计算的未实现盈亏:', unrealized_profit);
            }

            // 过滤有效持仓（持仓数量不为0）
            const valid_positions = (positions || []).filter((p: any) => {
              const amt = parseFloat(p.positionAmount || p.positionAmt || '0');
              return amt !== 0;
            }).map((p: any) => {
              const positionAmtValue = parseFloat(p.positionAmount || p.positionAmt || '0');
              const entryPriceValue = parseFloat(p.entryPrice || '0');
              const fallbackNotional = Number.isFinite(positionAmtValue) && Number.isFinite(entryPriceValue)
                ? String(positionAmtValue * entryPriceValue)
                : '0';
              return {
                ...p,
                positionAmt: p.positionAmount !== undefined ? p.positionAmount : p.positionAmt,
                entryPrice: p.entryPrice || '0',
                notional: p.notional !== undefined ? p.notional : fallbackNotional,
                unrealizedProfit: p.unrealisedPnl !== undefined ? p.unrealisedPnl : (p.unrealizedProfit || '0'),
                breakEvenPrice: p.bep !== undefined ? p.bep : p.breakEvenPrice,
                liquidationPrice: p.liquidationPrice || '0',
              };
            });
            console.log('[Account Update] 有效持仓数量:', valid_positions.length);

            // 直接更新本地 state
            const newAccountData = {
              available_balance,
              positions: valid_positions,
              today_profit_loss: 0,
              margin_balance,
              wallet_balance,
              unrealized_profit
            };
            console.log('[Account Update] 更新账户数据:', newAccountData);
            setAccountData(newAccountData);
            setAccountLoading(false);
          } else {
            console.log('[Account Update] 非 ACCOUNT_UPDATE 事件，eventType:', data.eventType);
          }
        };

        // 保存监听器引用到 ref，用于 cleanup
        handle_account_update_ref.current = handleAccountUpdate;

        // 绑定事件监听器
        store.socket.on('account_update', handleAccountUpdate);
        console.log('[Account Update] account_update 事件监听器已绑定');

        // 监听订阅状态确认
        store.socket.on('user_stream_status', (statusData: any) => {
          console.log('[Account Update] 收到 user_stream_status:', statusData);
        });

        // 再发送订阅请求（关键修复：先绑定监听器，再订阅）
        console.log('[Account Update] 发送 subscribe_user_stream 请求');
        store.socket.emit('subscribe_user_stream', {
          apiKey: active_api_key.api_key,
          apiSecret: active_api_key.api_secret,
          market: 'usdm'
        });
      } catch (err) {
        console.error('[QuickOrder] 订阅用户数据流失败:', err);
      }
    };

    // 初始加载一次数据（避免 WebSocket 初始延迟）
    loadAccountData();
    loadOrderRecords();
    initUserDataStream();

    // cleanup 函数
    return () => {
      is_subscribed = false;

      const store = useBinanceStore.getState();
      if (store.socket) {
        // 只移除当前组件的监听器，不影响其他组件
        if (handle_account_update_ref.current) {
          store.socket.off('account_update', handle_account_update_ref.current);
        }
        store.socket.emit('unsubscribe_user_stream', {
          apiKey: active_api_key.api_key,
          market: 'usdm'
        });
      }
    };
  }, [active_api_key_id, initialized, connectSocket, get_active_api_key, navigateToSettings, loadAccountData]);

  // 切换交易对时更新 ticker 订阅
  useEffect(() => {
    subscribeCurrentSymbol();
  }, [subscribeCurrentSymbol]);

  // 切换交易对时更新杠杆

  useEffect(() => {
    const updateLeverageForNewPair = async () => {
      // 优先从持仓数据中获取
      const position = account_data.positions.find(p => p.symbol === trading_pair);
      if (position) {
        setLeverage(parseInt(position.leverage, 10));
        return;
      }

      // 没有持仓数据时调用 API
      const active_api_key = get_active_api_key();
      if (!active_api_key) {
        return;
      }

      try {
        const response = await BinanceAccountApi.getPositionRisk({
          api_key: active_api_key.api_key,
          api_secret: active_api_key.api_secret,
          symbol: trading_pair
        });

        if (response.status === 'success' && response.datum?.leverage) {
          setLeverage(response.datum.leverage);
        } else {
          setLeverage(DEFAULT_LEVERAGE);
        }
      } catch (err) {
        setLeverage(DEFAULT_LEVERAGE);
      }
    };

    updateLeverageForNewPair();
  }, [trading_pair]);

  const long_positions = account_data.positions.filter(
    p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
  );
  const short_positions = account_data.positions.filter(
    p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
  );

  const total_long_amount = long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const total_short_amount = short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  const net_position = total_long_amount - total_short_amount;

  // 计算收益统计数据
  const profit_stats = useMemo(() => {
    // 今日数据
    const today_profit = account_data.today_profit_loss || 0;
    const today_trades = order_records.length;
    const today_win_rate = today_profit >= 0 ? 55 : 45;

    // 总计数据（简化处理，使用今日数据作为总计）
    const total_profit = today_profit;
    const total_trades = today_trades;
    const total_win_rate = today_win_rate;

    return {
      today_profit,
      today_trades,
      today_win_rate,
      total_profit,
      total_trades,
      total_win_rate
    };
  }, [account_data.today_profit_loss, order_records.length]);

  // 当前交易对的持仓数据
  const current_pair_positions = useMemo(() => {
    return account_data.positions.filter(p => p.symbol === trading_pair);
  }, [account_data.positions, trading_pair]);

  const current_pair_long_amount = useMemo(() => {
    const long_positions = current_pair_positions
      .filter(p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH'));
    return long_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_positions]);

  const current_pair_short_amount = useMemo(() => {
    const short_positions = current_pair_positions
      .filter(p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH'));
    return short_positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
  }, [current_pair_positions]);

  // 计算多单实时盈亏（基于当前价格）
  const long_profit = useMemo(() => {
    if (!current_price) {
      return null;
    }
    const long_pos = current_pair_positions.find(
      p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
    );
    if (!long_pos) {
      return null;
    }

    const entryPrice = parseFloat(long_pos.entryPrice);
    const positionAmt = parseFloat(long_pos.positionAmt);
    return (current_price - entryPrice) * positionAmt;
  }, [current_price, current_pair_positions]);

  // 计算空单实时盈亏（基于当前价格）
  const short_profit = useMemo(() => {
    if (!current_price) {
      return null;
    }
    const short_pos = current_pair_positions.find(
      p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
    );
    if (!short_pos) {
      return null;
    }

    const entryPrice = parseFloat(short_pos.entryPrice);
    const positionAmt = parseFloat(short_pos.positionAmt);
    return (entryPrice - current_price) * Math.abs(positionAmt);
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

    if (amount < MIN_POSITION_AMOUNT) {
      showMessage(`开仓金额不能小于 ${MIN_POSITION_AMOUNT} USDT`, 'error');
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
        source: 'QUICK_ORDER',
        positions: [{
          symbol: trading_pair,
          side: side === 'long' ? 'LONG' : 'SHORT',
          amount
        }]
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓操作已提交');
        order_records_panel_ref.current?.refresh();
        loadOrderRecords();
        // 刷新持仓数据以获取最新的强平价格
        await loadAccountData();
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

    const side_text = side === 'long' ? '多' : side === 'short' ? '空' : '';
    const position_text = percentage === 100 ? '全部' : `${percentage}%`;

    showCloseConfirm(
      `确认平仓`,
      `确定要${position_text}平${side_text}单吗？`,
      async () => {
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
            source: 'QUICK_ORDER',
            positions: close_positions
          });

          if (response.status === 'success' && response.datum) {
            handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓操作已提交');
            // 刷新持仓数据以获取最新的强平价格
            await loadAccountData();
          } else {
            showMessage(response.message || '平仓失败', 'error');
          }
        } catch (err) {
          console.error('[handleCloseByPercentage] 平仓异常:', err);
          showMessage('平仓失败，请重试', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
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

    const side_text = side === 'long' ? '多' : side === 'short' ? '空' : '';

    showCloseConfirm(
      `确认平仓`,
      `确定要平${side_text}单 ${amount} USDT 吗？`,
      async () => {
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
            source: 'QUICK_ORDER',
            positions: close_positions
          });

          if (response.status === 'success' && response.datum) {
            handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓操作已提交');
            if (side === 'long') {
              setCustomCloseLongAmount('');
            }
            if (side === 'short') {
              setCustomCloseShortAmount('');
            }
            // 刷新持仓数据以获取最新的强平价格
            await loadAccountData();
          } else {
            showMessage(response.message || '平仓失败', 'error');
          }
        } catch (err) {
          console.error('[handleCloseByAmount] 平仓异常:', err);
          showMessage('平仓失败，请重试', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleOpenByAmount = async (side: 'long' | 'short', amount: number) => {
    const active_api_key = get_active_api_key();
    if (!active_api_key) {
      navigateToSettings();
      return;
    }

    if (amount < MIN_POSITION_AMOUNT) {
      showMessage(`开仓金额不能小于 ${MIN_POSITION_AMOUNT} USDT`, 'error');
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
        source: 'QUICK_ORDER',
        positions: [{
          symbol: trading_pair,
          side: side === 'long' ? 'LONG' : 'SHORT',
          amount
        }]
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓操作已提交');
        order_records_panel_ref.current?.refresh();
        loadOrderRecords();
        if (side === 'long') {
          setCustomOpenLongAmount('');
        }
        if (side === 'short') {
          setCustomOpenShortAmount('');
        }
        // 刷新持仓数据以获取最新的强平价格
        await loadAccountData();
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
        source: 'QUICK_ORDER',
        positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '开仓持平完成');
        order_records_panel_ref.current?.refresh();
        loadOrderRecords();
        // 刷新持仓数据以获取最新的强平价格
        await loadAccountData();
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
        source: 'QUICK_ORDER',
        positions: close_positions
      });

      if (response.status === 'success' && response.datum) {
        handlePositionResponse(response.datum as PositionOperationResponse, showMessage, '平仓持平完成');
        // 刷新持仓数据以获取最新的强平价格
        await loadAccountData();
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

  const quick_pairs = ['BTC', 'ETH', 'HYPE', 'ASTER', 'BNB', 'AVAX'];
  const quick_pair_options = quick_pairs.map(coin => `${coin}USDT`);
  const other_pairs = usdt_pairs
    .filter(pair => !quick_pair_options.includes(pair))
    .slice(0, 20);
  const trading_pair_options = [
    ...quick_pair_options.map(pair => ({ value: pair, label: pair })),
    ...other_pairs.map(pair => ({ value: pair, label: pair }))
  ];

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
            <h1 className="quick-order-page-title">U本位快捷开单</h1>
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
            onClick={handleRefresh}
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
              mark_price={mark_price}
              index_price={index_price}
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
              today_profit_loss={account_data.today_profit_loss}
              margin_balance={account_data.margin_balance}
              wallet_balance={account_data.wallet_balance}
              unrealized_profit={account_data.unrealized_profit}
            />
            <ProfitStatsCard
              today_profit={profit_stats.today_profit}
              today_trades={profit_stats.today_trades}
              today_win_rate={profit_stats.today_win_rate}
              total_profit={profit_stats.total_profit}
              total_trades={profit_stats.total_trades}
              total_win_rate={profit_stats.total_win_rate}
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

      <PositionFloatingPanel
        positions={account_data.positions}
        ticker_prices={ticker_prices}
        get_active_api_key={get_active_api_key}
        show_message={showMessage}
        is_visible={show_position_panel}
        set_is_visible={setShowPositionPanel}
      />

      <OrderRecordsFloatingPanel
        ref={order_records_panel_ref}
        get_active_api_key={get_active_api_key}
        show_message={showMessage}
        is_visible={show_order_records_panel}
        set_is_visible={setShowOrderRecordsPanel}
        ticker_prices={ticker_prices}
        subscribe_ticker={subscribeTicker}
      />

      {!show_position_panel && (
        <button
          className="position-panel-toggle-btn"
          onClick={() => setShowPositionPanel(true)}
          title="打开持仓面板"
        >
          <IconList size={18} />
          <span>持仓</span>
        </button>
      )}

      {!show_order_records_panel && (
        <button
          className="order-records-panel-toggle-btn"
          onClick={() => setShowOrderRecordsPanel(true)}
          title="打开订单记录面板"
        >
          <IconHistory size={18} />
          <span>订单</span>
        </button>
      )}

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

      <ConfirmModal
        opened={close_confirm_modal.opened}
        title={close_confirm_modal.title}
        content={close_confirm_modal.content}
        onConfirm={close_confirm_modal.onConfirm}
        onClose={handleCloseConfirmModal}
      />
    </div>
  );
}

export default QuickOrderPage;
