

/**
 * 币安API配置
 * 配置币安交易所的基础URL和WebSocket连接地址
 */

module.exports = {
  baseUrl: "https://fapi.binance.com",
  wssBaseUrl: "wss://fstream.binance.com",
  testBaseUrl: "https://testnet.binancefuture.com",
  proxy: 'http://127.0.0.1:7890',
  proxy_obj: {
    host: '127.0.0.1',
    port: 7890,
    protocol: 'http',
  },
  ws_proxy: 'socks://127.0.0.1:7890',
};
