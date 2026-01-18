/**
 * 小时 K 线数据模型
 * 存储不同币种的小时级别 K 线数据
 */
'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class HourlyKline extends Model {
    static associate(models) {
      // 如需关联可在此定义
    }
  }

  HourlyKline.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID',
      },
      symbol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '交易对',
      },
      open_time: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '开盘时间(毫秒时间戳)',
      },
      open: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '开盘价',
      },
      high: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '最高价',
      },
      low: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '最低价',
      },
      close: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '收盘价',
      },
      volume: {
        type: DataTypes.DECIMAL(30, 8),
        allowNull: false,
        comment: '成交量',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: '更新时间',
      },
    },
    {
      sequelize,
      modelName: 'HourlyKline',
      tableName: 'hourly_kline',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return HourlyKline;
};
