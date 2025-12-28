"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class GridTradeHistory extends Model {
    static associate(models) { }
  }

  GridTradeHistory.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: "主键ID",
      },
      grid_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: "网格策略ID",
      },
      trading_pair: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "交易对",
      },
      api_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: "API密钥",
      },
      grid_price_difference: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: "网格价差",
      },
      grid_trade_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: "网格交易数量",
      },
      max_position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "最大持仓数量",
      },
      min_position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "最小持仓数量",
      },
      fall_prevention_coefficient: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "防跌系数",
      },
      entry_order_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "开仓订单ID",
      },
      exit_order_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "平仓订单ID",
      },
      grid_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "网格层级",
      },
      entry_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "开仓价格",
      },
      exit_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "平仓价格",
      },
      position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "仓位数量",
      },
      profit_loss: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "收益(USDT)",
      },
      profit_loss_percentage: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "收益率(%)",
      },
      entry_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "开仓手续费",
      },
      exit_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "平仓手续费",
      },
      total_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "总手续费",
      },
      fee_asset: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: "USDT",
        comment: "手续费资产类型",
      },
      entry_time: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "开仓时间",
      },
      exit_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "平仓时间",
      },
      holding_period: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "持仓时长(秒)",
      },
      exchange: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "BINANCE",
        comment: "交易所",
      },
      exchange_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "USDT-M",
        comment: "交易所类型",
      },
      leverage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "杠杆倍数",
      },
      margin_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "保证金模式",
      },
      margin_used: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "占用保证金",
      },
      realized_roe: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "已实现收益率(%)",
      },
      unrealized_pnl: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "未实现盈亏",
      },
      liquidation_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "强平价格",
      },
      market_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "开仓时市场价格",
      },
      market_volume: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "开仓时24h成交量",
      },
      funding_rate: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "当时资金费率(%)",
      },
      execution_delay: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "执行延迟(ms)",
      },
      slippage: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "滑点(%)",
      },
      retry_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "重试次数",
      },
      error_message: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "错误信息",
      },
      trade_direction: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "交易方向(BUY/SELL)",
      },
      position_side: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: "持仓方向(LONG/SHORT)",
      },
      order_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "MARKET",
        comment: "订单类型(MARKET/LIMIT)",
      },
      time_in_force: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: "GTC",
        comment: "订单有效期(GTC/IOC/FOK)",
      },
      avg_entry_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "平均开仓价格",
      },
      avg_exit_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "平均平仓价格",
      },
      price_difference: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "开平仓价差",
      },
      price_difference_percentage: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "价差百分比(%)",
      },
      max_drawdown: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "最大回撤(%)",
      },
      risk_reward_ratio: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "风险收益比",
      },
      win_rate: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "胜率(%)",
      },
      initial_margin: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "初始保证金",
      },
      maintenance_margin: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "维持保证金",
      },
      funding_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "资金费用",
      },
      commission_asset: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: "USDT",
        comment: "手续费资产",
      },
      market_trend: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "市场趋势(BULLISH/BEARISH/SIDEWAYS)",
      },
      volatility: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "波动率(%)",
      },
      volume_ratio: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "成交量比率",
      },
      rsi_entry: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "开仓时RSI值",
      },
      rsi_exit: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "平仓时RSI值",
      },
      ma_signal: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "均线信号",
      },
      execution_quality: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "NORMAL",
        comment: "执行质量(EXCELLENT/GOOD/NORMAL/POOR)",
      },
      latency: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "网络延迟(ms)",
      },
      partial_fill_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "部分成交次数",
      },
      cancel_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "撤单次数",
      },
      execution_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "执行方式(HTTP/WEBSOCKET)",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "COMPLETED",
        comment: "状态(COMPLETED/FAILED)",
      },
      remark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "备注",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: '更新时间',
      },
    },
    {
      sequelize,
      modelName: "grid_trade_history",
      tableName: "grid_trade_history",
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return GridTradeHistory;
};
