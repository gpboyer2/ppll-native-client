"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class BinanceUmTradingPairs extends Model {
        /**
         * 检查交易对数据是否需要更新
         * @returns {Promise<boolean>} 返回true表示需要更新
         */
        static async needsUpdate() {
            try {
                const record = await this.findOne({
                    order: [["updated_at", "DESC"]],
                    limit: 1,
                });

                if (!record) return true;

                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                return record.updated_at < oneDayAgo;
            } catch (error) {
                console.error("检查交易对更新状态失败:", error);
                return true;
            }
        }
    }

    BinanceUmTradingPairs.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
                comment: "主键ID",
            },
            symbol: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                comment: "交易对符号，如BTCUSDT",
            },
            base_asset: {
                type: DataTypes.STRING(20),
                allowNull: false,
                comment: "基础资产，如BTC",
            },
            quote_asset: {
                type: DataTypes.STRING(20),
                allowNull: false,
                comment: "计价资产，如USDT",
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: "created_at",
                comment: "创建时间",
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: "updated_at",
                comment: "更新时间",
            },
        },
        {
            sequelize,
            modelName: "binance_um_trading_pairs",
            tableName: "binance_um_trading_pairs",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    );

    return BinanceUmTradingPairs;
};
