import './index.scss';

export interface TradingPairInfoCardProps {
  current_price: number | string;
  leverage: number;
  current_pair_long_amount: number;
  current_pair_short_amount: number;
}

export function TradingPairInfoCard(props: TradingPairInfoCardProps): JSX.Element {
  const {
    current_price,
    leverage,
    current_pair_long_amount,
    current_pair_short_amount
  } = props;

  const price_text = !current_price ? '--' : Number(current_price).toFixed(2);

  return (
    <div className="trading-pair-info-card">
      <div className="trading-pair-info-card-header">
        <span className="trading-pair-info-card-title">交易对信息</span>
      </div>
      <div className="trading-pair-info-card-content">
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前价格</span>
          <span className="trading-pair-info-card-value">
            {price_text}
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">杠杆</span>
          <span className="trading-pair-info-card-value">
            {leverage}x
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前多单</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-long">
            {current_pair_long_amount.toFixed(2)} U
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前空单</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-short">
            {current_pair_short_amount.toFixed(2)} U
          </span>
        </div>
      </div>
    </div>
  );
}
