#!/usr/bin/env node

const { program } = require('commander');
const tradingPairsComparisonService = require('../service/trading-pairs-comparison.service.js');

program
  .name('trading-pairs-cli')
  .description('币安交易对比较工具')
  .version('1.0.0');

// 获取有合约但没有现货的交易对
program
  .command('futures-only')
  .description('获取有合约但没有现货的交易对')
  .option('-l, --limit <number>', '限制显示数量', '20')
  .action(async (options) => {
    try {
      console.log('正在获取有合约但没有现货的交易对...\n');
      const result = await tradingPairsComparisonService.getFuturesOnlyPairs();

      console.log(`📊 统计信息:`);
      console.log(`   总数量: ${result.count}`);
      console.log(`   描述: ${result.description}\n`);

      const limit = parseInt(options.limit);
      const displayPairs = limit > 0 ? result.pairs.slice(0, limit) : result.pairs;

      console.log(`📋 交易对列表 (显示前 ${displayPairs.length} 个):`);
      displayPairs.forEach((pair, index) => {
        console.log(`   ${(index + 1).toString().padStart(3)}: ${pair}`);
      });

      if (result.pairs.length > limit) {
        console.log(`   ... 还有 ${result.pairs.length - limit} 个交易对`);
      }
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

// 获取有现货但没有合约的交易对
program
  .command('spot-only')
  .description('获取有现货但没有合约的交易对')
  .option('-l, --limit <number>', '限制显示数量', '20')
  .action(async (options) => {
    try {
      console.log('正在获取有现货但没有合约的交易对...\n');
      const result = await tradingPairsComparisonService.getSpotOnlyPairs();

      console.log(`📊 统计信息:`);
      console.log(`   总数量: ${result.count}`);
      console.log(`   描述: ${result.description}\n`);

      const limit = parseInt(options.limit);
      const displayPairs = limit > 0 ? result.pairs.slice(0, limit) : result.pairs;

      console.log(`📋 交易对列表 (显示前 ${displayPairs.length} 个):`);
      displayPairs.forEach((pair, index) => {
        console.log(`   ${(index + 1).toString().padStart(3)}: ${pair}`);
      });

      if (result.pairs.length > limit) {
        console.log(`   ... 还有 ${result.pairs.length - limit} 个交易对`);
      }
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

// 获取完整报告
program
  .command('report')
  .description('获取完整的交易对比较报告')
  .option('-d, --details', '显示详细信息')
  .action(async (options) => {
    try {
      console.log('正在生成完整的交易对比较报告...\n');
      const result = await tradingPairsComparisonService.getComparisonReport();

      console.log(`📊 总体统计:`);
      console.log(`   总现货交易对数: ${result.summary.totalSpotPairs}`);
      console.log(`   总合约交易对数: ${result.summary.totalFuturesPairs}`);
      console.log(`   共同交易对数: ${result.summary.commonPairs}`);
      console.log(`   仅合约交易对数: ${result.summary.futuresOnlyCount}`);
      console.log(`   仅现货交易对数: ${result.summary.spotOnlyCount}`);
      console.log(`   生成时间: ${result.generatedAt}\n`);

      if (options.details) {
        console.log(`🔄 共同交易对 (前20个):`);
        result.commonPairs.pairs.slice(0, 20).forEach((pair, index) => {
          console.log(`   ${(index + 1).toString().padStart(3)}: ${pair}`);
        });

        console.log(`\n📈 仅合约交易对 (前20个):`);
        result.futuresOnly.pairs.slice(0, 20).forEach((pair, index) => {
          console.log(`   ${(index + 1).toString().padStart(3)}: ${pair}`);
        });

        console.log(`\n💰 仅现货交易对 (前20个):`);
        result.spotOnly.pairs.slice(0, 20).forEach((pair, index) => {
          console.log(`   ${(index + 1).toString().padStart(3)}: ${pair}`);
        });
      }
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

// 分析特定交易对
program
  .command('analyze <symbol>')
  .description('分析特定交易对的可用性')
  .action(async (symbol) => {
    try {
      console.log(`正在分析交易对 ${symbol.toUpperCase()}...\n`);
      const result = await tradingPairsComparisonService.analyzeTradingPairAvailability(symbol.toUpperCase());

      console.log(`🔍 分析结果:`);
      console.log(`   交易对: ${result.symbol}`);
      console.log(`   现货可用: ${result.hasSpot ? '✅ 是' : '❌ 否'}`);
      console.log(`   合约可用: ${result.hasFutures ? '✅ 是' : '❌ 否'}`);
      console.log(`   分类: ${result.category}`);
      console.log(`   检查时间: ${result.checkedAt}`);
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

// 基础资产分析
program
  .command('base-assets')
  .description('分析基础资产在现货和合约中的分布')
  .option('-d, --details', '显示详细资产列表')
  .action(async (options) => {
    try {
      console.log('正在分析基础资产分布...\n');
      const result = await tradingPairsComparisonService.getBaseAssetAnalysis();

      console.log(`📊 基础资产统计:`);
      console.log(`   总基础资产数: ${result.summary.totalBaseAssets}`);
      console.log(`   共同资产数: ${result.summary.commonAssetsCount}`);
      console.log(`   仅现货资产数: ${result.summary.spotOnlyAssetsCount}`);
      console.log(`   仅合约资产数: ${result.summary.futuresOnlyAssetsCount}`);
      console.log(`   分析时间: ${result.generatedAt}\n`);

      if (options.details) {
        if (result.details.futuresOnlyAssets.length > 0) {
          console.log(`📈 仅合约资产 (${result.details.futuresOnlyAssets.length}个):`);
          result.details.futuresOnlyAssets.slice(0, 30).forEach((asset, index) => {
            console.log(`   ${(index + 1).toString().padStart(3)}: ${asset}`);
          });
          if (result.details.futuresOnlyAssets.length > 30) {
            console.log(`   ... 还有 ${result.details.futuresOnlyAssets.length - 30} 个资产`);
          }
          console.log();
        }

        if (result.details.spotOnlyAssets.length > 0) {
          console.log(`💰 仅现货资产 (${result.details.spotOnlyAssets.length}个):`);
          result.details.spotOnlyAssets.slice(0, 30).forEach((asset, index) => {
            console.log(`   ${(index + 1).toString().padStart(3)}: ${asset}`);
          });
          if (result.details.spotOnlyAssets.length > 30) {
            console.log(`   ... 还有 ${result.details.spotOnlyAssets.length - 30} 个资产`);
          }
          console.log();
        }

        console.log(`🔄 共同资产 (前30个):`);
        result.details.commonAssets.slice(0, 30).forEach((asset, index) => {
          console.log(`   ${(index + 1).toString().padStart(3)}: ${asset}`);
        });
        if (result.details.commonAssets.length > 30) {
          console.log(`   ... 还有 ${result.details.commonAssets.length - 30} 个资产`);
        }
      }
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

// 批量分析交易对
program
  .command('batch-analyze <symbols...>')
  .description('批量分析多个交易对的可用性')
  .action(async (symbols) => {
    try {
      console.log(`正在批量分析 ${symbols.length} 个交易对...\n`);

      console.log(`交易对分析结果:`);
      console.log(`${'交易对'.padEnd(15)} | ${'现货'.padEnd(6)} | ${'合约'.padEnd(6)} | 分类`);
      console.log(`${'-'.repeat(50)}`);

      for (const symbol of symbols) {
        try {
          const result = await tradingPairsComparisonService.analyzeTradingPairAvailability(symbol.toUpperCase());
          const spotStatus = result.hasSpot ? '✅' : '❌';
          const futuresStatus = result.hasFutures ? '✅' : '❌';
          console.log(`${result.symbol.padEnd(15)} | ${spotStatus.padEnd(6)} | ${futuresStatus.padEnd(6)} | ${result.category}`);
        } catch (error) {
          console.log(`${symbol.toUpperCase().padEnd(15)} | ${'❌'.padEnd(6)} | ${'❌'.padEnd(6)} | 分析失败`);
        }
      }
    } catch (error) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  });

program.parse();