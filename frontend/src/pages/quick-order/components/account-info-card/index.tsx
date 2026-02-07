import './index.scss';

export interface AccountInfoCardProps {
  available_balance: number;
  net_position: number;
  total_long_amount: number;
  total_short_amount: number;
  today_profit_loss: number;
  margin_balance: number;
  wallet_balance: number;
  unrealized_profit: number;
}

export function AccountInfoCard(props: AccountInfoCardProps): JSX.Element {
  const {
    available_balance,
    net_position,
    total_long_amount,
    total_short_amount,
    today_profit_loss,
    margin_balance,
    wallet_balance,
    unrealized_profit
  } = props;

  const is_balance_low = available_balance < 1000;

  return (
    <div className="account-info-card">
      <div className="account-info-card-header">
        <span className="account-info-card-title">账户信息</span>
      </div>
      <div className="account-info-card-content">
        <div className="account-info-card-row">
          <div className="account-info-card-item">
            <span className="account-info-card-label">可用保证金</span>
            <span className={`account-info-card-value ${is_balance_low ? 'account-info-card-value-warning' : ''}`}>
              {available_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局多单仓位</span>
            <span className="account-info-card-value account-info-card-value-long">
              {total_long_amount.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局空单仓位</span>
            <span className="account-info-card-value account-info-card-value-short">
              {total_short_amount.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">全局净仓</span>
            <span className={`account-info-card-value ${net_position > 0 ? 'account-info-card-value-long' : net_position < 0 ? 'account-info-card-value-short' : ''}`}>
              {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
            </span>
          </div>
        </div>
        <div className="account-info-card-row">
          <div className="account-info-card-item">
            <span className="account-info-card-label">今日盈亏</span>
            <span className={`account-info-card-value ${today_profit_loss > 0 ? 'account-info-card-value-long' : today_profit_loss < 0 ? 'account-info-card-value-short' : ''}`}>
              {today_profit_loss > 0 ? '+' : ''}{today_profit_loss.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">保证金余额</span>
            <span className="account-info-card-value">
              {margin_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">钱包余额</span>
            <span className="account-info-card-value">
              {wallet_balance.toFixed(2)} U
            </span>
          </div>
          <div className="account-info-card-item">
            <span className="account-info-card-label">未实现盈亏</span>
            <span className={`account-info-card-value ${unrealized_profit > 0 ? 'account-info-card-value-long' : unrealized_profit < 0 ? 'account-info-card-value-short' : ''}`}>
              {unrealized_profit > 0 ? '+' : ''}{unrealized_profit.toFixed(2)} U
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
