

const { MainClient, USDMClient, CoinMClient, WebsocketClient, DefaultLogger } = require('binance');
const path = require('path');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const agent = new SocksProxyAgent(ws_proxy);

let contractGridOptions = {
  isAboveOpenPrice: true, // 是否开启“当价格大于等于开仓价格时则暂停网格”
  apiKey: `Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok`, // 必填
  apiSecret: `wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij`, // 必填
}

const logger = {
  ...DefaultLogger,
  silly: (...params) => {
    console.log('sillyLog: ', params);
  },
};

const wsClient = new WebsocketClient(
  {
    api_key: contractGridOptions.apiKey,
    api_secret: contractGridOptions.apiSecret,
    // Disable ping/pong ws heartbeat mechanism (not recommended)
    // disableHeartbeat: true
    beautify: true,
    wsOptions: process.env.NODE_ENV === 'production' ? {} : { agent },
  },
  logger,
);

// receive raw events
// message 事件中的数据是未处理过的，
// formattedMessage 事件中的数据是清洗过的，
// 二者使用其一即可
wsClient.on('message', (data) => {
  // console.log('raw message received ', JSON.stringify(data, null, 2));
});

// notification when a connection is opened
wsClient.on('open', (data) => {
  console.log('connection opened open:', data.wsKey, data.ws.target.url);
});

// receive formatted events with beautified keys. Any "known" floats stored in strings as parsed as floats.
wsClient.on('formattedMessage', (data) => {
  // K线
  // wsClient.subscribeContinuousContractKlines
  // close 是最新价格
  if (data.eventType === 'continuous_kline') {
    let { low, open, close, high } = data.kline;
    console.log(`continuous_kline:`, data);
    console.log(`continuous_kline: low, open, close, high --- `, low, open, close, high);
  }

  // 最新标记价格
  // wsClient.subscribeMarkPrice
  // markPrice 是标记价格
  if (data.eventType === 'markPriceUpdate') {
    let { markPrice } = data;
    // console.log(markPrice);
    wealthySoon.gridWebsocket({ latestPrice: markPrice });
  }

  // 现货
  // wsClient.subscribePartialBookDepths
  if (data.eventType === 'partialBookDepth') {
    let latestPrice = data.asks[0][0];
    console.log(data.asks);
    console.log(latestPrice);
  }

  // The wsKey can be parsed to determine the type of message (what websocket it came from)
  if (!Array.isArray(data) && data.wsKey.includes('userData')) {
    onUserDataEvent(data);
  }

  // or use a type guard if available
  if (isWsFormattedUserDataEvent(data)) {
    return onUserDataEvent(data);
  }
});

// read response to command sent via WS stream (e.g LIST_SUBSCRIPTIONS)
wsClient.on('reply', (data) => {
  console.log('log reply: ', JSON.stringify(data, null, 2));
});

// receive notification when a ws connection is reconnecting automatically
wsClient.on('reconnecting', (data) => {
  console.log('ws automatically reconnecting.... ', data?.wsKey);
});

// receive notification that a reconnection completed successfully (e.g use REST to check for missing data)
wsClient.on('reconnected', (data) => {
  if (
    typeof data?.wsKey === 'string' &&
    data.wsKey.toLowerCase().includes('userdata')
  ) {
    console.log('ws for user data stream has reconnected ', data?.wsKey);
    // This is a good place to check your own state is still in sync with the account state on the exchange, in case any events were missed while the library was reconnecting:
    // - fetch balances
    // - fetch positions
    // - fetch orders
  } else {
    console.log('ws has reconnected ', data?.wsKey);
  }
});

// Recommended: receive error events (e.g. first reconnection failed)
wsClient.on('error', (data) => {
  console.log('ws saw error ', data?.wsKey);
});

function onUserDataEvent(data) {
  // the market denotes which API category it came from
  // if (data.wsMarket.includes('spot')) {

  // or use a type guard, if one exists (PRs welcome)
  if (isWsFormattedSpotUserDataExecutionReport(data)) {
    console.log('spot user execution report event: ', data);
    return;
  }
  if (isWsFormattedSpotUserDataEvent(data)) {
    console.log('spot user data event: ', data);
    return;
  }
  if (data.wsMarket.includes('margin')) {
    console.log('margin user data event: ', data);
    return;
  }
  if (data.wsMarket.includes('isolatedMargin')) {
    console.log('isolatedMargin user data event: ', data);
    return;
  }
  if (data.wsMarket.includes('usdmTestnet')) {
    console.log('usdmTestnet user data event: ', data);
    return;
  }
  if (data.wsMarket.includes('coinmTestnet')) {
    console.log('coinmTestnet user data event: ', data);
    return;
  }
  if (isWsFormattedFuturesUserDataEvent(data)) {
    console.log('usdm user data event: ', data);
    return;
  }
}

function isWsFormattedUserDataEvent(data) {
  return !Array.isArray(data) && data.wsKey.includes('userData');
}

module.exports = wsClient
