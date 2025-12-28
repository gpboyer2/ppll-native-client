import { useState, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import { NumberInput } from '../mantine';
import { showWarning, showSuccess } from '../../utils/api-error';
import { NumberFormat } from '../../utils';
import { calculateCommission } from '../../utils/commission-calculator';
import { GridStrategyApi } from '../../api';
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
  default_params
}: SmartConfigModalProps) {
  // ==================== 输入参数状态 ====================
  const [budget, setBudget] = useState<number>(1000);
  const [optimize_target, setOptimizeTarget] = useState<OptimizeTarget>('profit');
  const [min_trade_value, setMinTradeValue] = useState<number>(20);
  const [max_trade_value, setMaxTradeValue] = useState<number>(100);
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
    if (min_trade_value >= max_trade_value) {
      showWarning('最小值必须小于最大值');
      return;
    }
    if (!default_params?.trading_pair) {
      showWarning('请先选择交易对');
      return;
    }
    if (!default_params?.api_key || !default_params?.secret_key) {
      showWarning('请先选择币安API Key');
      return;
    }

    setLoading(true);

    try {
      // 调用优化接口
      const response = await GridStrategyApi.optimize({
        symbol: default_params.trading_pair,
        total_capital: budget,
        optimize_target: optimize_target,
        min_trade_value: min_trade_value,
        max_trade_value: max_trade_value,
        interval,
        api_key: default_params.api_key,
        secret_key: default_params.secret_key
      });

      if (response.status === 'error') {
        throw new Error(response.message || '优化失败');
      }

      // 保存结果，切换到结果展示
      setOptimizationResult(response.data);
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

    const selectedConfig = optimizationResult.recommended.analysis?.top_list?.[selectedConfigIndex];
    if (!selectedConfig) {
      showWarning('请选择配置方案');
      return;
    }

    // 转换数据格式，回填到表单
    const config: OptimizedConfig = {
      grid_price_difference: parseFloat(selectedConfig.grid_spacing),
      grid_trade_quantity: parseFloat(selectedConfig.trade_quantity),
      gt_limitation_price: parseFloat(optimizationResult.market.resistance),
      lt_limitation_price: parseFloat(optimizationResult.market.support)
    };

    // 准备返佣计算所需数据
    const commissionData = {
      expected_daily_frequency: parseFloat(selectedConfig.expected_daily_frequency),
      expected_daily_profit: parseFloat(selectedConfig.expected_daily_profit),
      trade_value: parseFloat(selectedConfig.trade_value)
    };

    // 调用父组件回调，更新表单并传递返佣数据
    onApply(config, commissionData);

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
    <>
      {opened && (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{step === 'input' ? '智能参数配置' : '优化结果确认'}</h3>
              <button className="btn-icon" onClick={onClose}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              {loading && (
                <div className="smart-config-loading">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">正在计算最优配置...</div>
                </div>
              )}

              {step === 'input' && (
                <div className="smart-config-form">
                  {/* 预算投入资金 */}
                  <div className="smart-config-form-field">
                    <label className="smart-config-form-label">
              预算投入资金 (USDT)
                      <span className="grid-strategy-form-required">*</span>
                    </label>
                    <NumberInput
                      value={budget}
                      onChange={(value) => setBudget(typeof value === 'number' ? value : parseFloat(value || '0'))}
                      min={10}
                      max={100000}
                      step={100}
                      placeholder="例如：1000"
                    />
                    <div className="smart-config-form-help">总投入资金，建议 100~10000 USDT</div>
                  </div>

                  {/* 优化目标 */}
                  <div className="smart-config-form-field">
                    <label className="smart-config-form-label">
              优化目标
                      <span className="grid-strategy-form-required">*</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="optimizeTarget"
                          value="profit"
                          checked={optimize_target === 'profit'}
                          onChange={() => setOptimizeTarget('profit')}
                        />
                        <span>收益最大化</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="optimizeTarget"
                          value="cost"
                          checked={optimize_target === 'cost'}
                          onChange={() => setOptimizeTarget('cost')}
                        />
                        <span>成本摊薄高频</span>
                      </label>
                    </div>
                    <div className="smart-config-form-help">
                      {optimize_target === 'profit'
                        ? '追求最大收益，适合波动较大的市场'
                        : '降低持仓成本，适合震荡行情'}
                    </div>
                  </div>

                  {/* 每笔交易金额范围 */}
                  <div className="smart-config-form-field">
                    <label className="smart-config-form-label">
              每笔交易金额范围 (USDT)
                      <span className="grid-strategy-form-required">*</span>
                    </label>
                    <div className="smart-config-input-group">
                      <NumberInput
                        value={min_trade_value}
                        onChange={(value) => setMinTradeValue(typeof value === 'number' ? value : parseFloat(value || '20'))}
                        min={10}
                        max={1000}
                        step={5}
                        placeholder="最小值"
                      />
                      <span className="smart-config-input-separator">~</span>
                      <NumberInput
                        value={max_trade_value}
                        onChange={(value) => setMaxTradeValue(typeof value === 'number' ? value : parseFloat(value || '100'))}
                        min={10}
                        max={1000}
                        step={5}
                        placeholder="最大值"
                      />
                    </div>
                    <div className="smart-config-form-help">单笔交易的资金范围，建议 20~50 USDT</div>
                  </div>

                  {/* 市场分析周期 */}
                  <div className="smart-config-form-field">
                    <label className="smart-config-form-label">
              市场分析周期
                      <span className="grid-strategy-form-required">*</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="interval"
                          value="1h"
                          checked={interval === '1h'}
                          onChange={() => setInterval('1h')}
                        />
                        <span>1小时</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="interval"
                          value="4h"
                          checked={interval === '4h'}
                          onChange={() => setInterval('4h')}
                        />
                        <span>4小时（推荐）</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="interval"
                          value="1d"
                          checked={interval === '1d'}
                          onChange={() => setInterval('1d')}
                        />
                        <span>1天</span>
                      </label>
                    </div>
                    <div className="smart-config-form-help">K线分析周期，4小时平衡准确度和响应速度</div>
                  </div>

                  {/* 开始计算按钮 */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOptimize}
                    style={{ width: '100%', marginTop: '24px' }}
                  >
            开始计算
                  </button>
                </div>
              )}

              {step === 'result' && optimizationResult && (
                <div className="smart-config-result">
                  {/* 市场分析 */}
                  <div className="smart-config-section">
                    <h3 className="smart-config-section-title">
                      <span>📊</span>
              市场分析（{optimizationResult.interval_label}）
                    </h3>
                    <div className="smart-config-market-analysis">
                      <div className="smart-config-analysis-item">
                        <span className="label">支撑位</span>
                        <span className="value">{NumberFormat.truncateDecimal(optimizationResult.market.support)} USDT</span>
                      </div>
                      <div className="smart-config-analysis-item">
                        <span className="label">阻力位</span>
                        <span className="value">{NumberFormat.truncateDecimal(optimizationResult.market.resistance)} USDT</span>
                      </div>
                      <div className="smart-config-analysis-item">
                        <span className="label">当前价格波动率</span>
                        <span className="value">{optimizationResult.market.volatility}</span>
                      </div>
                      <div className="smart-config-analysis-item">
                        <span className="label">风险等级</span>
                        <span className="value">{optimizationResult.risk.level}</span>
                      </div>
                      <div className="smart-config-analysis-item full-width">
                        <span className="icon">✓</span>
                        <span className="advice">{optimizationResult.market.volatility_advice}</span>
                      </div>
                    </div>
                  </div>

                  {/* 推荐交易区间 */}
                  <div className="smart-config-section">
                    <h3 className="smart-config-section-title">
                      <span>🎯</span>
              推荐交易区间
                    </h3>
                    <div className="smart-config-trading-range">
                      {/* 当前价格 */}
                      <div className="smart-config-current-price">
                        <span className="label">当前价格</span>
                        <span className="value">{NumberFormat.truncateDecimal(optimizationResult.market.current_price)} USDT</span>
                      </div>
                      {default_params?.position_side === 'LONG' ? (
                        <>
                          <div className="smart-config-range-rule">
                    价格高于 {NumberFormat.truncateDecimal(optimizationResult.market.resistance)} USDT，继续网格，持续更高收益
                          </div>
                          <div className="smart-config-range-rule">
                    价格低于 {NumberFormat.truncateDecimal(optimizationResult.market.support)} USDT，暂停开仓，规避下跌风险
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="smart-config-range-rule">
                    价格高于 {NumberFormat.truncateDecimal(optimizationResult.market.resistance)} USDT，暂停开仓，规避上涨风险
                          </div>
                          <div className="smart-config-range-rule">
                    价格低于 {NumberFormat.truncateDecimal(optimizationResult.market.support)} USDT，继续网格，持续更高收益
                          </div>
                        </>
                      )}
                      <div className="smart-config-range-tip">
                基于近期K线数据分析，在此区间内网格交易效率最高
                      </div>
                    </div>
                  </div>

                  {/* 配置对比 */}
                  <div className="smart-config-section">
                    <h3 className="smart-config-section-title">
                      <span>⚖️</span>
              配置对比 - {optimizationResult.optimize_target_label}
                    </h3>
                    <table className="smart-config-table">
                      <thead>
                        <tr>
                          <th>间距</th>
                          <th>每笔金额 (USDT)</th>
                          <th>预期日频 (次)</th>
                          <th>预期日收益 (USDT)</th>
                          <th>日收益率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizationResult.recommended.analysis?.top_list?.map((config: GridConfigOption, index: number) => (
                          <tr
                            key={index}
                            className={selectedConfigIndex === index ? 'selected' : ''}
                            onClick={() => setSelectedConfigIndex(index)}
                          >
                            <td>{config.grid_spacing_percent}</td>
                            <td>{NumberFormat.truncateDecimal(config.trade_value)}</td>
                            <td>{NumberFormat.truncateDecimal(config.expected_daily_frequency)}</td>
                            <td>{NumberFormat.truncateDecimal(config.expected_daily_profit)}</td>
                            <td>{config.expected_daily_roi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 当前选中配置 */}
                  {optimizationResult.recommended.analysis?.top_list?.[selectedConfigIndex] && (
                    <div className="smart-config-section">
                      <h3 className="smart-config-section-title">
                        <span>✅</span>
                当前选中配置
                      </h3>
                      <div className="smart-config-selected">
                        <div className="smart-config-selected-item">
                          <span className="label">网格区间</span>
                          <span className="value">
                            {NumberFormat.truncateDecimal(optimizationResult.market.support)} ~ {NumberFormat.truncateDecimal(optimizationResult.market.resistance)} USDT
                          </span>
                        </div>
                        <div className="smart-config-selected-item">
                          <span className="label">每笔交易数量</span>
                          <span className="value">
                            {NumberFormat.truncateDecimal(optimizationResult.recommended.analysis.top_list[selectedConfigIndex].trade_quantity)} {default_params?.trading_pair?.replace('USDT', '') || 'BTC'}
                          </span>
                        </div>
                        <div className="smart-config-selected-item">
                          <span className="label">每笔交易金额</span>
                          <span className="value">
                            {NumberFormat.truncateDecimal(optimizationResult.recommended.analysis.top_list[selectedConfigIndex].trade_value)} USDT
                          </span>
                        </div>
                        <div className="smart-config-selected-item">
                          <span className="label">预期日频</span>
                          <span className="value">
                            {NumberFormat.truncateDecimal(optimizationResult.recommended.analysis.top_list[selectedConfigIndex].expected_daily_frequency)} 次/天
                          </span>
                        </div>
                        <div className="smart-config-selected-item">
                          <span className="label">预期日收益</span>
                          <span className="value">
                            {NumberFormat.truncateDecimal(optimizationResult.recommended.analysis.top_list[selectedConfigIndex].expected_daily_profit)} USDT
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="smart-config-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleRecalculate}
                    >
              重新计算
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApplyConfig}
                    >
              应用配置
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
              >
                {step === 'input' ? '取消' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SmartConfigModal;
