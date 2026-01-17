"use strict";

const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BinanceExchangeInfo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here if needed
    }

    /**
     * 检查交易所信息是否需要更新
     * @returns {Promise<boolean>} 返回true表示需要更新
     */
    static async needsUpdate() {
      try {
        const record = await this.findOne({
          order: [["updated_at", "DESC"]],
          limit: 1,
        });

        // 无记录或记录为空时需要更新
        if (!record || !record.exchange_info) return true;

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return record.updated_at < oneDayAgo;
      } catch (error) {
        console.error("检查更新状态失败:", error);
        return true; // 出错时默认需要更新
      }
    }

    /**
     * 获取最新的有效交易所信息记录
     * @returns {Promise<BinanceExchangeInfo|null>} 返回最新有效记录
     */
    static async getLatest() {
      try {
        return await this.findOne({
          where: {
            exchange_info: {
              [Op.ne]: null, // 确保exchange_info不为空
            },
          },
          order: [["updated_at", "DESC"]],
          limit: 1,
        });
      } catch (error) {
        console.error("获取最新记录失败:", error);
        return null;
      }
    }
  }

  BinanceExchangeInfo.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: "主键ID",
      },
      exchange: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "binance",
        comment: "交易所名称: binance(币安), okx(欧易), gateio(芝麻开门)",
      },
      exchange_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "交易所信息(JSON格式)",
      },
      market_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "usdm",
        comment: "市场类型: usdm(U本位合约), coinm(币本位合约), spot(现货)",
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
      modelName: "binance_exchange_info",
      tableName: "binance_exchange_info",
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return BinanceExchangeInfo;
};
