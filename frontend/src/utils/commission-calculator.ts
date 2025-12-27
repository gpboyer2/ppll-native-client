/**
 * 返佣计算工具函数
 * 用于计算网格策略的返佣收益
 */

/**
 * 返佣计算参数
 */
export interface CommissionCalculationParams {
  expectedDailyFrequency: number;  // 预期日频次
  expectedDailyProfit: number;     // 预期日收益（USDT）
  tradeValue: number;              // 每笔交易金额（USDT）
  commissionRate?: number;         // 手续费率（默认 0.001 = 1‰）
  rebateRate?: number;             // 返佣比例（默认 0.35 = 35%）
  daysInMonth?: number;            // 月天数（默认 30）
}

/**
 * 返佣计算结果
 */
export interface CommissionCalculationResult {
  monthlyTradingFee: number;           // 月交易手续费
  monthlyRebate: number;               // 月返佣金额
  monthlyUserProfit: number;           // 用户月收益（不含返佣）
  monthlyUserProfitWithRebate: number; // 用户月收益（含返佣）
  exchangeProfit: number;              // 交易所收益
  exchangeProfitWithRebate: number;    // 交易所收益（返佣后）
  rebatePercentage: number;            // 返佣比例（用于显示）
}

/**
 * 计算返佣收益
 *
 * 计算公式：
 * - 月交易手续费 = 日频次 × 30天 × 每笔金额 × 1‰
 * - 月返佣金额 = 月手续费 × 35%
 * - 用户总收益（含返佣）= 原收益 + 返佣
 * - 交易所收益（返佣后）= 手续费 - 返佣
 *
 * @param params 计算参数
 * @returns 计算结果
 */
export function calculateCommission(
  params: CommissionCalculationParams
): CommissionCalculationResult {
  const {
    expectedDailyFrequency,
    expectedDailyProfit,
    tradeValue,
    commissionRate = 0.001,      // 默认 1‰（开仓0.5‰ + 平仓0.5‰）
    rebateRate = 0.35,           // 默认 35%
    daysInMonth = 30             // 默认 30天
  } = params;

  // 月交易手续费 = 日频次 × 30天 × 每笔金额 × 1‰
  const monthlyTradingFee = expectedDailyFrequency * daysInMonth * tradeValue * commissionRate;

  // 月返佣金额 = 月手续费 × 35%
  const monthlyRebate = monthlyTradingFee * rebateRate;

  // 用户月收益（不含返佣）
  const monthlyUserProfit = expectedDailyProfit * daysInMonth;

  // 用户月收益（含返佣）
  const monthlyUserProfitWithRebate = monthlyUserProfit + monthlyRebate;

  // 交易所收益
  const exchangeProfit = monthlyTradingFee;

  // 交易所收益（返佣后）
  const exchangeProfitWithRebate = monthlyTradingFee - monthlyRebate;

  return {
    monthlyTradingFee: parseFloat(monthlyTradingFee.toFixed(2)),
    monthlyRebate: parseFloat(monthlyRebate.toFixed(2)),
    monthlyUserProfit: parseFloat(monthlyUserProfit.toFixed(2)),
    monthlyUserProfitWithRebate: parseFloat(monthlyUserProfitWithRebate.toFixed(2)),
    exchangeProfit: parseFloat(exchangeProfit.toFixed(2)),
    exchangeProfitWithRebate: parseFloat(exchangeProfitWithRebate.toFixed(2)),
    rebatePercentage: rebateRate * 100
  };
}

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的字符串
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * 计算收益率
 * @param profit 收益
 * @param capital 本金
 * @returns 收益率百分比
 */
export function calculateROI(profit: number, capital: number): number {
  if (capital === 0) return 0;
  return parseFloat(((profit / capital) * 100).toFixed(2));
}
