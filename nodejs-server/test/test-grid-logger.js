/**
 * 测试新的 GridStrategyLogger
 * 验证独立日志类的功能
 */
const { GridStrategyLogger } = require('../utils/grid-strategy-logger.js');

async function testGridLogger() {
  console.log('开始测试 GridStrategyLogger...\n');

  // 创建测试日志记录器
  const logger = new GridStrategyLogger({
    symbol: 'BTCUSDT',
    apiKey: 'test_api_key',
    market: 'um',
    direction: 'long',
    strategyId: 888
  });

  // 测试1: 普通日志（应该被过滤）
  console.log('测试1: 普通日志（应该被过滤）');
  await logger.log('这是一条普通日志，不应该写入数据库');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试2: 价格日志（应该写入，event_type: price_check）
  console.log('测试2: 价格日志');
  await logger.log('当前价格: 50000 USDT');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试3: 暂停日志（应该写入，event_type: pause）
  console.log('测试3: 暂停日志');
  await logger.log('⛔️ 币价小于等于限制价格，暂停网格');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试4: 持仓数量日志（应该写入，event_type: position_check）
  console.log('测试4: 持仓数量日志');
  await logger.log('当前总持仓数量为 0.1/BTCUSDT, 限制最大持仓数量为 1/BTCUSDT');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试5: 建仓成功日志（应该写入，event_type: open_position）
  console.log('测试5: 建仓成功日志');
  await logger.log('🎉 建仓成功');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试6: 平仓成功日志（应该写入，event_type: close_position）
  console.log('测试6: 平仓成功日志');
  await logger.log('🎉 平仓成功');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试7: warn 级别日志（应该写入，event_type: warn）
  console.log('测试7: warn 日志');
  await logger.warn('这是一个警告信息');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试8: error 级别日志（应该写入，event_type: error）
  console.log('测试8: error 日志');
  await logger.error('这是一个错误信息');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试9: 订单日志（应该写入，event_type: open_position）
  console.log('测试9: 订单日志');
  await logger.order('create', { orderId: 123456, symbol: 'BTCUSDT', price: 50000 });
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试10: 交易所数据日志（不应该写入数据库）
  console.log('测试10: 交易所数据日志（不应该写入数据库）');
  await logger.exchange('getAccount', { balances: [{ asset: 'USDT', free: 1000 }] });
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试11: trace 日志（不应该写入数据库）
  console.log('测试11: trace 日志（不应该写入数据库）');
  await logger.trace('这是一条 trace 日志');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 测试12: 初始化日志（应该写入，event_type: init）
  console.log('测试12: 初始化日志');
  await logger.log('✅ 策略初始化完成，网格已恢复运行');
  await new Promise(resolve => setTimeout(resolve, 100));

  // 等待队列处理完成
  console.log('\n等待日志队列处理完成（3秒）...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n测试完成！');
  console.log('请检查数据库中的日志记录。');
  console.log('预期结果:');
  console.log('- 测试1, 10, 11: 不应该在数据库中（被过滤）');
  console.log('- 测试2-9, 12: 应该在数据库中，事件类型正确识别');

  process.exit(0);
}

testGridLogger().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
