import { Select, NumberInput } from '../../../../components/mantine';
import type { AccountPosition } from '../../../../types/binance';
import './index.scss';

const QUICK_PAIRS = ['BTC', 'ETH', 'HYPE', 'ASTER', 'BNB', 'AVAX'];

export interface TradingPairInfoCardProps {
  trading_pair: string;
  leverage: number;
  trading_pair_options: Array<{ value: string; label: string }>;
  current_price: number | string;
  mark_price?: number | null;
  index_price?: number | null;
  current_pair_long_amount: number;
  current_pair_short_amount: number;
  current_pair_positions: AccountPosition[];
  long_profit?: number | null;
  short_profit?: number | null;
  on_trading_pair_change: (value: string) => void;
  on_leverage_change: (value: number) => void;
}

export function TradingPairInfoCard(props: TradingPairInfoCardProps): JSX.Element {
  const {
    trading_pair,
    leverage,
    trading_pair_options,
    current_price,
    mark_price,
    index_price,
    current_pair_long_amount,
    current_pair_short_amount,
    current_pair_positions,
    long_profit,
    short_profit,
    on_trading_pair_change,
    on_leverage_change
  } = props;

  const price_text = !current_price ? '--' : Number(current_price).toFixed(2);
  const display_index_price = index_price ? Number(index_price).toFixed(2) : '--';
  const display_mark_price = mark_price ? Number(mark_price).toFixed(2) : '--';

  const net_position = current_pair_long_amount - current_pair_short_amount;

  const long_position = current_pair_positions.find(
    p => parseFloat(p.positionAmt) > 0 && (p.positionSide === 'LONG' || p.positionSide === 'BOTH')
  );

  const short_position = current_pair_positions.find(
    p => parseFloat(p.positionAmt) < 0 && (p.positionSide === 'SHORT' || p.positionSide === 'BOTH')
  );

  const formatPrice = (price: string | undefined) => {
    if (!price || price === '0') return '--';
    const num = parseFloat(price);
    return isNaN(num) ? '--' : num.toFixed(2);
  };

  const formatProfit = (profit: string | undefined) => {
    if (!profit || profit === '0') return '--';
    const num = parseFloat(profit);
    if (isNaN(num)) return '--';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)} U`;
  };

  const getProfitClassName = (profit: string | undefined) => {
    if (!profit || profit === '0') return '';
    const num = parseFloat(profit);
    if (isNaN(num)) return '';
    if (num > 0) return 'trading-pair-info-card-price-value-success';
    if (num < 0) return 'trading-pair-info-card-price-value-danger';
    return '';
  };

  const handleQuickPairClick = (coin: string) => {
    on_trading_pair_change(`${coin}USDT`);
  };

  const getCurrentCoin = () => {
    return trading_pair?.replace('USDT', '') || '';
  };

  return (
    <div className="trading-pair-info-card">
      <div className="trading-pair-info-card-header">
        <span className="trading-pair-info-card-title">交易对信息</span>
      </div>
      <div className="trading-pair-info-card-controls">
        <div className="trading-pair-info-card-control-group">
          <label className="trading-pair-info-card-control-label">交易对</label>
          <div className="trading-pair-info-card-quick-buttons">
            {QUICK_PAIRS.map((coin) => (
              <button
                key={coin}
                className={`trading-pair-info-card-quick-button ${getCurrentCoin() === coin ? 'trading-pair-info-card-quick-button-active' : ''}`}
                onClick={() => handleQuickPairClick(coin)}
                type="button"
              >
                {coin}
              </button>
            ))}
          </div>
          <Select
            placeholder="选择交易对"
            value={trading_pair}
            onChange={(value) => on_trading_pair_change(value || 'BTCUSDT')}
            data={trading_pair_options}
            className="trading-pair-info-card-select"
          />
        </div>
        <div className="trading-pair-info-card-control-group">
          <label className="trading-pair-info-card-control-label">杠杆</label>
          <NumberInput
            placeholder="杠杆"
            value={leverage}
            onChange={(value) => on_leverage_change(Math.max(1, Math.min(125, parseInt(String(value)) || 1)))}
            min={1}
            max={125}
            className="trading-pair-info-card-number-input"
          />
          <span className="trading-pair-info-card-control-suffix">x</span>
        </div>
      </div>
      <div className="trading-pair-info-card-content">
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前价格(标记价格)</span>
          <span className="trading-pair-info-card-value">
            {display_mark_price}
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前多单仓位</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-long">
            {current_pair_long_amount.toFixed(2)} U
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">当前空单仓位</span>
          <span className="trading-pair-info-card-value trading-pair-info-card-value-short">
            {current_pair_short_amount.toFixed(2)} U
          </span>
        </div>
        <div className="trading-pair-info-card-item">
          <span className="trading-pair-info-card-label">净仓</span>
          <span
            className={`trading-pair-info-card-value`}
          >
            {net_position > 0 ? '+' : ''}{net_position.toFixed(2)} U
          </span>
        </div>
      </div>
      <div className="trading-pair-info-card-prices">
        <div className="trading-pair-info-card-price-section">
          <div className="trading-pair-info-card-price-section-title">
            <span>多单仓位详情</span>
            <span className="trading-pair-info-card-value-long">({current_pair_long_amount.toFixed(2)} U)</span>
          </div>
          <div className="trading-pair-info-card-price-list">
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">保本</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(long_position?.breakEvenPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">开仓</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(long_position?.entryPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">强平</span>
              <span className="trading-pair-info-card-price-value trading-pair-info-card-price-value-danger">{formatPrice(long_position?.liquidationPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">盈利</span>
              <span className={`trading-pair-info-card-price-value ${getProfitClassName(typeof long_profit === 'number' ? String(long_profit) : long_position?.unrealizedProfit)}`}>
                {typeof long_profit === 'number' ? formatProfit(String(long_profit)) : formatProfit(long_position?.unrealizedProfit)}
              </span>
            </div>
          </div>
        </div>
        <div className="trading-pair-info-card-price-section">
          <div className="trading-pair-info-card-price-section-title">
            <span>空单仓位详情</span>
            <span className="trading-pair-info-card-value-short">({current_pair_short_amount.toFixed(2)} U)</span>
          </div>
          <div className="trading-pair-info-card-price-list">
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">保本</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(short_position?.breakEvenPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">开仓</span>
              <span className="trading-pair-info-card-price-value">{formatPrice(short_position?.entryPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">强平</span>
              <span className="trading-pair-info-card-price-value trading-pair-info-card-price-value-danger">{formatPrice(short_position?.liquidationPrice)}</span>
            </div>
            <div className="trading-pair-info-card-price-item">
              <span className="trading-pair-info-card-price-label">盈利</span>
              <span className={`trading-pair-info-card-price-value ${getProfitClassName(typeof short_profit === 'number' ? String(short_profit) : short_position?.unrealizedProfit)}`}>
                {typeof short_profit === 'number' ? formatProfit(String(short_profit)) : formatProfit(short_position?.unrealizedProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
