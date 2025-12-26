/**
 * USD-M 合约账户数据模型
 * 单用户系统：存储用户的币安 USD-M 合约账户信息快照
 */
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class usd_m_futures_account extends Model {
    static associate(models) {
      // 单用户系统，无需用户关联
    }
  }

  usd_m_futures_account.init({
    account_json: {
      type: DataTypes.TEXT('long'),
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

  return usd_m_futures_account;
};
