import { IconScale } from '@tabler/icons-react';
import { Button } from '../../../../components/mantine';

export interface BalanceButtonProps {
  disabled: boolean;
  on_balance_click: () => void;
}

export function BalanceButton(props: BalanceButtonProps): JSX.Element {
  const { disabled, on_balance_click } = props;

  return (
    <div className="quick-order-balance">
      <Button
        className="quick-order-balance-btn"
        onClick={on_balance_click}
        disabled={disabled}
        title="一键将多空仓位调整为相等"
      >
        <IconScale size={16} />
        <span>多空仓位快速持平</span>
      </Button>
    </div>
  );
}
