# 网格策略智能配置功能设计文档

创建日期：2025-12-27
功能模块：网格策略 - 智能配置

## 1. 功能概述

在网格策略的新建/编辑页面添加"智能配置"功能，通过分析历史K线数据，自动计算最优网格参数，帮助用户快速配置策略。

### 核心价值
- 降低用户配置门槛，自动计算最优参数
- 基于历史数据分析，提供科学配置建议
- 多种优化目标选择，满足不同投资策略

## 2. 整体架构

### 2.1 技术选型
- **UI组件**：复用 Mantine 组件库（Modal、Table、NumberInput、Select、Radio）
- **状态管理**：React useState hooks
- **API调用**：后端接口已存在（POST /v1/grid-strategy/optimize）

### 2.2 文件结构
```
frontend/
├── src/
│   ├── components/
│   │   └── GridStrategy/
│   │       └── SmartConfigModal.tsx     # 新建：智能配置弹窗组件
│   ├── types/
│   │   └── grid-strategy.ts             # 扩展：添加智能配置相关类型
│   └── pages/
│       └── GridStrategy/
│           └── edit.tsx                 # 修改：集成智能配置按钮
└── index.scss                           # 修改：添加智能配置样式
```

### 2.3 数据流
```
用户输入 → 验证表单 → 调用API → 显示loading →
展示结果（市场分析+推荐区间+配置表格）→
用户选择配置 → 点击应用 → 更新表单字段 → 关闭弹窗
```

## 3. 组件设计

### 3.1 SmartConfigModal 组件

**Props 接口：**
```typescript
interface SmartConfigModalProps {
  opened: boolean;              // 弹窗显示状态
  onClose: () => void;          // 关闭弹窗回调
  onApply: (config: OptimizedConfig) => void;  // 应用配置回调
  defaultParams?: {             // 默认参数（从表单预填充）
    tradingPair?: string;
    positionSide?: 'LONG' | 'SHORT';
    apiKey?: string;
    apiSecret?: string;
  }
}
```

**内部状态：**
```typescript
// 输入参数状态
const [budget, setBudget] = useState<number>(1000);
const [optimizeTarget, setOptimizeTarget] = useState<'profit' | 'cost'>('profit');
const [minTradeValue, setMinTradeValue] = useState<number>(20);
const [maxTradeValue, setMaxTradeValue] = useState<number>(100);
const [interval, setInterval] = useState<string>('4h');

// UI状态
const [step, setStep] = useState<'input' | 'result'>('input');
const [loading, setLoading] = useState(false);
const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
const [selectedConfigIndex, setSelectedConfigIndex] = useState<number>(0);
```

### 3.2 类型定义

在 `frontend/src/types/grid-strategy.ts` 中添加：

```typescript
// 优化目标类型
export type OptimizeTarget = 'profit' | 'cost';

// 单个配置方案
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

// 优化结果
export interface OptimizationResult {
  symbol: string;
  interval: string;
  optimizeTarget: string;
  totalCapital: number;
  market: {
    currentPrice: string;
    support: string;
    resistance: string;
    volatility: string;
    volatilityLevel: string;
    volatilityAdvice: string;
  };
  risk: {
    level: string;
    score: number;
  };
  recommended: {
    gridSpacing: string;
    tradeQuantity: string;
    tradeValue: string;
    expectedDailyFrequency: string;
    expectedDailyProfit: string;
    expectedDailyROI: string;
    analysis?: {
      topList: GridConfigOption[];
    };
  };
}

// 应用配置时的数据结构
export interface OptimizedConfig {
  gridPriceDifference: number;      // 网格价格差价
  gridTradeQuantity: number;        // 网格交易数量
  gtLimitationPrice?: number;       // 价格上限（阻力位）
  ltLimitationPrice?: number;       // 价格下限（支撑位）
}
```

## 4. UI设计

### 4.1 两阶段布局

**阶段1：输入表单** (step = 'input')
- 预算投入资金（USDT）
- 优化目标：收益最大化 / 成本摊薄高频
- 每笔交易金额范围（USDT）：最小值、最大值
- 市场分析周期：1小时 / 4小时 / 1天
- 开始计算按钮

**阶段2：优化结果确认** (step = 'result')
- 市场分析区块：支撑位、阻力位、波动率、是否适合网格的文案
- 推荐交易区间区块：根据做多/做空显示不同策略文案
- 配置对比表格：展示5个配置方案，点击选择
- 当前选中配置区块：显示选中的配置详情
- 操作按钮：重新计算、应用配置

### 4.2 交互流程

```
用户点击「智能配置」按钮
    ↓
打开弹窗（step='input'）
    ↓
用户填写：预算、优化目标、金额范围
    ↓
点击「开始计算」
    ↓
验证输入 → 调用API → 显示loading
    ↓
API返回成功
    ↓
切换到结果页面（step='result'）
    ↓
显示：市场分析 + 推荐区间 + 配置表格
    ↓
用户浏览配置，点击表格行选择
    ↓
「当前选中配置」区块实时更新
    ↓
点击「应用配置」
    ↓
将参数回填到表单 + 关闭弹窗 + 显示成功提示

（或点击「重新计算」返回输入页面）
（或点击关闭按钮/遮罩关闭弹窗）
```

