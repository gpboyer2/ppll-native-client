'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class robot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/robot` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  robot.init({
    // id: {
    //   type: DataTypes.INTEGER,
    //   primaryKey: true,
    //   autoIncrement: true,
    //   comment: '主键ID',
    // },
    apiKey: {
      type: DataTypes.STRING,
      comment: 'API密钥',
    },
    apiSecret: {
      type: DataTypes.STRING,
      comment: 'API密钥Secret',
    },
    symbol: {
      type: DataTypes.STRING,
      comment: '交易对',
    },
    minPrice: {
      type: DataTypes.INTEGER,
      comment: '最小价格',
    },
    maxPrice: {
      type: DataTypes.INTEGER,
      comment: '最大价格',
    },
    maxOpenPositionQuantity: {
      type: DataTypes.INTEGER,
      comment: '最大持仓数量',
    },
    minOpenPositionQuantity: {
      type: DataTypes.INTEGER,
      comment: '最小持仓数量',
    },
    leverage: {
      type: DataTypes.INTEGER,
      comment: '杠杆倍数',
    },
    gridPriceDifference: {
      type: DataTypes.INTEGER,
      comment: '网格价差',
    },
    gridTradeQuantity: {
      type: DataTypes.INTEGER,
      comment: '网格交易数量',
    },
    initialFillPrice: {
      type: DataTypes.INTEGER,
      comment: '初始成交价格',
    },
    initialFillQuantity: {
      type: DataTypes.INTEGER,
      comment: '初始成交数量',
    },
    pollingInterval: {
      type: DataTypes.INTEGER,
      comment: '轮询间隔',
    },
    fallPreventionCoefficient: {
      type: DataTypes.STRING,
      comment: '防跌系数',
    },
    robotname: {
      type: DataTypes.STRING,
      comment: '机器人名称',
    },
    message: {
      type: DataTypes.STRING,
      comment: '消息内容',
    },
    remark: {
      type: DataTypes.STRING,
      comment: '备注',
    },
    active: {
      type: DataTypes.INTEGER,
      comment: '是否激活',
    },
    status: {
      type: DataTypes.INTEGER,
      comment: '状态',
    },
    deleted: {
      type: DataTypes.INTEGER,
      comment: '是否删除',
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间',
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间',
    },
  }, {
    sequelize,
    modelName: 'robots',
    tableName: 'robots',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '机器人表',
  });

  robot.isEmailTaken = async (apiKey, excluderobotId) => {
    const robot = await robot.findOne({
      where: {
        apiKey,
        robotId: {
          [Op.ne]: excluderobotId
        }
      }
    });
    return robot;
  };

  return robot;
};