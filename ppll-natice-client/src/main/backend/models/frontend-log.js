/**
 * 前端日志模型
 * 用于存储前端 console 日志（log/error/warn/info/table/debug 等）
 * 表：frontend_logs
 */
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class FrontendLog extends Model {
        /**
         * 定义模型关联关系
         */
        static associate(models) {
            // 无需关联
        }
    }

    FrontendLog.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                comment: "主键ID",
            },
            log_data: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: "日志数据（JSON 格式，用于 console.table 等复杂数据）",
            },
            log_timestamp: {
                type: DataTypes.BIGINT,
                allowNull: true,
                comment: "前端日志时间戳（毫秒，用于按前端执行时间排序）",
            },
            page_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
                comment: "当前页面 URL",
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "浏览器信息（User-Agent）",
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "日志记录时间",
            },
        },
        {
            sequelize,
            modelName: "frontend_log",
            tableName: "frontend_logs",
            timestamps: false,
        },
    );

    return FrontendLog;
};
