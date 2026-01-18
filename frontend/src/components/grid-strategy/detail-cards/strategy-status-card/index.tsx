import { IconActivity } from '@tabler/icons-react';
import './index.scss';
import { ICON_SIZE } from '../../../../constants/grid-strategy';

interface StrategyStatusCardProps {
  strategy_status: 'running' | 'paused' | 'stopped';
  position_side: 'LONG' | 'SHORT';
  leverage: number;
  remark?: string;
}

export function StrategyStatusCard({
  strategy_status,
  position_side,
  leverage,
  remark
}: StrategyStatusCardProps) {
  const is_long = position_side === 'LONG';

  const getStatusText = () => {
    switch (strategy_status) {
      case 'running': return '运行中';
      case 'paused': return '已暂停';
      case 'stopped': return '已停止';
    }
  };

  return (
    <div className="status-card">
      <div className="status-card-header">
        <IconActivity size={ICON_SIZE.MEDIUM} />
        <h3>策略状态</h3>
      </div>
      <div className="status-card-body">
        <div className="status-row">
          <span className="status-label">运行状态</span>
          <span className={`status-badge status-${strategy_status}`}>
            {getStatusText()}
          </span>
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
        {remark && remark !== 'error' && (
          <div className="status-row">
            <span className="status-label">备注</span>
            <span className="status-value">{remark}</span>
          </div>
        )}
      </div>
    </div>
  );
}
