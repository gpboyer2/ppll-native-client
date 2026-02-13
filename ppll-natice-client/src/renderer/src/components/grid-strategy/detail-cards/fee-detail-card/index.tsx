import { IconCoins } from '@tabler/icons-react'
import './index.scss'
import { DECIMAL_PLACES, ICON_SIZE } from '../../../../constants/grid-strategy'

interface FeeDetailCardProps {
  total_fee: number
  funding_fee: number
}

export function FeeDetailCard({ total_fee, funding_fee }: FeeDetailCardProps) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div className="detail-card-header-left">
          <IconCoins size={ICON_SIZE.MEDIUM} />
          <h3>费用明细</h3>
        </div>
      </div>
      <div className="detail-card-body">
        <div className="fee-row">
          <span className="fee-label">总手续费</span>
          <span className="fee-value">{total_fee.toFixed(DECIMAL_PLACES.PRICE)} USDT</span>
        </div>
        <div className="fee-row">
          <span className="fee-label">资金费用</span>
          <span className={`fee-value ${funding_fee >= 0 ? 'positive' : 'negative'}`}>
            {funding_fee >= 0 ? '+' : ''}
            {funding_fee.toFixed(DECIMAL_PLACES.PRICE)} USDT
          </span>
        </div>
        <div className="fee-row total">
          <span className="fee-label">总费用</span>
          <span className="fee-value">
            {(total_fee + funding_fee).toFixed(DECIMAL_PLACES.PRICE)} USDT
          </span>
        </div>
      </div>
    </div>
  )
}
