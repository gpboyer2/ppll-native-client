import { createPersistedStore } from '../lib/createPersistedStore'

// 策略配置的类型定义
interface StrategyConfig {
  // 基础配置
  strategy_name: string
  enabled: boolean

  // 交易参数
  leverage: number
  symbol: 'ETH' | 'BTC' | 'BNB'
  position_size: number

  // 风险控制
  stop_loss: number
  take_profit: number
  max_drawdown: number

  // 技术指标参数
  ma_short: number
  ma_long: number
  rsi_period: number
  rsi_overbought: number
  rsi_oversold: number
}

// 创建策略配置 Store - 另一个 Pinia-like 示例
export const useStrategyStore = createPersistedStore(
  'strategy-config', // 持久化存储的键名
  (set, get) => ({
    // ===== State =====
    strategy_name: '默认策略',
    enabled: false,

    leverage: 2,
    symbol: 'ETH' as const,
    position_size: 100,

    stop_loss: 2.0,
    take_profit: 4.0,
    max_drawdown: 10.0,

    ma_short: 5,
    ma_long: 20,
    rsi_period: 14,
    rsi_overbought: 70,
    rsi_oversold: 30,

    // ===== Actions =====

    // 基础配置 Actions
    set_strategy_name: (name: string) => {
      set((state: StrategyConfig) => ({ ...state, strategy_name: name }))
    },

    toggle_strategy: () => {
      set((state: StrategyConfig) => ({ ...state, enabled: !state.enabled }))
    },

    // 交易参数 Actions
    set_leverage: (leverage: number) => {
      const clamped_leverage = Math.max(1, Math.min(125, leverage))
      set((state: StrategyConfig) => ({ ...state, leverage: clamped_leverage }))
    },

    set_symbol: (symbol: 'ETH' | 'BTC' | 'BNB') => {
      set((state: StrategyConfig) => ({ ...state, symbol }))
    },

    set_position_size: (size: number) => {
      const clamped_size = Math.max(1, size)
      set((state: StrategyConfig) => ({ ...state, position_size: clamped_size }))
    },

    // 风险控制 Actions
    set_stop_loss: (stop_loss: number) => {
      const clamped_stop_loss = Math.max(0.1, Math.min(50, stop_loss))
      set((state: StrategyConfig) => ({ ...state, stop_loss: clamped_stop_loss }))
    },

    set_take_profit: (take_profit: number) => {
      const clamped_take_profit = Math.max(0.1, Math.min(100, take_profit))
      set((state: StrategyConfig) => ({ ...state, take_profit: clamped_take_profit }))
    },

    set_max_drawdown: (max_drawdown: number) => {
      const clamped_drawdown = Math.max(1, Math.min(50, max_drawdown))
      set((state: StrategyConfig) => ({ ...state, max_drawdown: clamped_drawdown }))
    },

    // 技术指标 Actions
    set_ma_short: (period: number) => {
      const clamped_period = Math.max(1, Math.min(100, period))
      set((state: StrategyConfig) => ({ ...state, ma_short: clamped_period }))
    },

    set_ma_long: (period: number) => {
      const clamped_period = Math.max(1, Math.min(200, period))
      set((state: StrategyConfig) => ({ ...state, ma_long: clamped_period }))
    },

    set_rsi_period: (period: number) => {
      const clamped_period = Math.max(2, Math.min(50, period))
      set((state: StrategyConfig) => ({ ...state, rsi_period: clamped_period }))
    },

    set_rsi_levels: (overbought: number, oversold: number) => {
      const clamped_overbought = Math.max(50, Math.min(100, overbought))
      const clamped_oversold = Math.max(0, Math.min(50, oversold))
      set((state: StrategyConfig) => ({
        ...state,
        rsi_overbought: clamped_overbought,
        rsi_oversold: clamped_oversold
      }))
    },

    // 批量更新配置
    update_config: (config: Partial<StrategyConfig>) => {
      set((state: StrategyConfig) => ({ ...state, ...config }))
    },

    // 重置为默认配置
    reset_to_defaults: () => {
      set(() => ({
        strategy_name: '默认策略',
        enabled: false,
        leverage: 2,
        symbol: 'ETH' as const,
        position_size: 100,
        stop_loss: 2.0,
        take_profit: 4.0,
        max_drawdown: 10.0,
        ma_short: 5,
        ma_long: 20,
        rsi_period: 14,
        rsi_overbought: 70,
        rsi_oversold: 30
      }))
    },

    // 获取策略风险评估
    get_risk_assessment: (): {
      level: 'low' | 'medium' | 'high'
      score: number
      factors: string[]
    } => {
      const state = get() as StrategyConfig
      let score = 0
      const factors: string[] = []

      // 杠杆风险
      if (state.leverage > 10) {
        score += 30
        factors.push('高杠杆')
      } else if (state.leverage > 5) {
        score += 15
        factors.push('中等杠杆')
      }

      // 止损风险
      if (state.stop_loss > 5) {
        score += 20
        factors.push('止损较宽')
      }

      // 最大回撤风险
      if (state.max_drawdown > 20) {
        score += 25
        factors.push('允许高回撤')
      } else if (state.max_drawdown > 10) {
        score += 10
        factors.push('中等回撤')
      }

      // 仓位大小风险
      if (state.position_size > 1000) {
        score += 15
        factors.push('大仓位')
      }

      let level: 'low' | 'medium' | 'high'
      if (score < 20) {
        level = 'low'
      } else if (score < 50) {
        level = 'medium'
      } else {
        level = 'high'
      }

      return { level, score, factors }
    },

    // 获取策略配置摘要
    get_config_summary: (): string => {
      const state = get() as StrategyConfig
      const risk = (get() as any).get_risk_assessment()

      return `${state.strategy_name} | ${state.symbol} x${state.leverage} | ${state.enabled ? '已启用' : '已禁用'} | 风险: ${risk.level}`
    }
  }),
  {
    backend: 'go' // 使用 Go 后端存储
  }
)

// 导出类型供其他地方使用
export type { StrategyConfig }
