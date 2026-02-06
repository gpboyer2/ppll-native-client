import { Button } from '../../../../components/mantine';

export interface AmountButtonsProps {
  amounts: number[];
  disabled?: boolean;
  button_class_name: string;
  on_amount_click: (amount: number) => void;
}

export function AmountButtons(props: AmountButtonsProps): JSX.Element {
  const { amounts, disabled, button_class_name, on_amount_click } = props;

  return (
    <div className="quick-order-buttons">
      {amounts.map(amount => (
        <Button
          key={amount}
          className={`quick-order-button ${button_class_name}`}
          onClick={() => on_amount_click(amount)}
          disabled={disabled}
        >
          {amount}U
        </Button>
      ))}
    </div>
  );
}
