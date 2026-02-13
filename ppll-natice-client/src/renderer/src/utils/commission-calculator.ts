/**
 * 返佣计算工具函数
 * 用于计算网格策略的返佣收益
 */

/**
 * 返佣计算参数
 */
export interface CommissionCalculationParams {
  expected_daily_frequency: number // 预期日频次
  expected_daily_profit: number // 预期日收益（USDT）
  trade_value: number // 每笔交易金额（USDT）
  commission_rate?: number // 手续费率（默认 0.001 = 1‰）
  rebate_rate?: number // 返佣比例（默认 0.35 = 35%）
  days_in_month?: number // 月天数（默认 30）
}

/**
 * 返佣计算结果
 */
export interface CommissionCalculationResult {
  monthly_trading_fee: number // 月交易手续费
  monthly_rebate: number // 月返佣金额
  monthly_user_profit: number // 用户月收益（不含返佣）
  monthly_user_profit_with_rebate: number // 用户月收益（含返佣）
  exchange_profit: number // 交易所收益
  exchange_profit_with_rebate: number // 交易所收益（返佣后）
  rebate_percentage: number // 返佣比例（用于显示）
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
    expected_daily_frequency,
    expected_daily_profit,
    trade_value,
    commission_rate = 0.001, // 默认 1‰（开仓0.5‰ + 平仓0.5‰）
    rebate_rate = 0.35, // 默认 35%
    days_in_month = 30 // 默认 30天
  } = params

  // 月交易手续费 = 日频次 × 30天 × 每笔金额 × 1‰
  const monthlyTradingFee = expected_daily_frequency * days_in_month * trade_value * commission_rate

  // 月返佣金额 = 月手续费 × 35%
  const monthlyRebate = monthlyTradingFee * rebate_rate

  // 用户月收益（不含返佣）
  const monthlyUserProfit = expected_daily_profit * days_in_month

  // 用户月收益（含返佣）
  const monthlyUserProfitWithRebate = monthlyUserProfit + monthlyRebate

  // 交易所收益
  const exchangeProfit = monthlyTradingFee

  // 交易所收益（返佣后）
  const exchangeProfitWithRebate = monthlyTradingFee - monthlyRebate

  return {
    monthly_trading_fee: parseFloat(monthlyTradingFee.toFixed(2)),
    monthly_rebate: parseFloat(monthlyRebate.toFixed(2)),
    monthly_user_profit: parseFloat(monthlyUserProfit.toFixed(2)),
    monthly_user_profit_with_rebate: parseFloat(monthlyUserProfitWithRebate.toFixed(2)),
    exchange_profit: parseFloat(exchangeProfit.toFixed(2)),
    exchange_profit_with_rebate: parseFloat(exchangeProfitWithRebate.toFixed(2)),
    rebate_percentage: rebate_rate * 100
  }
}

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的字符串
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/**
 * 计算收益率
 * @param profit 收益
 * @param capital 本金
 * @returns 收益率百分比
 */
export function calculateROI(profit: number, capital: number): number {
  if (capital === 0) return 0
  return parseFloat(((profit / capital) * 100).toFixed(2))
}
