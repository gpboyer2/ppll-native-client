import { IconClock } from '@tabler/icons-react'
import './index.scss'
import { ICON_SIZE } from '../../../../constants/grid-strategy'

interface TimeInfoCardProps {
  created_at: string
  start_time?: string
  updated_at: string
  run_duration: string
}

export function TimeInfoCard({
  created_at,
  start_time,
  updated_at,
  run_duration
}: TimeInfoCardProps) {
  return (
    <div className="time-card">
      <div className="time-card-header">
        <IconClock size={ICON_SIZE.SMALL} />
        <span>时间信息</span>
      </div>
      <div className="time-card-body">
        <div className="time-row">
          <span className="time-label">创建时间</span>
          <span className="time-value">{new Date(created_at).toLocaleString()}</span>
        </div>
        {start_time && (
          <div className="time-row">
            <span className="time-label">启动时间</span>
            <span className="time-value">{new Date(start_time).toLocaleString()}</span>
          </div>
        )}
        <div className="time-row">
          <span className="time-label">更新时间</span>
          <span className="time-value">{new Date(updated_at).toLocaleString()}</span>
        </div>
        <div className="time-row">
          <span className="time-label">运行时长</span>
          <span className="time-value">{run_duration}</span>
        </div>
      </div>
    </div>
  )
}
