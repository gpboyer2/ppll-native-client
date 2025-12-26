/**
 * 网格策略类型定义
 * 基于 GridStrategyService 的参数结构
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
  positionSide: PositionSide;

  /** 必填，交易对 */
  tradingPair: string;

  /** 必填，币安API Key */
  apiKey: string;

  /** 必填，币安API Secret */
  apiSecret: string;

  /** 初始建仓的数量 */
  initialFillPrice: number;

  /** 杠杆倍数, 默认20(不足20的设为最大倍数) */
  leverage: number;

  /** 限制的最大的持仓数量,为null或者undefined则不做限制 eg: 1个ETH */
  maxOpenPositionQuantity: number | undefined;

  /** 限制的最少的持仓数量,为null或者undefined则不做限制 eg: 0.2个ETH */
  minOpenPositionQuantity: number | undefined;

  /** 必填，网格之间的价格差价 */
  gridPriceDifference: number | undefined;

  /** 网格每次交易的数量（向后兼容，当没有设置分离数量时使用） */
  gridTradeQuantity: number | undefined;

  /** 做多方向：每次增加多单持仓的数量 */
  gridLongOpenQuantity: number | undefined;

  /** 做多方向：每次减少多单持仓的数量 */
  gridLongCloseQuantity: number | undefined;

  /** 做空方向：每次增加空单持仓的数量（开空单） */
  gridShortOpenQuantity: number | undefined;

  /** 做空方向：每次减少空单持仓的数量（平空单） */
  gridShortCloseQuantity: number | undefined;

  /** 防跌/防涨系数：系数越大，价格变动时的触发价格会下放的更低，为0时固定使用网格差价 */
  fallPreventionCoefficient: number;

  /** 大于等于某价格时暂停网格 */
  gtLimitationPrice: number | undefined;

  /** 小于等于某价格时暂停网格 */
  ltLimitationPrice: number | undefined;

  /** 是否开启"当价格大于等于开仓价格时则暂停网格" */
  isAboveOpenPrice: boolean;

  /** 是否开启"当价格低于等于开仓价格时则暂停网格" */
  isBelowOpenPrice: boolean;

  /** 获得最新价格的轮询间隔时间，单位：毫秒 */
  pollingInterval: number;

  /** 是否启用日志输出，默认为 true */
  enableLog: boolean;

  /** 允许'顺势仅减仓策略' */
  priorityCloseOnTrend: boolean;

  /** 计算平均成本价的默认天数 */
  avgCostPriceDays: number;

  /** 策略运行状态（前端维护） */
  status?: StrategyStatus;

  /** 创建时间（前端维护） */
  createdAt?: string;

  /** 更新时间（前端维护） */
  updatedAt?: string;
}

/** 网格策略表单数据类型（用于编辑） */
export type GridStrategyForm = Omit<GridStrategy, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
    /** 内部字段：选择的 API Key ID（不保存到数据库） */
    _apiKeyId?: number;
};

/** 网格策略列表项类型（用于列表展示） */
export interface GridStrategyListItem {
  id: string;
  positionSide: PositionSide;
  tradingPair: string;
  leverage: number;
  status: StrategyStatus;
  createdAt: string;
}

/** 默认策略配置 */
export const defaultGridStrategy: GridStrategyForm = {
  positionSide: 'LONG',
  tradingPair: '',
  apiKey: '',
  apiSecret: '',
  initialFillPrice: 0,
  leverage: 20,
  maxOpenPositionQuantity: undefined,
  minOpenPositionQuantity: undefined,
  gridPriceDifference: undefined,
  gridTradeQuantity: undefined,
  gridLongOpenQuantity: undefined,
  gridLongCloseQuantity: undefined,
  gridShortOpenQuantity: undefined,
  gridShortCloseQuantity: undefined,
  fallPreventionCoefficient: 0,
  gtLimitationPrice: undefined,
  ltLimitationPrice: undefined,
  isAboveOpenPrice: false,
  isBelowOpenPrice: false,
  pollingInterval: 10000,
  enableLog: true,
  priorityCloseOnTrend: true,
  avgCostPriceDays: 30
};

/** 筛选条件类型 */
export interface StrategyFilter {
  keyword: string;
  positionSide: 'all' | 'LONG' | 'SHORT';
  status: 'all' | StrategyStatus;
}
