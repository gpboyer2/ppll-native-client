/**
 * 路由管理器
 * 统一管理和注册所有API路由模块
 */
const userRoute = require("./v1/user.route");
const roleRoute = require("./v1/role.route");
const authRoute = require("./v1/auth.route");
const chatRoute = require("./v1/chat.route");
const robotRoute = require("./v1/robot.route");
const helloRoute = require("./v1/hello.route");
const ordersRoute = require("./v1/orders.route");
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

const routeManager = (app) => {
  // API V1 Routes
  app.use("/v1/user", userRoute);
  app.use("/v1/role", roleRoute);
  app.use("/v1/auth", authRoute);
  app.use("/v1/chat", chatRoute);
  app.use("/v1/robot", robotRoute);
  app.use("/v1/hello", helloRoute);
  app.use("/v1/orders", ordersRoute);
  app.use("/v1/dashboard", dashboardRoute);
  app.use("/v1/information", informationRoute);
  app.use("/v1/grid-strategy", gridStrategyRoute);
  app.use("/v1/utils", utilsRoute);
  app.use("/v1/analytics", analyticsRoute);
  app.use("/v1/fund-flows", fundFlows);
  app.use("/v1/binance-exchange-info", binanceExchangeInfoRoute);
  app.use("/v1/mark-price", markPrice);
  app.use("/v1/smart-money-flow", smartMoneyFlowRoute);
  app.use("/v1/grid-trade-history", gridTradeHistoryRoute);
  app.use("/v1/twitter", twitterRoute);
  app.use("/v1/banned-ips", bannedIpRoute);
  app.use("/v1/trading-pairs-comparison", tradingPairsComparisonRoute);
  app.use("/v1/gate-coin-list", gateCoinListRoute);
  app.use("/v1/login-logs", loginLogRoute);
  app.use("/v1/operation-logs", operationLogsRoute);
  app.use("/v1/system-logs", systemLogsRoute);
  app.use("/v1/binance-account", binanceAccountRoute);
};

module.exports = routeManager;
