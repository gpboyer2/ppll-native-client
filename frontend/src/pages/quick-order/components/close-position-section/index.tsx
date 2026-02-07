import { IconTrendingUp, IconTrendingDown, IconX } from '@tabler/icons-react';
import { Button, NumberInput } from '../../../../components/mantine';

const CLOSE_AMOUNTS = [100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000];

export type PositionSide = 'long' | 'short' | 'LONG' | 'SHORT';

export interface ClosePositionSectionProps {
  side: PositionSide;
  loading: boolean;
  account_loading: boolean;
  position_count: number;
  custom_amount: string;
  on_amount_click: (amount: number) => void;
  on_custom_amount_change: (value: string) => void;
  on_close_click: () => void;
  on_close_all_click: () => void;
}

export function ClosePositionSection(props: ClosePositionSectionProps): JSX.Element {
  const {
    side,
    loading,
    account_loading,
    position_count,
    custom_amount,
    on_amount_click,
    on_custom_amount_change,
    on_close_click,
    on_close_all_click
  } = props;

  const is_long = side === 'LONG' || side === 'long';
  const Icon = is_long ? IconTrendingUp : IconTrendingDown;
  const label = is_long ? '平多' : '平空';
  const all_label = is_long ? '全平多单' : '全平空单';
  const button_class = is_long ? 'quick-order-button-long' : 'quick-order-button-short';
  const section_class = is_long ? 'quick-order-section-long' : 'quick-order-section-short';

  return (
    <div className={`quick-order-section ${section_class} quick-order-section-close`}>
      <div className="quick-order-section-header">
        <div className="quick-order-section-label">
          <Icon size={14} />
          <span>{label}</span>
        </div>
      </div>
      <div className="quick-order-buttons-close">
        {CLOSE_AMOUNTS.map(amount => (
          <Button
            key={amount}
            className={`quick-order-button ${button_class} quick-order-button-close`}
            onClick={() => on_amount_click(amount)}
            disabled={loading}
          >
            {amount}U
          </Button>
        ))}
      </div>
      <div className="quick-order-close-actions">
        <NumberInput
          placeholder="自定义金额"
          value={custom_amount}
          onChange={(value) => on_custom_amount_change(String(value))}
          disabled={loading}
          min={0}
          className="quick-order-close-amount-input"
        />
        <Button
          className={`quick-order-button ${button_class} quick-order-button-close quick-order-close-btn`}
          onClick={on_close_click}
          disabled={loading || !custom_amount}
        >
          {label}
        </Button>
        <Button
          className={`quick-order-button ${button_class} quick-order-button-close quick-order-all-close-btn`}
          onClick={on_close_all_click}
          disabled={loading || position_count === 0}
        >
          <IconX size={14} />
          <span>{all_label}</span>
        </Button>
      </div>
    </div>
  );
}
