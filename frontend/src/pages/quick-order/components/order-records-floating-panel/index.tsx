import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { IconX, IconGripHorizontal } from '@tabler/icons-react';
import { OrdersApi } from '../../../../api';
import type { BinanceApiKey } from '../../../../stores/binance-store';
import './index.scss';

interface QuickOrderRecord {
  id: number;
  symbol: string;
  side: string;
  position_side: string;
  executed_amount: number;
  executed_price: number;
  quantity: number;
  status: string;
  created_at: string;
}

interface OrderRecordsFloatingPanelProps {
  get_active_api_key: () => BinanceApiKey | null;
  show_message: (msg: string, status: 'success' | 'error') => void;
  is_visible: boolean;
  set_is_visible: (value: boolean) => void;
  ticker_prices: Record<string, { price?: number; mark_price?: number }>;
}

interface DragState {
  is_dragging: boolean;
  start_x: number;
  start_y: number;
  initial_left: number;
  initial_top: number;
}

const DEFAULT_POSITION = { x: -0, y: 200 };

export interface OrderRecordsFloatingPanelRef {
  refresh: () => void;
}

function OrderRecordsFloatingPanel(props: OrderRecordsFloatingPanelProps, ref: React.Ref<OrderRecordsFloatingPanelRef>) {
  const { get_active_api_key, show_message, is_visible, set_is_visible, ticker_prices } = props;

  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [order_records, setOrderRecords] = useState<QuickOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing_positions, setClosingPositions] = useState<Set<string>>(new Set());
  const drag_state = useRef<DragState>({
    is_dragging: false,
    start_x: 0,
    start_y: 0,
    initial_left: 0,
    initial_top: 0,
  });
  const panel_ref = useRef<HTMLDivElement>(null);

  const loadOrderRecords = useCallback(async () => {
    const api_key = get_active_api_key();
    if (!api_key) {
      return;
    }

    setLoading(true);
    try {
      const response = await OrdersApi.getQuickOrderRecords({
        api_key: api_key.api_key
      });

      if (response.status === 'success' && response.datum) {
        setOrderRecords(response.datum.list || []);
      } else {
        setOrderRecords([]);
      }
    } catch (err) {
      console.error('[OrderRecordsFloatingPanel] 加载订单记录失败:', err);
      setOrderRecords([]);
    } finally {
      setLoading(false);
    }
  }, [get_active_api_key]);

  useImperativeHandle(ref, () => ({
    refresh: loadOrderRecords,
  }), [loadOrderRecords]);

  useEffect(() => {
    loadOrderRecords();
  }, [loadOrderRecords]);

  useEffect(() => {
    const updateDefaultPosition = () => {
      const panel = panel_ref.current;
      if (!panel) return;

      if (position.x === 0 && position.y === DEFAULT_POSITION.y) {
        const viewport_width = window.innerWidth;
        const target_x = viewport_width - 340;
        setPosition({ x: target_x, y: DEFAULT_POSITION.y });
      }
    };

    updateDefaultPosition();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const panel = panel_ref.current;
    if (!panel) return;

    drag_state.current = {
      is_dragging: true,
      start_x: e.clientX,
      start_y: e.clientY,
      initial_left: panel.offsetLeft,
      initial_top: panel.offsetTop,
    };

    const mouseMoveHandler = (evt: globalThis.MouseEvent) => {
      if (!drag_state.current.is_dragging) return;

      const dx = evt.clientX - drag_state.current.start_x;
      const dy = evt.clientY - drag_state.current.start_y;

      setPosition({
        x: drag_state.current.initial_left + dx,
        y: drag_state.current.initial_top + dy,
      });
    };

    const mouseUpHandler = () => {
      drag_state.current.is_dragging = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    e.preventDefault();
  }, []);

  const handleClose = useCallback(() => {
    set_is_visible(false);
  }, [set_is_visible]);

  const handleClosePosition = useCallback(async (record: QuickOrderRecord) => {
    const api_key = get_active_api_key();
    if (!api_key) {
      show_message('未选择 API Key', 'error');
      return;
    }

    setClosingPositions(prev => new Set(prev).add(record.symbol));

    try {
      const response = await OrdersApi.umClosePosition({
        api_key: api_key.api_key,
        api_secret: api_key.api_secret,
        source: 'QUICK_ORDER',
        positions: [{
          symbol: record.symbol,
          side: record.position_side as 'LONG' | 'SHORT',
          percentage: 100,
        }],
      });

      if (response.status === 'success') {
        show_message(`${record.symbol} 平仓成功`, 'success');
        loadOrderRecords();
      } else {
        show_message(response.message || `${record.symbol} 平仓失败`, 'error');
      }
    } catch (err) {
      console.error('[OrderRecordsFloatingPanel] 平仓异常:', err);
      show_message(`${record.symbol} 平仓失败`, 'error');
    } finally {
      setClosingPositions(prev => {
        const next = new Set(prev);
        next.delete(record.symbol);
        return next;
      });
    }
  }, [get_active_api_key, show_message, loadOrderRecords]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  const has_records = order_records.length > 0;

  if (!is_visible) {
    return null;
  }

  return (
    <div
      ref={panel_ref}
      className="order-records-floating-panel"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="order-records-floating-panel-header" onMouseDown={handleMouseDown}>
        <div className="order-records-floating-panel-title">
          <IconGripHorizontal size={18} className="order-records-floating-panel-grip" />
          <span>快捷开单</span>
          <span className="order-records-floating-panel-count">({order_records.length})</span>
        </div>
        <button
          className="order-records-floating-panel-close"
          onClick={handleClose}
          title="关闭"
        >
          <IconX size={16} />
        </button>
      </div>

      <div className="order-records-floating-panel-body">
        {loading ? (
          <div className="order-records-floating-panel-empty">
            <span className="order-records-floating-panel-empty-text">加载中...</span>
          </div>
        ) : !has_records ? (
          <div className="order-records-floating-panel-empty">
            <span className="order-records-floating-panel-empty-text">暂无订单</span>
          </div>
        ) : (
          <div className="order-records-floating-panel-list">
            {order_records.map(record => {
              const is_long = record.position_side === 'LONG';
              const side = is_long ? '多' : '空';
              const executed_price = parseFloat(String(record.executed_price || 0));
              const executed_amount = parseFloat(String(record.executed_amount || 0));
              const ticker = ticker_prices[record.symbol];
              const current_price = ticker?.mark_price || ticker?.price || executed_price;

              const is_closing = closing_positions.has(record.symbol);

              return (
                <div key={record.id} className="order-records-floating-panel-item">
                  <div className="order-records-floating-panel-item-main">
                    <div className="order-records-floating-panel-symbol">{record.symbol}</div>
                    <div className={`order-records-floating-panel-side ${is_long ? 'side-long' : 'side-short'}`}>
                      {side}
                    </div>
                  </div>

                  <div className="order-records-floating-panel-item-details">
                    <div className="order-records-floating-panel-detail-row">
                      <span className="order-records-floating-panel-label">开仓价</span>
                      <span className="order-records-floating-panel-value">{executed_price.toFixed(2)}</span>
                    </div>
                    <div className="order-records-floating-panel-detail-row">
                      <span className="order-records-floating-panel-label">开仓额</span>
                      <span className="order-records-floating-panel-value">{executed_amount.toFixed(2)} USDT</span>
                    </div>
                    <div className="order-records-floating-panel-detail-row">
                      <span className="order-records-floating-panel-label">现价</span>
                      <span className="order-records-floating-panel-value">{current_price.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    className={`order-records-floating-panel-close-btn ${is_long ? 'btn-long' : 'btn-short'} ${is_closing ? 'btn-loading' : ''}`}
                    onClick={() => handleClosePosition(record)}
                    disabled={is_closing}
                  >
                    {is_closing ? '平仓中...' : '平仓'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default forwardRef(OrderRecordsFloatingPanel);
