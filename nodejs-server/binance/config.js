

/**
 * 币安API配置
 * 配置币安交易所的基础URL和WebSocket连接地址
 * 代理配置现在从环境变量读取，参见 ../utils/proxy.js
 */

module.exports = {
  baseUrl: "https://fapi.binance.com",
  wssBaseUrl: "wss://fstream.binance.com",
  testBaseUrl: "https://testnet.binancefuture.com",
};
