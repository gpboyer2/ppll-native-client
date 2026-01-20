const db = require('../models');

(async () => {
  try {
    // 查询现有的策略ID
    const strategies = await db.grid_strategies.findAll({
      attributes: ['id', 'trading_pair'],
      limit: 5,
      order: [['id', 'DESC']]
    });
    console.log('现有的策略:');
    strategies.forEach(s => console.log(`  ID: ${s.id}, 交易对: ${s.trading_pair}`));

    if (strategies.length > 0) {
      const testStrategyId = strategies[0].id;
      console.log(`\n使用策略ID ${testStrategyId} 测试写入日志...`);

      const log = await db.usd_m_futures_infinite_grid_logs.create({
        strategy_id: testStrategyId,
        trading_pair: 'TESTUSDT',
        event_type: 'test',
        level: 'info',
        message: '测试日志',
        details: null
      });
      console.log('写入成功! ID:', log.id);

      // 查询确认
      const count = await db.usd_m_futures_infinite_grid_logs.count();
      const logs = await db.usd_m_futures_infinite_grid_logs.findAll({
        where: { event_type: 'test' },
        limit: 1
      });
      console.log('当前记录数:', count);
      console.log('最新日志:', logs[0]?.message);

      // 清理测试数据
      await log.destroy();
      console.log('测试数据已清理');
    }
  } catch (error) {
    console.error('错误:', error.message);
  }
  process.exit(0);
})();
