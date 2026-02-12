import { IconActivity } from '@tabler/icons-react'
import './index.scss'
import { ICON_SIZE } from '../../../../constants/grid-strategy'

interface StrategyStatusCardProps {
  strategy_status: 'running' | 'paused' | 'stopped'
  position_side: 'LONG' | 'SHORT'
  leverage: number
  status_text?: string
}

export function StrategyStatusCard({
  strategy_status,
  position_side,
  leverage,
  status_text
}: StrategyStatusCardProps) {
  const is_long = position_side === 'LONG'

  const getStatusText = () => {
    return (
      status_text ||
      (strategy_status === 'running'
        ? '运行中'
        : strategy_status === 'paused'
          ? '已暂停'
          : '已停止')
    )
  }

  return (
    <div className="status-card">
      <div className="status-card-header">
        <IconActivity size={ICON_SIZE.MEDIUM} />
        <h3>策略状态</h3>
      </div>
      <div className="status-card-body">
        <div className="status-row">
          <span className="status-label">运行状态</span>
          <span className={`status-badge status-${strategy_status}`}>{getStatusText()}</span>
        </div>
        <div className="status-row">
          <span className="status-label">持仓方向</span>
          <span className={`status-badge ${is_long ? 'long' : 'short'}`}>
            {is_long ? '做多' : '做空'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">杠杆倍数</span>
          <span className="status-value">x{leverage}</span>
        </div>
      </div>
    </div>
  )
}
