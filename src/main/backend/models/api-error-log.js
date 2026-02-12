/**
 * API错误日志模型
 * 定义API错误日志数据的结构和关联关系
 */
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ApiErrorLog extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/api_error_log` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    ApiErrorLog.init(
        {
            // id: {
            //   type: DataTypes.BIGINT,
            //   autoIncrement: true,
            //   primaryKey: true,
            //   comment: '主键ID'
            // },
            api_endpoint: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: "接口地址",
            },
            http_method: {
                type: DataTypes.STRING(16),
                allowNull: true,
                comment: "请求方法(GET/POST等)",
            },
            status_code: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: "HTTP状态码",
            },
            error_code: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: "报错码",
            },
            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "报错信息",
            },
            request_data: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "请求参数",
            },
            response_data: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "接口返回内容",
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
                comment: "IP地址",
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "设备/浏览器信息",
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
                comment: "报错时间",
            },
        },
        {
            sequelize,
            modelName: "api_error_log",
            tableName: "api_error_log",
            timestamps: false, // 默认为true, 为false 表示禁用自动时间戳，不会生成 created_at 和 updatedAt 字段。
        },
    );

    return ApiErrorLog;
};
