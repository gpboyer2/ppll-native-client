/**
 * 前后端同服务器部署安全配置
 * 解决黑客通过前端页面发起自动化API攻击的问题
 */

// 🚨 重要安全配置
const FRONTEND_BACKEND_SECURITY = {
  // 是否启用localhost绕过（前后端同服务器时必须false）
  ENABLE_LOCALHOST_BYPASS: process.env.ENABLE_LOCALHOST_BYPASS === 'true' || false,

  // 管理令牌头部名称
  MANAGEMENT_TOKEN_HEADER: process.env.MANAGEMENT_TOKEN_HEADER || 'x-management-token',

  // 管理令牌（用于真正的内部服务调用）
  MANAGEMENT_TOKEN: process.env.MANAGEMENT_TOKEN || generateSecureToken(),

  // 是否启用前端代理攻击检测
  ENABLE_FRONTEND_PROXY_DETECTION: process.env.ENABLE_FRONTEND_PROXY_DETECTION !== 'false',

  // 前端服务路径模式（用于识别前端代理请求）
  FRONTEND_PATH_PATTERNS: [
    '/static/',
    '/assets/',
    '/js/',
    '/css/',
    '/images/',
    '/favicon.ico',
    '/index.html',
    '/_next/',     // Next.js
    '/build/',     // React build
    '/dist/',      // Vue/Webpack dist
  ],

  // API路径模式（需要严格限流的接口）
  API_PATH_PATTERNS: [
    '/api/',
    '/v1/',
    '/v2/',
    '/graphql',
    '/webhook',
  ]
};

// 内网管理IP段（严格限制，仅允许真正的管理IP）
const INTERNAL_MANAGEMENT_IPS = {
  // 仅允许非常具体的管理IP段
  ALLOWED_RANGES: [
    /^10\.0\.0\.[1-9]$/,          // 10.0.0.1-10.0.0.9 (专用管理IP)
    /^192\.168\.1\.[1-9]$/,      // 192.168.1.1-192.168.1.9 (专用管理IP)
    /^172\.16\.0\.[1-9]$/,       // 172.16.0.1-172.16.0.9 (专用管理IP)
  ],

  // 开发环境本地IP（仅在开发模式下启用）
  DEVELOPMENT_IPS: [
    '127.0.0.1',
    '::1',
    'localhost'
  ]
};

// 需要管理令牌的内部接口
const INTERNAL_MANAGEMENT_PATHS = [
  '/health',
  '/status',
  '/metrics',
  '/v1/analytics/ip-bans',
  '/v1/analytics/memory/cleanup',
  '/v1/analytics/trusted-ips',
  '/admin',
  '/management',
];

// 前端代理攻击检测规则
const FRONTEND_PROXY_ATTACK_DETECTION = {
  // 检测User-Agent模式
  SUSPICIOUS_USER_AGENTS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i,
    /insomnia/i,
    /python/i,
    /node/i,
    /automated/i,
  ],

  // 检测请求头模式
  SUSPICIOUS_HEADERS: [
    'x-requested-with',      // AJAX请求标识
    'x-automation',          // 自动化工具标识
    'x-robot',              // 机器人标识
  ],

  // 可疑的请求模式
  SUSPICIOUS_PATTERNS: {
    // 缺少常见浏览器头部
    MISSING_BROWSER_HEADERS: [
      'accept',
      'accept-language',
      'accept-encoding',
    ],

    // 可疑的请求频率模式
    SUSPICIOUS_INTERVALS: {
      MIN_INTERVAL_MS: 100,    // 请求间隔少于100ms视为可疑
      MAX_REQUESTS_PER_SECOND: 10, // 每秒超过10次请求视为可疑
    }
  }
};

// 安全响应配置
const SECURITY_RESPONSES = {
  FRONTEND_PROXY_ATTACK: {
    status: 429,
    message: {
      zh: '检测到可能的前端代理攻击，访问被拒绝',
      en: 'Potential frontend proxy attack detected. Access denied.'
    }
  },

  LOCALHOST_BYPASS_DISABLED: {
    status: 429,
    message: {
      zh: '本地IP访问已禁用，请使用管理令牌或配置可信IP',
      en: 'Localhost bypass disabled. Please use management token or configure trusted IP.'
    }
  },

  MANAGEMENT_TOKEN_REQUIRED: {
    status: 401,
    message: {
      zh: '访问管理接口需要有效的管理令牌',
      en: 'Valid management token required for admin interface.'
    }
  }
};

// 生成安全的管理令牌
function generateSecureToken() {
  const crypto = require('crypto');
  return 'mgmt_' + crypto.randomBytes(32).toString('hex');
}

// 环境检测
const ENVIRONMENT_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  // 开发环境的宽松配置
  DEVELOPMENT_OVERRIDES: {
    ENABLE_LOCALHOST_BYPASS: true,
    ENABLE_FRONTEND_PROXY_DETECTION: false,
  }
};

module.exports = {
  FRONTEND_BACKEND_SECURITY,
  INTERNAL_MANAGEMENT_IPS,
  INTERNAL_MANAGEMENT_PATHS,
  FRONTEND_PROXY_ATTACK_DETECTION,
  SECURITY_RESPONSES,
  ENVIRONMENT_CONFIG,

  // 工具函数
  generateSecureToken,

  // 获取当前环境的有效配置
  getEffectiveConfig: () => {
    const config = { ...FRONTEND_BACKEND_SECURITY };

    if (ENVIRONMENT_CONFIG.IS_DEVELOPMENT) {
      Object.assign(config, ENVIRONMENT_CONFIG.DEVELOPMENT_OVERRIDES);
    }

    return config;
  }
};