import { Select, NumberInput } from '../../../../components/mantine';
import type { AccountPosition } from '../../../../types/binance';
import './index.scss';

export interface TradingPairInfoCardProps {
  trading_pair: string;
  leverage: number;
  trading_pair_options: Array<{ value: string; label: string }>;
  current_price: number | string;
  current_pair_long_amount: number;
  current_pair_short_amount: number;
  current_pair_positions: AccountPosition[];
  on_trading_pair_change: (value: string) => void;
  on_leverage_change: (value: number) => void;
}

export function TradingPairInfoCard(props: TradingPairInfoCardProps): JSX.Element {
  const {
    trading_pair,
    leverage,
    trading_pair_options,
    current_price,
    current_pair_long_amount,
    current_pair_short_amount,
    current_pair_positions,
    on_trading_pair_change,
    on_leverage_change
  } = props;

  const price_text = !current_price ? '--' : Number(current_price).toFixed(2);

  const long_position = current_pair_positions.find(
    p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
  );

  const short_position = current_pair_positions.find(
    p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
  );

  const formatPrice = (price: string | undefined) => {
    if (!price || price === '0') return '--';
    const num = parseFloat(price);
    return isNaN(num) ? '--' : num.toFixed(2);
  };

  return (
    <div className="trading-pair-info-card">
      <div className="trading-pair-info-card-header">
        <span className="trading-pair-info-card-title">交易对信息</span>
      </div>
      <div className="trading-pair-info-card-controls">
        <div className="trading-pair-info-card-control-group">
          <label className="trading-pair-info-card-control-label">交易对</label>
          <Select
            placeholder="选择交易对"
            value={trading_pair}
            onChange={(value) => on_trading_pair_change(value || 'BTCUSDT')}
            data={trading_pair_options}
            className="trading-pair-info-card-select"
          />
        </div>
        <div className="trading-pair-info-card-control-group">
          <label className="trading-pair-info-card-control-label">杠杆</label>
          <NumberInput
            placeholder="杠杆"
            value={leverage}
            onChange={(value) => on_leverage_change(Math.max(1, Math.min(125, parseInt(String(value)) || 1)))}
            min={1}
            max={125}
            className="trading-pair-info-card-number-input"
          />
          <span className="trading-pair-info-card-control-suffix">x</span>
        </div>
      </div>
      <div className="trading-pair-info-card-content">
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前价格</span>
          <span className="trading-pair-info-card-value">
            {price_text}
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前多单仓位</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-long">
            {current_pair_long_amount.toFixed(2)} U
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前空单仓位</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-short">
            {current_pair_short_amount.toFixed(2)} U
          </span>
        </div>
      </div>
      <div className="trading-pair-info-card-prices">
        <div className="trading-pair-info-card-price-section">
          <span className="trading-pair-info-card-price-section-title">多单仓位详情</span>
          <div className="trading-pair-info-card-price-list">
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">保本</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(long_position?.breakEvenPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">开仓</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(long_position?.entryPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">强平</span>
              <span className="trading-pair-info-card-price-value trading-pair-info-card-price-value-danger">{formatPrice(long_position?.liquidationPrice)}</span>
            </div>
          </div>
        </div>
        <div className="trading-pair-info-card-price-section">
          <span className="trading-pair-info-card-price-section-title">空单仓位详情</span>
          <div className="trading-pair-info-card-price-list">
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">保本</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(short_position?.breakEvenPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">开仓</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(short_position?.entryPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">强平</span>
              <span className="trading-pair-info-card-price-value trading-pair-info-card-price-value-danger">{formatPrice(short_position?.liquidationPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
