/**
 * 操作日志模型（单用户系统，无需 user_id）
 * 表：operation_logs
 */
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class OperationLogs extends Model {
        /**
         * 定义模型关联关系（单用户系统，无关联）
         */
        static associate(models) {
            // 单用户系统，无需用户关联
        }
    }

    OperationLogs.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                comment: "主键ID",
            },
            operator: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: "操作人员",
            },
            module: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "所属模块，例如 user/orders/trading",
            },
            action: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: "操作类型",
            },
            summary: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: "操作概要",
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "操作描述",
            },
            page: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: "所在页面路径",
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
                comment: "操作IP（支持IPv4/IPv6）",
            },
            location: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: "操作地点（国家/省/市/ISP）",
            },
            os: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "操作系统，例如 Windows/MacOS/Linux/iOS/Android",
            },
            browser: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "浏览器类型，例如 Chrome/Firefox/Safari",
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "设备/浏览器信息（User-Agent）",
            },
            status: {
                type: DataTypes.TINYINT,
                allowNull: false,
                defaultValue: 1, // 默认成功
                comment: "操作状态(0:失败,1:成功)",
            },
            extra_data: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: "扩展信息（JSON，敏感键已在应用层脱敏）",
            },
            operation_time: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "操作时间",
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "记录时间",
            },
        },
        {
            sequelize,
            modelName: "operation_logs",
            tableName: "operation_logs",
            timestamps: false, // 使用自定义字段
        },
    );

    return OperationLogs;
};
