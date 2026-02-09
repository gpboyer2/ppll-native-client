import { useState } from 'react';
import { showSuccess, showError } from '../../../utils/api-error';
import './index.scss';

interface IpRestrictionTipProps {
  ipAddress?: string;
}

export function IpRestrictionTip({ ipAddress }: IpRestrictionTipProps) {
  const [copied, setCopied] = useState(false);

  async function copyIpAddress(ip: string) {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      showSuccess('IP地址已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      showError('复制失败，请手动复制');
    }
  }

  return (
    <div className="ip-restriction-tip">
      <div className="ip-restriction-tip-header">
        <span className="ip-restriction-tip-icon">🌐</span>
        <span className="ip-restriction-tip-title">IP 白名单限制</span>
      </div>
      <div className="ip-restriction-tip-content">
        <p className="ip-restriction-tip-description">
          当前服务器IP地址未加入币安API白名单。请在币安后台删除IP白名单限制，或添加当前服务器IP。
        </p>

        {ipAddress && (
          <div className="ip-restriction-ip-info">
            <span className="ip-restriction-ip-label">当前服务器IP:</span>
            <code className="ip-restriction-ip-address">{ipAddress}</code>
            <button
              type="button"
              className={`ip-restriction-copy-button ${copied ? 'copied' : ''}`}
              onClick={() => copyIpAddress(ipAddress)}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        )}

        <div className="ip-restriction-tip-steps">
          <p className="ip-restriction-tip-steps-title">请按以下步骤解决：</p>
          <ol className="ip-restriction-tip-steps-list">
            <li>点击"前往币安API管理页面"链接</li>
            <li>找到对应的API Key，点击"编辑"按钮</li>
            <li>在"IP访问限制"中删除 IP 白名单限制，或添加当前服务器IP</li>
            {ipAddress && (
              <li>
                如果选择添加IP白名单
                <br />• 点击"复制"按钮复制服务器IP地址
                <br />• 将IP地址粘贴到白名单中并保存
              </li>
            )}
          </ol>
        </div>

        <div className="ip-restriction-tip-actions">
          <a
            href="https://www.binance.com/zh-CN/my/settings/api-management"
            target="_blank"
            rel="noopener noreferrer"
            className="ip-restriction-tip-action-link"
          >
            前往币安API管理页面 →
          </a>
        </div>
      </div>
    </div>
  );
}
