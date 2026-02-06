import { Select, NumberInput } from '../../../../components/mantine';
import type { BinanceApiKey } from '../../../../stores/binance-store';

export type ApiKey = BinanceApiKey;

export interface TradeSettingsProps {
  trading_pair: string;
  leverage: number;
  api_key_list: ApiKey[];
  active_api_key_id: string | null;
  trading_pair_options: Array<{ value: string; label: string }>;
  on_trading_pair_change: (value: string) => void;
  on_leverage_change: (value: number) => void;
  on_api_key_select: (id: string) => void;
}

export function TradeSettings(props: TradeSettingsProps): JSX.Element {
  const {
    trading_pair,
    leverage,
    trading_pair_options,
    on_trading_pair_change,
    on_leverage_change,
    // 以下参数保留用于未来扩展或保持接口一致性
    api_key_list,
    active_api_key_id,
    on_api_key_select
  } = props;

  // 保留这些参数的引用以维持接口一致性，供将来可能的功能扩展使用
  void api_key_list;
  void active_api_key_id;
  void on_api_key_select;

  return (
    <div className="quick-order-controls">
      <div className="quick-order-control-group">
        <label className="quick-order-control-label">交易对</label>
        <Select
          placeholder="选择交易对"
          value={trading_pair}
          onChange={(value) => on_trading_pair_change(value || 'BTCUSDT')}
          data={trading_pair_options}
          className="quick-order-select"
        />
      </div>

      <div className="quick-order-control-group">
        <label className="quick-order-control-label">杠杆</label>
        <NumberInput
          placeholder="杠杆"
          value={leverage}
          onChange={(value) => on_leverage_change(Math.max(1, Math.min(125, parseInt(String(value)) || 1)))}
          min={1}
          max={125}
          className="quick-order-number-input"
        />
        <span className="quick-order-control-suffix">x</span>
      </div>
    </div>
  );
}
