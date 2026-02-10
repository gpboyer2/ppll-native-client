/**
 * 统一代理配置工具模块
 * 从环境变量读取代理配置，提供各 HTTP 客户端所需的代理格式
 *
 * 支持的代理环境变量（按优先级）:
 * HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy, ALL_PROXY, all_proxy
 */
const { HttpsProxyAgent } = require('https-proxy-agent');
const BINANCE_CONFIG = require('../binance/config.js');

// ============================================
// 代理配置
// ============================================

// 代理 URL 字符串（从环境变量读取）
const PROXY_URL = process.env.HTTPS_PROXY ||
                  process.env.https_proxy ||
                  process.env.HTTP_PROXY ||
                  process.env.http_proxy ||
                  process.env.ALL_PROXY ||
                  process.env.all_proxy ||
                  '';

// 是否启用代理
const isProxyEnabled = !!PROXY_URL;

/**
 * 获取代理 URL 字符串
 * @returns {string} 代理 URL
 */
const getProxyUrlString = () => PROXY_URL;

/**
 * 获取代理配置对象（适用于 binance SDK 等需要 proxy_obj 的场景）
 * @returns {Object|undefined} 代理配置对象 { host, port, protocol }
 */
const getProxyConfig = () => {
  if (!isProxyEnabled) return undefined;

  try {
    const url = new URL(PROXY_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', ''),
    };
  } catch (error) {
    console.warn('[Proxy] 无效的代理 URL:', PROXY_URL);
    return undefined;
  }
};

/**
 * 获取 HttpsProxyAgent 实例（适用于 axios、fetch 等）
 * @returns {HttpsProxyAgent|undefined}
 */
const getHttpsProxyAgent = () => {
  if (!isProxyEnabled) return undefined;
  return new HttpsProxyAgent(PROXY_URL);
};

/**
 * 为 axios 配置添加代理
 * @param {Object} config - axios 请求配置
 * @returns {Object} 添加了代理的配置
 */
const applyProxyToAxiosConfig = (config = {}) => {
  const httpsAgent = getHttpsProxyAgent();
  if (httpsAgent) {
    config.httpsAgent = httpsAgent;
    config.httpAgent = httpsAgent;
  }
  return config;
};

/**
 * 为 request 库配置添加代理
 * @param {Object} options - request 库请求选项
 * @returns {Object} 添加了代理的选项
 */
const applyProxyToRequestOptions = (options = {}) => {
  if (isProxyEnabled) {
    options.proxy = PROXY_URL;
  }
  return options;
};

/**
 * 打印代理配置状态（用于调试）
 */
const logProxyStatus = () => {
  if (isProxyEnabled) {
    console.log(`[Proxy] 代理已启用: ${PROXY_URL}`);
  } else {
    console.log('[Proxy] 代理未启用');
  }
};

module.exports = {
  // ============================================
  // 币安API配置
  // ============================================
  BINANCE_CONFIG,

  // ============================================
  // 代理配置方法
  // ============================================
  getProxyUrlString,
  getProxyConfig,
  getHttpsProxyAgent,
  applyProxyToAxiosConfig,
  applyProxyToRequestOptions,
  logProxyStatus,
};
