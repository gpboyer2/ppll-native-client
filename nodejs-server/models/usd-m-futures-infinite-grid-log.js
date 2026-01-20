/**
 * U本位合约无限网格策略日志模型
 * 用于存储网格策略插件的运行日志和事件
 */
'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UsdMFuturesInfiniteGridLog extends Model {
    static associate(models) {
      // 无关联
    }
  }

  UsdMFuturesInfiniteGridLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID',
      },
      strategy_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '关联的网格策略ID',
      },
      trading_pair: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '交易对',
      },
      event_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '事件类型: pause/resume/open_position/close_position/limit_reached',
      },
      level: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'info',
        comment: '日志级别: error/warn/info/success/debug',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '日志消息内容',
      },
      details: {
        type: DataTypes.JSON,
        comment: '详细信息JSON',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
    },
    {
      sequelize,
      modelName: "usd_m_futures_infinite_grid_logs",
      tableName: "usd_m_futures_infinite_grid_logs",
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return UsdMFuturesInfiniteGridLog;
};
