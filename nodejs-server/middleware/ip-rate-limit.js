const db = require('../models');
const BannedIP = db.banned_ips;

// 配置
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 分钟
  MAX_REQUESTS: 100,     // 最大 100 次
  BAN_TIME_MS: 24 * 60 * 60 * 1000, // 封禁 24 小时
  CLEANUP_INTERVAL_MS: 60 * 1000,   // 每分钟清理一次过期数据
  TRUST_PROXY: false,    // 是否信任代理头部（生产环境建议false）
  MAX_MEMORY_IPS: 10000, // 内存中最大IP数量限制
  ENABLE_LOCALHOST_BYPASS: false, // 🚨 重要：是否启用本地IP绕过（生产环境必须false）
  MANAGEMENT_TOKEN_HEADER: 'x-management-token', // 管理操作令牌头
  // DEBUG: false,          // 是否启用调试日志
};

// 可信IP白名单（管理员IP、监控系统IP等）
const TRUSTED_IPS = new Set([
  // '192.168.1.100',  // 示例：管理员IP
  // '10.0.0.5',       // 示例：监控系统IP
]);

// 管理操作令牌（用于内部服务调用）
const MANAGEMENT_TOKEN = process.env.MANAGEMENT_TOKEN || 'your-secure-management-token';

// 需要特殊处理的路径（如健康检查、内部监控等）
const INTERNAL_PATHS = new Set([
  '/health',
  '/status',
  '/metrics',
  '/v1/banned-ips', // IP封禁管理接口（已迁移到banned-ip模块）
  '/v1/banned-ips/memory/cleanup', // 内存清理接口
  '/v1/banned-ips/trusted-ips', // 可信IP管理接口
]);

// 本地/内网IP范围
const LOCAL_IP_RANGES = [
  /^127\./,                    // 127.x.x.x
  /^10\./,                     // 10.x.x.x
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.x.x - 172.31.x.x
  /^192\.168\./,               // 192.168.x.x
  /^::1$/,                     // IPv6 localhost
  /^fe80:/,                    // IPv6 link-local
  /^fc00:/,                    // IPv6 unique local
  /^fd00:/,                    // IPv6 unique local
];

// 内存存储活跃 IP 的请求计数（避免频繁查数据库）
const ipRequestCounts = new Map();

// 清理任务是否已启动
let cleanupJobStarted = false;

/**
 * 紧急清理内存中的IP计数（当内存使用过多时）
 */
function emergencyCleanup() {
  const now = Date.now();
  let cleanedCount = 0;

  // 按最后访问时间排序，清理最老的IP记录
  const sortedIPs = Array.from(ipRequestCounts.entries())
    .sort(([, a], [, b]) => {
      const aLastTime = a.requests[a.requests.length - 1]?.time || a.firstReqTime;
      const bLastTime = b.requests[b.requests.length - 1]?.time || b.firstReqTime;
      return aLastTime - bLastTime;
    });

  // 清理一半的记录
  const clearCount = Math.floor(sortedIPs.length / 2);
  for (let i = 0; i < clearCount; i++) {
    ipRequestCounts.delete(sortedIPs[i][0]);
    cleanedCount++;
  }

  console.log(`[Rate Limit] 紧急清理了 ${cleanedCount} 个IP计数，当前内存IP数量: ${ipRequestCounts.size}`);
}

/**
 * 获取内存使用统计
 */
