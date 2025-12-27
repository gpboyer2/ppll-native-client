# 网格策略智能配置功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在网格策略新建/编辑页面添加智能配置功能，通过分析历史K线数据自动计算最优网格参数。

**架构：** 单个Modal弹窗组件（SmartConfigModal）+ 类型扩展 + 样式扩展。调用后端已有的 `/v1/grid-strategy/optimize` 接口，展示优化结果并应用配置到表单。

**Tech Stack:** React + TypeScript + Mantine (Modal, Table, NumberInput, Select)

---

## 前置条件检查

### Task 0: 验证后端接口可用性

**目标：** 确认后端优化接口正常工作

**Step 1: 检查后端接口定义**

文件：`nodejs-server/route/v1/grid-strategy.route.js:369`

确认以下路由存在：
```javascript
router.post('/optimize', vipMiddleware.validateVipAccess, gridStrategyController.optimizeParams);
```

**Step 2: 启动后端服务**

Run: `cd nodejs-server && npm start`

**Step 3: 测试接口**

使用 Postman 或 curl 发送测试请求：

```bash
curl -X POST http://localhost:3000/api/v1/grid-strategy/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "totalCapital": 1000,
    "optimizeTarget": "profit",
    "minTradeValue": 20,
    "maxTradeValue": 100,
    "interval": "4h",
    "apiKey": "your_test_key",
    "apiSecret": "your_test_secret"
  }'
```

Expected: 返回包含 market、recommended 等字段的优化结果

**Step 4: 记录响应格式**

保存一个示例响应到 `docs/grid-optimizer-api-response-example.json`，供后续开发参考。

---

## 阶段1：类型定义扩展

### Task 1: 扩展网格策略类型定义

**Files:**
- Modify: `frontend/src/types/grid-strategy.ts`

**Step 1: 打开并阅读现有类型定义**

Run: `cat frontend/src/types/grid-strategy.ts`

了解现有的 `GridStrategyForm`、`PositionSide` 等类型。

**Step 2: 添加智能配置相关类型**

在文件末尾添加以下类型定义：

```typescript
// ==================== 智能配置相关类型 ====================

/**
 * 优化目标类型
 */
export type OptimizeTarget = 'profit' | 'cost';

/**
 * 单个网格配置方案
 */
export interface GridConfigOption {
  gridSpacing: string;
  gridSpacingPercent: string;
  tradeQuantity: string;
  tradeValue: string;
  expectedDailyFrequency: string;
  expectedDailyProfit: string;
  expectedDailyROI: string;
  singleNetProfit: string;
  turnoverRatio: string;
}

/**
 * 市场分析数据
 */
export interface MarketAnalysis {
  currentPrice: string;
  support: string;
  resistance: string;
  avgPrice: string;
  priceRange: string;
  volatility: string;
  volatilityLevel: string;
  volatilityAdvice: string;
  atr: string;
  atrDesc: string;
  klineCount: number;
  algorithmStatus: string;
  algorithmSource: string;
  spreadStr?: string;
  spreadRatio?: number;
  identifyResult?: any;
}

/**
 * 风险评估数据
 */
export interface RiskAssessment {
  level: string;
  score: number;
}

/**
 * 推荐配置详情
 */
export interface RecommendedConfig {
  gridSpacing: string;
  gridSpacingPercent: string;
  tradeQuantity: string;
  tradeValue: string;
  expectedDailyFrequency: string;
  expectedDailyProfit: string;
  expectedDailyFee: string;
  expectedDailyROI: string;
  singleNetProfit: string;
  turnoverRatio: string;
  analysis?: {
    totalConfigCount: number;
    topList: GridConfigOption[];
    avgPrice: number;
  };
}

/**
 * 优化结果完整数据
 */
export interface OptimizationResult {
  symbol: string;
  interval: string;
  intervalLabel: string;
  optimizeTarget: string;
  optimizeTargetLabel: string;
  enableBoundaryDefense: boolean;
  totalCapital: number;
  minTradeValue: number;
  maxTradeValue: number;
  feeRate: number;
  market: MarketAnalysis;
  risk: RiskAssessment;
  recommended: RecommendedConfig;
  boundaryDefense?: RecommendedConfig;
}

/**
 * 应用到表单的配置数据
 */
export interface OptimizedConfig {
  gridPriceDifference: number;
  gridTradeQuantity: number;
  gtLimitationPrice?: number;
  ltLimitationPrice?: number;
}

/**
 * 智能配置弹窗 Props
 */
export interface SmartConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onApply: (config: OptimizedConfig) => void;
  defaultParams?: {
    tradingPair?: string;
    positionSide?: PositionSide;
    apiKey?: string;
    apiSecret?: string;
  };
}
```

