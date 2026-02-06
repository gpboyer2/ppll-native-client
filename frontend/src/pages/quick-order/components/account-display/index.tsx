export interface AccountDisplayProps {
  current_price: number | string;
  available_balance: number;
  net_position: number;
  total_long_amount: number;
  total_short_amount: number;
}

export function AccountDisplay(props: AccountDisplayProps): JSX.Element {
  const {
    current_price,
    available_balance,
    net_position,
    total_long_amount,
    total_short_amount
  } = props;

  const price_text = !current_price ? '--' : Number(current_price).toFixed(2);
  const is_balance_low = available_balance < 1000;

  return (
    <div className="quick-order-display">
      <div className="quick-order-display-item">
        <span className="quick-order-display-label">当前价格</span>
        <span className="quick-order-display-value">{price_text}</span>
      </div>
      <div className="quick-order-display-item">
        <span className="quick-order-display-label">可用保证金</span>
        <span className={`quick-order-display-value ${is_balance_low ? 'quick-order-display-value-warning' : ''}`}>
          {available_balance.toFixed(2)} U
        </span>
      </div>
      <div className="quick-order-display-item">
        <span className="quick-order-display-label">净仓</span>
        <span className={`quick-order-display-value ${net_position > 0 ? 'quick-order-display-value-long' : net_position < 0 ? 'quick-order-display-value-short' : ''}`}>
          {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
        </span>
      </div>
      <div className="quick-order-display-item">
        <span className="quick-order-display-label">多单</span>
        <span className="quick-order-display-value quick-order-display-value-long">
          {total_long_amount.toFixed(2)} U
        </span>
      </div>
      <div className="quick-order-display-item">
        <span className="quick-order-display-label">空单</span>
        <span className="quick-order-display-value quick-order-display-value-short">
          {total_short_amount.toFixed(2)} U
        </span>
      </div>
    </div>
  );
}
