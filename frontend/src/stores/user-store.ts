import { createPersistedStore } from '../lib/createPersistedStore';

// 用户设置的类型定义
interface UserSettings {
  // 基础设置
  username: string;
  email: string;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  
  // 交易设置
  defaultLeverage: number;
  defaultSymbol: 'BTC' | 'ETH' | 'BNB';
  riskLevel: 'low' | 'medium' | 'high';
  
  // 通知设置
  enableNotifications: boolean;
  soundEnabled: boolean;
  
  // 界面设置
  compactMode: boolean;
  showAdvancedFeatures: boolean;
}

// 创建用户设置 Store - 使用 Pinia-like API
export const useUserStore = createPersistedStore(
  'user-settings', // 持久化存储的键名，将保存到 ~/.config/ppll-client/config.enc.json
  (set, get) => ({
    // ===== State =====
    username: '',
    email: '',
    theme: 'dark' as const,
    language: 'zh-CN' as const,
    
    defaultLeverage: 2,
    defaultSymbol: 'BTC' as const,
    riskLevel: 'medium' as const,
    
    enableNotifications: true,
    soundEnabled: true,
    
    compactMode: false,
    showAdvancedFeatures: false,
    
    // ===== Actions =====
    
    // 基础设置 Actions
    setUsername: (username: string) => {
      set((state: UserSettings) => ({ ...state, username }));
    },
    
    setEmail: (email: string) => {
      set((state: UserSettings) => ({ ...state, email }));
    },
    
    setTheme: (theme: 'light' | 'dark') => {
      set((state: UserSettings) => ({ ...state, theme }));
    },
    
    setLanguage: (language: 'zh-CN' | 'en-US') => {
      set((state: UserSettings) => ({ ...state, language }));
    },
    
    // 交易设置 Actions
    setDefaultLeverage: (leverage: number) => {
      // 限制杠杆倍数范围
      const clampedLeverage = Math.max(1, Math.min(125, leverage));
      set((state: UserSettings) => ({ 
        ...state, 
        defaultLeverage: clampedLeverage 
      }));
    },
    
    setDefaultSymbol: (symbol: 'BTC' | 'ETH' | 'BNB') => {
      set((state: UserSettings) => ({ ...state, defaultSymbol: symbol }));
    },
    
    setRiskLevel: (riskLevel: 'low' | 'medium' | 'high') => {
      set((state: UserSettings) => ({ ...state, riskLevel }));
    },
    
    // 通知设置 Actions
    toggleNotifications: () => {
      set((state: UserSettings) => ({ 
        ...state, 
        enableNotifications: !state.enableNotifications 
      }));
    },
    
    toggleSound: () => {
      set((state: UserSettings) => ({ 
        ...state, 
        soundEnabled: !state.soundEnabled 
      }));
    },
    
    // 界面设置 Actions
    toggleCompactMode: () => {
      set((state: UserSettings) => ({ 
        ...state, 
        compactMode: !state.compactMode 
      }));
    },
    
    toggleAdvancedFeatures: () => {
      set((state: UserSettings) => ({ 
        ...state, 
        showAdvancedFeatures: !state.showAdvancedFeatures 
      }));
    },
    
    // 批量更新 Action
    updateSettings: (settings: Partial<UserSettings>) => {
      set((state: UserSettings) => ({ ...state, ...settings }));
    },
    
    // 重置到默认设置
    resetToDefaults: () => {
      set(() => ({
        username: '',
        email: '',
        theme: 'dark' as const,
        language: 'zh-CN' as const,
        defaultLeverage: 2,
        defaultSymbol: 'BTC' as const,
        riskLevel: 'medium' as const,
        enableNotifications: true,
        soundEnabled: true,
        compactMode: false,
        showAdvancedFeatures: false,
      }));
    },
    
    // 获取用户配置摘要（计算属性风格）
    getSettingsSummary: (): {
      user: string;
      trading: string;
      ui: string;
      features: string;
    } => {
      const state = get() as UserSettings;
      return {
        user: `${state.username} (${state.email})`,
        trading: `${state.defaultSymbol} x${state.defaultLeverage} (${state.riskLevel} 风险)`,
        ui: `${state.theme} 主题, ${state.language} 语言`,
        features: `${state.compactMode ? '紧凑' : '标准'}模式, ${state.showAdvancedFeatures ? '显示' : '隐藏'}高级功能`,
      };
    },
  }),
  {
    backend: 'go', // 使用 Go 后端存储
  }
);

// 导出类型供其他地方使用
export type { UserSettings };
