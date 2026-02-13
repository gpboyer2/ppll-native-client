import { KeyErrorTip } from './key-error-tip'
import { IpRestrictionTip } from './ip-restriction-tip'
import { NetworkErrorTip } from './network-error-tip'
import './index.scss'

// 币安U本位合约账户信息接口（使用币安API的camelCase字段）
interface BinancePosition {
  symbol: string
  positionAmt: string
  entryPrice: string
  unrealizedProfit: string
}

interface BinanceAsset {
  asset: string
  walletBalance: string
  crossWalletBalance: string
}

interface AccountValidationData {
  feeTier?: number
  canTrade?: boolean
  canDeposit?: boolean
  canWithdraw?: boolean
  totalInitialMargin?: string
  totalMaintMargin?: string
  totalWalletBalance?: string
  totalUnrealizedProfit?: string
  totalMarginBalance?: string
  totalPositionInitialMargin?: string
  totalOpenOrderInitialMargin?: string
  totalCrossWalletBalance?: string
  totalCrossUnPnl?: string
  availableBalance?: string
  maxWithdrawAmount?: string
  assets?: BinanceAsset[]
  positions?: BinancePosition[]
}

type ErrorType =
  | 'validation_failed'
  | 'vip_required'
  | 'network_error'
  | 'signature_error'
  | 'invalid_api_key'
  | 'ip_restricted'

interface AccountValidationProps {
  // 外部注入的账户验证数据
  // 为 null/undefined 时，组件内部自己请求账户数据
  // 为对象（包括空对象）时，组件直接使用外部数据，不再内部请求
  account_data?: {
    status: 'idle' | 'loading' | 'success' | 'error'
    data?: AccountValidationData
    error?: string
    errorType?: ErrorType
    ipAddress?: string
  } | null
}

