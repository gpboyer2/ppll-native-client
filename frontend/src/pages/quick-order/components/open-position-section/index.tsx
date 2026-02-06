import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { Button, NumberInput } from '../../../../components/mantine';
import { AmountButtons } from '../amount-buttons';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000];

export type PositionSide = 'long' | 'short' | 'LONG' | 'SHORT';

export interface OpenPositionSectionProps {
  side: PositionSide;
  loading: boolean;
  account_loading: boolean;
  custom_amount: string;
  on_amount_click: (amount: number) => void;
  on_custom_amount_change: (value: string) => void;
  on_open_click: () => void;
}

export function OpenPositionSection(props: OpenPositionSectionProps): JSX.Element {
  const { side, loading, account_loading, custom_amount, on_amount_click, on_custom_amount_change, on_open_click } = props;

  const is_long = side === 'LONG' || side === 'long';
  const Icon = is_long ? IconTrendingUp : IconTrendingDown;
  const label = is_long ? '开多' : '开空';
  const button_class = is_long ? 'quick-order-button-long' : 'quick-order-button-short';
  const section_class = is_long ? 'quick-order-section-long' : 'quick-order-section-short';

  return (
    <div className={`quick-order-section ${section_class}`}>
      <div className="quick-order-section-header">
        <div className="quick-order-section-label">
          <Icon size={16} />
          <span>{label}</span>
        </div>
      </div>
      <AmountButtons
        amounts={QUICK_AMOUNTS}
        disabled={loading || account_loading}
        button_class_name={button_class}
        on_amount_click={on_amount_click}
      />
      <div className="quick-order-open-actions">
        <NumberInput
          placeholder="自定义金额"
          value={custom_amount}
          onChange={(value) => on_custom_amount_change(String(value))}
          disabled={loading || account_loading}
          min={0}
          className="quick-order-open-amount-input"
        />
        <Button
          className={`quick-order-button ${button_class} quick-order-open-btn`}
          onClick={on_open_click}
          disabled={loading || account_loading || !custom_amount}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
