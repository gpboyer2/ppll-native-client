import './index.scss';

export function NetworkErrorTip() {
  return (
    <div className="network-error-tip">
      <div className="network-error-tip-header">
        <span className="network-error-tip-icon">💡</span>
        <span className="network-error-tip-title">可能是网络连接问题</span>
      </div>
      <div className="network-error-tip-content">
        <p className="network-error-tip-description">
          如果您在中国大陆地区使用币安API，可能需要开启或者切换网络代理才能正常连接。
        </p>
        <p className="network-error-tip-note">
          配置完成后请手动刷新页面。
        </p>
        <div className="network-error-tip-actions">
          <button
            type="button"
            className="network-error-tip-refresh-button"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      </div>
    </div>
  );
}
