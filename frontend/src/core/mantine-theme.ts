import { MantineTheme, createTheme } from '@mantine/core';

/**
 * Mantine 主题配置 - 适配 PPLL 币安风格
 * 
 * 设计原则：
 * 1. 与现有 CSS 变量保持一致
 * 2. 深色主题为主
 * 3. 币安黄色作为主色调
 * 4. 禁用全局样式注入
 */
export const mantineTheme = createTheme({
  // 主色调配置 - 币安黄色系
  primaryColor: 'yellow',
  
  // 自定义颜色调色板
  colors: {
    // 币安黄色调色板
    yellow: [
      '#fef9e7', // 50
      '#fef3c7', // 100
      '#fde68a', // 200
      '#fcd34d', // 300
      '#fbbf24', // 400
      '#f0b90b', // 500 - 主色
      '#d9a00a', // 600
      '#b45309', // 700
      '#92400e', // 800
      '#78350f', // 900
    ],
    // 深色背景色系
    dark: [
      '#eaecef', // 0 - 浅色文字
      '#848e9c', // 1 - 次要文字
      '#2b3139', // 2 - 边框色
      '#1e2329', // 3 - 深灰背景
      '#181a20', // 4 - 卡片表面色
      '#0b0e11', // 5 - 主背景色
      '#0a0d10', // 6
      '#090c0f', // 7
      '#080b0e', // 8
      '#07090c', // 9
    ],
    // 功能色系
    red: [
      '#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171',
      '#f6465d', // 币安红色
      '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'
    ],
    green: [
      '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80',
      '#0ecb81', // 币安绿色
      '#16a34a', '#15803d', '#166534', '#14532d'
    ]
  },

  // 字体配置
  fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

  // 字体大小
  fontSizes: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  },

  // 行高
  lineHeights: {
    xs: '1.25',
    sm: '1.35',
    md: '1.5',
    lg: '1.6',
    xl: '1.65',
  },

  // 圆角配置
  radius: {
    xs: '2px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
  },

  // 间距配置
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },

  // 阴影配置 - 适配深色主题
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,0.4)',
    sm: '0 1px 3px rgba(0,0,0,0.5)',
    md: '0 6px 16px rgba(0,0,0,0.6)',
    lg: '0 16px 40px rgba(0,0,0,0.8)',
    xl: '0 25px 50px rgba(0,0,0,0.9)',
  },

  
  // 其他配置
  other: {
    // 自定义 CSS 变量映射
    cssVariables: {
      '--color-primary': '#f0b90b',
      '--color-bg': '#0b0e11',
      '--color-surface': '#181a20',
      '--color-text': '#eaecef',
      '--color-text-muted': '#848e9c',
      '--color-border': '#2b3139',
      '--color-danger': '#f6465d',
      '--color-success': '#0ecb81',
    }
  },

  // 组件默认属性配置
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 600,
          fontSize: '13px',
          height: '36px',
          transition: 'all 0.15s ease',
        }
      }
    },
    
    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: '#181a20',
          borderColor: '#2b3139',
          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }
      }
    },

    Input: {
      defaultProps: {
        size: 'sm',
        radius: 'sm',
      },
      styles: {
        input: {
          backgroundColor: '#181a20',
          borderColor: '#2b3139',
          color: '#eaecef',
          '&:focus': {
            borderColor: '#f0b90b',
            boxShadow: '0 0 0 3px rgba(240, 185, 11, 0.2)',
          }
        }
      }
    },

    Modal: {
      defaultProps: {
        radius: 'md',
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 4,
        }
      },
      styles: {
        content: {
          backgroundColor: '#181a20',
          borderColor: '#2b3139',
        },
        header: {
          backgroundColor: '#181a20',
          borderBottomColor: '#2b3139',
        }
      }
    },

    Notification: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          backgroundColor: '#181a20',
          borderColor: '#2b3139',
        }
      }
    }
  }
});

/**
 * 获取适配当前项目的 Mantine 主题
 */
export function getPPLLMantineTheme(): MantineTheme {
  return mantineTheme as MantineTheme;
}
