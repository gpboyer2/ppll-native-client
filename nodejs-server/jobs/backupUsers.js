const fs = require("fs");
const path = require("path");
const UtilRecord = require("../utils/record-log.js");
const userService = require("../service/user.service"); // 引入 userService

/**
 * @description 将 JS 值转换为 SQL 字符串字面量
 * @param {*} value
 * @returns {string}
 */
function escapeSqlValue(value) {
    if (value === null || typeof value === "undefined") {
        return "NULL";
    }
    if (typeof value === "string") {
        // 转义特殊字符，例如单引号
        return "'" + value.replace(/'/g, "''") + "'";
    }
    if (typeof value === "boolean") {
        return value ? "1" : "0";
    }
    if (value instanceof Date) {
        return "'" + value.toISOString().slice(0, 19).replace("T", " ") + "'";
    }
    return value; // 数字或其他类型直接返回
}

/**
 * @description 每次启动程序时备份 users 表的数据，不依赖外部 mysqldump
 */
async function backupUsersTable() {
    try {
        UtilRecord.log("开始执行用户表备份任务 (纯 Node.js 实现)... ");

        // 1. 通过 service 获取所有用户数据
        const users = await userService.getAllUsersForBackup();

        if (!users || users.length === 0) {
            UtilRecord.log("用户表为空，无需备份。");
            return;
        }

        // 2. 准备备份内容
        const columns = Object.keys(users[0]);
        const columnsSql = columns.map((col) => `"${col}"`).join(", ");

        let sqlContent = "";

        // 为每个用户生成 INSERT 语句
        users.forEach((user) => {
            const values = columns
                .map((col) => escapeSqlValue(user[col]))
                .join(", ");
            sqlContent += `INSERT INTO 
users
 (${columnsSql}) VALUES (${values});\n`;
        });

        // 3. 准备备份目录和文件
        const backupDir = path.join(__dirname, "..", "database");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            UtilRecord.log(`备份目录 ${backupDir} 已成功创建。`);
        }

        const now = new Date();
        const timestamp = now
            .toISOString()
            .slice(0, 19)
            .replace("T", "_")
            .replace(/:/g, "-");
        const backupFile = path.join(backupDir, `users_${timestamp}.sql`);

        // 4. 将 SQL 内容写入文件
        fs.writeFileSync(backupFile, sqlContent);

        UtilRecord.log(`用户表已成功备份至: ${backupFile}`);
    } catch (error) {
        UtilRecord.log(`执行备份任务时捕获到意外错误: ${error.stack}`);
    }
}

// 立即执行备份，并处理进程退出，确保在独立运行时能正确关闭数据库连接
(async () => {
    await backupUsersTable();
    // 独立脚本执行完毕后，可能需要手动关闭数据库连接池
    const db = require("../models/index");
    if (db.sequelize) {
        // FIX: 不能在此处关闭连接池，因为有其他服务在使用数据库连接
        // await db.sequelize.close();
    }
})();
