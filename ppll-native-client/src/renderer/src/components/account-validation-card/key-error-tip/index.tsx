import './index.scss'

interface KeyErrorTipProps {
  errorType: 'signature_error' | 'invalid_api_key'
}

export function KeyErrorTip({ errorType }: KeyErrorTipProps) {
  if (errorType === 'signature_error') {
    return (
      <div className="key-error-tip">
        <div className="key-error-tip-header">
          <span className="key-error-tip-icon">🔐</span>
          <span className="key-error-tip-title">签名错误</span>
        </div>
        <div className="key-error-tip-content">
          <p className="key-error-tip-description">Secret Key 用于签名验证，可能输入有误。</p>
          <div className="key-error-tip-steps">
            <p className="key-error-tip-steps-title">请按以下步骤排查：</p>
            <ol className="key-error-tip-steps-list">
              <li>
                检查 API Key 是否正确复制
                <br />• 确保没有多余的空格
                <br />• 确保复制了完整的内容
              </li>
              <li>
                检查 Secret Key 是否正确复制
                <br />• 确保没有多余的空格
                <br />• 确保复制了完整的 64 位字符
              </li>
              <li>
                检查币安后台权限设置
                <br />• 访问币安 API 管理页面
                <br />• 确保启用了「U本位合约交易」权限
                <br />• 如果设置了 IP 白名单，请删除限制
              </li>
              <li>
                如果以上都正确
                <br />• 建议删除当前 API Key
                <br />• 重新生成新的 API Key 和 Secret Key
                <br />• 然后在系统中更新
              </li>
            </ol>
          </div>
          <div className="key-error-tip-actions">
            <a
              href="https://www.binance.com/zh-CN/my/settings/api-management"
              target="_blank"
              rel="noopener noreferrer"
              className="key-error-tip-action-link"
            >
              前往币安API管理页面 →
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (errorType === 'invalid_api_key') {
    return (
      <div className="key-error-tip">
        <div className="key-error-tip-header">
          <span className="key-error-tip-icon">🔑</span>
          <span className="key-error-tip-title">API Key 无效</span>
        </div>
        <div className="key-error-tip-content">
          <p className="key-error-tip-description">API Key 可能已过期、被删除或输入错误。</p>
          <div className="key-error-tip-steps">
            <p className="key-error-tip-steps-title">请按以下步骤检查：</p>
            <ol className="key-error-tip-steps-list">
              <li>
                检查 API Key 是否正确复制
                <br />• 确保没有多余的空格
                <br />• 确保复制了完整的内容
              </li>
              <li>
                检查币安后台 API Key 状态
                <br />• 访问币安 API 管理页面
                <br />• 确认 API Key 是否被禁用或删除
              </li>
              <li>
                如果 API Key 已失效
                <br />• 重新生成新的 API Key
                <br />• 然后在系统中更新
              </li>
            </ol>
          </div>
          <div className="key-error-tip-actions">
            <a
              href="https://www.binance.com/zh-CN/my/settings/api-management"
              target="_blank"
              rel="noopener noreferrer"
              className="key-error-tip-action-link"
            >
              前往币安API管理页面 →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}
