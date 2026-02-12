/**
 * 安全配置文件
 * 包含IP限流、封禁、白名单等安全相关配置
 */

// 从环境变量读取配置，提供默认值
const RATE_LIMIT_CONFIG = {
    // 限流窗口时间（毫秒）
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1分钟

    // 窗口内最大请求数
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

    // 封禁时长（毫秒）- 永久封禁设为100年
    BAN_TIME_MS:
        parseInt(process.env.RATE_LIMIT_BAN_TIME_MS) ||
        100 * 365 * 24 * 60 * 60 * 1000,

    // 清理任务间隔（毫秒）
    CLEANUP_INTERVAL_MS:
        parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS) || 60 * 1000,

    // 是否信任代理头部（生产环境建议false）
    TRUST_PROXY: process.env.RATE_LIMIT_TRUST_PROXY === "true" || false,

    // 内存中最大IP数量限制
    MAX_MEMORY_IPS: parseInt(process.env.RATE_LIMIT_MAX_MEMORY_IPS) || 10000,

    // 启用调试日志
    DEBUG: process.env.RATE_LIMIT_DEBUG === "true" || false,
};

// 可信IP白名单（从环境变量或配置文件读取）
const TRUSTED_IPS = (process.env.TRUSTED_IPS || "")
    .split(",")
    .filter((ip) => ip.trim());

// 管理操作令牌（用于内部服务调用）
const MANAGEMENT_TOKEN =
    process.env.MANAGEMENT_TOKEN ||
    "your-secure-management-token-" + Math.random().toString(36);

// 需要特殊处理的路径（如健康检查、内部监控等）
const INTERNAL_MANAGEMENT_PATHS = [
    "/health",
    "/status",
    "/metrics",
    "/v1/analytics/ip-bans", // IP封禁管理接口
    "/v1/analytics/memory/cleanup", // 内存清理接口
    "/v1/analytics/trusted-ips", // 可信IP管理接口
];

// 本地/内网IP检测规则
const LOCAL_IP_PATTERNS = [
    // IPv4私有地址
    /^127\./, // 127.x.x.x (loopback)
    /^10\./, // 10.x.x.x (Class A private)
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.x.x - 172.31.x.x (Class B private)
    /^192\.168\./, // 192.168.x.x (Class C private)
    /^169\.254\./, // 169.254.x.x (Link-local)

    // IPv6特殊地址
    /^::1$/, // IPv6 loopback
    /^fe80:/i, // IPv6 link-local
    /^fc00:/i, // IPv6 unique local (ULA)
    /^fd00:/i, // IPv6 unique local (ULA)
    /^::ffff:127\./i, // IPv4-mapped IPv6 loopback
    /^::ffff:10\./i, // IPv4-mapped IPv6 private
    /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./i, // IPv4-mapped IPv6 private
    /^::ffff:192\.168\./i, // IPv4-mapped IPv6 private
];

// 特殊处理的地址
const SPECIAL_ADDRESSES = ["localhost", "0.0.0.0", "::", "::0"];

// IP验证正则表达式
const IP_VALIDATION = {
    // IPv4地址验证
    IPv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

    // IPv6地址验证（简化版）
    IPv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/,
};

// 安全响应消息
const SECURITY_MESSAGES = {
    TOO_MANY_REQUESTS: {
        zh: "访问过于频繁，IP已被永久封禁",
        en: "Too many requests. IP permanently banned.",
    },
    INVALID_IP: {
        zh: "IP地址格式不正确",
        en: "Invalid IP address format",
    },
    DATABASE_ERROR: {
        zh: "访问过于频繁，请稍后再试",
        en: "Too many requests. Please try again later.",
    },
};

// 监控阈值配置
const MONITORING_THRESHOLDS = {
    // 内存使用警告阈值（MB）
    MEMORY_WARNING_MB: parseInt(process.env.MEMORY_WARNING_MB) || 100,

    // 内存使用严重警告阈值（MB）
    MEMORY_CRITICAL_MB: parseInt(process.env.MEMORY_CRITICAL_MB) || 200,

    // IP计数警告阈值
    IP_COUNT_WARNING: parseInt(process.env.IP_COUNT_WARNING) || 5000,

    // IP计数紧急清理阈值
    IP_COUNT_EMERGENCY: parseInt(process.env.IP_COUNT_EMERGENCY) || 8000,
};

module.exports = {
    RATE_LIMIT_CONFIG,
    TRUSTED_IPS,
    LOCAL_IP_PATTERNS,
    SPECIAL_ADDRESSES,
    IP_VALIDATION,
    SECURITY_MESSAGES,
    MONITORING_THRESHOLDS,
};
