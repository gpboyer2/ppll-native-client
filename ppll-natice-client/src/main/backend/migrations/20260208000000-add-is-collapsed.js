/**
 * 数据库迁移脚本
 * 添加 is_collapsed 字段到 orders 表
 * 日期：2026-02-08
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 添加 is_collapsed 字段
        await queryInterface.addColumn("orders", "is_collapsed", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0,
            comment: "是否折叠（仅快捷订单使用）",
        });

        console.log("数据库迁移完成：已添加 is_collapsed 字段到 orders 表");
    },

    down: async (queryInterface) => {
        // 回滚：删除 is_collapsed 字段
        await queryInterface.removeColumn("orders", "is_collapsed");
        console.log("数据库回滚完成：已删除 is_collapsed 字段");
    },
};
