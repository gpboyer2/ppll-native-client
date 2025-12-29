# 网格策略参数验证设计文档

**日期**: 2025-12-29
**目标**: 在创建/编辑网格策略时，对参数进行交易所规则验证，防止配置错误导致运行失败

---

## 一、问题背景

当前策略创建/编辑时只进行基本验证（必填、大于0），缺少对币安交易所规则的具体验证。导致用户配置的策略在运行时才发现问题（如交易数量小于最小限制）。

## 二、设计原则

1. **前后端双重验证**: 前端提供即时反馈，后端做最终校验
2. **混合规则获取**: 优先使用缓存，支持手动刷新
3. **完整字段验证**: 覆盖所有与交易所规则相关的字段
4. **智能建议**: 显示错误 + 建议值，用户可选择采纳

---

## 三、整体架构

### 三层验证架构

```
用户输入
  ↓
前端实时验证层 (React组件)
  - 使用 binance-store 缓存
  - 实时显示验证状态
  - 提供智能建议
  ↓
用户确认提交
  ↓
后端同步验证层 (Controller)
  - 调用 binance-precision 工具
  - 返回详细错误和建议
  - 最后保障数据安全
  ↓
保存到数据库
```

### 交易所规则缓存层

利用现有的 `binance-store`：
- 缓存币安 exchangeInfo 数据
- 提供 `getTradingPairRules(symbol)` 方法
- 支持手动刷新机制

---

## 四、前端验证设计

### 数据结构

```typescript
// 交易对规则接口
interface TradingPairRules {
  symbol: string;
  minQty: string;         // 最小交易数量
  maxQty: string;         // 最大交易数量
  qtyPrecision: number;   // 数量精度
  minPrice: string;       // 最小价格
  maxPrice: string;       // 最大价格
  pricePrecision: number; // 价格精度
  tickSize: string;       // 价格步长
  minNotional: string;    // 最小名义价值
  maxLeverage: number;    // 最大杠杆倍数
}

// 验证结果接口
interface ValidationResult {
  valid: boolean;
  field: string;
  message: string;
  suggestion?: any;
  severity?: 'error' | 'warning';
}
```

### 表单集成方式

- 在 `GridStrategyEditPage` 添加验证状态
- 用户离开输入框时触发验证 (onBlur)
- 实时显示验证提示（绿色√、红色×、黄色!）
- 错误时显示：`当前值 X 不符合要求，建议改为 Y`

### 关键验证点

1. **数量字段**: `grid_trade_quantity` ≥ `minQty`
2. **价格差价**: `grid_price_difference` ≥ `tickSize`
3. **杠杆倍数**: 1 ≤ `leverage` ≤ `maxLeverage`

---

## 五、后端验证设计

### 验证中间件

```javascript
// utils/strategy-validator.js
const validateStrategyParams = catchAsync(async (req, res, next) => {
  const { api_key, secret_key } = req.apiCredentials;
  const { trading_pair, grid_trade_quantity, grid_price_difference, leverage } = req.body;

  // 1. 获取交易对规则
  const exchangeInfo = await binanceExchangeInfoService.getExchangeInfo({ api_key, secret_key });
  const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === trading_pair);

  if (!symbolInfo) {
    return sendError(res, `交易对 ${trading_pair} 不存在或不可用`, 400);
  }

  // 2. 验证交易数量
  const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
  if (grid_trade_quantity && grid_trade_quantity < Number(lotSizeFilter.minQty)) {
    return sendError(res, {
      message: `交易数量不能小于最小值 ${lotSizeFilter.minQty}`,
      field: 'grid_trade_quantity',
      suggestion: lotSizeFilter.minQty
    }, 400);
  }

  // 3. 验证其他字段...
  next();
});
```

### 路由集成

```javascript
router.post('/create', validateStrategyParams, gridStrategyController.create);
router.post('/update', validateStrategyParams, gridStrategyController.update);
```

---

## 六、用户体验设计

### 实时验证提示

- 输入框下方显示验证状态图标
- 错误时显示红色边框和提示文字
- 格式：`当前值 0.0002 过小，最小要求 0.001`

### 智能建议按钮

- 验证失败时显示"采纳建议"按钮
- 点击后自动填充建议值
- 示例：`[采纳建议] 将数量改为 0.001`

### 提交前检查

- "保存"按钮旁边显示验证状态
- 有错误时按钮置灰
- 有警告时按钮可点击，显示"保存（有警告）"

### 交易所规则提示

- 每个字段旁边显示 "?" 图标
- 悬停显示该字段的交易所规则
- 示例："BTCUSDT 最小数量: 0.001, 精度: 3位小数"

---

## 七、错误处理

### 异常场景

1. **交易所信息获取失败**
   - 降级到基本验证（>0）
   - 显示警告"无法获取交易所规则"
   - 提供"重试"按钮

2. **缓存过期**
   - 检测缓存时间（超过1小时显示警告）
   - 提供"刷新交易所信息"按钮

3. **交易对不支持**
   - 前端：在选择时过滤不支持的交易对
   - 后端：返回明确错误

4. **部分字段验证失败**
   - 返回所有验证错误
   - 格式：`{ errors: [{field, message, suggestion}, ...] }`

5. **数值精度处理**
   - 显示时按交易所精度格式化
   - 提交时自动调整到合法精度

---

## 八、实施计划

### 阶段一：后端验证（优先）
1. 创建 `utils/strategy-validator.js`
2. 在 `grid-strategy.controller.js` 集成验证中间件
3. 测试：创建不符合规则的策略

### 阶段二：前端验证工具
1. 创建 `utils/strategy-validation.ts`
2. 从 `binance-store` 获取交易所规则
3. 实现各字段验证逻辑

### 阶段三：前端 UI 集成
1. 修改 `edit.tsx` 添加验证状态
2. 添加实时验证提示组件
3. 实现智能建议按钮

### 阶段四：测试
- 数量小于/超过限制
- 价格差价不符合 tickSize
- 杠杆超过限制
- 交易所信息获取失败
