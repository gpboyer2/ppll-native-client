import { IconSettings } from '@tabler/icons-react';
import './index.scss';
import { ICON_SIZE } from '../../../../constants/grid-strategy';

interface GridParamsCardProps {
  grid_price_difference: number;
  grid_long_open_quantity?: number;
  grid_long_close_quantity?: number;
  grid_short_open_quantity?: number;
  grid_short_close_quantity?: number;
  exchange?: string;
  margin_type?: string;
}

export function GridParamsCard({
  grid_price_difference,
  grid_long_open_quantity,
  grid_long_close_quantity,
  grid_short_open_quantity,
  grid_short_close_quantity,
  exchange,
  margin_type
}: GridParamsCardProps) {
  return (
    <div className="info-card">
      <div className="info-card-header">
        <IconSettings size={ICON_SIZE.MEDIUM} />
        <span>网格参数</span>
      </div>
      <div className="info-card-body">
        <div className="info-row">
          <span className="info-label">网格价差</span>
          <span className="info-value">{grid_price_difference}%</span>
        </div>
        {grid_long_open_quantity && (
          <div className="info-row">
            <span className="info-label">做多开仓</span>
            <span className="info-value">{grid_long_open_quantity}</span>
          </div>
        )}
        {grid_long_close_quantity && (
          <div className="info-row">
            <span className="info-label">做多平仓</span>
            <span className="info-value">{grid_long_close_quantity}</span>
          </div>
        )}
        {grid_short_open_quantity && (
          <div className="info-row">
            <span className="info-label">做空开仓</span>
            <span className="info-value">{grid_short_open_quantity}</span>
          </div>
        )}
        {grid_short_close_quantity && (
          <div className="info-row">
            <span className="info-label">做空平仓</span>
            <span className="info-value">{grid_short_close_quantity}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">交易所</span>
          <span className="info-value">{exchange || 'BINANCE'}</span>
        </div>
        {margin_type && (
          <div className="info-row">
            <span className="info-label">保证金模式</span>
            <span className="info-value">{margin_type}</span>
          </div>
        )}
      </div>
    </div>
  );
}
