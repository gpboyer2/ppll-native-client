import { IconActivity, IconChartBar, IconCoins } from '@tabler/icons-react'
import './index.scss'
import { DECIMAL_PLACES, ICON_SIZE } from '../../../../constants/grid-strategy'

interface ProfitCardProps {
  total_profit_loss: number
  total_open_position_value: number
  total_trades: number
  total_pairing_times: number
  total_fee: number
}

export function ProfitCard({
  total_profit_loss,
  total_open_position_value,
  total_trades,
  total_pairing_times,
  total_fee
}: ProfitCardProps) {
  const profit_class = total_profit_loss >= 0 ? 'positive' : 'negative'
  const profit_rate =
    total_open_position_value > 0 ? (total_profit_loss / total_open_position_value) * 100 : 0

  return (
    <div className="profit-card">
      <div className="profit-main">
        <div className="profit-label">总盈亏</div>
        <div className={`profit-value ${profit_class}`}>
          {total_profit_loss >= 0 ? '+' : ''}
          {total_profit_loss.toFixed(DECIMAL_PLACES.PRICE)}
          <span className="profit-unit">USDT</span>
        </div>
        <div className={`profit-rate ${profit_class}`}>
          {profit_rate >= 0 ? '+' : ''}
          {profit_rate.toFixed(DECIMAL_PLACES.PERCENTAGE)}%
        </div>
      </div>
      <div className="profit-divider"></div>
      <div className="profit-stats">
        <div className="profit-stat-item">
          <IconActivity size={ICON_SIZE.SMALL} />
          <span className="stat-label">交易次数</span>
          <span className="stat-value">{total_trades}</span>
        </div>
        <div className="profit-stat-item">
          <IconChartBar size={ICON_SIZE.SMALL} />
          <span className="stat-label">配对次数</span>
          <span className="stat-value">{total_pairing_times}</span>
        </div>
        <div className="profit-stat-item">
          <IconCoins size={ICON_SIZE.SMALL} />
          <span className="stat-label">手续费</span>
          <span className="stat-value">{total_fee.toFixed(DECIMAL_PLACES.PRICE)} USDT</span>
        </div>
      </div>
    </div>
  )
}
