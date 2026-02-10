/**
 * USD-M 合约账户数据模型
 * 单用户系统：通过 api_key 实现数据隔离，存储不同 API Key 的币安 USD-M 合约账户信息快照
 */
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UsdMFuturesAccount extends Model {
    static associate(models) {
      // 单用户系统，通过 api_key 实现数据隔离，无需用户关联
    }
  }

  UsdMFuturesAccount.init({
    api_key: {
      type: DataTypes.STRING(128),
      allowNull: false,
      primaryKey: true,
      comment: 'API密钥（主键，用于数据隔离）'
    },
    account_json: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '账户数据JSON'
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
    modelName: 'usd_m_futures_account',
    tableName: 'usd_m_futures_account',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return UsdMFuturesAccount;
};
