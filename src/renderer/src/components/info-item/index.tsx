import React from 'react'

interface InfoItemProps {
  label: string
  value?: string | number | null | undefined
  type?: 'default' | 'status' | 'link' | 'path'
  status?: 'success' | 'danger' | 'warning'
  style?: React.CSSProperties
  onClick?: () => void
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  type = 'default',
  status,
  style,
  onClick
}) => {
  const displayValue = value ?? '-'

  const renderValue = () => {
    if (type === 'status' && status) {
      const statusStyles = {
        success: {
          background: 'color-mix(in srgb, #28a745 20%, var(--color-bg))',
          color: '#28a745'
        },
        danger: {
          background: 'color-mix(in srgb, #dc3545 20%, var(--color-bg))',
          color: '#dc3545'
        },
        warning: {
          background: 'color-mix(in srgb, #ffc107 20%, var(--color-bg))',
          color: '#ffc107'
        }
      }
      const customStyle = style ? { ...style } : statusStyles[status] || {}
      return (
        <span className={`info-status ${status}`} style={customStyle}>
          {displayValue}
        </span>
      )
    }

    if (type === 'link') {
      return (
        <span className="info-link" style={{ cursor: 'pointer', ...style }} onClick={onClick}>
          {displayValue}
        </span>
      )
    }

    if (type === 'path') {
      return (
        <span className="info-path" style={style}>
          {displayValue}
        </span>
      )
    }

    return (
      <span className="info-value" style={style}>
        {displayValue}
      </span>
    )
  }

  return (
    <div className="info-item" style={{ alignItems: type === 'path' ? 'flex-start' : 'center' }}>
      <span className="info-label">{label}</span>
      {renderValue()}
    </div>
  )
}

export default InfoItem