**Step 3: 保存文件**

保存修改后的类型文件。

**Step 4: 验证类型语法**

Run: `cd frontend && npm run type-check 2>&1 | grep -A 5 "grid-strategy"` || echo "类型检查通过"

**Step 5: 提交类型定义**

```bash
git add frontend/src/types/grid-strategy.ts
git commit -m "feat(grid-strategy): 添加智能配置相关类型定义"
```

---

## 阶段2：创建智能配置弹窗组件

### Task 2: 创建 SmartConfigModal 组件文件

**Files:**
- Create: `frontend/src/components/GridStrategy/SmartConfigModal.tsx`

**Step 1: 创建组件目录**

Run: `mkdir -p frontend/src/components/GridStrategy`

**Step 2: 创建组件文件骨架**

创建 `frontend/src/components/GridStrategy/SmartConfigModal.tsx`，内容如下：

```typescript
import { useState, useEffect } from 'react';
import { Modal, NumberInput, Radio, RadioGroup, Table, LoadingOverlay } from '@mantine/core';
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
```

**Step 3: 保存文件**

**Step 4: 提交骨架代码**

```bash
git add frontend/src/components/GridStrategy/SmartConfigModal.tsx
git commit -m "feat(grid-strategy): 创建智能配置弹窗组件骨架"
```

---

### Task 3: 实现输入表单UI

**Files:**
- Modify: `frontend/src/components/GridStrategy/SmartConfigModal.tsx:100-120`

**Step 1: 定位到输入表单的TODO位置**

找到 `{/* TODO: Task 3 - 添加输入表单 */}` 注释

**Step 2: 替换为完整的输入表单代码**

将 TODO 块替换为：

```typescript
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
      <RadioGroup
        value={optimizeTarget}
        onChange={(value: 'profit' | 'cost') => setOptimizeTarget(value)}
      >
        <Radio value="profit" label="收益最大化" />
        <Radio value="cost" label="成本摊薄高频" />
      </RadioGroup>
      <div className="smart-config-form-help">
        {optimizeTarget === 'profit'
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
          value={minTradeValue}
          onChange={(value) => setMinTradeValue(typeof value === 'number' ? value : parseFloat(value || '20'))}
          min={10}
          max={1000}
          step={5}
          placeholder="最小值"
        />
        <span className="smart-config-input-separator">~</span>
        <NumberInput
          value={maxTradeValue}
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
      <RadioGroup
        value={interval}
        onChange={(value: string) => setInterval(value)}
      >
        <Radio value="1h" label="1小时" />
        <Radio value="4h" label="4小时（推荐）" />
        <Radio value="1d" label="1天" />
      </RadioGroup>
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
```

**Step 3: 保存文件**

**Step 4: 验证导入**

确认 `RadioGroup` 和 `Radio` 已从 @mantine/core 导入（在文件顶部）

如果没有，添加到导入列表：
```typescript
import { Modal, NumberInput, RadioGroup, Radio, Table, LoadingOverlay } from '@mantine/core';
```

**Step 5: 提交输入表单**

```bash
git add frontend/src/components/GridStrategy/SmartConfigModal.tsx
git commit -m "feat(grid-strategy): 实现智能配置输入表单UI"
```

---

### Task 4: 实现结果展示UI

**Files:**
- Modify: `frontend/src/components/GridStrategy/SmartConfigModal.tsx:140-160`

**Step 1: 定位到结果展示的TODO位置**

找到 `{/* TODO: Task 4 - 添加结果展示 */}` 注释

**Step 2: 替换为完整的结果展示代码**

将 TODO 块替换为：

