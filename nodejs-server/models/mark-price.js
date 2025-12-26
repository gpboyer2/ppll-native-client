/**
 * 标记价格模型
 * 定义标记价格数据的结构和关联关系
 */
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MarkPrice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/mark-price` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  MarkPrice.init(
    {
      // id: {
      //   type: DataTypes.INTEGER,
      //   autoIncrement: true,
      //   primaryKey: true,
      //   comment: '主键ID',
      // },
      event_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'markPriceUpdate',
        comment: '事件类型',
      },
      event_time: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '事件时间',
      },
      symbol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '交易对',
      },
      mark_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '标记价格',
      },
      index_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '现货指数价格',
      },
      estimated_settle_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: '预估结算价，仅在结算前最后一小时有参考价值',
      },
      funding_rate: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: '资金费率',
      },
      next_funding_time: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: '下次资金时间',
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
      modelName: 'MarkPrice',
      tableName: 'mark_price',
      // 使用下划线命名的时间戳字段
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return MarkPrice;
};