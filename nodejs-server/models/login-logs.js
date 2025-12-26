"use strict";

// 登录日志数据模型（单用户系统，无需 user_id）
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class login_logs extends Model {
    static associate(models) {
      // 单用户系统，无需用户关联
    }
  }

  login_logs.init(
    {
      username: { type: DataTypes.STRING(64), allowNull: true, comment: "用户名" },
      apiKey: { type: DataTypes.STRING(255), allowNull: true, comment: "API密钥" },
      apiSecret: { type: DataTypes.STRING(255), allowNull: true, comment: "API密钥Secret（敏感）" },
      login_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, comment: "登录时间" },
      ip: { type: DataTypes.STRING(64), allowNull: true, comment: "登录IP" },
      location: { type: DataTypes.STRING(255), allowNull: true, comment: "登录地址详情" },
      user_agent: { type: DataTypes.STRING(500), allowNull: true, comment: "User-Agent" },
      browser: { type: DataTypes.STRING(255), allowNull: true, comment: "浏览器类型" },
      os: { type: DataTypes.STRING(255), allowNull: true, comment: "操作系统" },
      device: { type: DataTypes.STRING(255), allowNull: true, comment: "设备" },
      method: { type: DataTypes.STRING(64), allowNull: true, comment: "登录方式" },
      login_system: { type: DataTypes.STRING(16), allowNull: true, comment: "登录系统(app/admin)" },
      status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, comment: "登录状态(0:失败,1:成功)" },
      fail_reason: { type: DataTypes.STRING(255), allowNull: true, comment: "失败原因" },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, comment: "创建时间" },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, comment: "更新时间" },
    },
    {
      sequelize,
      modelName: "login_logs",
      tableName: "login_logs",
      timestamps: false,
    }
  );

  return login_logs;
};

