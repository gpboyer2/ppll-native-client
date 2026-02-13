const db = require("../models");

(async () => {
    try {
        console.log("测试写入不存在的 strategyId...");

        // 尝试写入一个不存在的 strategyId
        const log = await db.usd_m_futures_infinite_grid_logs.create({
            strategy_id: 99999, // 不存在的 ID
            trading_pair: "TESTUSDT",
            event_type: "test",
            level: "info",
            message: "测试不存在的外键约束",
            details: null,
        });

        console.log("✅ 写入成功！ID:", log.id);
        console.log("证明：外键约束已成功删除");

        // 清理测试数据
        await log.destroy();
        console.log("测试数据已清理");
    } catch (error) {
        console.error("❌ 写入失败:", error.message);
    }
    process.exit(0);
})();
