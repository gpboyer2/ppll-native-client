import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'app-theme';

/**
 * 从 localStorage 读取主题
 */
function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // 忽略错误
  }
  return 'dark'; // 默认深色主题
}

/**
 * 保存主题到 localStorage
 */
function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 忽略错误
  }
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * 主题状态管理 Store
 */
export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector((set, get) => {
    const initialTheme = getStoredTheme();
    applyTheme(initialTheme);

    return {
      theme: initialTheme,

      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
        saveTheme(theme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },
    };
  })
);
