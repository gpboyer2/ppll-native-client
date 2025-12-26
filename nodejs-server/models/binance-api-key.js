/**
 * Binance ApiKey 数据模型
 * 定义 Binance ApiKey 表结构和相关的数据库操作方法
 */
'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class binance_api_keys extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     */
    static associate(models) {
      // ApiKey 属于一个用户
      binance_api_keys.belongsTo(models.users, {
        foreignKey: 'user_id',
        targetKey: 'id',
        as: 'userInfo'
      });
    }
  }

  binance_api_keys.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联的用户ID'
    },
    name: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'API Key 名称'
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Binance API Key'
    },
    secret_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Binance Secret Key'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 2,
      comment: '状态(1:未知,2:启用,3:禁用)'
    },
    remark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '备注信息'
    },
    deleted: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否删除(0:未删除,1:已删除)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    sequelize,
    modelName: 'binance_api_keys',
    tableName: 'binance_api_keys',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'], name: 'idx_user_id' },
      { fields: ['api_key'], name: 'idx_api_key' },
      { fields: ['status'], name: 'idx_status' },
      { fields: ['deleted'], name: 'idx_deleted' }
    ]
  });

  return binance_api_keys;
};
