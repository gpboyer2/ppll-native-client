/**
 * 测试日志数据库写入功能
 * 验证新的批量写入机制和智能过滤是否正常工作
 */
const StrategyLog = require("../utils/strategy-log.js");

// 创建测试日志记录器
const testLogger = StrategyLog.createLogger({
    symbol: "BTCUSDT",
    apiKey: "test_api_key_for_logger_test",
    market: "um",
    direction: "long",
    strategyId: 999,
});

async function testLoggerWrite() {
    console.log("开始测试日志数据库写入功能...\n");

    // 测试1: 普通日志（应该被过滤，不写入数据库）
    console.log("测试1: 普通日志（应该被过滤）");
    await testLogger.log("这是一条普通日志，不应该写入数据库");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试2: 包含重要关键词的日志（应该写入数据库）
    console.log('测试2: 包含"价格"关键词的日志（应该写入数据库）');
    await testLogger.log("当前价格: 50000 USDT");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试3: 包含"暂停"关键词的日志（应该写入数据库，事件类型为 pause）
    console.log('测试3: 包含"暂停"关键词的日志（应该写入数据库）');
    await testLogger.log("⛔️ 币价小于等于限制价格，暂停网格");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试4: 包含"持仓数量"关键词的日志（应该写入数据库）
    console.log('测试4: 包含"持仓数量"关键词的日志（应该写入数据库）');
    await testLogger.log(
        "当前总持仓数量为 0.1/BTCUSDT, 限制最大持仓数量为 1/BTCUSDT",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试5: warn 级别日志（应该写入数据库）
    console.log("测试5: warn 级别日志（应该写入数据库）");
    await testLogger.warn("这是一个警告信息");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试6: error 级别日志（应该写入数据库）
    console.log("测试6: error 级别日志（应该写入数据库）");
    await testLogger.error("这是一个错误信息");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试7: 建仓成功日志（应该写入数据库，事件类型为 open_position）
    console.log("测试7: 建仓成功日志（应该写入数据库）");
    await testLogger.log("🎉 建仓成功");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试8: 平仓成功日志（应该写入数据库，事件类型为 close_position）
    console.log("测试8: 平仓成功日志（应该写入数据库）");
    await testLogger.log("🎉 平仓成功");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 等待队列处理完成
    console.log("\n等待日志队列处理完成（3秒）...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n测试完成！请检查数据库中的日志记录。");
    console.log("预期结果:");
    console.log("- 测试1: 不应该在数据库中（被过滤）");
    console.log("- 测试2-8: 应该在数据库中，事件类型正确识别");

    process.exit(0);
}

testLoggerWrite().catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
});
