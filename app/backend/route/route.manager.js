/**
 * 路由管理器
 * 统一管理和注册所有API路由模块
 * 本地客户端系统：已移除用户认证和权限系统
 *
 * 路由规范：所有路由统一使用 /api/v1 前缀
 * 示例：GET /api/v1/grid-strategy/list
 */
const chatRoute = require("./v1/chat.route");
const helloRoute = require("./v1/hello.route");
const ordersRoute = require("./v1/binance-um-orders.route");
const dashboardRoute = require("./v1/dashboard.route");
const informationRoute = require("./v1/information.route");
const gridStrategyRoute = require("./v1/grid-strategy.route");
const utilsRoute = require("./v1/utils.route");
const analyticsRoute = require("./v1/analytics.route");
const fundFlows = require("./v1/fund-flows.route");
const binanceExchangeInfoRoute = require("./v1/binance-exchange-info.route");
const markPrice = require("./v1/mark-price.route");
const smartMoneyFlowRoute = require("./v1/smart-money-flow.route");
const gridTradeHistoryRoute = require("./v1/grid-trade-history.route");
const twitterRoute = require("./v1/twitter.route");
const bannedIpRoute = require("./v1/banned-ip.route");
const tradingPairsComparisonRoute = require("./v1/trading-pairs-comparison.route");
const gateCoinListRoute = require("./v1/gate-coin-list.route");
const loginLogRoute = require("./v1/login-logs.route");
const operationLogsRoute = require("./v1/operation-logs.route");
const systemLogsRoute = require("./v1/system-logs.route");
const binanceAccountRoute = require("./v1/binance-account.route");
const binanceApiKeyRoute = require("./v1/binance-api-key.route");
const systemRoute = require("./v1/system.route");
const databaseAdminRoute = require("./v1/database-admin.route");
const frontendLogRoute = require("./v1/frontend-log.route");
const hourlyKlineRoute = require("./v1/hourly-kline.route");
const usdMFuturesPluginLogRoute = require("./v1/usd-m-futures-plugin-log.route");
const binanceUmTradingPairsRoute = require("./v1/binance-um-trading-pairs.route");

const routeManager = (app) => {
  // API V1 Routes - 统一使用 /api/v1 前缀
  app.use("/api/v1/chat", chatRoute);
  app.use("/api/v1/hello", helloRoute);
  app.use("/api/v1/orders", ordersRoute);
  app.use("/api/v1/dashboard", dashboardRoute);
  app.use("/api/v1/information", informationRoute);
  app.use("/api/v1/grid-strategy", gridStrategyRoute);
  app.use("/api/v1/utils", utilsRoute);
  app.use("/api/v1/analytics", analyticsRoute);
  app.use("/api/v1/fund-flows", fundFlows);
  app.use("/api/v1/binance-exchange-info", binanceExchangeInfoRoute);
  app.use("/api/v1/mark-price", markPrice);
  app.use("/api/v1/smart-money-flow", smartMoneyFlowRoute);
  app.use("/api/v1/grid-trade-history", gridTradeHistoryRoute);
  app.use("/api/v1/twitter", twitterRoute);
  app.use("/api/v1/banned-ips", bannedIpRoute);
  app.use("/api/v1/trading-pairs-comparison", tradingPairsComparisonRoute);
  app.use("/api/v1/gate-coin-list", gateCoinListRoute);
  app.use("/api/v1/login-logs", loginLogRoute);
  app.use("/api/v1/operation-logs", operationLogsRoute);
  app.use("/api/v1/system-logs", systemLogsRoute);
  app.use("/api/v1/binance-account", binanceAccountRoute);
  app.use("/api/v1/binance-api-key", binanceApiKeyRoute);
  app.use("/api/v1/system", systemRoute);
  app.use("/api/v1/database-admin", databaseAdminRoute);
  app.use("/api/v1/frontend-logs", frontendLogRoute);
  app.use("/api/v1/hourly-kline", hourlyKlineRoute);
  app.use("/api/v1/usd-m-futures-plugin-log", usdMFuturesPluginLogRoute);
  app.use("/api/v1/binance-um-trading-pairs", binanceUmTradingPairsRoute);
};

module.exports = routeManager;
