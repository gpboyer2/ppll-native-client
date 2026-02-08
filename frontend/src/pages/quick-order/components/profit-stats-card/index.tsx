import './index.scss';

export interface ProfitStatsCardProps {
  today_profit: number;
  today_trades: number;
  today_win_rate: number;
  total_profit: number;
  total_trades: number;
  total_win_rate: number;
}

export function ProfitStatsCard(props: ProfitStatsCardProps): JSX.Element {
  const {
    today_profit,
    today_trades,
    today_win_rate,
    total_profit,
    total_trades,
    total_win_rate
  } = props;

  return (
    <div className="profit-stats-card">
      <div className="profit-stats-card-header">
        <span className="profit-stats-card-title">收益战绩统计</span>
      </div>
      <div className="profit-stats-card-content">
        <div className="profit-stats-card-row">
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日盈亏</span>
            <span className={`profit-stats-card-value ${today_profit > 0 ? 'profit-stats-card-value-long' : today_profit < 0 ? 'profit-stats-card-value-short' : ''}`}>
              {today_profit > 0 ? '+' : ''}{today_profit.toFixed(2)} U
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日交易</span>
            <span className="profit-stats-card-value">
              {today_trades}
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总盈亏</span>
            <span className={`profit-stats-card-value ${total_profit > 0 ? 'profit-stats-card-value-long' : total_profit < 0 ? 'profit-stats-card-value-short' : ''}`}>
              {total_profit > 0 ? '+' : ''}{total_profit.toFixed(2)} U
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总交易</span>
            <span className="profit-stats-card-value">
              {total_trades}
            </span>
          </div>
        </div>
        <div className="profit-stats-card-row">
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">今日胜率</span>
            <span className={`profit-stats-card-value ${today_win_rate >= 50 ? 'profit-stats-card-value-long' : today_win_rate < 50 ? 'profit-stats-card-value-short' : ''}`}>
              {today_win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="profit-stats-card-item">
            <span className="profit-stats-card-label">总计胜率</span>
            <span className={`profit-stats-card-value ${total_win_rate >= 50 ? 'profit-stats-card-value-long' : total_win_rate < 50 ? 'profit-stats-card-value-short' : ''}`}>
              {total_win_rate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
