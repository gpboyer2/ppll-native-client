/**
 * 测试事件管理器功能
 * 用于验证日志记录机制是否正常工作
 */

const usd_m_futures_infinite_grid_event_manager = require('../managers/usd-m-futures-infinite-grid-event-manager');

async function testEventManager() {
  console.log('=== 开始测试事件管理器 ===\n');

  try {
    // 测试1：记录警告事件
    console.log('测试1：记录警告事件...');
    const warnResult = await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategy_id: 1,
      trading_pair: 'UNIUSDT',
      event_type: usd_m_futures_infinite_grid_event_manager.eventTypes.WARN,
      level: 'warn',
      message: '测试警告消息：API请求频率过高',
      details: {
        endpoint: '/api/v1/order',
        rate_limit: 1200,
        current_usage: 1150
      }
    });
    console.log('✓ 警告事件记录成功:', warnResult.id);

    // 测试2：记录成功事件
    console.log('\n测试2：记录成功事件...');
    const successResult = await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategy_id: 1,
      trading_pair: 'UNIUSDT',
      event_type: usd_m_futures_infinite_grid_event_manager.eventTypes.SUCCESS,
      level: 'success',
      message: '建仓成功: BUY 10.5 @ 5.25',
      details: {
        side: 'BUY',
        quantity: 10.5,
        price: 5.25,
        order_id: '123456789'
      }
    });
    console.log('✓ 成功事件记录成功:', successResult.id);

    // 测试3：记录错误事件
    console.log('\n测试3：记录错误事件...');
    const errorResult = await usd_m_futures_infinite_grid_event_manager.logEvent({
      strategy_id: 1,
      trading_pair: 'UNIUSDT',
      event_type: usd_m_futures_infinite_grid_event_manager.eventTypes.ERROR,
      level: 'error',
      message: '创建订单失败：余额不足',
      details: {
        error_code: -2019,
        error_msg: 'Not enough balance',
        required: 100,
        available: 50
      }
    });
    console.log('✓ 错误事件记录成功:', errorResult.id);

    // 测试4：查询日志
    console.log('\n测试4：查询日志列表...');
    const logs = await usd_m_futures_infinite_grid_event_manager.getLogs(
      { strategy_id: 1 },
      { current_page: 1, page_size: 10 }
    );
    console.log(`✓ 查询到 ${logs.pagination.total} 条日志记录`);
    console.log('最新日志:');
    logs.list.slice(0, 3).forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.level}] ${log.message}`);
    });

    // 测试5：获取统计信息
    console.log('\n测试5：获取统计信息...');
    const stats = await usd_m_futures_infinite_grid_event_manager.getStatistics(1);
    console.log('✓ 统计信息:', stats);

    console.log('\n=== 所有测试完成 ===');
    console.log('✅ 事件管理器工作正常！');
    console.log('💡 如果前端仍然看不到日志，请检查：');
    console.log('   1. 策略是否正在运行（只有运行中的策略才会产生日志）');
    console.log('   2. 前端是否正确调用了日志API');
    console.log('   3. 浏览器控制台是否有错误信息');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testEventManager().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
