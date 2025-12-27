import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { CommissionCalculationResult } from '../../utils/commission-calculator';

/**
 * 渐进式展示组件 - 返佣收益对比
 * 默认折叠，点击展开详细信息
 */
export function CommissionComparisonProgressive({ data }: { data: CommissionCalculationResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="commission-comparison-progressive">
      {/* 第一步：默认交易收益 */}
      <div className="commission-step commission-step-default">
        <div className="commission-step-header">
          <div className="commission-step-title">预计月收益</div>
          <div className="commission-step-value">{data.monthlyUserProfit} USDT</div>
        </div>
        <div className="commission-step-desc">
          通过您的交易，交易所每月赚取手续费 {data.monthlyTradingFee} USDT
        </div>
      </div>

      {/* 第二步：开启返佣按钮 */}
      {!expanded && (
        <button
          className="commission-expand-button"
          onClick={() => setExpanded(true)}
        >
          <span className="expand-icon">🎁</span>
          <span className="expand-text">开启返佣，额外收入</span>
          <IconChevronDown size={20} className="expand-chevron" />
        </button>
      )}

      {/* 第三步：展开后显示详细信息 */}
      {expanded && (
        <div className="commission-step commission-step-expanded">
          <div className="commission-expand-header">
            <div className="expand-header-title">
              <span className="expand-header-icon">💰</span>
              启用返佣后，您每月额外获得
            </div>
            <div className="expand-header-value">+{data.monthlyRebate} USDT</div>
          </div>

          {/* 详细收益卡片 */}
          <div className="commission-detail-card">
            <div className="commission-detail-row commission-detail-highlight">
              <span className="detail-label">用户总收益</span>
              <span className="detail-value detail-value-large">
                {data.monthlyUserProfitWithRebate} USDT
              </span>
            </div>
            <div className="commission-detail-row">
              <span className="detail-label detail-label-break">其中返佣金额</span>
              <span className="detail-value detail-value-rebate">
                +{data.monthlyRebate} USDT
              </span>
            </div>
            <div className="commission-detail-row">
              <span className="detail-label">交易所收益</span>
              <span className="detail-value">{data.exchangeProfitWithRebate} USDT</span>
            </div>
          </div>

          {/* 收起按钮 */}
          <button
            className="commission-collapse-button"
            onClick={() => setExpanded(false)}
          >
            收起详情
          </button>
        </div>
      )}

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

export default CommissionComparisonProgressive;
