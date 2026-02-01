/**
 * 网格策略状态映射工具
 * 基于后端的 execution_status 字段进行前端显示状态转换
 */

import type { StrategyStatus, ExecutionStatus } from '../types/grid-strategy';

/**
 * 将后端的执行状态映射为前端的显示状态
 * @param item 策略数据对象（包含 status 和 execution_status）
 * @returns 前端显示状态
 */
export function getStrategyDisplayStatus(item: {
  status?: string;
  execution_status?: ExecutionStatus;
}): StrategyStatus {
  // 1. 优先使用生命周期状态
  const lifecycleStatus = item.status?.toUpperCase();
  if (lifecycleStatus === 'STOPPED' || lifecycleStatus === 'DELETED') {
    return 'stopped';
  }

  // 2. 使用执行状态
  const executionStatus = item.execution_status?.toUpperCase();

  switch (executionStatus) {
    case 'TRADING':
    case 'INITIALIZING':
      return 'running';

    case 'PAUSED_MANUAL':
      return 'paused';

    case 'PRICE_ABOVE_MAX':
    case 'PRICE_BELOW_MIN':
    case 'PRICE_ABOVE_OPEN':
    case 'PRICE_BELOW_OPEN':
      return 'running'; // 策略活着但条件不满足

    case 'API_KEY_INVALID':
    case 'NETWORK_ERROR':
    case 'INSUFFICIENT_BALANCE':
    case 'OTHER_ERROR':
      return 'stopped'; // 错误状态

    default:
      // 兼容旧逻辑：如果没有 execution_status，默认为运行中
      return 'running';
  }
}

/**
 * 获取执行状态的中文描述
 * @param executionStatus 执行状态
 * @returns 中文描述
 */
export function getStrategyStatusText(executionStatus?: ExecutionStatus): string {
  if (!executionStatus) {
    return '未知';
  }

  switch (executionStatus) {
    case 'TRADING':
      return '运行中';
    case 'PAUSED_MANUAL':
      return '已暂停';
    case 'PRICE_ABOVE_MAX':
      return '价格超上限';
    case 'PRICE_BELOW_MIN':
      return '价格超下限';
    case 'PRICE_ABOVE_OPEN':
      return '价格超开仓价';
    case 'PRICE_BELOW_OPEN':
      return '价格低于开仓价';
    case 'API_KEY_INVALID':
      return 'API Key 错误';
    case 'NETWORK_ERROR':
      return '网络错误';
    case 'INSUFFICIENT_BALANCE':
      return '余额不足';
    case 'OTHER_ERROR':
      return '异常';
    case 'INITIALIZING':
      return '初始化中';
    default:
      return '未知';
  }
}
