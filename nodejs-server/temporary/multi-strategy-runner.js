/**
 * 多策略运行器
 * 
 * 功能：
 * 1. 共享一个 WebSocket 连接，订阅所有需要的交易对
 * 2. 根据配置文件创建多个网格策略实例
 * 3. 统一分发价格更新到对应的策略实例
 * 
 * 优势：
 * - 100个交易对只需要1个WebSocket连接，而不是100个
 * - 节省权重消耗（每个连接5权重 -> 只消耗5权重）
 * - 便于统一管理和监控
 * 
 * 使用方式：
 *   NODE_ENV=development node ./temporary/multi-strategy-runner.js
 *   NODE_ENV=production pm2 start ./temporary/multi-strategy-runner.js --name multi-strategy
 */

const { WebsocketClient, DefaultLogger } = require('binance');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const InfiniteGrid = require('../plugin/umInfiniteGrid.js');
const { accountList, strategyList } = require('./strategies.config.list.js');

// 避免 node 命令执行后自动终止程序
setTimeout(function pm2_blockDuplicateStart() {
  setTimeout(pm2_blockDuplicateStart, 100000);
}, 100000);

// 生产环境标识
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 代理配置（仅开发环境启用）
const agent = IS_PRODUCTION ? null : new SocksProxyAgent(ws_proxy);


/**
 * 策略实例映射表
 * key: `${tradingPair}:${positionSide}:${accountName}`
 * value: InfiniteGrid 实例
 */
const gridInstanceMap = new Map();

/**
 * 交易对到策略实例的映射（用于价格分发）
 * key: tradingPair (如 'ARUSDT')
 * value: InfiniteGrid 实例数组（同一交易对可能有多个策略：做多+做空，或不同账号）
 */
const symbolToGridMap = new Map();


// 策略启动延时（毫秒），避免同时启动多个策略触发币安API速率限制
const STRATEGY_START_DELAY_MS = 8000;


/**
 * 延时函数
 * @param {number} ms 延时毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 初始化所有启用的策略（异步，带延时）
 */
async function initStrategyList() {
  const enabledStrategyList = strategyList.filter(s => s.enabled);

  if (enabledStrategyList.length === 0) {
    console.log('⚠️ 没有启用的策略，请检查 strategies.config.list.js');
    return;
  }

  console.log(`📊 共有 ${enabledStrategyList.length} 个启用的策略`);
  console.log(`⏱️  每个策略启动间隔: ${STRATEGY_START_DELAY_MS / 1000} 秒`);
  console.log('');

  for (let i = 0; i < enabledStrategyList.length; i++) {
    const strategy = enabledStrategyList[i];
    const account = accountList[strategy.account];
    if (!account) {
      console.log(`❌ 策略 ${strategy.tradingPair}-${strategy.positionSide} 的账号 "${strategy.account}" 不存在`);
      continue;
    }

    // 非第一个策略需要延时启动，避免触发币安API速率限制
    if (i > 0) {
      console.log(`⏳ 等待 ${STRATEGY_START_DELAY_MS / 1000} 秒后启动下一个策略...`);
      await sleep(STRATEGY_START_DELAY_MS);
    }

    // 构建完整的网格配置
    const gridOptions = {
      ...strategy,
      apiKey: account.apiKey,
      apiSecret: account.apiSecret,
    };

    // 创建网格实例
    const grid = new InfiniteGrid(gridOptions);
    if (!grid.config) {
      console.log(`❌ 策略 ${strategy.tradingPair}-${strategy.positionSide} 初始化失败`);
      continue;
    }

    // 初始化订单
    grid.initOrders();

    // 存储实例
    const instanceKey = `${strategy.tradingPair}:${strategy.positionSide}:${strategy.account}`;
    gridInstanceMap.set(instanceKey, grid);

    // 建立交易对到实例的映射
    if (!symbolToGridMap.has(strategy.tradingPair)) {
      symbolToGridMap.set(strategy.tradingPair, []);
    }
    symbolToGridMap.get(strategy.tradingPair).push(grid);

    console.log(`✅ [${i + 1}/${enabledStrategyList.length}] 策略已创建: ${strategy.tradingPair} ${strategy.positionSide} (${strategy.account})`);
  }

  console.log('');
  console.log(`📈 需要订阅的交易对数量: ${symbolToGridMap.size}`);
  console.log(`📈 交易对列表: ${Array.from(symbolToGridMap.keys()).join(', ')}`);
  console.log('');
}


