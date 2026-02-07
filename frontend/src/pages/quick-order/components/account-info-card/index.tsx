import './index.scss';

export interface AccountInfoCardProps {
  available_balance: number;
  net_position: number;
  total_long_amount: number;
  total_short_amount: number;
}

export function AccountInfoCard(props: AccountInfoCardProps): JSX.Element {
  const {
    available_balance,
    net_position,
    total_long_amount,
    total_short_amount
  } = props;

  const is_balance_low = available_balance < 1000;

  return (
    <div className="account-info-card">
      <div className="account-info-card-header">
        <span className="account-info-card-title">账户信息</span>
      </div>
      <div className="account-info-card-content">
        <div className="account-info-card-item">
          <span className="account-info-card-label">可用保证金</span>
          <span className={`account-info-card-value ${is_balance_low ? 'account-info-card-value-warning' : ''}`}>
            {available_balance.toFixed(2)} U
          </span>
        </div>
        <div className="account-info-card-item">
          <span className="account-info-card-label">全局净仓</span>
          <span className={`account-info-card-value ${net_position > 0 ? 'account-info-card-value-long' : net_position < 0 ? 'account-info-card-value-short' : ''}`}>
            {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
          </span>
        </div>
        <div className="account-info-card-item">
          <span className="account-info-card-label">全局多单</span>
          <span className="account-info-card-value account-info-card-value-long">
            {total_long_amount.toFixed(2)} U
          </span>
        </div>
        <div className="account-info-card-item">
          <span className="account-info-card-label">全局空单</span>
          <span className="account-info-card-value account-info-card-value-short">
            {total_short_amount.toFixed(2)} U
          </span>
        </div>
      </div>
    </div>
  );
}
