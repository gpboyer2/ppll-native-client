/**
 * 网格策略状态映射工具
 * 基于后端的 execution_status 字段进行前端显示状态转换
 */

import type { StrategyStatus, ExecutionStatus } from '../types/grid-strategy'
import { EXECUTION_STATUS } from '../types/grid-strategy'

/**
 * 将后端的执行状态映射为前端的显示状态
 * @param item 策略数据对象（包含 status 和 execution_status）
 * @returns 前端显示状态
 */
export function getStrategyDisplayStatus(item: {
  status?: string
  execution_status?: ExecutionStatus
}): StrategyStatus {
  // 1. 优先使用生命周期状态
  const lifecycle_status = item.status?.toUpperCase()
  if (lifecycle_status === 'STOPPED' || lifecycle_status === 'DELETED') {
    return 'stopped'
  }

  // 2. 使用执行状态映射表
  const execution_status = item.execution_status?.toUpperCase()
  return EXECUTION_STATUS.display_status[execution_status as ExecutionStatus] || 'running'
}

/**
 * 获取执行状态的中文描述
 * @param executionStatus 执行状态
 * @returns 中文描述
 */
export function getStrategyStatusText(executionStatus?: ExecutionStatus): string {
  if (!executionStatus) {
    return '未知'
  }

  return EXECUTION_STATUS.label[executionStatus] || '未知'
}

/**
 * 判断是否可以切换暂停状态
 * @param execution_status 执行状态
 * @returns 是否可以切换暂停状态
 */
export function canTogglePause(execution_status?: ExecutionStatus): boolean {
  if (!execution_status) {
    return false
  }

  return (EXECUTION_STATUS.can_toggle_pause as readonly ExecutionStatus[]).includes(
    execution_status
  )
}
