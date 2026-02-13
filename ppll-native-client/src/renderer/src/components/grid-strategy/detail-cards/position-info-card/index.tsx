import { IconTrendingUp } from '@tabler/icons-react'
import './index.scss'
import { DECIMAL_PLACES, ICON_SIZE } from '../../../../constants/grid-strategy'

interface PositionInfoCardProps {
  total_open_position_quantity: number
  total_open_position_value: number
  total_open_position_entry_price: number
  current_price?: number | null
  liquidation_price?: number
  break_even_price?: number
}

export function PositionInfoCard({
  total_open_position_quantity,
  total_open_position_value,
  total_open_position_entry_price,
  current_price,
  liquidation_price,
  break_even_price
}: PositionInfoCardProps) {
  const price_change =
    current_price && total_open_position_entry_price
      ? ((current_price - total_open_position_entry_price) / total_open_position_entry_price) * 100
      : 0

  return (
    <div className="info-card">
      <div className="info-card-header">
        <IconTrendingUp size={ICON_SIZE.MEDIUM} />
        <span>当前持仓</span>
      </div>
      <div className="info-card-body">
        <div className="info-row">
          <span className="info-label">持仓数量</span>
          <span className="info-value">
            {total_open_position_quantity.toFixed(DECIMAL_PLACES.QUANTITY)}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">持仓价值</span>
          <span className="info-value">
            {total_open_position_value.toFixed(DECIMAL_PLACES.PRICE)} USDT
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">成本价格</span>
          <span className="info-value">
            {total_open_position_entry_price.toFixed(DECIMAL_PLACES.PRICE)}
          </span>
        </div>
        {current_price && (
          <div className="info-row">
            <span className="info-label">当前价格</span>
            <span className="info-value">{current_price.toFixed(DECIMAL_PLACES.PRICE)}</span>
          </div>
        )}
        {current_price && total_open_position_entry_price && (
          <div className="info-row">
            <span className="info-label">价格变化</span>
            <span className={`info-value ${price_change >= 0 ? 'positive' : 'negative'}`}>
              {price_change >= 0 ? '+' : ''}
              {price_change.toFixed(DECIMAL_PLACES.PERCENTAGE)}%
            </span>
          </div>
        )}
        {liquidation_price && (
          <div className="info-row">
            <span className="info-label">强平价格</span>
            <span className="info-value warning">
              {liquidation_price.toFixed(DECIMAL_PLACES.PRICE)}
            </span>
          </div>
        )}
        {break_even_price && (
          <div className="info-row">
            <span className="info-label">保本价格</span>
            <span className="info-value">{break_even_price.toFixed(DECIMAL_PLACES.PRICE)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
