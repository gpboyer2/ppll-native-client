/**
 * 网格策略类型定义
 * 基于 GridStrategyService 的参数结构
 * 所有字段名使用 snake_case，与后端完全一致
 */

/** 持仓方向类型 */
export type PositionSide = 'LONG' | 'SHORT';

/** 策略状态类型 */
export type StrategyStatus = 'running' | 'paused' | 'stopped';

/** 策略执行状态常量（统一定义） */
export const EXECUTION_STATUS = {
  TRADING: 'TRADING',
  PAUSED_MANUAL: 'PAUSED_MANUAL',
  PRICE_ABOVE_MAX: 'PRICE_ABOVE_MAX',
  PRICE_BELOW_MIN: 'PRICE_BELOW_MIN',
  PRICE_ABOVE_OPEN: 'PRICE_ABOVE_OPEN',
  PRICE_BELOW_OPEN: 'PRICE_BELOW_OPEN',
  API_KEY_INVALID: 'API_KEY_INVALID',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  OTHER_ERROR: 'OTHER_ERROR',
  INITIALIZING: 'INITIALIZING',

  /** 显示状态映射 */
  display_status: {
    TRADING: 'running',
    PAUSED_MANUAL: 'paused',
    PRICE_ABOVE_MAX: 'paused',
    PRICE_BELOW_MIN: 'paused',
    PRICE_ABOVE_OPEN: 'paused',
    PRICE_BELOW_OPEN: 'paused',
    API_KEY_INVALID: 'stopped',
    NETWORK_ERROR: 'stopped',
    INSUFFICIENT_BALANCE: 'stopped',
    OTHER_ERROR: 'stopped',
    INITIALIZING: 'running',
  } as const,

  /** 中文描述映射 */
  label: {
    TRADING: '正常交易',
    PAUSED_MANUAL: '手动暂停',
    PRICE_ABOVE_MAX: '价格超过上限',
    PRICE_BELOW_MIN: '价格低于下限',
    PRICE_ABOVE_OPEN: '价格超过开仓价',
    PRICE_BELOW_OPEN: '价格低于开仓价',
    API_KEY_INVALID: 'API Key 无效',
    NETWORK_ERROR: '网络错误',
    INSUFFICIENT_BALANCE: '余额不足',
    OTHER_ERROR: '其他错误',
    INITIALIZING: '初始化中',
  } as const,

  /** 可暂停操作的状态列表 */
  can_toggle_pause: [
    'TRADING',
    'PAUSED_MANUAL',
    'PRICE_ABOVE_MAX',
    'PRICE_BELOW_MIN',
    'PRICE_ABOVE_OPEN',
    'PRICE_BELOW_OPEN',
    'INITIALIZING',
  ] as const,
} as const;

/** 策略执行状态类型（后端字段） */
export type ExecutionStatus = keyof typeof EXECUTION_STATUS.label;

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

  /** 交易模式 (spot/usdt_futures/coin_futures) */
  trading_mode?: string;

  /** 策略运行状态（前端维护） */
  status?: StrategyStatus;

  /** 策略执行状态（后端字段，细粒度状态） */
  execution_status?: ExecutionStatus;

  /** 创建时间（前端维护） */
  created_at?: string;

  /** 更新时间（前端维护） */
  updated_at?: string;

  /** 内部字段：关联的 API Key ID（前端维护，用于列表展示） */
  _api_key_id?: string;

  /** 内部字段：关联的 API Key 名称（前端维护，用于列表展示） */
  _api_key_name?: string;
}

/** 网格策略表单数据类型（用于编辑） */
export type GridStrategyForm = Omit<GridStrategy, 'id' | 'status' | 'created_at' | 'updated_at' | '_api_key_id' | '_api_key_name'> & {
  /** 内部字段：选择的 API Key ID（不保存到数据库） */
  _api_key_id?: number | string;

  /** 内部字段：关联的 API Key 名称（前端维护，用于列表展示） */
  _api_key_name?: string;
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
  take_profit_price: undefined,
  trading_mode: 'spot'
};

/** 筛选条件类型 */
export interface StrategyFilter {
  keyword: string;
  position_side: 'all' | 'LONG' | 'SHORT';
  status: 'all' | StrategyStatus;
  api_key_id: 'all' | string;
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

// ==================== 策略详情相关类型 ====================

/**
 * 网格策略插件日志
 */
export interface PluginLog {
  id: number;
  strategy_id: number;
  trading_pair: string;
  event_type: string;
  level: string;
  message: string;
  details: any;
  created_at: string;
}

/**
 * 网格策略详情(从后端 API 获取的完整数据)
 */
export interface GridStrategyDetail {
  id: number;
  name?: string;
  trading_pair: string;
  position_side: 'LONG' | 'SHORT';
  leverage: number;
  paused: boolean;
  remark: string;
  execution_status?: ExecutionStatus;
  grid_price_difference: number;
  grid_long_open_quantity?: number;
  grid_long_close_quantity?: number;
  grid_short_open_quantity?: number;
  grid_short_close_quantity?: number;
  total_open_position_quantity: number;
  total_open_position_value: number;
  total_open_position_entry_price: number;
  total_profit_loss: number;
  total_trades: number;
  total_pairing_times: number;
  total_fee: number;
  funding_fee: number;
  start_time?: string;
  created_at: string;
  updated_at: string;
  exchange?: string;
  trading_mode?: string;
  margin_type?: string;
  liquidation_price?: number;
  is_above_open_price?: boolean;
  is_below_open_price?: boolean;
}
