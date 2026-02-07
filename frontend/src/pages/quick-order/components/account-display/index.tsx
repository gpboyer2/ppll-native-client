import { AccountInfoCard } from '../account-info-card';
import { TradingPairInfoCard } from '../trading-pair-info-card';

export interface AccountDisplayProps {
  current_price: number | string;
  leverage: number;
  available_balance: number;
  net_position: number;
  total_long_amount: number;
  total_short_amount: number;
  current_pair_long_amount: number;
  current_pair_short_amount: number;
}

export function AccountDisplay(props: AccountDisplayProps): JSX.Element {
  const {
    current_price,
    leverage,
    available_balance,
    net_position,
    total_long_amount,
    total_short_amount,
    current_pair_long_amount,
    current_pair_short_amount
  } = props;

  return (
    <div className="quick-order-display">
      <AccountInfoCard
        available_balance={available_balance}
        net_position={net_position}
        total_long_amount={total_long_amount}
        total_short_amount={total_short_amount}
      />
      <TradingPairInfoCard
        current_price={current_price}
        leverage={leverage}
        current_pair_long_amount={current_pair_long_amount}
        current_pair_short_amount={current_pair_short_amount}
      />
    </div>
  );
}
