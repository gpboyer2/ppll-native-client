'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Robot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/robot` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  Robot.init({
    // id: {
    //   type: DataTypes.INTEGER,
    //   primaryKey: true,
    //   autoIncrement: true,
    //   comment: '主键ID',
    // },
    api_key: {
      type: DataTypes.STRING,
      comment: 'API密钥',
    },
    secret_key: {
      type: DataTypes.STRING,
      comment: 'API密钥Secret',
    },
    trading_pair: {
      type: DataTypes.STRING,
      comment: '交易对',
    },
    min_price: {
      type: DataTypes.INTEGER,
      comment: '最小价格',
    },
    max_price: {
      type: DataTypes.INTEGER,
      comment: '最大价格',
    },
    max_open_position_quantity: {
      type: DataTypes.INTEGER,
      comment: '最大持仓数量',
    },
    min_open_position_quantity: {
      type: DataTypes.INTEGER,
      comment: '最小持仓数量',
    },
    leverage: {
      type: DataTypes.INTEGER,
      comment: '杠杆倍数',
    },
    grid_price_difference: {
      type: DataTypes.INTEGER,
      comment: '网格价差',
    },
    grid_trade_quantity: {
      type: DataTypes.INTEGER,
      comment: '网格交易数量',
    },
    initial_fill_price: {
      type: DataTypes.INTEGER,
      comment: '初始成交价格',
    },
    initial_fill_quantity: {
      type: DataTypes.INTEGER,
      comment: '初始成交数量',
    },
    polling_interval: {
      type: DataTypes.INTEGER,
      comment: '轮询间隔',
    },
    fall_prevention_coefficient: {
      type: DataTypes.STRING,
      comment: '防跌系数',
    },
    robot_name: {
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

  Robot.isEmailTaken = async (api_key, exclude_robot_id) => {
    const robotRecord = await Robot.findOne({
      where: {
        api_key,
        id: {
          [Op.ne]: exclude_robot_id
        }
      }
    });
    return robotRecord;
  };

  return Robot;
};