```typescript
{step === 'result' && optimizationResult && (
  <div className="smart-config-result">
    {/* 市场分析 */}
    <div className="smart-config-section">
      <h3 className="smart-config-section-title">
        <span>📊</span>
        市场分析（{optimizationResult.intervalLabel}）
      </h3>
      <div className="smart-config-market-analysis">
        <div className="smart-config-analysis-item">
          <span className="label">支撑位</span>
          <span className="value">{optimizationResult.market.support} USDT</span>
        </div>
        <div className="smart-config-analysis-item">
          <span className="label">阻力位</span>
          <span className="value">{optimizationResult.market.resistance} USDT</span>
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
          <span className="advice">{optimizationResult.market.volatilityAdvice}</span>
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
        {defaultParams?.positionSide === 'LONG' ? (
          <>
            <div className="smart-config-range-rule">
              价格高于 {optimizationResult.market.resistance} USDT，暂停开仓，规避上涨风险
            </div>
            <div className="smart-config-range-rule">
              价格低于 {optimizationResult.market.support} USDT，继续网格，持续更高收益
            </div>
          </>
        ) : (
          <>
            <div className="smart-config-range-rule">
              价格高于 {optimizationResult.market.resistance} USDT，继续网格，持续更高收益
            </div>
            <div className="smart-config-range-rule">
              价格低于 {optimizationResult.market.support} USDT，暂停开仓，规避下跌风险
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
        配置对比 - {optimizationResult.optimizeTargetLabel}
      </h3>
      <Table className="smart-config-table">
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
          {optimizationResult.recommended.analysis?.topList?.map((config: GridConfigOption, index: number) => (
            <tr
              key={index}
              className={selectedConfigIndex === index ? 'selected' : ''}
              onClick={() => setSelectedConfigIndex(index)}
            >
              <td>{config.gridSpacingPercent}</td>
              <td>{config.tradeValue}</td>
              <td>{config.expectedDailyFrequency}</td>
              <td>{config.expectedDailyProfit}</td>
              <td>{config.expectedDailyROI}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>

    {/* 当前选中配置 */}
    {optimizationResult.recommended.analysis?.topList?.[selectedConfigIndex] && (
      <div className="smart-config-section">
        <h3 className="smart-config-section-title">
          <span>✅</span>
          当前选中配置
        </h3>
        <div className="smart-config-selected">
          <div className="smart-config-selected-item">
            <span className="label">网格区间</span>
            <span className="value">
              {optimizationResult.market.support} ~ {optimizationResult.market.resistance} USDT
            </span>
          </div>
          <div className="smart-config-selected-item">
            <span className="label">每笔交易</span>
            <span className="value">
              {optimizationResult.recommended.analysis.topList[selectedConfigIndex].tradeQuantity}
            </span>
          </div>
          <div className="smart-config-selected-item">
            <span className="label">预期日频</span>
            <span className="value">
              {optimizationResult.recommended.analysis.topList[selectedConfigIndex].expectedDailyFrequency} 次/天
            </span>
          </div>
          <div className="smart-config-selected-item">
            <span className="label">预期日收益</span>
            <span className="value">
              {optimizationResult.recommended.analysis.topList[selectedConfigIndex].expectedDailyProfit} USDT
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
```

**Step 3: 保存文件**

**Step 4: 提交结果展示**

```bash
git add frontend/src/components/GridStrategy/SmartConfigModal.tsx
git commit -m "feat(grid-strategy): 实现智能配置结果展示UI"
```

---

## 阶段3：添加样式

### Task 5: 添加智能配置样式

**Files:**
- Modify: `frontend/src/index.scss`

**Step 1: 打开样式文件**

Run: `tail -50 frontend/src/index.scss`

查看文件末尾，确认插入位置。

**Step 2: 在文件末尾添加智能配置样式**

