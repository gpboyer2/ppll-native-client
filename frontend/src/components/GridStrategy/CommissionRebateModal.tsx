import { useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { CommissionCalculationResult } from '../../utils/commission-calculator';
import { CommissionComparisonLeftRight } from './CommissionComparisonLeftRight';
import { CommissionComparisonTopBottom } from './CommissionComparisonTopBottom';
import { CommissionComparisonProgressive } from './CommissionComparisonProgressive';

// localStorage key
const DO_NOT_SHOW_AGAIN_KEY = 'commission-rebate-do-not-show-again';

// UI组件类型
type UIType = 'left-right' | 'top-bottom' | 'progressive';

// 假数据
const MOCK_DATA: CommissionCalculationResult = {
  withoutRebate: {
    dailyProfit: 15.5,
    weeklyProfit: 108.5,
    monthlyProfit: 465,
    yearlyProfit: 5580
  },
  withRebate: {
    dailyProfit: 20.5,
    weeklyProfit: 143.5,
    monthlyProfit: 615,
    yearlyProfit: 7380
  },
  rebateProfit: {
    dailyProfit: 5,
    weeklyProfit: 35,
    monthlyProfit: 150,
    yearlyProfit: 1800
  }
};

/**
 * 返佣提示弹窗组件属性
 */
export interface CommissionRebateModalProps {
  opened: boolean;
  onClose: () => void;
  data: CommissionCalculationResult;
}

/**
 * 检查是否应该显示弹窗
 */
export function shouldShowCommissionRebateModal(): boolean {
  const doNotShowAgain = localStorage.getItem(DO_NOT_SHOW_AGAIN_KEY);
  return doNotShowAgain !== 'true';
}

/**
 * 返佣提示弹窗
 * 保存成功后弹出，展示返佣收益对比
 */
export function CommissionRebateModal({
  opened,
  onClose,
  data
}: CommissionRebateModalProps) {
  // 当前UI类型
  const [uiType, setUiType] = useState<UIType>('left-right');

  // 是否选中"下次不再提示"
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  // 渲染UI组件
  function renderUIComponent() {
    const currentData = data || MOCK_DATA;

    switch (uiType) {
      case 'left-right':
        return <CommissionComparisonLeftRight data={currentData} />;
      case 'top-bottom':
        return <CommissionComparisonTopBottom data={currentData} />;
      case 'progressive':
        return <CommissionComparisonProgressive data={currentData} />;
      default:
        return <CommissionComparisonLeftRight data={currentData} />;
    }
  }

  // 跳转到返佣页面
  function handleGoToRebate() {
    window.open('https://senmo.hk', '_blank');
    handleSavePreference();
    onClose();
  }

  // 保存用户偏好
  function handleSavePreference() {
    if (doNotShowAgain) {
      localStorage.setItem(DO_NOT_SHOW_AGAIN_KEY, 'true');
    }
  }

  // 关闭弹窗
  function handleClose() {
    handleSavePreference();
    onClose();
  }

  if (!opened) return null;

  return (
    <>
      {opened && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 额外收益提醒</h3>
              <button className="btn-icon" onClick={handleClose}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              {/* 顶部提示文字 */}
              <div className="commission-rebate-intro">
                恭喜！您的策略已保存成功。开启返佣可以让您获得更多收益：
              </div>

              {/* UI切换按钮组 */}
              <div className="commission-rebate-ui-switcher">
                <button
                  className={`btn btn-sm ${uiType === 'left-right' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUiType('left-right')}
                >
                  左右对比
                </button>
                <button
                  className={`btn btn-sm ${uiType === 'top-bottom' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUiType('top-bottom')}
                >
                  上下对比
                </button>
                <button
                  className={`btn btn-sm ${uiType === 'progressive' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUiType('progressive')}
                >
                  渐进展示
                </button>
              </div>

              {/* 返佣对比区域 - 根据选择显示不同组件 */}
              <div className="commission-rebate-content">
                {renderUIComponent()}
              </div>

              {/* 下次不再提示勾选框 */}
              <div className="commission-rebate-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={doNotShowAgain}
                    onChange={(e) => setDoNotShowAgain(e.target.checked)}
                  />
                  <span>下次不再提示</span>
                </label>
              </div>
            </div>

            <div className="modal-footer commission-rebate-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleClose}
                style={{ flex: 1 }}
              >
                知道了
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoToRebate}
                style={{ flex: 1 }}
              >
                去启用返佣
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommissionRebateModal;
