import { useEffect, useMemo } from 'react';
import { OpenBrowser } from '../../../wailsjs/go/main/App';
import { NumberFormat } from '../../utils';
import './dialog.scss';

// 网格策略参数类型
export interface GridStrategyParams {
    trading_pair: string;
    position_side: 'LONG' | 'SHORT';
    grid_price_difference: number;
    grid_trade_quantity?: number;
    grid_long_open_quantity?: number;
    grid_short_open_quantity?: number;
    // 预计算的返佣数据（优先使用）
    expected_daily_frequency?: number;
    expected_daily_profit?: number;
    trade_value?: number;
}

// 收益计算数据类型
interface CommissionCalculationData {
    tradeValue: number; // 每笔交易金额
    dailyFrequency: number; // 日交易次数
    commissionRate: string; // 手续费率
    rebateRate: string; // 返佣比例
    dailyRebateProfit: number; // 日返佣收益
    monthlyExtraProfit: number; // 月额外收益
    currentMonthlyProfit: number; // 当前月收益（无返佣）
    rebateMonthlyProfit: number; // 开启返佣后月收益
    currentYearlyProfit: number; // 当前年收益（无返佣）
    rebateYearlyProfit: number; // 开启返佣后年收益
    extraProfitRate: number; // 额外收益百分比
}

// 组件 props 类型
export interface ReferralCommissionDialogProps {
    opened: boolean;
    onClose: () => void;
    gridParams?: GridStrategyParams;
}