```scss
/* ==================== 智能配置弹窗 ==================== */

/* 弹窗内容区 */
.smart-config-modal {
}

.smart-config-content {
  padding: 24px;
}

/* 区块容器 */
.smart-config-section {
  margin-bottom: 24px;
}

.smart-config-section:last-child {
  margin-bottom: 0;
}

.smart-config-section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ==================== 输入表单 ==================== */

.smart-config-form {
}

.smart-config-form-field {
  margin-bottom: 20px;
}

.smart-config-form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text);
}

.smart-config-form-help {
  display: block;
  font-size: var(--text-xs);
  margin-top: 6px;
  color: var(--color-text-muted);
}

/* 范围输入组 */
.smart-config-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.smart-config-input-group .mantine-NumberInput-root {
  flex: 1;
}

.smart-config-input-separator {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
}

/* ==================== 结果页面 ==================== */

.smart-config-result {
}

/* 市场分析 */
.smart-config-market-analysis {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.smart-config-analysis-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.smart-config-analysis-item.full-width {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.smart-config-analysis-item .label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.smart-config-analysis-item .value {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.smart-config-analysis-item .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--color-success);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.smart-config-analysis-item .advice {
  font-size: var(--text-sm);
  color: var(--color-text);
}

/* 推荐交易区间 */
.smart-config-trading-range {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.smart-config-range-rule {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.6;
}

.smart-config-range-rule:last-child {
  margin-bottom: 12px;
}

.smart-config-range-rule::before {
  content: "•";
  color: var(--color-primary);
  font-weight: bold;
}

.smart-config-range-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ==================== 配置表格 ==================== */

.smart-config-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.smart-config-table thead {
  background: var(--color-surface-alt);
}

.smart-config-table thead th {
  padding: 12px 16px;
  text-align: left;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.smart-config-table tbody tr {
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.2s;
}

.smart-config-table tbody tr:hover {
  background: var(--color-surface-alt);
}

.smart-config-table tbody tr.selected {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-left: 3px solid var(--color-primary);
}

.smart-config-table tbody td {
  padding: 12px 16px;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.smart-config-table tbody tr.selected td {
  font-weight: 600;
}

/* ==================== 当前选中配置 ==================== */

.smart-config-selected {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05) 0%, rgba(var(--color-primary-rgb), 0.02) 100%);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  padding: 16px;
}

.smart-config-selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: var(--text-sm);
}

.smart-config-selected-item .label {
  color: var(--color-text-muted);
}

.smart-config-selected-item .value {
  font-weight: 600;
  color: var(--color-text);
}

/* ==================== 按钮组 ==================== */

.smart-config-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.smart-config-actions .btn {
  flex: 1;
}
```

**Step 3: 保存文件**

**Step 4: 提交样式**

```bash
git add frontend/src/index.scss
git commit -m "feat(grid-strategy): 添加智能配置弹窗样式"
```

---

## 阶段4：集成到表单页面

### Task 6: 在编辑页面集成智能配置按钮

**Files:**
- Modify: `frontend/src/pages/GridStrategy/edit.tsx`

**Step 1: 添加导入语句**

在文件顶部的导入区域添加：

```typescript
import { SmartConfigModal } from '../../components/GridStrategy/SmartConfigModal';
import type { OptimizedConfig } from '../../types/grid-strategy';
```

**Step 2: 添加弹窗状态**

在组件内部的状态定义区域（约第27行之后）添加：

```typescript
// 智能配置弹窗状态
const [smartConfigOpened, setSmartConfigOpened] = useState(false);
```

**Step 3: 添加智能配置处理函数**

在 `fillMockData` 函数之后（约第229行）添加：

```typescript
// 打开智能配置弹窗
function handleOpenSmartConfig() {
    // 验证必填字段
    if (!formData.tradingPair.trim()) {
        showWarning('请先选择交易对');
        return;
    }
    if (!formData.apiKey.trim()) {
        showWarning('请先选择币安API Key');
        return;
    }
    if (!formData.apiSecret.trim()) {
        showWarning('请先选择币安API Key');
        return;
    }
    setSmartConfigOpened(true);
}

// 应用智能配置
function handleApplySmartConfig(config: OptimizedConfig) {
    setFormData(prev => ({
        ...prev,
        gridPriceDifference: config.gridPriceDifference,
        gridTradeQuantity: config.gridTradeQuantity,
        gtLimitationPrice: config.gtLimitationPrice,
        ltLimitationPrice: config.ltLimitationPrice
    }));
}
```

**Step 4: 在页面头部添加智能配置按钮**

在"基础设置"区块之前（约第278行）添加：

