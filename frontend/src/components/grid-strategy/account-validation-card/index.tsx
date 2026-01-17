import { showSuccess, showError } from '../../../utils/api-error';

interface AccountValidationData {
  availableBalance?: string;
  totalWalletBalance?: string;
  canTrade?: boolean;
}

interface AccountValidationProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: AccountValidationData;
  error?: string;
  ipAddress?: string;
}

export function AccountValidationCard({
  status,
  data,
  error,
  ipAddress
}: AccountValidationProps) {
  // 复制IP地址到剪贴板
  async function copyIpAddress(ip: string) {
    try {
      await navigator.clipboard.writeText(ip);
      showSuccess('IP地址已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      showError('复制失败，请手动复制');
    }
  }

  // idle 状态不显示
  if (status === 'idle') {
    return null;
  }

  return (
    <div className="surface mb-16">
      {/* 加载状态 */}
      {status === 'loading' && (
        <div className="account-card-loading">
          <span className="account-card-spinner"></span>
          <span>正在验证账户信息...</span>
        </div>
      )}

      {/* 成功状态 */}
      {status === 'success' && data && (
        <div className="account-card-success">
          <div className="account-card-header">
            <span className="account-card-icon">✓</span>
            <span className="account-card-title">账户信息验证成功</span>
          </div>
          <div className="account-card-details">
            <div className="account-card-item">
              <span className="account-card-label">可用余额:</span>
              <span className="account-card-value">{Number(data.availableBalance || 0).toFixed(2)} USDT</span>
            </div>
            <div className="account-card-item">
              <span className="account-card-label">总余额:</span>
              <span className="account-card-value">{Number(data.totalWalletBalance || 0).toFixed(2)} USDT</span>
            </div>
            <div className="account-card-item">
              <span className="account-card-label">交易权限:</span>
              <span className={`account-card-value ${data.canTrade ? 'account-card-permission-granted' : 'account-card-permission-denied'}`}>
                {data.canTrade ? '已启用' : '未启用'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {status === 'error' && (
        <div className="account-card-error">
          <div className="account-card-error-header">
            <span className="account-card-icon">⚠</span>
            <span className="account-card-title">API Key 验证失败</span>
          </div>
          <div className="account-card-error-content">
            <p className="account-card-error-message">{error}</p>

            {ipAddress && (
              <div className="account-card-ip-section">
                <div className="account-card-ip-info">
                  <span className="account-card-ip-label">当前服务器IP:</span>
                  <code className="account-card-ip-address">{ipAddress}</code>
                </div>
                <button
                  type="button"
                  className="account-card-copy-button"
                  onClick={() => copyIpAddress(ipAddress)}
                >
                  复制IP
                </button>
              </div>
            )}

            <div className="account-card-actions">
              <a
                href="https://www.binance.com/zh-CN/my/settings/api-management"
                target="_blank"
                rel="noopener noreferrer"
                className="account-card-action-link"
              >
                前往币安API管理页面 →
              </a>
            </div>

            <div className="account-card-help">
              <p>解决步骤：</p>
              <ol>
                <li>点击上方"复制IP"按钮复制服务器IP地址</li>
                <li>点击"前往币安API管理页面"链接</li>
                <li>找到对应的API Key，点击"编辑"按钮</li>
                <li>在"IP访问限制"中选择"限定IP（推荐）"</li>
                <li>将复制的IP地址粘贴到IP白名单中并保存</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
