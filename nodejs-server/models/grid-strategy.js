/**
 * 网格策略模型
 * 定义网格交易策略数据的结构和关联关系
 */
"use strict";

const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GridStrategy extends Model {
    /**
     * 关联关系定义
     * 单用户系统：API Key 即为用户标识，无需额外关联
     */
    static associate(models) {
      // API Key 本身就是用户标识，通过 api_key + api_secret 实现数据隔离
    }

    /**
     * 更新策略执行状态
     * @param {string} newStatus - 新的执行状态
     * @returns {Promise<void>}
     */
    async updateExecutionStatus(newStatus) {
      try {
        await this.update({ execution_status: newStatus });
        console.trace(`策略 ${this.id} 执行状态已更新为: ${newStatus}`);
      } catch (error) {
        console.trace(`策略 ${this.id} 更新执行状态失败:`, error);
        throw error;
      }
    }
  }

  GridStrategy.init(
    {
      // 主键ID（与表保持一致：bigint 自增）
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: "主键ID",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "策略名称",
      },
      trading_pair: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "交易对",
      },
      api_key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: "API密钥",
      },
      api_secret: {
        type: DataTypes.STRING(256),
        allowNull: false,
        comment: "API密钥Secret",
      },
      // 网格参数
      grid_price_difference: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: "网格价差",
      },
      grid_trade_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "网格交易数量(向后兼容)",
      },
      grid_long_open_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "做多开仓数量",
      },
      grid_long_close_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "做多平仓数量",
      },
      grid_short_open_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "做空开仓数量",
      },
      grid_short_close_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "做空平仓数量",
      },
      max_open_position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        comment: "最大持仓数量",
      },
      min_open_position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        comment: "最小持仓数量",
      },
      fall_prevention_coefficient: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: 0,
        comment: "防跌系数",
      },
      // 运行配置
      execution_type: {
        type: DataTypes.STRING(20),
        defaultValue: "WEBSOCKET",
        comment: "执行方式(HTTP/WEBSOCKET)",
      },
      polling_interval: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 10000,
        comment: "轮询间隔(毫秒)",
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: "RUNNING",
        comment: "状态(RUNNING/STOPPED/DELETED)",
      },
      total_open_position_quantity: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "当前持仓总数量",
      },
      total_open_position_value: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "当前持仓总价值",
      },
      total_pairing_times: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "总配对次数",
      },
      invested_margin: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "投入保证金",
      },
      funding_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "资金费用",
      },
      total_fee: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "总手续费",
      },
      liquidation_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "强平价格",
      },
      is_above_open_price: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "是否高于开仓价格(0:否,1:是)",
      },
      is_below_open_price: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "是否低于开仓价暂停(0:否,1:是)",
      },
      priority_close_on_trend: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
        comment: "顺势仅减仓策略(0:否,1:是)",
      },
      grid_strategy_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "网格策略名称",
      },
      position_side: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: "持仓方向(LONG/SHORT)",
      },
      paused: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "是否暂停(0:否,1:是),此字段表示用户手动暂停此网格",
      },
      execution_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'INITIALIZING',
        comment: "策略执行状态(TRADING/PAUSED_MANUAL/PRICE_ABOVE_MAX/PRICE_BELOW_MIN/PRICE_ABOVE_OPEN/PRICE_BELOW_OPEN/API_KEY_INVALID/NETWORK_ERROR/INSUFFICIENT_BALANCE/INITIALIZING/OTHER_ERROR)",
      },
      throttle_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "轮询限制状态",
      },
      gt_limitation_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "大于限制价格",
      },
      lt_limitation_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "小于限制价格",
      },
      // 统计
      total_profit_loss: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "总收益(USDT)",
      },
      total_trades: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "总交易次数",
      },
      successful_trades: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "成功交易次数",
      },
      failed_trades: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "失败交易次数",
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "策略启动时间",
      },
      last_trade_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "最后交易时间",
      },
      // 交易所与仓位/杠杆
      exchange: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "BINANCE",
        comment: "交易所(BINANCE/OKEX等)",
      },
      trading_mode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "交易模式(spot/usdt_futures/coin_futures)",
      },
      leverage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 20,
        comment: "杠杆倍数",
      },
      margin_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "ISOLATED",
        comment: "保证金模式(ISOLATED/CROSS)",
      },
      // 价格与精度
      price_precision: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 8,
        comment: "价格精度",
      },
      quantity_precision: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 8,
        comment: "数量精度",
      },
      min_notional: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "最小名义价值",
      },
      current_grid_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "当前网格价格",
      },
      last_grid_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "上一次网格价格",
      },
      // 风控
      stop_loss_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "止损价格",
      },
      take_profit_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "止盈价格",
      },
      max_drawdown: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: "最大回撤限制(%)",
      },
      daily_profit_limit: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "每日利润限制(USDT)",
      },
      // 运行质量与错误
      avg_execution_time: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "平均执行时间(ms)",
      },
      error_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "错误次数",
      },
      last_error_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "最后错误时间",
      },
      last_error_message: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "最后错误信息",
      },
      remark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "备注",
      },
      // 关键字段（新增）
      initial_fill_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: null,
        comment: "初始建仓价格",
      },
      total_open_position_entry_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "持仓平均开仓价/成本价",
      },
      next_expected_rise_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "预期上涨触发价",
      },
      next_expected_fall_price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "预期下跌触发价",
      },
      // 统计增强字段
      max_position_value: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "历史最大持仓价值",
      },
      max_profit_value: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "历史最大盈利价值",
      },
      max_single_loss: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "单笔最大亏损记录",
      },
      daily_max_loss: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        comment: "每日最大亏损限制",
      },
      today_profit: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        defaultValue: 0,
        comment: "今日盈利(负值表示亏损)",
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
      modelName: "grid_strategies",
      tableName: "grid_strategies",
      // 使用下划线命名的时间戳字段
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  // 辅助方法：检查 api_key 是否已被占用（排除指定 id）
  GridStrategy.is_api_key_taken = async (api_key, exclude_id) => {
    const row = await GridStrategy.findOne({
      where: {
        api_key,
        id: { [Op.ne]: exclude_id },
      },
    });
    return row;
  };

  return GridStrategy;
};
