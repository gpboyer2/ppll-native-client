import { useEffect } from 'react';
import { OpenBrowser } from '../../../wailsjs/go/main/App';
import './dialog.scss';

// 收益计算数据类型
interface CommissionCalculationData {
    tradeValue: number; // 每笔交易金额
    dailyFrequency: number; // 日交易次数
    commissionRate: string; // 手续费率
    rebateRate: string; // 返佣比例
    dailyRebateProfit: number; // 日返佣收益
    monthlyExtraProfit: number; // 月额外收益
    currentMonthlyProfit: number; // 当前月收益（无返佣）
    rebateMonthlyProfit: number; // 开启返佣后月收益
    currentYearlyProfit: number; // 当前年收益（无返佣）
    rebateYearlyProfit: number; // 开启返佣后年收益
    extraProfitRate: number; // 额外收益百分比
}

// 组件 props 类型
interface ReferralCommissionDialogProps {
    opened: boolean;
    onClose: () => void;
    data?: CommissionCalculationData;
}

export function ReferralCommissionDialog({
    opened,
    onClose,
    data
}: ReferralCommissionDialogProps) {
    // ESC 键关闭弹窗
    useEffect(() => {
        if (!opened) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [opened, onClose]);

    // 跳转到返佣注册页面
    async function handleEnableRebate() {
        const url = 'https://senmo.hk';

        // 检查是否在 Wails 桌面客户端环境中
        const isWailsAvailable = typeof window !== 'undefined' &&
                                (window as any).go &&
                                (window as any).go.main &&
                                (window as any).go.main.App;

        if (isWailsAvailable) {
            // 桌面客户端：使用系统浏览器打开
            try {
                await OpenBrowser(url);
            } catch (error) {
                console.error('打开系统浏览器失败:', error);
            }
        } else {
            // 浏览器环境：使用 window.open 打开新标签页
            try {
                const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

                // 如果 window.open 被阻止（例如浏览器弹窗拦截），使用当前页面跳转
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    console.warn('弹窗被拦截，使用当前页面跳转');
                    window.location.href = url;
                }
            } catch (error) {
                console.error('打开链接失败:', error);
                // 备用方案：使用当前页面跳转
                window.location.href = url;
            }
        }
    }

    // 下次不再提示
    function handleToggleDontShow(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        console.log('下次不再提示:', checked);
        // TODO: 将设置保存到 localStorage
    }

    if (!opened) return null;

    return (
        <div className="referral-commission-dialog-overlay">
            <div className="referral-commission-dialog">
                <div className="referral-commission-dialog-header">
                    <h2 className="referral-commission-dialog-title">额外收益提醒</h2>
                    <div className="referral-commission-dialog-value-proposition">零成本，纯额外收益</div>
                    <p className="referral-commission-dialog-subtitle">
                        开启返佣后，同样的交易每月可多赚收益，无需任何额外投入
                    </p>
                    <button
                        className="referral-commission-dialog-close-button"
                        onClick={onClose}
                        type="button"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.5 3.5L3.5 12.5M3.5 3.5L12.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                <div className="referral-commission-dialog-content">
                    {/* 月度收益对比 */}
                    <div className="referral-commission-dialog-comparison-section">
                        <div className="referral-commission-dialog-comparison-cards">
                            <div className="referral-commission-dialog-comparison-card">
                                <div className="referral-commission-dialog-card-label referral-commission-dialog-card-label-normal">
                                    当前状态（无返佣）
                                </div>
                                <div className="referral-commission-dialog-card-amount referral-commission-dialog-card-amount-normal">
                                    {data?.currentMonthlyProfit || 465}
                                </div>
                                <div className="referral-commission-dialog-card-period">USDT / 月</div>
                            </div>

                            <div className="referral-commission-dialog-vs-separator">VS</div>

                            <div className="referral-commission-dialog-comparison-card referral-commission-dialog-comparison-card-highlight">
                                <div className="referral-commission-dialog-extra-earnings-tag">
                                    额外 +{data?.extraProfitRate || 32}%
                                </div>
                                <div className="referral-commission-dialog-card-label referral-commission-dialog-card-label-highlight">
                                    开启返佣后
                                </div>
                                <div className="referral-commission-dialog-card-amount referral-commission-dialog-card-amount-highlight">
                                    {data?.rebateMonthlyProfit || 615}
                                </div>
                                <div className="referral-commission-dialog-card-period">USDT / 月</div>
                            </div>
                        </div>
                    </div>

                    {/* 计算明细 */}
                    <div className="referral-commission-dialog-details-section">
                        <div className="referral-commission-dialog-details-title">收益对比明细</div>

                        {/* 对比表格 */}
                        <div className="referral-commission-dialog-comparison-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="referral-commission-dialog-table-label">时间周期</th>
                                        <th className="referral-commission-dialog-table-normal">网格收益</th>
                                        <th className="referral-commission-dialog-table-highlight">返佣收益</th>
                                        <th className="referral-commission-dialog-table-diff">差额</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>每日</strong></td>
                                        <td>{data?.currentMonthlyProfit ? (data.currentMonthlyProfit / 30).toFixed(2) : '15.50'} USDT</td>
                                        <td className="referral-commission-dialog-table-highlight-text">
                                            <strong>{data?.dailyRebateProfit || 5} USDT</strong>
                                        </td>
                                        <td className="referral-commission-dialog-table-diff-text">
                                            +{data?.dailyRebateProfit || 5} USDT
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>每月</strong></td>
                                        <td>{data?.currentMonthlyProfit || 465} USDT</td>
                                        <td className="referral-commission-dialog-table-highlight-text">
                                            <strong>{data?.monthlyExtraProfit || 150} USDT</strong>
                                        </td>
                                        <td className="referral-commission-dialog-table-diff-text">
                                            +{data?.monthlyExtraProfit || 150} USDT
                                        </td>
                                    </tr>
                                    <tr className="referral-commission-dialog-table-total">
                                        <td><strong>每年</strong></td>
                                        <td><strong>{(data?.currentYearlyProfit || 5580).toLocaleString()} USDT</strong></td>
                                        <td className="referral-commission-dialog-table-highlight-text">
                                            <strong>{((data?.rebateYearlyProfit || 7380) - (data?.currentYearlyProfit || 5580)).toLocaleString()} USDT</strong>
                                        </td>
                                        <td className="referral-commission-dialog-table-diff-text">
                                            <strong>+{((data?.rebateYearlyProfit || 7380) - (data?.currentYearlyProfit || 5580)).toLocaleString()} USDT</strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 参数说明 */}
                        <div className="referral-commission-dialog-params-info">
                            <div className="referral-commission-dialog-param-item">
                                <span className="referral-commission-dialog-param-label">每笔交易金额：</span>
                                <span className="referral-commission-dialog-param-value">{data?.tradeValue || 50} USDT</span>
                            </div>
                            <div className="referral-commission-dialog-param-item">
                                <span className="referral-commission-dialog-param-label">日交易次数：</span>
                                <span className="referral-commission-dialog-param-value">{data?.dailyFrequency || 5} 次</span>
                            </div>
                            <div className="referral-commission-dialog-param-item">
                                <span className="referral-commission-dialog-param-label">手续费率：</span>
                                <span className="referral-commission-dialog-param-value">{data?.commissionRate || '1‰'}</span>
                            </div>
                            <div className="referral-commission-dialog-param-item">
                                <span className="referral-commission-dialog-param-label">返佣比例：</span>
                                <span className="referral-commission-dialog-param-value referral-commission-dialog-table-highlight-text">
                                    {data?.rebateRate || '最高 35%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="referral-commission-dialog-info-text">
                        * 基于您的实际策略参数计算，年收益按365天计算
                    </p>

                    <div className="referral-commission-dialog-actions-section">
                        <div className="referral-commission-dialog-button-group">
                            <button
                                className="referral-commission-dialog-btn referral-commission-dialog-btn-primary"
                                onClick={handleEnableRebate}
                                type="button"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                去启用返佣
                            </button>
                            <button
                                className="referral-commission-dialog-btn referral-commission-dialog-btn-secondary"
                                onClick={onClose}
                                type="button"
                            >
                                知道了
                            </button>
                        </div>

                        <div className="referral-commission-dialog-checkbox-wrapper">
                            <input
                                type="checkbox"
                                id="referral-commission-dont-show-again"
                                onChange={handleToggleDontShow}
                            />
                            <label htmlFor="referral-commission-dont-show-again">下次不再提示</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
