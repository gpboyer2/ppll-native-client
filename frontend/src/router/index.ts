// 路由配置和常量定义

// 路由路径常量
export const ROUTES = {
  HOME: '/',
  SETTINGS: '/settings',
  PLUGINS: '/plugins',
  PLUGIN_DETAIL: '/plugins/:id',
  GRID_STRATEGY: '/grid-strategy',
  GRID_STRATEGY_EDIT: '/grid-strategy/edit/:id?'
} as const;

// 页面组件路径映射
export const pageComponents = {
  HomePage: '../pages/HomePage',
  SettingsPage: '../pages/SettingsPage',
  PluginsPage: '../pages/PluginsPage',
  GridStrategyListPage: '../pages/GridStrategy',
  GridStrategyEditPage: '../pages/GridStrategy/edit'
} as const;

// 导航配置
export const navItems = [
  {
    path: '/',
    label: '首页',
    icon: '🏠',
    description: '系统概览与快速操作'
  },
  {
    path: '/settings',
    label: '设置',
    icon: '⚙️',
    description: '系统配置与更新管理'
  },
  // 功能内容还没有想好, 暂时隐藏
  // {
  //   path: '/plugins',
  //   label: '插件',
  //   icon: '🔧',
  //   description: '插件管理与配置'
  // }
];

// 插件信息配置
export const pluginInfo: Record<string, { name: string; description: string; icon: string; category: string }> = {
  'u-contract-market': {
    name: 'U本位合约超市',
    description: '浏览与管理策略模板，支持搜索和收藏功能',
    icon: '📊',
    category: '策略管理'
  },
  'u-grid-t': {
    name: '做T网格',
    description: '经典网格交易策略，适合震荡行情',
    icon: '🔄',
    category: '交易策略'
  },
  'u-grid-tdz': {
    name: '天地针网格',
    description: '高频网格策略，捕捉短期价格波动',
    icon: '⚡',
    category: '交易策略'
  }
};

// Feed URL 示例配置
export const feedURLExamples = [
  {
    name: 'GitHub Releases',
    url: 'https://api.github.com/repos/ppll-team/ppll-client/releases',
    description: 'GitHub 官方发布源'
  },
  {
    name: 'PPLL 官方源',
    url: 'https://update.ppll.com/api/v1/releases/stable',
    description: 'PPLL 官方更新源'
  },
  {
    name: 'CDN 镜像源',
    url: 'https://cdn.ppll.com/releases/feed.json',
    description: 'CDN 加速镜像'
  },
  {
    name: '测试源',
    url: 'https://releases.example.com/ppll/feed.xml',
    description: '开发测试环境'
  }
];