function getMemoryStats() {
  const memUsage = process.memoryUsage();
  return {
    ipCount: ipRequestCounts.size,
    memoryUsage: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    }
  };
}
function startCleanupJob() {
  if (cleanupJobStarted) return;
  cleanupJobStarted = true;

  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ip, data] of ipRequestCounts) {
      // 清理 2 分钟未活动的 IP 计数
      if (now - data.firstReqTime > 2 * RATE_LIMIT.WINDOW_MS) {
        ipRequestCounts.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Rate Limit] 清理了 ${cleanedCount} 个过期IP计数`);
    }
  }, RATE_LIMIT.CLEANUP_INTERVAL_MS);

  // 每小时清理一次过期的数据库封禁记录
  setInterval(async () => {
    try {
      const cleanedCount = await BannedIP.cleanupExpiredRecords();
      if (cleanedCount > 0) {
        console.log(`[Rate Limit] 清理了 ${cleanedCount} 条过期封禁记录`);
      }
    } catch (error) {
      console.error('[Rate Limit] 清理过期封禁记录失败:', error);
    }
  }, 60 * 60 * 1000); // 每小时执行一次
}

/**
 * 检查 IP 是否被封禁（查数据库）
 */
async function checkIfBanned(ip) {
  try {
    return await BannedIP.isIpBanned(ip);
  } catch (error) {
    console.error('[Rate Limit] 检查IP封禁状态失败:', error);
    return false; // 出错时默认不封禁，避免误杀
  }
}

/**
 * 记录请求（内存计数），返回是否超限
 */
function trackRequest(ip) {
  const now = Date.now();

  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, {
      count: 1,
      firstReqTime: now,
      requests: [{ time: now }]
    });
    return false;
  }

  const ipData = ipRequestCounts.get(ip);

  // 添加新请求记录
  ipData.requests.push({ time: now });
  ipData.count = ipData.requests.length;

  // 清理超出时间窗口的请求记录
  const windowStart = now - RATE_LIMIT.WINDOW_MS;
  ipData.requests = ipData.requests.filter(req => req.time > windowStart);
  ipData.count = ipData.requests.length;

  // 如果 1 分钟内超过 100 次，返回 true（触发封禁）
  return ipData.count > RATE_LIMIT.MAX_REQUESTS;
}

/**
 * 封禁 IP（写入数据库）
 */
async function banIP(ip) {
  try {
    await BannedIP.banIP(
      ip,
      '频率限制：1分钟内请求超过100次',
      0,
      '自动封禁'
    );
    console.log(`[Rate Limit] IP ${ip} 已被自动永久封禁`);

    // 清理内存中的计数
    ipRequestCounts.delete(ip);
  } catch (error) {
    console.error('[Rate Limit] 封禁IP失败:', error);
  }
}

/**
 * 安全地获取客户端真实IP地址
 * @param {object} req - Express请求对象
 * @returns {string} 客户端IP地址
 */
function getClientIP(req) {
  let ip;

  if (RATE_LIMIT.TRUST_PROXY) {
    // 如果信任代理，按优先级获取IP
    ip = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.ip;

    // 如果是X-Forwarded-For，取第一个IP（最原始的客户端IP）
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
  } else {
    // 不信任代理头部，只使用连接IP
    ip = req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.ip ||
            '';
  }

  return normalizeIP(ip);
}

/**
 * 标准化IP地址
 * @param {string} ip - 原始IP地址
 * @returns {string} 标准化后的IP地址
 */
function normalizeIP(ip) {
  if (!ip) return '';

  // 移除IPv4映射的IPv6前缀
  ip = ip.replace(/^::ffff:/, '');

  // 处理IPv6地址
  if (ip.includes(':')) {
    // 标准化IPv6地址：转小写、去除多余的零
    try {
      // 简单的IPv6标准化（可以考虑使用专门的库如ip6addr）
      return ip.toLowerCase().replace(/(^|:)0+([0-9a-f])/g, '$1$2');
    } catch (e) {
      return ip.toLowerCase();
    }
  }

  // IPv4地址验证和返回
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) {
    return ip;
  }

  // 如果IP格式不正确，返回空字符串
  console.warn(`[Rate Limit] 无效的IP格式: ${ip}`);
  return '';
}

/**
 * 检查是否为内网管理IP（仅限真正的内网管理访问）
 * @param {string} ip - IP地址
 * @returns {boolean} 是否为内网管理IP
 */
function isInternalManagementIP(ip) {
  if (!ip) return false;

  // 🚨 重要：只有在明确启用本地绕过时才跳过localhost
  if (RATE_LIMIT.ENABLE_LOCALHOST_BYPASS) {
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
      return true;
    }
  }

  // 仅检查真正的内网管理IP段（不包括127.0.0.1等）
  const internalManagementRanges = [
    /^10\.0\.0\.[1-9]$/,        // 10.0.0.1-10.0.0.9 (管理专用)
    /^192\.168\.1\.[1-9]$/,    // 192.168.1.1-192.168.1.9 (管理专用)
    // 可根据实际网络环境配置更具体的管理IP段
  ];

  return internalManagementRanges.some(range => range.test(ip));
}

/**
 * 检查是否为合法的内部服务调用
 * @param {object} req - Express请求对象
 * @returns {boolean} 是否为合法内部调用
 */
function isInternalServiceCall(req) {
  // 检查管理令牌
  const token = req.headers[RATE_LIMIT.MANAGEMENT_TOKEN_HEADER];
  if (token && token === MANAGEMENT_TOKEN) {
    return true;
  }

  // 检查是否为内部管理路径
  if (INTERNAL_PATHS.has(req.path)) {
    // 内部路径也需要验证来源或令牌
    return token === MANAGEMENT_TOKEN;
  }

  return false;
}

/**
 * 检查是否为可信IP
 * @param {string} ip - IP地址
 * @returns {boolean} 是否为可信IP
 */
function isTrustedIP(ip) {
  return TRUSTED_IPS.has(ip);
}

/**
 * 频率限制 & 封禁中间件
 */
function rateLimitMiddleware() {
  // 启动定时清理任务（避免内存泄漏）
  startCleanupJob();

  return async (req, res, next) => {
    // 安全地获取客户端IP地址
    const ip = getClientIP(req);

    // IP地址无效时记录警告并放行（避免阻塞正常请求）
    if (!ip) {
      console.warn('[Rate Limit] 无法获取有效的客户端IP地址');
      return next();
    }

    // 检查内部服务调用（通过令牌验证）
    if (isInternalServiceCall(req)) {
      console.log(`[Rate Limit] 内部服务调用，IP: ${ip}, 路径: ${req.path}`);
      return next();
    }

    // 检查内网管理IP（严格限制）
    if (isInternalManagementIP(ip)) {
      console.log(`[Rate Limit] 内网管理IP访问，IP: ${ip}`);
      return next();
    }

    // 跳过可信IP
    if (isTrustedIP(ip)) {
      return next();
    }

    // 🚨 重要：所有其他IP（包括127.0.0.1前端代理请求）都要进行限流检查
    // 这样可以防止黑客通过前端页面发起自动化攻击

    // 检查内存使用情况，防止内存耗尽攻击
    if (ipRequestCounts.size > RATE_LIMIT.MAX_MEMORY_IPS) {
      console.warn(`[Rate Limit] 内存中IP数量过多(${ipRequestCounts.size})，执行紧急清理`);
      emergencyCleanup();
    }

    try {
      // 1. 检查是否已被封禁（查数据库）
      const isBanned = await checkIfBanned(ip);
      if (isBanned) {
        return res.status(429).json({
          status: 'error',
          code: 429,
          error: '访问过于频繁，IP已被永久封禁',
          message: 'Too many requests. IP permanently banned.'
        });
      }

      // 2. 记录请求（内存计数）
      const isOverLimit = trackRequest(ip);
      if (isOverLimit) {
        // 触发封禁（写入数据库）
        await banIP(ip);
        return res.status(429).json({
          status: 'error',
          code: 429,
          error: '访问过于频繁，IP已被永久封禁',
          message: 'Too many requests. IP permanently banned.'
        });
      }

      next(); // 放行
    } catch (err) {
      console.error("[Rate Limit] 频率限制中间件错误:", err);

      // 数据库错误时的降级策略
      if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeTimeoutError') {
        console.warn('[Rate Limit] 数据库连接错误，启用内存限流模式');
        // 仅使用内存限流，不封禁到数据库
        const isOverLimit = trackRequest(ip);
        if (isOverLimit) {
          return res.status(429).json({
            status: 'error',
            code: 429,
            error: '访问过于频繁，请稍后再试',
            message: 'Too many requests. Please try again later.'
          });
        }
      }

      next(); // 其他错误时仍放行（避免阻塞正常请求）
    }
  };
}

/**
 * 获取当前内存中的IP统计信息（用于调试）
 */
function getIPStats() {
  const stats = {};
  for (const [ip, data] of ipRequestCounts) {
    stats[ip] = {
      count: data.count,
      firstReqTime: new Date(data.firstReqTime).toISOString(),
      lastReqTime: new Date(data.requests[data.requests.length - 1]?.time || data.firstReqTime).toISOString()
    };
  }
  return stats;
}

module.exports = {
  rateLimitMiddleware,
  getIPStats,
  getMemoryStats,
  emergencyCleanup,
  RATE_LIMIT,
  TRUSTED_IPS, // 允许外部修改可信IP列表
  MANAGEMENT_TOKEN,
  INTERNAL_PATHS,
  // 工具函数，供外部使用
  addTrustedIP: (ip) => TRUSTED_IPS.add(ip),
  removeTrustedIP: (ip) => TRUSTED_IPS.delete(ip),
  addInternalPath: (path) => INTERNAL_PATHS.add(path),
  removeInternalPath: (path) => INTERNAL_PATHS.delete(path),
  isTrustedIP,
  isInternalManagementIP,
  isInternalServiceCall
};