export function AccountValidationCard({ account_data }: AccountValidationProps) {
  // 外部提供数据时直接使用，否则显示 idle（不显示任何内容）
  const displayStatus = account_data?.status ?? 'idle'
  const displayData = account_data?.data
  const displayError = account_data?.error
  const displayErrorType = account_data?.errorType ?? 'validation_failed'
  const displayIpAddress = account_data?.ipAddress

  // idle 状态不显示
  if (displayStatus === 'idle') {
    return null
  }

  return (
    <div className="account-validation-card mb-16">
      {/* 加载状态 */}
      {displayStatus === 'loading' && (
        <div className="account-card-loading">
          <span className="account-card-spinner"></span>
          <span>正在验证账户信息...</span>
        </div>
      )}

      {/* 成功状态 */}
      {displayStatus === 'success' && displayData && (
        <div className="account-card-success">
          <div className="account-card-header">
            <span className="account-card-icon">✓</span>
            <span className="account-card-title">U本位合约账户验证成功</span>
          </div>
          <div className="account-card-grid">
            {/* 可用余额 - 重点突出 */}
            <div className="account-card-item account-card-item-highlight">
              <span className="account-card-label">可用余额</span>
              <span className="account-card-value">
                {Number(displayData.availableBalance || 0).toFixed(2)}{' '}
                <span className="account-card-unit-inline">USDT</span>
              </span>
            </div>

            {/* 总余额 */}
            <div className="account-card-item">
              <span className="account-card-label">总余额</span>
              <span className="account-card-value">
                {Number(displayData.totalWalletBalance || 0).toFixed(2)}{' '}
                <span className="account-card-unit-inline">USDT</span>
              </span>
            </div>

            {/* 未实现盈亏 */}
            {displayData.totalUnrealizedProfit !== undefined && (
              <div className="account-card-item">
                <span className="account-card-label">未实现盈亏</span>
                <span
                  className={`account-card-value ${Number(displayData.totalUnrealizedProfit) >= 0 ? 'account-card-value-positive' : 'account-card-value-negative'}`}
                >
                  {Number(displayData.totalUnrealizedProfit) >= 0 ? '+' : ''}
                  {Number(displayData.totalUnrealizedProfit || 0).toFixed(2)}{' '}
                  <span className="account-card-unit-inline">USDT</span>
                </span>
              </div>
            )}

            {/* 保证金余额 */}
            <div className="account-card-item">
              <span className="account-card-label">保证金余额</span>
              <span className="account-card-value">
                {Number(displayData.totalMarginBalance || 0).toFixed(2)}{' '}
                <span className="account-card-unit-inline">USDT</span>
              </span>
            </div>

            {/* 持仓保证金 */}
            <div className="account-card-item">
              <span className="account-card-label">持仓保证金</span>
              <span className="account-card-value">
                {Number(displayData.totalPositionInitialMargin || 0).toFixed(2)}{' '}
                <span className="account-card-unit-inline">USDT</span>
              </span>
            </div>

            {/* 挂单保证金 */}
            <div className="account-card-item">
              <span className="account-card-label">挂单保证金</span>
              <span className="account-card-value">
                {Number(displayData.totalOpenOrderInitialMargin || 0).toFixed(2)}{' '}
                <span className="account-card-unit-inline">USDT</span>
              </span>
            </div>

            {/* 手续费等级 */}
            {displayData.feeTier !== undefined && (
              <div className="account-card-item">
                <span className="account-card-label">手续费等级</span>
                <span className="account-card-value account-card-badge">
                  VIP {displayData.feeTier}
                </span>
              </div>
            )}

            {/* 交易权限 */}
            <div className="account-card-item">
              <span className="account-card-label">交易权限</span>
              <span
                className={`account-card-value ${displayData.canTrade ? 'account-card-permission-granted' : 'account-card-permission-denied'}`}
              >
                {displayData.canTrade ? '已启用' : '未启用'}
              </span>
            </div>

            {/* 持仓数量 */}
            {displayData.positions && (
              <div className="account-card-item">
                <span className="account-card-label">持仓数量</span>
                <span className="account-card-value">
                  {displayData.positions.filter((p) => parseFloat(p.positionAmt) !== 0).length} 个
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIP权限提示 */}
      {displayStatus === 'error' && displayErrorType === 'vip_required' && (
        <div className="account-card-vip-notice">
          <div className="account-card-vip-header">
            <span className="account-card-vip-icon">💎</span>
            <span className="account-card-vip-title">网格策略交易功能</span>
          </div>
          <div className="account-card-vip-content">
            <p className="account-card-vip-description">
              网格策略交易是VIP专属功能，需要开通VIP权限才能使用。
            </p>

            <div className="account-card-vip-features">
              <div className="account-card-vip-feature">
                <span className="account-card-vip-feature-icon">📊</span>
                <div className="account-card-vip-feature-text">
                  <span className="account-card-vip-feature-title">自动化网格交易</span>
                  <span className="account-card-vip-feature-desc">
                    24小时自动运行，无需人工干预
                  </span>
                </div>
              </div>

              <div className="account-card-vip-feature">
                <span className="account-card-vip-feature-icon">⚡</span>
                <div className="account-card-vip-feature-text">
                  <span className="account-card-vip-feature-title">智能策略配置</span>
                  <span className="account-card-vip-feature-desc">
                    灵活的参数设置，适配不同行情
                  </span>
                </div>
              </div>

              <div className="account-card-vip-feature">
                <span className="account-card-vip-feature-icon">📈</span>
                <div className="account-card-vip-feature-text">
                  <span className="account-card-vip-feature-title">实时收益跟踪</span>
                  <span className="account-card-vip-feature-desc">
                    清晰的数据展示，掌握投资动态
                  </span>
                </div>
              </div>
            </div>

            <div className="account-card-vip-note">
              <span className="account-card-vip-note-icon">ℹ️</span>
              <span className="account-card-vip-note-text">
                当前账号暂无VIP权限。如需使用此功能，请联系管理员开通。
              </span>
            </div>

            <div className="account-card-vip-contact">
              <a
                href="https://t.me/+FK2cvhHVhgNjYzg1"
                target="_blank"
                rel="noopener noreferrer"
                className="account-card-vip-contact-link"
              >
                <span className="account-card-vip-contact-icon">💬</span>
                <span className="account-card-vip-contact-text">联系我们开通VIP</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {displayStatus === 'error' && displayErrorType !== 'vip_required' && (
        <div className="account-card-error">
          {/* Key 异常 */}
          {(displayErrorType === 'signature_error' || displayErrorType === 'invalid_api_key') && (
            <KeyErrorTip errorType={displayErrorType} />
          )}

          {/* IP 白名单限制 */}
          {displayErrorType === 'ip_restricted' && (
            <IpRestrictionTip ipAddress={displayIpAddress} />
          )}

          {/* 网络错误 */}
          {displayErrorType === 'network_error' && <NetworkErrorTip />}

          {/* 其他验证失败 */}
          {!['signature_error', 'invalid_api_key', 'ip_restricted', 'network_error'].includes(
            displayErrorType
          ) && (
            <div className="account-card-error-content">
              <p className="account-card-error-message">{displayError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
