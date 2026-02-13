/**
 * 测试新的 GridStrategyLogger
 * 验证独立日志类的功能
 */
const { GridStrategyLogger } = require("../utils/grid-strategy-logger.js");

async function testGridLogger() {
    console.log("开始测试 GridStrategyLogger...\n");

    // 创建测试日志记录器
    const logger = new GridStrategyLogger({
        symbol: "BTCUSDT",
        apiKey: "test_api_key",
        market: "um",
        direction: "long",
        strategyId: 888,
    });

    // 测试1: 普通日志（仅输出到终端，不写入数据库）
    console.log("测试1: 普通日志（仅终端输出）");
    logger.log("这是一条普通日志，不应该写入数据库");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试2: 价格日志（写入数据库）
    console.log("\n测试2: 价格日志（写入数据库）");
    logger.sql("price_check", "当前价格: 50000 USDT");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试3: 暂停日志（写入数据库）
    console.log("\n测试3: 暂停日志（写入数据库）");
    logger
        .sql("grid_pause", "⛔️ 币价小于等于限制价格，暂停网格")
        .log("⛔️ 根据用户要求, 将网格暂停");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试4: 持仓数量日志（写入数据库）
    console.log("\n测试4: 持仓数量日志（写入数据库）");
    logger.sql(
        "position_check",
        "当前总持仓数量为 0.1/BTCUSDT, 限制最大持仓数量为 1/BTCUSDT",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试5: 建仓成功日志（写入数据库）
    console.log("\n测试5: 建仓成功日志（写入数据库）");
    logger.sql("position_open_success", "🎉 建仓成功").log("🎉 建仓成功");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试6: 平仓成功日志（写入数据库）
    console.log("\n测试6: 平仓成功日志（写入数据库）");
    logger.sql("position_close_success", "🎉 平仓成功").log("🎉 平仓成功");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试7: warn 日志（仅终端输出）
    console.log("\n测试7: warn 日志（仅终端输出）");
    logger.warn("这是一个警告信息");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试8: error 日志（仅终端输出）
    console.log("\n测试8: error 日志（仅终端输出）");
    logger.error("这是一个错误信息");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试9: 订单日志（写入数据库）
    console.log("\n测试9: 订单日志（写入数据库）");
    logger.sql("order", "创建订单", {
        order: { orderId: 123456, symbol: "BTCUSDT", price: 50000 },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试10: 交易所数据日志（仅终端输出）
    console.log("\n测试10: 交易所数据日志（仅终端输出）");
    logger.debug("getAccount", { balances: [{ asset: "USDT", free: 1000 }] });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试11: 调试日志（仅终端输出）
    console.log("\n测试11: 调试日志（仅终端输出）");
    logger.debug("这是一条调试日志");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试12: 初始化日志（写入数据库）
    console.log("\n测试12: 初始化日志（写入数据库）");
    logger
        .sql("strategy_init_success", "✅ 策略初始化完成，网格已恢复运行")
        .log("✅ 策略初始化完成");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 等待队列处理完成
    console.log("\n等待日志队列处理完成（3秒）...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 检查错误统计
    console.log("\n错误统计信息:");
    const errorStats = logger.getErrorStats();
    console.log(JSON.stringify(errorStats, null, 2));

    console.log("\n测试完成！");
    console.log("请检查数据库中的日志记录。");
    console.log("预期结果：只有调用 .sql() 的日志才会写入数据库。");

    // 销毁日志记录器
    await logger.destroy();

    process.exit(0);
}

testGridLogger().catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
});
