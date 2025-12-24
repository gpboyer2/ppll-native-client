/**
 * 策略运行器 - 单个策略实例执行文件
 */

const { WebsocketClient, DefaultLogger } = require('binance');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const InfiniteGrid = require('../plugin/umInfiniteGrid.js');
const { accountList, strategyList } = require('./strategies.config.list.js');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const agent = IS_PRODUCTION ? null : new SocksProxyAgent(ws_proxy);
const STRATEGY_START_DELAY_MIN_MS = 10000;
const STRATEGY_START_DELAY_MAX_MS = 15000;


function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    result[key] = args[i + 1];
  }
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function runStrategy() {
  setTimeout(function keepAlive() { setTimeout(keepAlive, 100000); }, 100000);

  const { symbol, positionSide, account: accountName, index } = parseArgs();
  if (!symbol || !positionSide || !accountName) {
    console.log('❌ 缺少必要参数');
    process.exit(1);
  }

  const strategy = strategyList.find(s => s.tradingPair === symbol && s.positionSide === positionSide && s.account === accountName);
  const account = accountList[accountName];
  if (!strategy || !account) {
    console.log(`❌ 策略或账号不存在`);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log(`   ${symbol} ${positionSide} (${accountName})`);
  console.log('========================================\n');
  console.log(`环境: ${IS_PRODUCTION ? '生产' : '开发'}`);
  console.log(`代理: ${IS_PRODUCTION ? '未启用' : ws_proxy}\n`);

  const strategyIndex = parseInt(index, 10) || 0;
  if (strategyIndex > 0) {
    const baseDelayMs = Math.floor(Math.random() * (STRATEGY_START_DELAY_MAX_MS - STRATEGY_START_DELAY_MIN_MS + 1)) + STRATEGY_START_DELAY_MIN_MS;
    const delayMs = strategyIndex * baseDelayMs;
    console.log(`⏳ 延时 ${(delayMs / 1000).toFixed(1)} 秒后启动...`);
    const totalSteps = 20;
    for (let step = 0; step <= totalSteps; step++) {
      process.stdout.write(`\r   [${'█'.repeat(step)}${'░'.repeat(totalSteps - step)}] ${Math.floor((step / totalSteps) * 100)}%`);
      if (step < totalSteps) await sleep(delayMs / totalSteps);
    }
    console.log('\n✅ 延时结束\n');
  }

  const grid = new InfiniteGrid({ ...strategy, apiKey: account.apiKey, apiSecret: account.apiSecret });
  if (!grid.config) {
    console.log('❌ 初始化失败');
    process.exit(1);
  }
  grid.initOrders();
  console.log(`✅ 策略已创建: ${symbol} ${positionSide} (${accountName})`);

  const logger = { ...DefaultLogger, silly: () => { } };

  const wsClient = new WebsocketClient({
    api_key: account.apiKey,
    api_secret: account.apiSecret,
    beautify: true,
    wsOptions: IS_PRODUCTION ? {} : { agent },
  }, logger);

  wsClient.on('open', (data) => console.log(`🔗 WebSocket 连接: ${data.wsKey}`));
  wsClient.on('reconnecting', (data) => console.log(`🔄 重连中... ${data?.wsKey}`));
  wsClient.on('reconnected', (data) => console.log(`✅ 已重连: ${data?.wsKey}`));
  wsClient.on('error', (data) => console.log(`❌ 错误: ${data?.wsKey}`, data));
  wsClient.on('formattedMessage', (data) => {
    if (data.eventType === 'markPriceUpdate' && data.symbol === symbol) {
      grid.gridWebsocket({ latestPrice: data.markPrice });
    }
  });

  wsClient.subscribeMarkPrice(symbol, 'usdm');
  console.log(`📡 已订阅: ${symbol}\n🚀 策略已启动！\n`);
}


runStrategy();
