import { IconSettings } from '@tabler/icons-react'
import './index.scss'
import { ICON_SIZE } from '../../../../constants/grid-strategy'

interface GridParamsCardProps {
  grid_price_difference: number
  grid_long_open_quantity?: number
  grid_long_close_quantity?: number
  grid_short_open_quantity?: number
  grid_short_close_quantity?: number
  exchange?: string
  margin_type?: string
  position_side: 'LONG' | 'SHORT'
  current_price?: number | null
}

export function GridParamsCard({
  grid_price_difference,
  grid_long_open_quantity,
  grid_long_close_quantity,
  grid_short_open_quantity,
  grid_short_close_quantity,
  exchange,
  margin_type,
  position_side,
  current_price
}: GridParamsCardProps) {
  const is_long = position_side === 'LONG'

  // 计算金额的辅助函数
  const calculateAmount = (quantity: number): string => {
    if (!quantity) return '-'
    if (!current_price) return '等待价格'
    const amount = quantity * current_price
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="info-card">
      <div className="info-card-header">
        <IconSettings size={ICON_SIZE.MEDIUM} />
        <span>网格参数</span>
      </div>
      <div className="info-card-body">
        <div className="info-row">
          <span className="info-label">当前价格</span>
          <span className="info-value">
            {current_price ? `$${current_price.toLocaleString()}` : '加载中...'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">网格价差</span>
          <span className="info-value">
            {current_price ? ((grid_price_difference / current_price) * 100).toFixed(3) : '-'}% /{' '}
            {grid_price_difference.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}{' '}
            USDT
          </span>
        </div>

        {is_long ? (
          <>
            {grid_long_open_quantity && (
              <div className="info-row">
                <span className="info-label">做多开仓(数量/金额)</span>
                <span className="info-value">
                  {grid_long_open_quantity} / {calculateAmount(grid_long_open_quantity)}
                  {current_price && ' USDT'}
                </span>
              </div>
            )}
            {grid_long_close_quantity && (
              <div className="info-row">
                <span className="info-label">做多平仓(数量/金额)</span>
                <span className="info-value">
                  {grid_long_close_quantity} / {calculateAmount(grid_long_close_quantity)}
                  {current_price && ' USDT'}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {grid_short_open_quantity && (
              <div className="info-row">
                <span className="info-label">做空开仓(数量/金额)</span>
                <span className="info-value">
                  {grid_short_open_quantity} / {calculateAmount(grid_short_open_quantity)}
                  {current_price && ' USDT'}
                </span>
              </div>
            )}
            {grid_short_close_quantity && (
              <div className="info-row">
                <span className="info-label">做空平仓(数量/金额)</span>
                <span className="info-value">
                  {grid_short_close_quantity} / {calculateAmount(grid_short_close_quantity)}
                  {current_price && ' USDT'}
                </span>
              </div>
            )}
          </>
        )}

        {exchange && (
          <div className="info-row">
            <span className="info-label">交易所</span>
            <span className="info-value">{exchange}</span>
          </div>
        )}
        {margin_type && (
          <div className="info-row">
            <span className="info-label">保证金模式</span>
            <span className="info-value">
              {margin_type === 'cross'
                ? 'CROSS (全仓)'
                : margin_type === 'isolated'
                  ? 'ISOLATED (逐仓)'
                  : margin_type.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