```typescript
{/* 智能配置按钮 */}
<div className="surface p-12 mb-16">
    <div className="flex items-center justify-between">
        <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 'var(--text-lg)' }}>
                还在为参数设置发愁？
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                使用智能配置，基于历史数据自动计算最优参数
            </p>
        </div>
        <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenSmartConfig}
            style={{ height: '40px', padding: '0 24px' }}
        >
            智能配置
        </button>
    </div>
</div>
```

**Step 5: 在组件末尾添加弹窗组件**

在 `</div>` 闭合标签之前（文件末尾，约第680行）添加：

```typescript
{/* 智能配置弹窗 */}
<SmartConfigModal
    opened={smartConfigOpened}
    onClose={() => setSmartConfigOpened(false)}
    onApply={handleApplySmartConfig}
    defaultParams={{
        tradingPair: formData.tradingPair,
        positionSide: formData.positionSide,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret
    }}
/>
```

**Step 6: 保存文件**

**Step 7: 提交集成代码**

```bash
git add frontend/src/pages/GridStrategy/edit.tsx
git commit -m "feat(grid-strategy): 集成智能配置按钮到编辑页面"
```

---

## 阶段5：测试和验证

### Task 7: 手动功能测试

**Step 1: 启动前端开发服务器**

Run: `cd frontend && npm run dev`

**Step 2: 访问网格策略编辑页面**

浏览器打开: `http://localhost:5173/#/grid-strategy/create`

**Step 3: 测试智能配置按钮**

1. 选择交易对：BTCUSDT
2. 选择API Key（任意有效key）
3. 点击"智能配置"按钮

Expected: 弹窗打开，显示输入表单

**Step 4: 测试输入表单**

1. 输入预算：1000
2. 选择优化目标：收益最大化
3. 输入金额范围：20~50
4. 选择周期：4小时
5. 点击"开始计算"

Expected:
- 显示loading遮罩
- 调用API
- 显示结果页面

**Step 5: 测试结果展示**

验证以下区块正确显示：
- 市场分析（支撑位、阻力位、波动率、风险等级）
- 推荐交易区间（根据做多/做空显示不同文案）
- 配置对比表格（5行数据）
- 当前选中配置

**Step 6: 测试配置选择**

1. 点击表格中的不同行
2. 观察"当前选中配置"区块是否实时更新

Expected: 选中行高亮，配置详情实时更新

**Step 7: 测试应用配置**

1. 选择一个配置
2. 点击"应用配置"按钮

Expected:
- 弹窗关闭
- 表单字段自动填充：
  - 网格价格差价 = 选择的gridSpacing
  - 网格交易数量 = 选择的tradeQuantity
  - 价格上限 = 阻力位
  - 价格下限 = 支撑位
- 显示"智能配置已应用"提示

**Step 8: 测试错误处理**

1. 打开智能配置
2. 输入预算：0 或负数
3. 点击"开始计算"

Expected: 显示"请输入有效的预算投入资金"警告

**Step 9: 测试重新计算**

1. 在结果页面点击"重新计算"按钮

Expected: 返回输入表单页面

**Step 10: 测试编辑模式**

1. 编辑一个已有策略
2. 点击"智能配置"按钮

Expected: 弹窗正常打开并使用当前表单的参数

### Task 8: 样式验证

**Step 1: 检查弹窗样式**

验证以下样式正确应用：
- 弹窗标题居中对齐
- 输入字段间距合适
- 市场分析区块网格布局（2列）
- 配置表格边框、圆角、悬停效果
- 选中行高亮（primary色背景 + 左侧边框）

**Step 2: 检查响应式布局**

虽然项目不需要响应式设计，但验证在标准桌面屏幕（1920x1080）下显示正常。

**Step 3: 检查颜色一致性**

验证使用的颜色变量与项目其他页面一致：
- 主色调、成功色、文本颜色
- 边框颜色、背景色

### Task 9: 控制台错误检查

**Step 1: 打开浏览器开发者工具**

F12 打开 Console 面板

**Step 2: 执行完整流程**

从打开弹窗到应用配置，观察控制台

Expected: 无错误信息，无警告（除了可能的API请求失败）

**Step 3: 检查网络请求**

在 Network 面板查看：

1. `/api/v1/grid-strategy/optimize` 请求
2. 请求参数是否正确
3. 响应数据是否完整

### Task 10: 边界情况测试

