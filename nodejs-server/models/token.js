'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class token extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/token` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  token.init({
    // id: {
    //   type: DataTypes.INTEGER,
    //   autoIncrement: true,
    //   primaryKey: true,
    //   comment: '主键ID'
    // },
    token: {
      type: DataTypes.STRING,
      comment: '令牌'
    },
    user_id: {
      type: DataTypes.STRING,
      comment: '用户ID'
    },
    type: {
      type: DataTypes.STRING,
      comment: '令牌类型'
    },
    expire_at: {
      type: DataTypes.DATE,
      comment: '过期时间'
    },
    black_listed: {
      type: DataTypes.INTEGER,
      comment: '是否在黑名单'
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
    modelName: 'tokens',
    tableName: 'tokens',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return token;
};