/**
 * 网格策略执行状态常量
 * 统一管理所有执行状态值，避免硬编码
 */

module.exports = {
    // 正常交易
    TRADING: "TRADING",
    // 手动暂停
    PAUSED_MANUAL: "PAUSED_MANUAL",
    // 价格超过上限
    PRICE_ABOVE_MAX: "PRICE_ABOVE_MAX",
    // 价格低于下限
    PRICE_BELOW_MIN: "PRICE_BELOW_MIN",
    // 价格超过开仓价
    PRICE_ABOVE_OPEN: "PRICE_ABOVE_OPEN",
    // 价格低于开仓价
    PRICE_BELOW_OPEN: "PRICE_BELOW_OPEN",
    // API Key 无效
    API_KEY_INVALID: "API_KEY_INVALID",
    // 网络错误
    NETWORK_ERROR: "NETWORK_ERROR",
    // 余额不足
    INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
    // 其他错误
    OTHER_ERROR: "OTHER_ERROR",
    // 初始化中
    INITIALIZING: "INITIALIZING",
    // 初始化失败
    INIT_FAILED: "INIT_FAILED",
};
