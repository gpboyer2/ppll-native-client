/**
 * 网格策略类型定义
 * 基于 GridStrategyService 的参数结构
 * 所有字段名使用 snake_case，与后端完全一致
 */

/** 持仓方向类型 */
export type PositionSide = 'LONG' | 'SHORT';

/** 策略状态类型 */
export type StrategyStatus = 'running' | 'paused' | 'stopped';

/** 网格策略配置类型 */
export interface GridStrategy {
  /** 由GridStrategyService生成并传入的策略ID */
  id: string;

  /** 必填，持仓方向 */
  position_side: PositionSide;

  /** 必填，交易对 */
  trading_pair: string;

  /** 必填，币安API Key */
  api_key: string;

  /** 必填，币安API Secret */
  secret_key: string;

  /** 初始建仓的价格，不填值时自动按当前价格建仓 */
  initial_fill_price: number | undefined;

  /** 杠杆倍数, 默认20(不足20的设为最大倍数) */
  leverage: number;

  /** 限制的最大的持仓数量,为null或者undefined则不做限制 eg: 1个ETH */
  max_open_position_quantity: number | undefined;

  /** 限制的最少的持仓数量,为null或者undefined则不做限制 eg: 0.2个ETH */
  min_open_position_quantity: number | undefined;

  /** 必填，网格之间的价格差价 */
  grid_price_difference: number | undefined;

  /** 网格每次交易的数量（向后兼容，当没有设置分离数量时使用） */
  grid_trade_quantity: number | undefined;

  /** 做多方向：每次增加多单持仓的数量 */
  grid_long_open_quantity: number | undefined;

  /** 做多方向：每次减少多单持仓的数量 */
  grid_long_close_quantity: number | undefined;

  /** 做空方向：每次增加空单持仓的数量（开空单） */
  grid_short_open_quantity: number | undefined;

  /** 做空方向：每次减少空单持仓的数量（平空单） */
  grid_short_close_quantity: number | undefined;

  /** 防跌/防涨系数：系数越大，价格变动时的触发价格会下放的更低，为0时固定使用网格差价 */
  fall_prevention_coefficient: number;

  /** 大于等于某价格时暂停网格 */
  gt_limitation_price: number | undefined;

  /** 小于等于某价格时暂停网格 */
  lt_limitation_price: number | undefined;

  /** 是否开启"当价格大于等于开仓价格时则暂停网格" */
  is_above_open_price: boolean;

  /** 是否开启"当价格低于等于开仓价格时则暂停网格" */
  is_below_open_price: boolean;

  /** 获得最新价格的轮询间隔时间，单位：毫秒 */
  polling_interval: number;

  /** 是否启用日志输出，默认为 true */
  enable_log: boolean;

  /** 允许'顺势仅减仓策略' */
  priority_close_on_trend: boolean;

  /** 计算平均成本价的默认天数 */
  avg_cost_price_days: number;

  /** 止损价格 */
  stop_loss_price?: number;

  /** 止盈价格 */
  take_profit_price?: number;

  /** 保证金模式 (ISOLATED/CROSS) */
  margin_type?: string;

  /** 价格精度 */
  price_precision?: number;

  /** 数量精度 */
  quantity_precision?: number;

  /** 交易所类型 (SPOT/USDT-M/COIN-M) */
  exchange_type?: string;

  /** 策略运行状态（前端维护） */
  status?: StrategyStatus;

  /** 创建时间（前端维护） */
  created_at?: string;

  /** 更新时间（前端维护） */
  updated_at?: string;
}

/** 网格策略表单数据类型（用于编辑） */
export type GridStrategyForm = Omit<GridStrategy, 'id' | 'status' | 'created_at' | 'updated_at'> & {
    /** 内部字段：选择的 API Key ID（不保存到数据库） */
    _api_key_id?: number;
};

