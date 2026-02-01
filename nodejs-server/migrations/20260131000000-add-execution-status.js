/**
 * 数据库迁移脚本
 * 添加 execution_status 字段到 grid_strategies 表
 * 日期：2026-01-31
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加 execution_status 字段
    await queryInterface.addColumn('grid_strategies', 'execution_status', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'INITIALIZING',
      comment: '策略执行状态(TRADING/PAUSED_MANUAL/PRICE_ABOVE_MAX/PRICE_BELOW_MIN/PRICE_ABOVE_OPEN/PRICE_BELOW_OPEN/API_KEY_INVALID/NETWORK_ERROR/INSUFFICIENT_BALANCE/INITIALIZING/OTHER_ERROR)',
      after: 'paused'
    });

    console.log('数据库迁移完成：已添加 execution_status 字段到 grid_strategies 表');
  },

  down: async (queryInterface) => {
    // 回滚：删除 execution_status 字段
    await queryInterface.removeColumn('grid_strategies', 'execution_status');
    console.log('数据库回滚完成：已删除 execution_status 字段');
  }
};
