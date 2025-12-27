import { useState, useEffect } from 'react';
import { Modal, NumberInput, RadioGroup, Radio, Table, LoadingOverlay } from '@mantine/core';
import { showWarning, showSuccess } from '../../utils/api-error';
import type {
  SmartConfigModalProps,
  OptimizationResult,
  GridConfigOption,
  OptimizedConfig,
  OptimizeTarget
} from '../../types/grid-strategy';

/**
 * 智能配置弹窗组件
 * 两阶段：输入表单 → 结果展示
 */
export function SmartConfigModal({
  opened,
  onClose,
  onApply,
  defaultParams
}: SmartConfigModalProps) {
  // ==================== 输入参数状态 ====================
  const [budget, setBudget] = useState<number>(1000);
  const [optimizeTarget, setOptimizeTarget] = useState<OptimizeTarget>('profit');
  const [minTradeValue, setMinTradeValue] = useState<number>(20);
  const [maxTradeValue, setMaxTradeValue] = useState<number>(100);
  const [interval, setInterval] = useState<string>('4h');

  // ==================== UI状态 ====================
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [loading, setLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedConfigIndex, setSelectedConfigIndex] = useState<number>(0);

  // ==================== 重置表单 ====================
  useEffect(() => {
    if (opened) {
      // 打开弹窗时重置状态
      setStep('input');
      setBudget(1000);
      setOptimizeTarget('profit');
      setMinTradeValue(20);
      setMaxTradeValue(100);
      setInterval('4h');
      setOptimizationResult(null);
      setSelectedConfigIndex(0);
    }
  }, [opened]);

  // ==================== 开始计算 ====================
  async function handleOptimize() {
    // 验证输入
    if (!budget || budget <= 0) {
      showWarning('请输入有效的预算投入资金');
      return;
    }
    if (minTradeValue >= maxTradeValue) {
      showWarning('最小值必须小于最大值');
      return;
    }
    if (!defaultParams?.tradingPair) {
      showWarning('请先选择交易对');
      return;
    }
    if (!defaultParams?.apiKey || !defaultParams?.apiSecret) {
      showWarning('请先选择币安API Key');
      return;
    }

    setLoading(true);

    try {
      // 调用优化接口
      const response = await fetch('/api/v1/grid-strategy/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: defaultParams.tradingPair,
          totalCapital: budget,
          optimizeTarget,
          minTradeValue,
          maxTradeValue,
          interval,
          apiKey: defaultParams.apiKey,
          apiSecret: defaultParams.apiSecret
        })
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || '优化失败');
      }

      // 保存结果，切换到结果展示
      setOptimizationResult(result.data);
      setSelectedConfigIndex(0);  // 默认选中第一个
      setStep('result');

    } catch (error: any) {
      console.error('优化失败:', error);
      showWarning(error.message || '优化失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  // ==================== 应用配置 ====================
  function handleApplyConfig() {
    if (!optimizationResult) return;

    const selectedConfig = optimizationResult.recommended.analysis?.topList?.[selectedConfigIndex];
    if (!selectedConfig) {
      showWarning('请选择配置方案');
      return;
    }

    // 转换数据格式，回填到表单
    const config: OptimizedConfig = {
      gridPriceDifference: parseFloat(selectedConfig.gridSpacing),
      gridTradeQuantity: parseFloat(selectedConfig.tradeQuantity),
      gtLimitationPrice: parseFloat(optimizationResult.market.resistance),
      ltLimitationPrice: parseFloat(optimizationResult.market.support)
    };

    // 调用父组件回调，更新表单
    onApply(config);

    // 关闭弹窗
    onClose();

    showSuccess('智能配置已应用');
  }

  // ==================== 重新计算 ====================
  function handleRecalculate() {
    setStep('input');
    setOptimizationResult(null);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={step === 'input' ? '智能参数配置' : '优化结果确认'}
      size="lg"
      padding="xl"
    >
      <LoadingOverlay visible={loading} overlayBlur={2} />

      {step === 'input' && (
        <div className="smart-config-form">
          {/* TODO: Task 3 - 添加输入表单 */}
          <div style={{ padding: '200px', textAlign: 'center' }}>
            输入表单内容（Task 3）
          </div>
        </div>
      )}

      {step === 'result' && optimizationResult && (
        <div className="smart-config-result">
          {/* TODO: Task 4 - 添加结果展示 */}
          <div style={{ padding: '200px', textAlign: 'center' }}>
            结果展示内容（Task 4）
          </div>
        </div>
      )}
    </Modal>
  );
}

export default SmartConfigModal;
