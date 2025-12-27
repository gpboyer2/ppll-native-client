import { CommissionCalculationResult } from '../../utils/commission-calculator';

/**
 * 左右分栏对比组件 - 返佣收益对比
 */
export function CommissionComparisonLeftRight({ data }: { data: CommissionCalculationResult }) {
  return (
    <div className="commission-comparison-leftright">
      {/* 左侧卡片：默认交易 */}
      <div className="commission-card commission-card-default">
        <h3 className="commission-card-title">默认交易模式</h3>
        <div className="commission-card-body">
          <div className="commission-row">
            <span className="commission-label">用户月收益</span>
            <span className="commission-value">{data.monthlyUserProfit} USDT</span>
          </div>
          <div className="commission-row">
            <span className="commission-label">月交易手续费</span>
            <span className="commission-value">{data.monthlyTradingFee} USDT</span>
          </div>
          <div className="commission-row">
            <span className="commission-label">交易所收益</span>
            <span className="commission-value">{data.exchangeProfit} USDT</span>
          </div>
        </div>
      </div>

      {/* 右侧卡片：启用返佣 */}
      <div className="commission-card commission-card-rebate">
        <div className="commission-card-badge">推荐</div>
        <h3 className="commission-card-title">启用返佣模式</h3>
        <div className="commission-card-body">
          <div className="commission-row">
            <span className="commission-label">用户月收益</span>
            <span className="commission-value commission-value-highlight">
              {data.monthlyUserProfitWithRebate} USDT
            </span>
          </div>
          <div className="commission-row">
            <span className="commission-label">月交易手续费</span>
            <span className="commission-value">{data.monthlyTradingFee} USDT</span>
          </div>
          <div className="commission-row commission-row-rebate">
            <span className="commission-label">返佣金额</span>
            <span className="commission-value commission-value-rebate">
              +{data.monthlyRebate} USDT
            </span>
          </div>
          <div className="commission-row">
            <span className="commission-label">交易所收益</span>
            <span className="commission-value">{data.exchangeProfitWithRebate} USDT</span>
          </div>
        </div>
        <div className="commission-card-footer">
          <div className="commission-profit-diff">
            <span className="commission-profit-icon">💰</span>
            <span className="commission-profit-text">
              额外收益 <strong>+{data.monthlyRebate} USDT/月</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="commission-comparison-note">
        <span className="note-icon">ℹ️</span>
        <div className="note-content">
          <div>手续费标准：开仓0.5‰ + 平仓0.5‰ = 1‰</div>
          <div>返佣比例：最高{data.rebatePercentage}%</div>
        </div>
      </div>
    </div>
  );
}

export default CommissionComparisonLeftRight;