/**
 * 创建共享的 WebSocket 客户端
 */
function createSharedWebSocketClient() {
  // 使用第一个启用策略的账号来创建 WebSocket 连接
  // 注意：markPrice 是公共流，不需要 apiKey/apiSecret
  // 但 binance 包要求传入，所以我们使用第一个账号的凭证
  const firstEnabledStrategy = strategyList.find(s => s.enabled);
  if (!firstEnabledStrategy) {
    console.log('❌ 没有启用的策略');
    return null;
  }

  const account = accountList[firstEnabledStrategy.account];

  const logger = {
    ...DefaultLogger,
    silly: () => { }, // 静默 silly 日志
  };

  const wsClient = new WebsocketClient(
    {
      api_key: account.apiKey,
      api_secret: account.apiSecret,
      beautify: true,
      wsOptions: IS_PRODUCTION ? {} : { agent },
    },
    logger,
  );

  // 连接事件
  wsClient.on('open', (data) => {
    console.log(`🔗 WebSocket 连接已建立: ${data.wsKey}`);
  });

  wsClient.on('reconnecting', (data) => {
    console.log(`🔄 WebSocket 重连中... ${data?.wsKey}`);
  });

  wsClient.on('reconnected', (data) => {
    console.log(`✅ WebSocket 已重连: ${data?.wsKey}`);
  });

  wsClient.on('error', (data) => {
    console.log(`❌ WebSocket 错误: ${data?.wsKey}`, data);
  });

  // 价格更新事件 - 分发到对应的策略实例
  wsClient.on('formattedMessage', (data) => {
    if (data.eventType === 'markPriceUpdate') {
      const { symbol, markPrice } = data;

      // 获取该交易对的所有策略实例
      const gridList = symbolToGridMap.get(symbol);
      if (gridList && gridList.length > 0) {
        for (const grid of gridList) {
          grid.gridWebsocket({ latestPrice: markPrice });
        }
      }
    }
  });

  return wsClient;
}


/**
 * 订阅所有需要的交易对
 */
function subscribeAllSymbol(wsClient) {
  const symbolList = Array.from(symbolToGridMap.keys());

  console.log(`📡 开始订阅 ${symbolList.length} 个交易对的标记价格...`);

  for (const symbol of symbolList) {
    wsClient.subscribeMarkPrice(symbol, 'usdm');
    console.log(`   ✓ 已订阅: ${symbol}`);
  }

  console.log('');
  console.log('🚀 多策略运行器已启动！');
  console.log('');
}


/**
 * 主函数
 */
async function main() {
  console.log('');
  console.log('========================================');
  console.log('   多策略运行器 - Multi Strategy Runner');
  console.log('========================================');
  console.log('');
  console.log(`环境: ${IS_PRODUCTION ? '生产环境' : '开发环境'}`);
  console.log(`代理: ${IS_PRODUCTION ? '未启用' : ws_proxy}`);
  console.log('');

  // 1. 初始化所有策略（异步，带延时）
  await initStrategyList();

  if (symbolToGridMap.size === 0) {
    console.log('❌ 没有需要订阅的交易对，退出');
    return;
  }

  // 2. 创建共享的 WebSocket 客户端
  const wsClient = createSharedWebSocketClient();
  if (!wsClient) {
    console.log('❌ 创建 WebSocket 客户端失败，退出');
    return;
  }

  // 3. 订阅所有交易对
  subscribeAllSymbol(wsClient);
}


// 启动
main();