/** 网格策略列表项类型（用于列表展示） */
export interface GridStrategyListItem {
  id: string;
  position_side: PositionSide;
  trading_pair: string;
  leverage: number;
  status: StrategyStatus;
  created_at: string;
}

/** 默认策略配置 */
export const defaultGridStrategy: GridStrategyForm = {
  position_side: 'LONG',
  trading_pair: '',
  api_key: '',
  secret_key: '',
  initial_fill_price: undefined,
  leverage: 20,
  max_open_position_quantity: undefined,
  min_open_position_quantity: undefined,
  grid_price_difference: undefined,
  grid_trade_quantity: undefined,
  grid_long_open_quantity: undefined,
  grid_long_close_quantity: undefined,
  grid_short_open_quantity: undefined,
  grid_short_close_quantity: undefined,
  fall_prevention_coefficient: 0,
  gt_limitation_price: undefined,
  lt_limitation_price: undefined,
  is_above_open_price: false,
  is_below_open_price: false,
  polling_interval: 10000,
  enable_log: true,
  priority_close_on_trend: true,
  avg_cost_price_days: 30,
  stop_loss_price: undefined,
  take_profit_price: undefined
};

/** 筛选条件类型 */
export interface StrategyFilter {
  keyword: string;
  position_side: 'all' | 'LONG' | 'SHORT';
  status: 'all' | StrategyStatus;
}

// ==================== 智能配置相关类型 ====================

/**
 * 优化目标类型
 */
export type OptimizeTarget = 'profit' | 'cost';

/**
 * 单个网格配置方案
 */
export interface GridConfigOption {
  grid_spacing: string;
  grid_spacing_percent: string;
  trade_quantity: string;
  trade_value: string;
  expected_daily_frequency: string;
  expected_daily_profit: string;
  expected_daily_roi: string;
  single_net_profit: string;
  turnover_ratio: string;
}

/**
 * 市场分析数据
 */
export interface MarketAnalysis {
  current_price: string;
  support: string;
  resistance: string;
  avg_price: string;
  price_range: string;
  volatility: string;
  volatility_level: string;
  volatility_advice: string;
  atr: string;
  atr_desc: string;
  kline_count: number;
  algorithm_status: string;
  algorithm_source: string;
  spread_str?: string;
  spread_ratio?: number;
  identify_result?: any;
}

/**
 * 风险评估数据
 */
export interface RiskAssessment {
  level: string;
  score: number;
}

/**
 * 推荐配置详情
 */
export interface RecommendedConfig {
  grid_spacing: string;
  grid_spacing_percent: string;
  trade_quantity: string;
  trade_value: string;
  expected_daily_frequency: string;
  expected_daily_profit: string;
  expected_daily_fee: string;
  expected_daily_roi: string;
  single_net_profit: string;
  turnover_ratio: string;
  analysis?: {
    total_config_count: number;
    top_list: GridConfigOption[];
    avg_price: number;
  };
}

/**
 * 优化结果完整数据
 */
export interface OptimizationResult {
  symbol: string;
  interval: string;
  interval_label: string;
  optimize_target: string;
  optimize_target_label: string;
  enable_boundary_defense: boolean;
  total_capital: number;
  min_trade_value: number;
  max_trade_value: number;
  fee_rate: number;
  market: MarketAnalysis;
  risk: RiskAssessment;
  recommended: RecommendedConfig;
  boundary_defense?: RecommendedConfig;
}

/**
 * 应用到表单的配置数据
 */
export interface OptimizedConfig {
  grid_price_difference: number;
  grid_trade_quantity: number;
  gt_limitation_price?: number;
  lt_limitation_price?: number;
}

/**
 * 智能配置弹窗 Props
 */
export interface SmartConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onApply: (config: OptimizedConfig, commissionData?: {
    expected_daily_frequency: number;
    expected_daily_profit: number;
    trade_value: number;
  }) => void;
  default_params?: {
    trading_pair?: string;
    position_side?: PositionSide;
    api_key?: string;
    secret_key?: string;
  };
}
