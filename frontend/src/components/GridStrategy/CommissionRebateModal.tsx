import { IconX } from '@tabler/icons-react';
import { CommissionCalculationResult } from '../../utils/commission-calculator';
import { CommissionComparisonLeftRight } from './CommissionComparisonLeftRight';

// 如果想使用其他样式，可以切换导入：
// import { CommissionComparisonTopBottom } from './CommissionComparisonTopBottom';
// import { CommissionComparisonProgressive } from './CommissionComparisonProgressive';

/**
 * 返佣提示弹窗组件属性
 */
export interface CommissionRebateModalProps {
  opened: boolean;
  onClose: () => void;
  data: CommissionCalculationResult;
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
  // 跳转到返佣页面
  function handleGoToRebate() {
    window.open('https://senmo.hk', '_blank');
    onClose();
  }

  if (!opened) return null;

  return (
    <>
      {opened && (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 额外收益提醒</h3>
              <button className="btn-icon" onClick={onClose}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              {/* 顶部提示文字 */}
              <div className="commission-rebate-intro">
                恭喜！您的策略已保存成功。开启返佣可以让您获得更多收益：
              </div>

              {/* 返佣对比区域 - 可以切换不同的组件 */}
              <div className="commission-rebate-content">
                <CommissionComparisonLeftRight data={data} />

                {/* 如果想使用其他样式，可以切换导入： */}
                {/* <CommissionComparisonTopBottom data={data} /> */}
                {/* <CommissionComparisonProgressive data={data} /> */}
              </div>
            </div>

            <div className="modal-footer commission-rebate-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
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
