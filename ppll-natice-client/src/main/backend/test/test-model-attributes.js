/**
 * 测试脚本:验证 Sequelize 模型能否直接获取字段信息(包括注释)
 */

const db = require("../models");

async function testModelAttributes() {
    try {
        console.log("=== 测试 Sequelize 模型字段信息 ===\n");

        // 测试 grid_strategies 表
        const tableName = "grid_strategies";
        const model = db.sequelize.models[tableName];

        if (!model) {
            console.log(`❌ 模型 ${tableName} 不存在`);
            return;
        }

        console.log(`✅ 找到模型: ${tableName}`);
        console.log(
            `模型原始属性数量: ${Object.keys(model.rawAttributes).length}\n`,
        );

        // 输出前5个字段的详细信息
        const fields = Object.values(model.rawAttributes).slice(0, 5);

        fields.forEach((attr, index) => {
            console.log(`字段 ${index + 1}:`);
            console.log(`  fieldName: ${attr.fieldName}`);
            console.log(
                `  type: ${attr.type.toSql ? attr.type.toSql() : String(attr.type)}`,
            );
            console.log(`  allowNull: ${attr.allowNull}`);
            console.log(`  primaryKey: ${attr.primaryKey}`);
            console.log(`  defaultValue: ${attr.defaultValue}`);
            console.log(`  comment: ${attr.comment || "(无注释)"}`);
            console.log("");
        });

        // 测试能否转换为前端需要的格式
        console.log("=== 转换为前端格式 ===");
        const columns = Object.values(model.rawAttributes).map((attr) => ({
            name: attr.fieldName,
            type: attr.type.toSql ? attr.type.toSql() : String(attr.type),
            nullable: attr.allowNull,
            defaultValue: attr.defaultValue,
            primaryKey: attr.primaryKey,
            comment: attr.comment || null,
        }));

        console.log(`总字段数: ${columns.length}`);
        console.log("\n前3个字段示例:");
        columns.slice(0, 3).forEach((col, index) => {
            console.log(`${index + 1}. ${col.name}`);
            console.log(`   类型: ${col.type}`);
            console.log(`   可空: ${col.nullable}`);
            console.log(`   主键: ${col.primaryKey}`);
            console.log(`   默认值: ${col.defaultValue}`);
            console.log(`   注释: ${col.comment || "(无)"}`);
            console.log("");
        });

        // 对比 PRAGMA table_info 的结果
        console.log("=== 对比 PRAGMA table_info ===");
        const tableInfo = await db.sequelize.query(
            `PRAGMA table_info("${tableName}")`,
        );
        console.log(`PRAGMA 返回字段数: ${tableInfo[0].length}`);

        // 检查哪些字段在 PRAGMA 中有但在模型中没有
        const pragmaFields = tableInfo[0].map((col) => col.name);
        const modelFields = Object.values(model.rawAttributes).map(
            (attr) => attr.fieldName,
        );

        const onlyInPragma = pragmaFields.filter(
            (f) => !modelFields.includes(f),
        );
        const onlyInModel = modelFields.filter(
            (f) => !pragmaFields.includes(f),
        );

        if (onlyInPragma.length > 0) {
            console.log(`只在 PRAGMA 中的字段: ${onlyInPragma.join(", ")}`);
        }
        if (onlyInModel.length > 0) {
            console.log(`只在模型中的字段: ${onlyInModel.join(", ")}`);
        }
        if (onlyInPragma.length === 0 && onlyInModel.length === 0) {
            console.log("✅ PRAGMA 和模型的字段完全一致");
        }
    } catch (error) {
        console.error("❌ 测试失败:", error.message);
        console.error(error.stack);
    } finally {
        await db.sequelize.close();
    }
}

testModelAttributes();
