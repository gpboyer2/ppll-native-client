import React from 'react';

interface InfoItemProps {
    label: string;
    value?: string | number | null | undefined;
    type?: 'default' | 'status' | 'link' | 'path';
    status?: 'success' | 'danger' | 'warning';
    style?: React.CSSProperties;
    onClick?: () => void;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  type = 'default',
  status,
  style,
  onClick
}) => {
  const displayValue = value ?? '-';

  const renderValue = () => {
    if (type === 'status' && status) {
      const customStyle = style || {};
      if (status === 'success' && !style) {
        customStyle.background = 'color-mix(in srgb, #28a745 20%, var(--color-bg))';
        customStyle.color = '#28a745';
      } else if (status === 'danger' && !style) {
        customStyle.background = 'color-mix(in srgb, #dc3545 20%, var(--color-bg))';
        customStyle.color = '#dc3545';
      } else if (status === 'warning' && !style) {
        customStyle.background = 'color-mix(in srgb, #ffc107 20%, var(--color-bg))';
        customStyle.color = '#ffc107';
      }
      return <span className={`info-status ${status}`} style={customStyle}>{displayValue}</span>;
    }

    if (type === 'link') {
      return <span className="info-link" style={{ cursor: 'pointer', ...style }} onClick={onClick}>{displayValue}</span>;
    }

    if (type === 'path') {
      return <span className="info-path" style={style}>{displayValue}</span>;
    }

    return <span className="info-value" style={style}>{displayValue}</span>;
  };

  return (
    <div className="info-item" style={{ alignItems: type === 'path' ? 'flex-start' : 'center' }}>
      <span className="info-label">{label}</span>
      {renderValue()}
    </div>
  );
};

export default InfoItem;