**Step 1: 测试极端输入**

- 预算：10（最小值）
- 预算：100000（最大值）
- 金额范围：10~10（相等）
- 金额范围：1000~10（min > max）

Expected: 适当的验证提示

**Step 2: 测试API失败场景**

1. 使用无效的API Key
2. 点击"开始计算"

Expected: 显示"优化失败，请重试"错误提示

**Step 3: 测试空数据处理**

如果API返回空配置列表：

Expected: 不显示表格，不显示"当前选中配置"区块

---

## 阶段6：文档和清理

### Task 11: 更新组件导出

**Files:**
- Modify: `frontend/src/components/GridStrategy/index.ts`（如果存在）

**Step 1: 检查是否有index文件**

Run: `ls frontend/src/components/GridStrategy/`

**Step 2: 如果存在index.ts，添加导出**

```typescript
export { SmartConfigModal } from './SmartConfigModal';
```

**Step 3: 如果不存在，创建index.ts**

创建 `frontend/src/components/GridStrategy/index.ts`:

```typescript
export { SmartConfigModal } from './SmartConfigModal';
export { default } from './SmartConfigModal';
```

**Step 4: 提交**

```bash
git add frontend/src/components/GridStrategy/
git commit -m "feat(grid-strategy): 添加SmartConfigModal组件导出"
```

### Task 12: 代码注释检查

**Step 1: 检查所有中文注释**

确保所有关键逻辑都有中文注释说明

**Step 2: 移除调试console.log**

搜索并移除开发过程中的console.log（保留错误日志的console.error）

**Step 3: 确认没有TODO残留**

Run: `grep -r "TODO" frontend/src/components/GridStrategy/`

Expected: 无TODO注释（或仅在必要处保留）

### Task 13: 最终提交

**Step 1: 查看所有更改**

Run: `git status`

**Step 2: 确保所有文件已提交**

如果有未提交的文件：

```bash
git add frontend/
git commit -m "feat(grid-strategy): 完成智能配置功能开发"
```

**Step 3: 查看提交历史**

Run: `git log --oneline -10`

确认功能开发的完整提交链。

---

## 验收标准

完成所有Task后，满足以下标准即视为功能完成：

### 功能完整性
- ✅ 用户可以在新建/编辑页面点击"智能配置"按钮
- ✅ 弹窗包含完整的输入表单（预算、优化目标、金额范围、周期）
- ✅ 点击"开始计算"后调用API并显示结果
- ✅ 结果页面显示市场分析、推荐区间、配置对比表格
- ✅ 用户可以选择不同配置方案
- ✅ 点击"应用配置"后参数回填到表单
- ✅ 输入验证和错误处理完善

### 代码质量
- ✅ 类型定义完整，无any类型
- ✅ 组件职责单一，代码可读性好
- ✅ 遵循项目代码规范（完整路径选择器、无嵌套&）
- ✅ 注释清晰，中文注释完善
- ✅ 无console.log残留（除错误日志）

### 用户体验
- ✅ UI美观，与项目风格一致
- ✅ 交互流畅，无卡顿
- ✅ 错误提示友好，指导性强
- ✅ Loading状态清晰
- ✅ 表格行点击反馈明确

### 测试覆盖
- ✅ 正常流程测试通过
- ✅ 边界情况测试通过
- ✅ 错误处理测试通过
- ✅ 样式在不同屏幕下显示正常

---

## 已知问题和限制

1. **API依赖**: 功能依赖后端优化接口，接口不可用时功能无法使用
2. **网络延迟**: 优化计算需要3-5秒，需要耐心等待
3. **配置限制**: 只提供5个推荐配置，用户无法自定义更多配置
4. **历史数据**: 基于历史数据预测，未来市场可能有变化

---

## 后续优化建议

1. **缓存优化**: 相同参数5分钟内不重复请求
2. **历史记录**: 保存用户的优化历史
3. **导出报告**: 支持导出PDF或图片格式的优化报告
4. **更多优化目标**: 添加"风险最小化"、"最大回撤控制"等目标
5. **参数建议**: 根据交易对自动推荐默认参数

---

**实施计划完成时间估算**: 2-3小时
**测试时间估算**: 1小时
**总计**: 3-4小时
