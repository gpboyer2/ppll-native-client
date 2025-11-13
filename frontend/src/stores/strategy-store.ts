import { createPersistedStore } from '../lib/createPersistedStore';

// 策略配置的类型定义
interface StrategyConfig {
  // 基础配置
  strategyName: string;
  enabled: boolean;
  
  // 交易参数
  leverage: number;
  symbol: 'ETH' | 'BTC' | 'BNB';
  positionSize: number;
  
  // 风险控制
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
  
  // 技术指标参数
  maShort: number;
  maLong: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
}

// 创建策略配置 Store - 另一个 Pinia-like 示例
export const useStrategyStore = createPersistedStore(
  'strategy-config', // 持久化存储的键名
  (set, get) => ({
    // ===== State =====
    strategyName: '默认策略',
    enabled: false,
    
    leverage: 2,
    symbol: 'ETH' as const,
    positionSize: 100,
    
    stopLoss: 2.0,
    takeProfit: 4.0,
    maxDrawdown: 10.0,
    
    maShort: 5,
    maLong: 20,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    
    // ===== Actions =====
    
    // 基础配置 Actions
    setStrategyName: (name: string) => {
      set((state: StrategyConfig) => ({ ...state, strategyName: name }));
    },
    
    toggleStrategy: () => {
      set((state: StrategyConfig) => ({ ...state, enabled: !state.enabled }));
    },
    
    // 交易参数 Actions
    setLeverage: (leverage: number) => {
      const clampedLeverage = Math.max(1, Math.min(125, leverage));
      set((state: StrategyConfig) => ({ ...state, leverage: clampedLeverage }));
    },
    
    setSymbol: (symbol: 'ETH' | 'BTC' | 'BNB') => {
      set((state: StrategyConfig) => ({ ...state, symbol }));
    },
    
    setPositionSize: (size: number) => {
      const clampedSize = Math.max(1, size);
      set((state: StrategyConfig) => ({ ...state, positionSize: clampedSize }));
    },
    
    // 风险控制 Actions
    setStopLoss: (stopLoss: number) => {
      const clampedStopLoss = Math.max(0.1, Math.min(50, stopLoss));
      set((state: StrategyConfig) => ({ ...state, stopLoss: clampedStopLoss }));
    },
    
    setTakeProfit: (takeProfit: number) => {
      const clampedTakeProfit = Math.max(0.1, Math.min(100, takeProfit));
      set((state: StrategyConfig) => ({ ...state, takeProfit: clampedTakeProfit }));
    },
    
    setMaxDrawdown: (maxDrawdown: number) => {
      const clampedDrawdown = Math.max(1, Math.min(50, maxDrawdown));
      set((state: StrategyConfig) => ({ ...state, maxDrawdown: clampedDrawdown }));
    },
    
    // 技术指标 Actions
    setMAShort: (period: number) => {
      const clampedPeriod = Math.max(1, Math.min(100, period));
      set((state: StrategyConfig) => ({ ...state, maShort: clampedPeriod }));
    },
    
    setMALong: (period: number) => {
      const clampedPeriod = Math.max(1, Math.min(200, period));
      set((state: StrategyConfig) => ({ ...state, maLong: clampedPeriod }));
    },
    
    setRSIPeriod: (period: number) => {
      const clampedPeriod = Math.max(2, Math.min(50, period));
      set((state: StrategyConfig) => ({ ...state, rsiPeriod: clampedPeriod }));
    },
    
    setRSILevels: (overbought: number, oversold: number) => {
      const clampedOverbought = Math.max(50, Math.min(100, overbought));
      const clampedOversold = Math.max(0, Math.min(50, oversold));
      set((state: StrategyConfig) => ({ 
        ...state, 
        rsiOverbought: clampedOverbought,
        rsiOversold: clampedOversold
      }));
    },
    
    // 批量更新配置
    updateConfig: (config: Partial<StrategyConfig>) => {
      set((state: StrategyConfig) => ({ ...state, ...config }));
    },
    
    // 重置为默认配置
    resetToDefaults: () => {
      set(() => ({
        strategyName: '默认策略',
        enabled: false,
        leverage: 2,
        symbol: 'ETH' as const,
        positionSize: 100,
        stopLoss: 2.0,
        takeProfit: 4.0,
        maxDrawdown: 10.0,
        maShort: 5,
        maLong: 20,
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
      }));
    },
    
    // 获取策略风险评估
    getRiskAssessment: (): {
      level: 'low' | 'medium' | 'high';
      score: number;
      factors: string[];
    } => {
      const state = get() as StrategyConfig;
      let score = 0;
      const factors: string[] = [];
      
      // 杠杆风险
      if (state.leverage > 10) {
        score += 30;
        factors.push('高杠杆');
      } else if (state.leverage > 5) {
        score += 15;
        factors.push('中等杠杆');
      }
      
      // 止损风险
      if (state.stopLoss > 5) {
        score += 20;
        factors.push('止损较宽');
      }
      
      // 最大回撤风险
      if (state.maxDrawdown > 20) {
        score += 25;
        factors.push('允许高回撤');
      } else if (state.maxDrawdown > 10) {
        score += 10;
        factors.push('中等回撤');
      }
      
      // 仓位大小风险
      if (state.positionSize > 1000) {
        score += 15;
        factors.push('大仓位');
      }
      
      let level: 'low' | 'medium' | 'high';
      if (score < 20) {
        level = 'low';
      } else if (score < 50) {
        level = 'medium';
      } else {
        level = 'high';
      }
      
      return { level, score, factors };
    },
    
    // 获取策略配置摘要
    getConfigSummary: (): string => {
      const state = get() as StrategyConfig;
      const risk = (get() as any).getRiskAssessment();
      
      return `${state.strategyName} | ${state.symbol} x${state.leverage} | ${state.enabled ? '已启用' : '已禁用'} | 风险: ${risk.level}`;
    },
  }),
  {
    backend: 'go', // 使用 Go 后端存储
  }
);

// 导出类型供其他地方使用
export type { StrategyConfig };
