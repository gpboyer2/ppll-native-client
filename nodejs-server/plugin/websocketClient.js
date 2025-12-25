/**
 * WebSocket 客户端工厂
 * 为需要独立 WebSocket 连接的场景提供客户端创建功能
 * 注意：优先使用全局 wsManager 以复用连接
 */
const { WebsocketClient, DefaultLogger } = require('binance');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const agent = new SocksProxyAgent(ws_proxy);

const logger = {
  ...DefaultLogger,
  silly: (...params) => {
    console.log('sillyLog: ', params);
  },
};

/**
 * 创建 WebSocket 客户端
 * @param {Object} options - 配置选项
 * @param {string} options.apiKey - API 密钥
 * @param {string} options.apiSecret - API 密钥
 * @param {boolean} options.beautify - 是否美化输出
 * @returns {WebsocketClient} WebSocket 客户端实例
 */
function createWsClient(options = {}) {
  const {
    apiKey,
    apiSecret,
    beautify = true,
  } = options;

  return new WebsocketClient(
    {
      api_key: apiKey,
      api_secret: apiSecret,
      beautify: beautify,
      wsOptions: process.env.NODE_ENV === "production" ? {} : { agent },
    },
    logger,
  );
}

// 导出工厂函数
module.exports = {
  createWsClient,
};
