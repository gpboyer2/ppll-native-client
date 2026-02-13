const db = require("../models");

(async () => {
    try {
        const foreignKeys = await db.sequelize.query(
            "PRAGMA foreign_key_list(usd_m_futures_infinite_grid_logs);",
        );
        console.log("外键约束:", foreignKeys[0]);
        console.log("外键数量:", foreignKeys[0]?.length || 0);

        if (!foreignKeys[0] || foreignKeys[0].length === 0) {
            console.log("✅ 确认：没有外键约束");
        }
    } catch (error) {
        console.error("错误:", error.message);
    }
    process.exit(0);
})();
