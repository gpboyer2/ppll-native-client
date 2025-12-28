"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class page_view_log extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/page_view_log` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  page_view_log.init(
    {
      // id: {
      //   type: DataTypes.BIGINT,
      //   autoIncrement: true,
      //   primaryKey: true,
      //   comment: '主键ID'
      // },
      page: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "页面路径",
      },
      referrer: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "来源页面",
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "设备/浏览器信息",
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: "IP地址",
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "停留时长(秒)",
      },
      extra_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "扩展信息(JSON)",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "访问时间",
      },
    },
    {
      sequelize,
      modelName: "page_view_log",
      tableName: "page_view_log",
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return page_view_log;
};
