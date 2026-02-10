/**
 * 网格策略事件类型常量
 * 简化为核心分类，便于前端筛选展示
 */

const GridEventTypes = {
  /** 策略初始化 */
  INIT: 'init',

  /** 订单操作（开仓、平仓、查询） */
  ORDER: 'order',

  /** 账户信息 */
  ACCOUNT: 'account',

  /** 交易所信息 */
  EXCHANGE: 'exchange',

  /** 网格运行（轮询、触发条件） */
  GRID: 'grid',

  /** 错误 */
  ERROR: 'error',
};

module.exports = GridEventTypes;
