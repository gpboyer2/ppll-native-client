/**
 * 统一代理配置工具模块
 * 从环境变量读取代理配置，提供各 HTTP 客户端所需的代理格式
 * 支持的环境变量（按优先级）: HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy, ALL_PROXY, all_proxy
 */
const { HttpsProxyAgent } = require('https-proxy-agent');

// 从环境变量获取代理 URL
const getProxyUrl = () => {
  return process.env.HTTPS_PROXY ||
         process.env.https_proxy ||
         process.env.HTTP_PROXY ||
         process.env.http_proxy ||
         process.env.ALL_PROXY ||
         process.env.all_proxy ||
         '';
};

// 代理 URL 字符串
const proxyUrl = getProxyUrl();

// 是否启用代理
const isEnabled = () => !!proxyUrl;

/**
 * 获取代理配置对象（适用于 binance SDK 等需要 proxy_obj 的场景）
 * @returns {Object|undefined} 代理配置对象 { host, port, protocol }
 */
const getProxyConfig = () => {
  if (!isEnabled()) return undefined;

  try {
    const url = new URL(proxyUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', ''),
    };
  } catch (error) {
    console.warn('[Proxy] 无效的代理 URL:', proxyUrl);
    return undefined;
  }
};

/**
 * 获取完整的代理 URL 字符串
 * @returns {string} 代理 URL
 */
const getProxyUrlString = () => proxyUrl;

/**
 * 获取 HttpsProxyAgent 实例（适用于 axios、fetch 等）
 * @returns {HttpsProxyAgent|undefined}
 */
const getHttpsProxyAgent = () => {
  if (!isEnabled()) return undefined;
  return new HttpsProxyAgent(proxyUrl);
};

/**
 * 获取 HttpProxyAgent 实例（适用于 HTTP 请求）
 * 注意：项目当前未安装 http-proxy-agent，返回 HttpsProxyAgent 实例代替
 * @returns {HttpsProxyAgent|undefined}
 */
const getHttpProxyAgent = () => {
  if (!isEnabled()) return undefined;
  return getHttpsProxyAgent();
};

/**
 * 获取适用于 request 库的代理配置
 * @returns {string|undefined} 代理 URL 字符串
 */
const getRequestProxy = () => {
  return isEnabled() ? proxyUrl : undefined;
};

/**
 * 获取适用于 binance SDK 的完整代理配置
 * @returns {Object} 包含 proxy, proxy_obj, ws_proxy 的配置对象
 */
const getBinanceProxyConfig = () => {
  if (!isEnabled()) {
    return {
      proxy: '',
      proxy_obj: undefined,
      ws_proxy: '',
    };
  }

  const proxyConfig = getProxyConfig();
  return {
    proxy: proxyUrl,
    proxy_obj: proxyConfig,
    ws_proxy: proxyUrl.replace('http://', 'socks://').replace('https://', 'socks://'),
  };
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
    config.httpAgent = httpsAgent; // HttpsProxyAgent 也支持 HTTP
  }
  return config;
};

/**
 * 为 request 库配置添加代理
 * @param {Object} options - request 库请求选项
 * @returns {Object} 添加了代理的选项
 */
const applyProxyToRequestOptions = (options = {}) => {
  const requestProxy = getRequestProxy();
  if (requestProxy) {
    options.proxy = requestProxy;
  }
  return options;
};

/**
 * 打印代理配置状态（用于调试）
 */
const logProxyStatus = () => {
  if (isEnabled()) {
    console.log(`[Proxy] 代理已启用: ${proxyUrl}`);
  } else {
    console.log('[Proxy] 代理未启用');
  }
};

module.exports = {
  // 基础方法
  isEnabled,
  getProxyUrlString,
  getProxyConfig,

  // Agent 实例
  getHttpsProxyAgent,
  getHttpProxyAgent,

  // 适用于特定库的配置
  getRequestProxy,
  getBinanceProxyConfig,
  applyProxyToAxiosConfig,
  applyProxyToRequestOptions,

  // 调试
  logProxyStatus,
};
