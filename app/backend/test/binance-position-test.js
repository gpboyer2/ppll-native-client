/**
 * 测试币安 U 本位合约持仓信息 API
 * 验证返回的字段，特别是 entryPrice 和 breakEvenPrice
 */
const { USDMClient } = require('binance');
const proxy = require('../utils/proxy.js');
const db = require('../models');

async function testPositionAPI() {
  console.log('=== 币安 U 本位合约持仓信息测试 ===\n');

  // 从数据库获取 API Key
  let api_key, api_secret;
  try {
    const keyRecord = await db.binance_api_keys.findOne({
      where: { status: 2, deleted: 0 },
      order: [['created_at', 'DESC']]
    });
    if (keyRecord) {
      api_key = keyRecord.api_key;
      api_secret = keyRecord.api_secret;
      console.log(`使用 API Key: ${keyRecord.name} (${api_key?.substring(0, 8)}...)`);
    }
  } catch (error) {
    console.log('从数据库获取 API Key 失败:', error.message);
  }

  if (!api_key || !api_secret) {
    console.error('错误: 未找到有效的币安 API Key');
    console.log('请先在系统中配置币安 API Key');
    return;
  }

  const requestOptions = {
    timeout: 10000,
  };

  // 从环境变量读取代理配置
  const proxyConfig = proxy.getProxyConfig();
  if (proxyConfig) {
    requestOptions.proxy = proxyConfig;
    console.log('使用代理:', proxyConfig);
  }

  const client = new USDMClient({
    api_key: api_key,
    api_secret: api_secret,
    beautify: true,
  }, requestOptions);

  try {
    console.log('1. 调用 getAccountInformation()...\n');
    const account = await client.getAccountInformation();
    console.log('账户总余额:', account.availableBalance, 'USDT');
    console.log('持仓数量:', account.positions?.length || 0);

    // 找出有持仓的交易对
    const activePositions = account.positions?.filter(p => parseFloat(p.positionAmt) !== 0) || [];
    console.log('活跃持仓数量:', activePositions.length);

    if (activePositions.length === 0) {
      console.log('\n当前没有持仓，无法测试完整字段');
      console.log('\n2. 调用 getPositionsV3() 获取所有交易对...\n');
    } else {
      console.log('\n2. 有持仓的交易对 (来自 getAccountInformation):');
      console.log('-'.repeat(100));
      console.log(sprintf('%-15s %-10s %-15s %-15s %-15s %-15s',
        '交易对', '方向', '持仓量', '开仓均价', '保本价格', '标记价格'));
      console.log('-'.repeat(100));

      for (const pos of activePositions.slice(0, 5)) {
        console.log(sprintf('%-15s %-10s %-15s %-15s %-15s %-15s',
          pos.symbol,
          pos.positionSide,
          pos.positionAmt,
          pos.entryPrice || 'N/A',
          pos.breakEvenPrice || 'N/A',
          pos.markPrice || 'N/A'
        ));
      }
    }

    console.log('\n3. 调用 getPositionsV3() 获取完整持仓信息...\n');
    const positions = await client.getPositionsV3();

    console.log('返回总数:', positions.length);

    // 找出有持仓的交易对
    const activePositionsV3 = positions.filter(p => parseFloat(p.positionAmt) !== 0);
    console.log('活跃持仓数量:', activePositionsV3.length);

    if (activePositionsV3.length > 0) {
      console.log('\n有持仓的交易对 (来自 getPositionsV3):');
      console.log('-'.repeat(120));
      console.log(sprintf('%-15s %-10s %-15s %-15s %-18s %-15s %-15s %-10s',
        '交易对', '方向', '持仓量', '开仓均价', '保本价格', '标记价格', '强平价格', '杠杆'));
      console.log('-'.repeat(120));

      for (const pos of activePositionsV3) {
        console.log(sprintf('%-15s %-10s %-15s %-15s %-18s %-15s %-15s %-10s',
          pos.symbol,
          pos.positionSide,
          pos.positionAmt,
          pos.entryPrice,
          pos.breakEvenPrice,
          pos.markPrice,
          pos.liquidationPrice,
          pos.leverage + 'x'
        ));
      }

      console.log('\n4. 字段说明:');
      console.log('  entryPrice      - 开仓均价（平均开仓价格）');
      console.log('  breakEvenPrice  - 保本价格（包含手续费的开仓成本价，平仓时达到此价格不亏不赚）');
      console.log('  markPrice       - 标记价格（当前市场价格，用于计算未实现盈亏）');
      console.log('  liquidationPrice - 强平价格（价格达到此值会被强制平仓）');

      console.log('\n5. 关键发现:');
      console.log('  breakEvenPrice 是什么？');
      console.log('  - 它是币安官方计算的"保本价格"');
      console.log('  - 包含了交易手续费的成本');
      console.log('  - 当 markPrice 达到 breakEvenPrice 时，平仓后不亏不赚');
      console.log('  - 这个值已经考虑了所有历史开仓/加仓/减仓操作的平均成本');

      console.log('\n6. 与 entryPrice 的区别:');
      const firstPos = activePositionsV3[0];
      if (firstPos) {
        const entryPrice = parseFloat(firstPos.entryPrice);
        const breakEvenPrice = parseFloat(firstPos.breakEvenPrice);
        const diff = ((breakEvenPrice - entryPrice) / entryPrice * 100).toFixed(4);
        console.log(`  示例 ${firstPos.symbol}:`);
        console.log(`    entryPrice: ${entryPrice} (纯开仓均价)`);
        console.log(`    breakEvenPrice: ${breakEvenPrice} (含手续费保本价)`);
        console.log(`    差异: ${diff}% (这是手续费成本)`);
      }

    } else {
      console.log('\n当前没有持仓，显示所有返回的交易对字段示例:');
      if (positions.length > 0) {
        const sample = positions[0];
        console.log('\n第一个交易对的字段:');
        for (const key of Object.keys(sample)) {
          console.log(`  ${key}: ${sample[key]}`);
        }
      }
    }

  } catch (error) {
    console.error('调用失败:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    if (error.body) {
      console.error('响应体:', error.body);
    }
  }
}

// 简单的 sprintf 实现
function sprintf(format, ...args) {
  return format.replace(/%-?(\d+)?s/g, (match, width) => {
    const arg = args.shift();
    const str = String(arg);
    if (!width) return str;
    const numWidth = parseInt(width);
    if (match.startsWith('%-')) {
      return str.padEnd(numWidth);
    } else {
      return str.padStart(numWidth);
    }
  });
}

// 运行测试
testPositionAPI().then(() => {
  console.log('\n测试完成');
  process.exit(0);
}).catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
