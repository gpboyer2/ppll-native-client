/**
 * 交易对比较功能使用示例
 * 
 * 使用官方 binance npm 包获取交易对信息
 */

const tradingPairsService = require('../service/trading-pairs-comparison.service.js');

/**
 * 基本使用示例
 */
async function basicExample() {
  console.log('=== 基本使用示例 ===\n');

  try {
    // 1. 获取有合约但没有现货的交易对
    console.log('1. 获取有合约但没有现货的交易对...');
    const futuresOnly = await tradingPairsService.getFuturesOnlyPairs();
    console.log(`   找到 ${futuresOnly.count} 个交易对`);
    console.log(`   示例: ${futuresOnly.pairs.slice(0, 5).join(', ')}`);
    console.log();

    // 2. 获取有现货但没有合约的交易对
    console.log('2. 获取有现货但没有合约的交易对...');
    const spotOnly = await tradingPairsService.getSpotOnlyPairs();
    console.log(`   找到 ${spotOnly.count} 个交易对`);
    console.log(`   示例: ${spotOnly.pairs.slice(0, 5).join(', ')}`);
    console.log();

    // 3. 分析特定交易对
    console.log('3. 分析特定交易对...');
    const symbols = ['BTCUSDT', 'ETHUSDT', '1000BONKUSDT', 'AAVEBTC'];
    for (const symbol of symbols) {
      const analysis = await tradingPairsService.analyzeTradingPairAvailability(symbol);
      console.log(`   ${symbol}: ${analysis.category}`);
    }
    console.log();

  } catch (error) {
    console.error('基本示例执行失败:', error.message);
  }
}

/**
 * 高级使用示例
 */
async function advancedExample() {
  console.log('=== 高级使用示例 ===\n');

  try {
    // 1. 获取完整报告
    console.log('1. 生成完整比较报告...');
    const report = await tradingPairsService.getComparisonReport();

    console.log('   报告摘要:');
    console.log(`   - 总现货交易对: ${report.summary.total_spot_pairs}`);
    console.log(`   - 总合约交易对: ${report.summary.total_futures_pairs}`);
    console.log(`   - 共同交易对: ${report.summary.common_pairs}`);
    console.log(`   - 仅合约交易对: ${report.summary.futures_only_count}`);
    console.log(`   - 仅现货交易对: ${report.summary.spot_only_count}`);
    console.log();

    // 2. 基础资产分析
    console.log('2. 基础资产分析...');
    const assetAnalysis = await tradingPairsService.getBaseAssetAnalysis();

    console.log('   基础资产统计:');
    console.log(`   - 总基础资产数: ${assetAnalysis.summary.total_base_assets}`);
    console.log(`   - 共同资产数: ${assetAnalysis.summary.common_assets_count}`);
    console.log(`   - 仅现货资产数: ${assetAnalysis.summary.spot_only_assets_count}`);
    console.log(`   - 仅合约资产数: ${assetAnalysis.summary.futures_only_assets_count}`);

    if (assetAnalysis.details.futures_only_assets.length > 0) {
      console.log(`   - 仅合约资产示例: ${assetAnalysis.details.futures_only_assets.slice(0, 10).join(', ')}`);
    }
    console.log();

  } catch (error) {
    console.error('高级示例执行失败:', error.message);
  }
}

/**
 * SDK客户端使用示例
 */
async function sdkExample() {
  console.log('=== SDK客户端使用示例 ===\n');

  try {
    // 1. 直接使用现货客户端
    console.log('1. 直接使用现货客户端...');
    const spotClient = tradingPairsService.createSpotClient();
    const spotInfo = await spotClient.getExchangeInfo();
    const activePairs = spotInfo.symbols.filter(s => s.status === 'TRADING');
    console.log(`   现货交易对总数: ${activePairs.length}`);
    console.log();

    // 2. 直接使用合约客户端
    console.log('2. 直接使用合约客户端...');
    const futuresClient = tradingPairsService.createUSDMClient();
    const futuresInfo = await futuresClient.getExchangeInfo();
    const activeFutures = futuresInfo.symbols.filter(
      s => s.status === 'TRADING' && s.contractType === 'PERPETUAL'
    );
    console.log(`   合约交易对总数: ${activeFutures.length}`);
    console.log();

  } catch (error) {
    console.error('SDK示例执行失败:', error.message);
  }
}

/**
 * 实用工具函数示例
 */
async function utilityExample() {
  console.log('=== 实用工具函数示例 ===\n');

  try {
    // 1. 查找特定模式的交易对
    console.log('1. 查找包含"1000"的合约交易对...');
    const futuresPairs = await tradingPairsService.fetchFuturesTradingPairs();
    const thousandPairs = futuresPairs.filter(pair => pair.includes('1000'));
    console.log(`   找到 ${thousandPairs.length} 个包含"1000"的合约交易对`);
    console.log(`   示例: ${thousandPairs.slice(0, 10).join(', ')}`);
    console.log();

    // 2. 查找USDC交易对
    console.log('2. 查找USDC交易对...');
    const spotPairs = await tradingPairsService.fetchSpotTradingPairs();
    const usdcPairs = spotPairs.filter(pair => pair.endsWith('USDC'));
    console.log(`   现货USDC交易对数量: ${usdcPairs.length}`);

    const futuresUsdcPairs = futuresPairs.filter(pair => pair.endsWith('USDC'));
    console.log(`   合约USDC交易对数量: ${futuresUsdcPairs.length}`);
    console.log();

    // 3. 比较热门币种在现货和合约的可用性
    console.log('3. 热门币种可用性分析...');
    const popularCoins = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOGE', 'XRP'];

    for (const coin of popularCoins) {
      const usdtPair = `${coin}USDT`;
      const analysis = await tradingPairsService.analyzeTradingPairAvailability(usdtPair);
      const status = analysis.hasSpot && analysis.hasFutures ? '✅' :
        analysis.hasSpot ? '📊' :
          analysis.hasFutures ? '📈' : '❌';
      console.log(`   ${usdtPair.padEnd(10)} ${status} ${analysis.category}`);
    }
    console.log('\n   图例: ✅ 现货+合约  📊 仅现货  📈 仅合约  ❌ 都不可用');

  } catch (error) {
    console.error('实用工具示例执行失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 币安交易对比较功能示例\n');

  await basicExample();
  await advancedExample();
  await sdkExample();
  await utilityExample();

  console.log('\n✅ 所有示例执行完成！');
}

// 如果直接运行此文件则执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 示例执行过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  basicExample,
  advancedExample,
  sdkExample,
  utilityExample
};