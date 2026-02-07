import { IconScale, IconArrowDown } from '@tabler/icons-react';
import { Button } from '../../../../components/mantine';

export interface BalanceButtonProps {
  disabled: boolean;
  on_balance_by_open_click: () => void;
  on_balance_by_close_click: () => void;
}

export function BalanceButton(props: BalanceButtonProps): JSX.Element {
  const { disabled, on_balance_by_open_click, on_balance_by_close_click } = props;

  return (
    <div className="quick-order-balance">
      <div className="quick-order-balance-buttons">
        <Button
          className="quick-order-balance-btn quick-order-balance-btn-open"
          onClick={on_balance_by_open_click}
          disabled={disabled}
          title="通过建仓方式使多空仓位相等"
        >
          <IconScale size={16} />
          <span>开仓持平 (通过建仓方式使多空仓位相等)</span>
        </Button>
        <Button
          className="quick-order-balance-btn quick-order-balance-btn-close"
          onClick={on_balance_by_close_click}
          disabled={disabled}
          title="通过减仓平仓方式使多空仓位相等"
        >
          <IconArrowDown size={16} />
          <span>平仓持平 (通过减仓平仓方式使多空仓位相等)</span>
        </Button>
      </div>
    </div>
  );
}
