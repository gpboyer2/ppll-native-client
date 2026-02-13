/**
 * 测试链式调用功能
 */
const { GridStrategyLogger } = require("../utils/grid-strategy-logger.js");

async function testChainCall() {
    console.log("开始测试链式调用...\n");

    // 创建测试日志记录器
    const logger = new GridStrategyLogger({
        symbol: "BTCUSDT",
        apiKey: "test_api_key",
        market: "um",
        direction: "long",
        strategyId: 999,
    });

    // 测试1: 只用 log
    console.log("测试1: 只用 log");
    logger.log("⛔️ 根据用户要求, 将网格暂停");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试2: 只用 sql
    console.log("\n测试2: 只用 sql");
    logger.sql("GRID", "⛔️ 用户手动暂停网格");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试3: 先 log 再 sql
    console.log("\n测试3: 先 log 再 sql");
    logger
        .log("⛔️ 根据用户要求, 将网格暂停")
        .sql("GRID", "⛔️ 用户手动暂停网格");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试4: 先 sql 再 log
    console.log("\n测试4: 先 sql 再 log");
    logger
        .sql("GRID", "⛔️ 用户手动暂停网格")
        .log("⛔️ 根据用户要求, 将网格暂停");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试5: 多次链式调用
    console.log("\n测试5: 多次链式调用");
    logger
        .log("第一次调用")
        .log("第二次调用")
        .sql("GRID", "写入数据库")
        .log("第三次调用");
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("\n链式调用测试完成！");
    console.log("如果看到所有日志都正常输出，说明链式调用功能正常。");

    process.exit(0);
}

testChainCall().catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
});
