/**
 * 用户数据模型
 * 定义用户表结构和相关的数据库操作方法
 */
'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/users` file will call this method automatically.
     */
    static associate(models) {
      // 用户属于一个角色
      users.belongsTo(models.roles, {
        foreignKey: 'role',
        targetKey: 'code',
        as: 'roleInfo'
      });
    }
  }

  users.init({
    apiKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API密钥'
    },
    apiSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API密钥Secret'
    },
    vip_expire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'VIP到期时间'
    },
    permissions: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '用户权限(JSON字符串)'
    },
    username: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: '',
      comment: '用户名'
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: '',
      comment: '邮箱'
    },
    password: {
      type: DataTypes.STRING(256),
      allowNull: false,
      defaultValue: '',
      comment: '密码(加密)'
    },
    role: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'user',
      comment: '角色(user/admin/super_admin)'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 2,
      comment: '状态(1:未知,2:启用,3:禁用)'
    },
    active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '是否激活(0:未激活,1:激活)'
    },
    deleted: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否删除(0:未删除,1:已删除)'
    },
    last_login_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
    },
    last_login_ip: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '最后登录IP'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '用户token'
    },
    token_expire: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'token过期时间'
    },
    remark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '备注'
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '生日'
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
    modelName: 'users',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  users.isEmailTaken = async (email, excludeUserId) => {
    const result = await users.findOne({
      where: {
        email,
        userId: {
          [Op.ne]: excludeUserId
        }
      }
    });
    return result;
  }

  users.isPasswordMatch = async (password, hash) => {
    return Date.now();
  }
  return users;
};