export function ReferralCommissionDialog({
  opened,
  onClose,
  gridParams
}: ReferralCommissionDialogProps) {
  // 根据网格参数计算返佣数据
  const calculatedData = useMemo<CommissionCalculationData | null>(() => {
    if (!gridParams) return null;

    const { position_side, grid_price_difference, grid_trade_quantity, grid_long_open_quantity, grid_short_open_quantity, expected_daily_frequency, expected_daily_profit, trade_value } = gridParams;

    // 如果提供了预计算的数据，直接使用（优先）
    if (expected_daily_frequency && expected_daily_profit && trade_value) {
      const commissionRate = 0.001;
      const rebateRate = 0.35;
      const daysInMonth = 30;
      const daysInYear = 365;

      const monthlyTradingFee = expected_daily_frequency * daysInMonth * trade_value * commissionRate;
      const monthlyRebate = monthlyTradingFee * rebateRate;
      const monthlyUserProfit = expected_daily_profit * daysInMonth;
      const monthlyUserProfitWithRebate = monthlyUserProfit + monthlyRebate;

      const dailyRebate = monthlyTradingFee / daysInMonth * rebateRate;

      return {
        tradeValue: parseFloat(NumberFormat.truncateDecimal(trade_value)),
        dailyFrequency: expected_daily_frequency,
        commissionRate: '1‰',
        rebateRate: '最高 35%',
        dailyRebateProfit: parseFloat(NumberFormat.truncateDecimal(dailyRebate)),
        monthlyExtraProfit: parseFloat(NumberFormat.truncateDecimal(monthlyRebate)),
        currentMonthlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfit)),
        rebateMonthlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfitWithRebate)),
        currentYearlyProfit: parseFloat(NumberFormat.truncateDecimal(expected_daily_profit * daysInYear)),
        rebateYearlyProfit: parseFloat(NumberFormat.truncateDecimal((expected_daily_profit + dailyRebate) * daysInYear)),
        extraProfitRate: parseFloat(((monthlyRebate / monthlyUserProfit) * 100).toFixed(0))
      };
    }

    // 否则，使用估算逻辑
    // 获取网格交易数量（优先使用分离数量，否则使用通用数量）
    let tradeQuantity = grid_trade_quantity || 0;

    // 如果是做多，优先使用做多开仓数量
    if (position_side === 'LONG' && grid_long_open_quantity) {
      tradeQuantity = grid_long_open_quantity;
    }
    // 如果是做空，优先使用做空开仓数量
    else if (position_side === 'SHORT' && grid_short_open_quantity) {
      tradeQuantity = grid_short_open_quantity;
    }

    // 如果没有有效的交易数量或网格差价，返回 null
    if (tradeQuantity <= 0 || grid_price_difference <= 0) {
      return null;
    }

    // 估算每笔交易金额 = 交易数量 × 网格差价
    const estimatedTradeValue = tradeQuantity * grid_price_difference;

    // 估算日交易频次：根据网格差价和市场波动估算
    // 网格差价越小，触发频次越高
    const estimatedDailyFrequency = Math.max(3, Math.min(20, Math.floor(100 / grid_price_difference)));

    // 估算日收益：每次网格交易的利润 × 日频次
    // 每次网格利润 ≈ 网格差价 × 交易数量 × 0.5（考虑双向交易）
    const estimatedDailyProfit = grid_price_difference * tradeQuantity * estimatedDailyFrequency * 0.5;

    // 计算返佣相关数据
    const commissionRate = 0.001; // 1‰
    const rebateRate = 0.35; // 35%
    const daysInMonth = 30;

    // 月交易手续费 = 日频次 × 30天 × 每笔金额 × 1‰
    const monthlyTradingFee = estimatedDailyFrequency * daysInMonth * estimatedTradeValue * commissionRate;

    // 月返佣金额 = 月手续费 × 35%
    const monthlyRebate = monthlyTradingFee * rebateRate;

    // 用户月收益（不含返佣）
    const monthlyUserProfit = estimatedDailyProfit * daysInMonth;

    // 用户月收益（含返佣）
    const monthlyUserProfitWithRebate = monthlyUserProfit + monthlyRebate;

    return {
      tradeValue: parseFloat(NumberFormat.truncateDecimal(estimatedTradeValue)),
      dailyFrequency: estimatedDailyFrequency,
      commissionRate: '1‰',
      rebateRate: '最高 35%',
      dailyRebateProfit: parseFloat(NumberFormat.truncateDecimal(monthlyRebate / 30)),
      monthlyExtraProfit: parseFloat(NumberFormat.truncateDecimal(monthlyRebate)),
      currentMonthlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfit)),
      rebateMonthlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfitWithRebate)),
      currentYearlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfit * 12)),
      rebateYearlyProfit: parseFloat(NumberFormat.truncateDecimal(monthlyUserProfitWithRebate * 12)),
      extraProfitRate: parseFloat(((monthlyRebate / monthlyUserProfit) * 100).toFixed(0))
    };
  }, [gridParams]);
    // ESC 键关闭弹窗
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [opened, onClose]);

  // 跳转到返佣注册页面
  async function handleEnableRebate() {
    const url = 'https://senmo.hk';

    // 检查是否在 Wails 桌面客户端环境中
    const isWailsAvailable = typeof window !== 'undefined' &&
                                (window as any).go &&
                                (window as any).go.main &&
                                (window as any).go.main.App;

    if (isWailsAvailable) {
      // 桌面客户端：使用系统浏览器打开
      try {
        await OpenBrowser(url);
      } catch (error) {
        console.error('打开系统浏览器失败:', error);
      }
    } else {
      // 浏览器环境：使用 window.open 打开新标签页
      try {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('打开链接失败:', error);
        // 备用方案：使用当前页面跳转
      }
    }
  }

  // 下次不再提示
  function handleToggleDontShow(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    console.log('下次不再提示:', checked);
    // TODO: 将设置保存到 localStorage
  }

  if (!opened) return null;

  // 使用计算后的数据，如果没有则使用默认值
  const data = calculatedData || {
    tradeValue: 50,
    dailyFrequency: 5,
    commissionRate: '1‰',
    rebateRate: '最高 35%',
    dailyRebateProfit: 5,
    monthlyExtraProfit: 150,
    currentMonthlyProfit: 465,
    rebateMonthlyProfit: 615,
    currentYearlyProfit: 5580,
    rebateYearlyProfit: 7380,
    extraProfitRate: 32
  };

  return (
    <div className="referral-commission-dialog-overlay">
      <div className="referral-commission-dialog">
        <div className="referral-commission-dialog-header">
          <h2 className="referral-commission-dialog-title">额外收益提醒</h2>
          <div className="referral-commission-dialog-value-proposition">零成本，纯额外收益</div>
          <p className="referral-commission-dialog-subtitle">
                        开启返佣后，同样的交易每月可多赚收益，无需任何额外投入
          </p>
          <button
            className="referral-commission-dialog-close-button"
            onClick={onClose}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.5 3.5L3.5 12.5M3.5 3.5L12.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="referral-commission-dialog-content">
          {/* 月度收益对比 */}
          <div className="referral-commission-dialog-comparison-section">
            <div className="referral-commission-dialog-comparison-cards">
              <div className="referral-commission-dialog-comparison-card">
                <div className="referral-commission-dialog-card-label referral-commission-dialog-card-label-normal">
                                    当前状态（无返佣）
                </div>
                <div className="referral-commission-dialog-card-amount referral-commission-dialog-card-amount-normal">
                  {NumberFormat.truncateDecimal(data.currentMonthlyProfit)}
                </div>
                <div className="referral-commission-dialog-card-period">USDT / 月</div>
              </div>

              <div className="referral-commission-dialog-vs-separator">VS</div>

              <div className="referral-commission-dialog-comparison-card referral-commission-dialog-comparison-card-highlight">
                <div className="referral-commission-dialog-extra-earnings-tag">
                                    额外 +{data.extraProfitRate}%
                </div>
                <div className="referral-commission-dialog-card-label referral-commission-dialog-card-label-highlight">
                                    开启返佣后
                </div>
                <div className="referral-commission-dialog-card-amount referral-commission-dialog-card-amount-highlight">
                  {NumberFormat.truncateDecimal(data.rebateMonthlyProfit)}
                </div>
                <div className="referral-commission-dialog-card-period">USDT / 月</div>
              </div>
            </div>
          </div>

          {/* 计算明细 */}
          <div className="referral-commission-dialog-details-section">
            <div className="referral-commission-dialog-details-title">收益对比明细</div>

            {/* 对比表格 */}
            <div className="referral-commission-dialog-comparison-table">
              <table>
                <thead>
                  <tr>
                    <th className="referral-commission-dialog-table-label">时间周期</th>
                    <th className="referral-commission-dialog-table-normal">网格收益</th>
                    <th className="referral-commission-dialog-table-highlight">返佣收益</th>
                    <th className="referral-commission-dialog-table-diff">差额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>每日</strong></td>
                    <td>{NumberFormat.truncateDecimal(data.currentMonthlyProfit / 30)} USDT</td>
                    <td className="referral-commission-dialog-table-highlight-text">
                      <strong>{NumberFormat.truncateDecimal(data.dailyRebateProfit)} USDT</strong>
                    </td>
                    <td className="referral-commission-dialog-table-diff-text">
                                            +{NumberFormat.truncateDecimal(data.dailyRebateProfit)} USDT
                    </td>
                  </tr>
                  <tr>
                    <td><strong>每月</strong></td>
                    <td>{NumberFormat.truncateDecimal(data.currentMonthlyProfit)} USDT</td>
                    <td className="referral-commission-dialog-table-highlight-text">
                      <strong>{NumberFormat.truncateDecimal(data.monthlyExtraProfit)} USDT</strong>
                    </td>
                    <td className="referral-commission-dialog-table-diff-text">
                                            +{NumberFormat.truncateDecimal(data.monthlyExtraProfit)} USDT
                    </td>
                  </tr>
                  <tr className="referral-commission-dialog-table-total">
                    <td><strong>每年</strong></td>
                    <td><strong>{NumberFormat.truncateDecimal(data.currentYearlyProfit)} USDT</strong></td>
                    <td className="referral-commission-dialog-table-highlight-text">
                      <strong>{NumberFormat.truncateDecimal(data.rebateYearlyProfit - data.currentYearlyProfit)} USDT</strong>
                    </td>
                    <td className="referral-commission-dialog-table-diff-text">
                      <strong>+{NumberFormat.truncateDecimal(data.rebateYearlyProfit - data.currentYearlyProfit)} USDT</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 参数说明 */}
            <div className="referral-commission-dialog-params-info">
              <div className="referral-commission-dialog-param-item">
                <span className="referral-commission-dialog-param-label">每笔交易金额：</span>
                <span className="referral-commission-dialog-param-value">{NumberFormat.truncateDecimal(data.tradeValue)} USDT</span>
              </div>
              <div className="referral-commission-dialog-param-item">
                <span className="referral-commission-dialog-param-label">日交易次数：</span>
                <span className="referral-commission-dialog-param-value">{NumberFormat.truncateDecimal(data.dailyFrequency)} 次</span>
              </div>
              <div className="referral-commission-dialog-param-item">
                <span className="referral-commission-dialog-param-label">手续费率：</span>
                <span className="referral-commission-dialog-param-value">{data.commissionRate}</span>
              </div>
              <div className="referral-commission-dialog-param-item">
                <span className="referral-commission-dialog-param-label">返佣比例：</span>
                <span className="referral-commission-dialog-param-value referral-commission-dialog-table-highlight-text">
                  {data.rebateRate}
                </span>
              </div>
            </div>
          </div>

          <div className="referral-commission-dialog-info-text">
            <div>* 收益计算说明：月收益按 30 天计算，年收益按 365 天计算。</div>
            <div>返佣收益 = 交易手续费 × 35% 返佣比例</div>
          </div>

          <div className="referral-commission-dialog-actions-section">
            <div className="referral-commission-dialog-button-group">
              <button
                className="referral-commission-dialog-btn referral-commission-dialog-btn-secondary"
                onClick={onClose}
                type="button"
              >
                                知道了
              </button>
              <button
                className="referral-commission-dialog-btn referral-commission-dialog-btn-primary"
                onClick={handleEnableRebate}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                                去启用返佣
              </button>
            </div>

            <div className="referral-commission-dialog-checkbox-wrapper">
              <input
                type="checkbox"
                id="referral-commission-dont-show-again"
                onChange={handleToggleDontShow}
              />
              <label htmlFor="referral-commission-dont-show-again">下次不再提示</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
