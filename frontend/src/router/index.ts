// 路由配置和常量定义

// 路由路径常量
export const ROUTES = {
  HOME: '/',
  SETTINGS: '/settings',
  SYSTEM_INFO: '/system-info',
  DATABASE_MANAGER: '/database-manager',
  PLUGINS: '/plugins',
  PLUGIN_DETAIL: '/plugins/:id',
  GRID_STRATEGY: '/grid-strategy',
  GRID_STRATEGY_CREATE: '/grid-strategy/create',
  GRID_STRATEGY_EDIT: '/grid-strategy/edit/:id'
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
  {
    path: '/system-info',
    label: '系统信息',
    icon: 'ℹ️',
    description: '查看系统配置和服务状态'
  },
  {
    path: '/database-manager',
    label: '数据库管理',
    icon: '🗄️',
    description: '管理数据库表结构和数据'
  },
];

// 插件信息配置（唯一数据源）
export interface PluginConfig {
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  defaultEnable: boolean;
  status?: 'coming-soon';
  referenceUrl?: string;
}

export const pluginConfig: Record<string, PluginConfig> = {
  'u-contract-market': {
    name: 'U本位合约超市',
    description: '浏览与管理策略模板，支持搜索和收藏功能',
    icon: '📊',
    category: '策略管理',
    version: '0.1.0',
    defaultEnable: true
  },
  'u-grid-t': {
    name: '做T网格',
    description: '经典网格交易策略，适合震荡行情',
    icon: '🔄',
    category: '交易策略',
    version: '0.1.0',
    defaultEnable: true
  },
  'u-grid-tdz': {
    name: '天地针网格',
    description: '高频网格策略，捕捉短期价格波动',
    icon: '⚡',
    category: '交易策略',
    version: '0.1.0',
    defaultEnable: false
  },
  'ai-quant-agent': {
    name: 'AI量化代理',
    description: '基于AI的智能量化交易代理，参考 nof1.ai 设计',
    icon: '🤖',
    category: 'AI策略',
    version: '0.0.1',
    defaultEnable: false,
    status: 'coming-soon',
    referenceUrl: 'https://nof1.ai/'
  },
  'u-funding-rate-arbitrage': {
    name: 'U本位资金费率套利',
    description: '利用永续合约资金费率进行套利，通过现货与合约对冲获取稳定收益',
    icon: '💰',
    category: '交易策略',
    version: '0.1.0',
    defaultEnable: false
  },
  'coin-funding-rate-arbitrage': {
    name: '币本位合约资金费率套利',
    description: '利用币本位永续合约资金费率进行套利，通过现货与合约对冲获取稳定收益',
    icon: '💎',
    category: '交易策略',
    version: '0.1.0',
    defaultEnable: false
  }
};

// 插件状态管理（纯前端，使用 localStorage）
const PLUGIN_ENABLE_KEY = 'ppll-plugin-enable';

function loadEnableMap(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PLUGIN_ENABLE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveEnableMap(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(PLUGIN_ENABLE_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储错误
  }
}

// 插件列表项类型
export interface PluginItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  enable: boolean;
  status?: 'coming-soon';
  referenceUrl?: string;
}

// 获取完整插件列表（合并配置和启用状态）
export function getPluginList(): PluginItem[] {
  const enableMap = loadEnableMap();
  return Object.entries(pluginConfig).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    icon: config.icon,
    category: config.category,
    version: config.version,
    enable: enableMap[id] ?? config.defaultEnable,
    status: config.status,
    referenceUrl: config.referenceUrl,
  }));
}

// 设置插件启用状态
export function setPluginEnable(id: string, enable: boolean): void {
  const map = loadEnableMap();
  map[id] = enable;
  saveEnableMap(map);
}

// 兼容旧代码的 pluginInfo 导出
export const pluginInfo = pluginConfig;

// Feed URL 示例配置
export const feedURLExamples = [
  {
    name: 'GitHub Releases',
    url: 'https://api.github.com/repos/ppll-team/ppll-client/releases',
    description: 'GitHub 官方发布源'
  },
  {
    name: 'PPLL 官方源',
    url: 'https://update.ppll.com/api/api/v1/releases/stable',
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