### 4.3 验证规则

**输入验证：**
- 预算投入：必须 > 0
- 每笔金额范围：min < max，且 min >= 10, max <= 10000
- 交易对：必须先选择

**API错误处理：**
- 网络错误：提示用户检查网络
- 参数错误：显示具体错误信息
- 无可用配置：提示用户调整参数

## 5. API接口

### 5.1 接口信息
- **接口路径**：`POST /v1/grid-strategy/optimize`
- **是否已实现**：是
- **权限验证**：需要VIP权限（vipMiddleware.validateVipAccess）

### 5.2 请求参数
```json
{
  "symbol": "BTCUSDT",           // 交易对
  "totalCapital": 1000,          // 总投入资金 (USDT)
  "interval": "4h",              // K线周期（可选，默认4h）
  "optimizeTarget": "profit",    // 优化目标：profit(收益最大化) / cost(成本摊薄)
  "minTradeValue": 20,           // 最小每笔交易金额（可选，默认20）
  "maxTradeValue": 100,          // 最大每笔交易金额（可选，默认100）
  "apiKey": "xxx",               // 币安API Key
  "apiSecret": "xxx"             // 币安API Secret
}
```

### 5.3 响应数据
```json
{
  "status": "success",
  "data": {
    "symbol": "BTCUSDT",
    "market": {
      "currentPrice": "43250.500000",
      "support": "42000.000000",
      "resistance": "44500.000000",
      "volatility": "5.23%",
      "volatilityLevel": "高",
      "volatilityAdvice": "非常适合做网格，交易机会多"
    },
    "risk": {
      "level": "激进型",
      "score": 0.75
    },
    "recommended": {
      "gridSpacing": "125.500000",
      "tradeQuantity": "0.002500",
      "tradeValue": "100.00",
      "expectedDailyFrequency": "12.50",
      "expectedDailyProfit": "15.50",
      "expectedDailyROI": "1.5500%",
      "analysis": {
        "topList": [
          {
            "gridSpacing": "125.500000",
            "gridSpacingPercent": "0.2903%",
            "tradeValue": "100.00",
            "dailyFrequency": 12.50,
            "dailyProfit": 15.50,
            "dailyROI": 1.55
          }
          // ... 更多配置
        ]
      }
    }
  }
}
```

## 6. 样式规范

### 6.1 样式组织
所有样式添加到 `frontend/src/index.scss`，遵循项目规范：
- 使用完整路径选择器
- 禁止使用嵌套选择器的"&"符号
- 禁止使用"%"符号
- 不需要考虑响应式设计

### 6.2 样式类命名
- `.smart-config-modal` - 弹窗主容器
- `.smart-config-form` - 表单容器
- `.smart-config-result` - 结果页面容器
- `.smart-config-market-analysis` - 市场分析区块
- `.smart-config-trading-range` - 交易区间区块
- `.smart-config-table` - 配置表格
- `.smart-config-selected` - 当前选中配置区块
- `.smart-config-actions` - 按钮组容器
- `.smart-config-loading` - 加载状态

### 6.3 颜色变量
使用项目现有的 CSS 变量：
- `--color-text` - 主要文本颜色
- `--color-text-muted` - 次要文本颜色
- `--color-primary` - 主题色
- `--color-success` - 成功色
- `--color-surface` - 表面背景色
- `--color-border` - 边框颜色

## 7. 实施要点

### 7.1 代码复用原则
- 充分复用现有 Mantine 组件（Modal、Table、NumberInput、Select、Checkbox）
- 复用现有的 API 错误处理工具（showWarning、showSuccess）
- 复用币安 store 的数据（apiKeyList、usdtPairs）

### 7.2 开发顺序
1. 扩展类型定义（grid-strategy.ts）
2. 创建 SmartConfigModal 组件
3. 添加样式到 index.scss
4. 在 edit.tsx 中集成智能配置按钮
5. 测试整个流程

### 7.3 测试要点
- 输入验证：预算、金额范围的合法性
- API调用：成功和失败场景
- 配置选择：表格行点击、选中高亮
- 应用配置：参数正确回填到表单
- 错误处理：网络错误、参数错误、无可用配置

### 7.4 用户提示
- 输入验证失败：使用 showWarning 显示具体错误
- API调用成功：使用 showSuccess 提示"智能配置已应用"
- API调用失败：使用 showWarning 提示"优化失败，请重试"

## 8. 后续优化建议

### 8.1 性能优化
- 配置表格数据量大时使用虚拟滚动
- API调用结果缓存（相同参数5分钟内不重复请求）

### 8.2 功能增强
- 添加历史配置记录
- 支持导出优化报告
- 添加配置对比图表

### 8.3 用户体验
- 添加参数推荐提示（根据交易对给出默认值）
- 显示优化进度百分比
- 添加配置风险提示

## 9. 参考资料

- 后端服务：`nodejs-server/service/grid-optimizer.service.js`
- 后端路由：`nodejs-server/route/v1/grid-strategy.route.js`
- 前端表单：`frontend/src/pages/GridStrategy/edit.tsx`
- Mantine文档：https://mantine.dev/core/modal/
