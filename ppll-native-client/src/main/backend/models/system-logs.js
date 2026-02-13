/**
 * 系统日志模型
 * 定义系统日志数据的结构和关联关系，与数据库表 system_logs 保持一致
 */
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class SystemLogs extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    SystemLogs.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                comment: "主键ID",
            },
            module: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "所属模块，例如 user/orders/trading",
            },
            api_endpoint: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: "接口地址，例如 /v1/orders/create",
            },
            http_method: {
                type: DataTypes.STRING(16),
                allowNull: true,
                comment: "HTTP方法，例如 GET/POST",
            },
            status_code: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: "HTTP状态码，例如 200/400/500",
            },
            error_code: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: "错误码，例如 BINANCE-1001",
            },
            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "错误信息",
            },
            request_data: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "请求内容（字符串，可能为JSON）",
            },
            response_data: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "响应内容（字符串，可能为JSON）",
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
                comment: "IP地址（支持IPv4/IPv6）",
            },
            location: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: "地点，例如 北京市朝阳区",
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: "设备/浏览器信息（User-Agent）",
            },
            os_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "操作系统名称，例如 Windows 10/MacOS 15",
            },
            browser_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: "浏览器类型，例如 Chrome 128/Firefox 129",
            },
            response_time: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: "请求耗时（毫秒）",
            },
            extra_data: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: "扩展信息（JSON，对常见敏感键脱敏后存储）",
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "创建时间/请求时间",
            },
        },
        {
            sequelize,
            modelName: "system_logs",
            tableName: "system_logs",
            timestamps: false, // 禁用自动时间戳，使用 created_at 字段
        },
    );

    return SystemLogs;
};
