# 命名规范统一重构设计方案

**日期**：2025年12月28日
**模块**：网格策略模块（起始模块）
**重构方式**：分模块渐进

## 一、命名规范规则

| 类别 | 规范 | 示例 |
|------|------|------|
| 数据库表名 | snake_case | `grid_strategies`, `grid_trade_history` |
| 数据库字段名 | snake_case | `trading_pair`, `grid_price_difference` |
| JavaScript 类名 | 保持不变 | `class Robot`（类名都是 PascalCase） |
| Model 字段定义 | snake_case | `api_key: DataTypes.STRING` |
| 函数/方法名 | 保持不变 | `getOrderList()`, `createStrategy()`（PascalCase优先） |
| 变量名（含局部变量） | snake_case | `const grid_strategy = ...` |
| 前端类型定义字段 | snake_case | `interface Strategy { trading_pair: string }` |
| API 请求/响应字段 | snake_case | `{ trading_pair: "BTCUSDT" }` |

### 第三方交互例外

与币安等第三方交互时，保持第三方原有的命名风格（如币安的 `symbol`, `positionSide` 等），只在代码内部进行映射转换。

## 二、影响范围

所有的Nodejs服务 和 前端接口字段相关!

## 三、具体变更内容

### 1. Model 字段定义

**原代码**：
```javascript
apiKey: {
  type: DataTypes.STRING,
  allowNull: false
}
```

**变更为**：
```javascript
api_key: {
  type: DataTypes.STRING,
  allowNull: false
}
```

### 2. 前端类型定义

**原代码**：
```typescript
interface GridStrategy {
  apiKey?: string;
  apiSecret?: string;
}
```

**变更为**：
```typescript
interface GridStrategy {
  api_key?: string;
  secret_key?: string;
}
```

### 3. 前端 API 调用

直接透传后端字段，不进行任何转换。

## 四、数据库迁移

### 迁移策略

开发环境进行破坏性重构，不需要回滚操作。

### 迁移脚本

```javascript
// migrations/YYYYMMDDHHMMSS-rename-grid-strategy-fields.js

module.exports = {
  up: async (queryInterface) => {
    // 网格策略表字段重命名
    await queryInterface.renameColumn('grid_strategies', 'apiKey', 'api_key');
    await queryInterface.renameColumn('grid_strategies', 'apiSecret', 'secret_key');
    await queryInterface.renameColumn('grid_strategies', 'tradingPair', 'trading_pair');
    await queryInterface.renameColumn('grid_strategies', 'positionSide', 'position_side');
    await queryInterface.renameColumn('grid_strategies', 'gridPriceDifference', 'grid_price_difference');
    await queryInterface.renameColumn('grid_strategies', 'gridTradeQuantity', 'grid_trade_quantity');
    await queryInterface.renameColumn('grid_strategies', 'initialFillPrice', 'initial_fill_price');
    await queryInterface.renameColumn('grid_strategies', 'initialFillQuantity', 'initial_fill_quantity');
    await queryInterface.renameColumn('grid_strategies', 'pollingInterval', 'polling_interval');
    await queryInterface.renameColumn('grid_strategies', 'fallPreventionCoefficient', 'fall_prevention_coefficient');
    await queryInterface.renameColumn('grid_strategies', 'minPrice', 'min_price');
    await queryInterface.renameColumn('grid_strategies', 'maxPrice', 'max_price');
    await queryInterface.renameColumn('grid_strategies', 'maxOpenPositionQuantity', 'max_open_position_quantity');
    await queryInterface.renameColumn('grid_strategies', 'minOpenPositionQuantity', 'min_open_position_quantity');
    await queryInterface.renameColumn('grid_strategies', 'robotname', 'robot_name');
  }
};
```

## 五、实施步骤

### 步骤1：数据库迁移
- 创建迁移脚本，重命名所有字段为 snake_case
- 执行迁移，更新数据库结构

### 步骤2：后端 Model 修改
- 修改 Model 定义中的所有字段名为 snake_case
- 更新相关的 Sequelize 配置

### 步骤3：后端 Controller 和 Service
- 更新所有使用这些字段的地方，使用新的字段名
- 函数名和类名保持不变

### 步骤4：前端类型定义
- 更新 TypeScript interface 中的所有字段名为 snake_case

### 步骤5：前端 API 调用
- 确保所有 API 调用使用新的字段名
- 删除任何字段名转换逻辑

### 步骤6：前端组件
- 更新所有使用这些字段的组件代码

## 六、验证方法

1. 运行后端服务，检查是否有 Sequelize 相关错误
2. 运行前端服务，检查 TypeScript 类型检查是否通过
3. 测试网格策略的增删改查功能
4. 检查浏览器控制台是否有字段相关错误
