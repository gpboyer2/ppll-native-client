/**
 * 订单模型
 * 定义订单数据的结构和关联关系
 */
'use strict';

const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/order` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  Order.init({
    // id: {
    //   type: DataTypes.BIGINT,
    //   primaryKey: true,
    //   autoIncrement: true,
    //   comment: '主键ID'
    // },
    api_key: {
      type: DataTypes.STRING(255),
      field: 'api_key',
      comment: 'API密钥'
    },
    api_secret: {
      type: DataTypes.STRING(255),
      field: 'api_secret',
      comment: 'API密钥Secret'
    },
    order_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: '订单ID'
    },
    client_order_id: {
      type: DataTypes.STRING(64),
      comment: '客户端订单ID'
    },
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '交易对'
    },
    side: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: '买卖方向(BUY/SELL)'
    },
    position_side: {
      type: DataTypes.STRING(10),
      comment: '持仓方向(LONG/SHORT)'
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '订单类型(LIMIT/MARKET等)'
    },
    quantity: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: '订单数量'
    },
    price: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '订单价格'
    },
    stop_price: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '触发价格(止损止盈订单)'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '订单状态(NEW/FILLED/CANCELED等)'
    },
    time_in_force: {
      type: DataTypes.STRING(10),
      comment: '有效方式(GTC/IOC/FOK)'
    },
    executed_qty: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: '已成交数量'
    },
    executed_price: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '成交均价'
    },
    executed_amount: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: '成交金额(USDT)'
    },
    fee: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: '手续费'
    },
    fee_asset: {
      type: DataTypes.STRING(10),
      defaultValue: 'USDT',
      comment: '手续费资产类型'
    },
    realized_pnl: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: '已实现盈亏'
    },
    grid_id: {
      type: DataTypes.STRING(64),
      comment: '网格策略ID'
    },
    grid_level: {
      type: DataTypes.INTEGER,
      comment: '网格层级'
    },
    grid_type: {
      type: DataTypes.STRING(20),
      comment: '网格类型(LONG/SHORT)'
    },
    grid_price_difference: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '网格价差'
    },
    grid_trade_quantity: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '网格交易数量'
    },
    max_position_quantity: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '最大持仓数量'
    },
    min_position_quantity: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '最小持仓数量'
    },
    fall_prevention_coefficient: {
      type: DataTypes.DECIMAL(20, 8),
      comment: '防跌系数'
    },
    source: {
      type: DataTypes.STRING(20),
      comment: '订单来源(GRID/MANUAL)'
    },
    execution_type: {
      type: DataTypes.STRING(20),
      comment: '执行方式(HTTP/WEBSOCKET)'
    },
    remark: {
      type: DataTypes.STRING(255),
      comment: '备注'
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    sequelize,
    modelName: 'orders',
    tableName: 'orders',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Order.isEmailTaken = async (email, excludeOrderId) => {
    const orderRecord = await Order.findOne({
      where: {
        email,
        orderId: {
          [Op.ne]: excludeOrderId
        }
      }
    });
    return orderRecord;
  };

  Order.isPasswordMatch = async (password, hash) => {
    return Date.now();
  };

  return Order;
};