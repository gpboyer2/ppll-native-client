import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { IconX, IconGripHorizontal } from '@tabler/icons-react'
import { OrdersApi } from '../../../../api'
import { ConfirmModal } from '../../../../components/mantine/Modal'
import type { AccountPosition } from '../../../../types/binance'
import type { BinanceApiKey } from '../../../../stores/binance-store'
import './index.scss'

interface PositionFloatingPanelProps {
  positions: AccountPosition[]
  ticker_prices: Record<string, { price?: number; mark_price?: number }>
  get_active_api_key: () => BinanceApiKey | null
  show_message: (msg: string, status: 'success' | 'error') => void
  is_visible: boolean
  set_is_visible: (value: boolean) => void
  on_close_success?: () => void
}

interface DragState {
  is_dragging: boolean
  start_x: number
  start_y: number
  initial_left: number
  initial_top: number
}

const PANEL_RIGHT_OFFSET = 340
const DEFAULT_Y = 200

function PositionFloatingPanel(props: PositionFloatingPanelProps) {
  const {
    positions,
    ticker_prices,
    get_active_api_key,
    show_message,
    is_visible,
    set_is_visible,
    on_close_success
  } = props

  const [position, setPosition] = useState(() => ({
    x: window.innerWidth - PANEL_RIGHT_OFFSET,
    y: DEFAULT_Y
  }))
  const [closing_positions, setClosingPositions] = useState<Set<string>>(new Set())
  const [close_confirm_modal, setCloseConfirmModal] = useState<{
    opened: boolean
    title: string
    content: string
    onConfirm: () => void
  }>({
    opened: false,
    title: '',
    content: '',
    onConfirm: () => {}
  })
  const drag_state = useRef<DragState>({
    is_dragging: false,
    start_x: 0,
    start_y: 0,
    initial_left: 0,
    initial_top: 0
  })
  const panel_ref = useRef<HTMLDivElement>(null)

  const valid_positions = useMemo(() => {
    return positions.filter((p) => parseFloat(p.positionAmt) !== 0)
  }, [positions])

  const has_positions = valid_positions.length > 0

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const panel = panel_ref.current
    if (!panel) return

    drag_state.current = {
      is_dragging: true,
      start_x: e.clientX,
      start_y: e.clientY,
      initial_left: panel.offsetLeft,
      initial_top: panel.offsetTop
    }

    const mouseMoveHandler = (evt: globalThis.MouseEvent) => {
      if (!drag_state.current.is_dragging) return

      const dx = evt.clientX - drag_state.current.start_x
      const dy = evt.clientY - drag_state.current.start_y

      setPosition({
        x: drag_state.current.initial_left + dx,
        y: drag_state.current.initial_top + dy
      })
    }

    const mouseUpHandler = () => {
      drag_state.current.is_dragging = false
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
    e.preventDefault()
  }, [])

  const handleClose = useCallback(() => {
    set_is_visible(false)
  }, [set_is_visible])

  const handleClosePosition = useCallback(
    async (position: AccountPosition, confirmed = false) => {
      if (!confirmed) {
        const position_amt = parseFloat(position.positionAmt)
        const side = position_amt > 0 ? '多' : '空'
        setCloseConfirmModal({
          opened: true,
          title: '确认平仓',
          content: `确定要平掉 ${position.symbol} 的${side}单吗？`,
          onConfirm: () => handleClosePosition(position, true)
        })
        return
      }

      const api_key = get_active_api_key()
      if (!api_key) {
        show_message('未选择 API Key', 'error')
        return
      }

      const position_amt = parseFloat(position.positionAmt)
      const side: 'LONG' | 'SHORT' = position_amt > 0 ? 'LONG' : 'SHORT'

      setClosingPositions((prev) => new Set(prev).add(position.symbol))

      try {
        const response = await OrdersApi.umClosePosition({
          api_key: api_key.api_key,
          api_secret: api_key.api_secret,
          positions: [
            {
              symbol: position.symbol,
              side,
              percentage: 100
            }
          ]
        })

        if (response.status === 'success') {
          show_message(`${position.symbol} 平仓成功`, 'success')
          on_close_success?.()
        } else {
          show_message(response.message || `${position.symbol} 平仓失败`, 'error')
        }
      } catch (err) {
        console.error('[PositionFloatingPanel] 平仓异常:', err)
        show_message(`${position.symbol} 平仓失败`, 'error')
      } finally {
        setClosingPositions((prev) => {
          const next = new Set(prev)
          next.delete(position.symbol)
          return next
        })
      }
    },
    [get_active_api_key, show_message]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  if (!is_visible) {
    return null
  }

  return (
    <div
      ref={panel_ref}
      className="position-floating-panel"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="position-floating-panel-header" onMouseDown={handleMouseDown}>
        <div className="position-floating-panel-title">
          <IconGripHorizontal size={18} className="position-floating-panel-grip" />
          <span>持仓</span>
          <span className="position-floating-panel-count">({valid_positions.length})</span>
        </div>
        <button className="position-floating-panel-close" onClick={handleClose} title="关闭">
          <IconX size={16} />
        </button>
      </div>

      <div className="position-floating-panel-body">
        {!has_positions ? (
          <div className="position-floating-panel-empty">
            <span className="position-floating-panel-empty-text">暂无持仓</span>
          </div>
        ) : (
          <div className="position-floating-panel-list">
            {valid_positions.map((p) => {
              const position_amt = parseFloat(p.positionAmt)
              const is_long = position_amt > 0
              const side = is_long ? '多' : '空'
              const entry_price = parseFloat(p.entryPrice)
              const notional = Math.abs(parseFloat(p.notional))
              const leverage = parseInt(p.leverage)
              const ticker = ticker_prices[p.symbol]
              const current_price = ticker?.mark_price || ticker?.price || entry_price
              const estimated_fee = notional * 0.001

              const unrealized_profit = parseFloat(p.unrealizedProfit)
              const profit_class =
                unrealized_profit > 0
                  ? 'profit-positive'
                  : unrealized_profit < 0
                    ? 'profit-negative'
                    : ''

              const is_closing = closing_positions.has(p.symbol)

              return (
                <div key={`${p.symbol}-${p.positionSide}`} className="position-floating-panel-item">
                  <div className="position-floating-panel-item-main">
                    <div className="position-floating-panel-symbol">{p.symbol}</div>
                    <div
                      className={`position-floating-panel-side ${is_long ? 'side-long' : 'side-short'}`}
                    >
                      {side}
                    </div>
                  </div>

                  <div className="position-floating-panel-item-details">
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">开仓价</span>
                      <span className="position-floating-panel-value">
                        {entry_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">持仓额</span>
                      <span
                        className={`position-floating-panel-value ${is_long ? 'value-long' : 'value-short'}`}
                      >
                        {notional.toFixed(4)} USDT
                      </span>
                    </div>
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">杠杆</span>
                      <span className="position-floating-panel-value">{leverage}x</span>
                    </div>
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">现价</span>
                      <span className="position-floating-panel-value">
                        {current_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">预计手续费</span>
                      <span className="position-floating-panel-value">
                        {estimated_fee.toFixed(4)} USDT
                      </span>
                    </div>
                    <div className="position-floating-panel-detail-row">
                      <span className="position-floating-panel-label">当前盈亏</span>
                      <span className={`position-floating-panel-value ${profit_class}`}>
                        {unrealized_profit >= 0 ? '+' : ''}
                        {unrealized_profit.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  <button
                    className={`position-floating-panel-close-btn ${is_long ? 'btn-long' : 'btn-short'} ${is_closing ? 'btn-loading' : ''}`}
                    onClick={() => handleClosePosition(p)}
                    disabled={is_closing}
                  >
                    {is_closing ? '平仓中...' : '平仓'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        opened={close_confirm_modal.opened}
        title={close_confirm_modal.title}
        content={close_confirm_modal.content}
        onConfirm={close_confirm_modal.onConfirm}
        onClose={() => setCloseConfirmModal((prev) => ({ ...prev, opened: false }))}
      />
    </div>
  )
}

export default PositionFloatingPanel
