# 移除用户系统，API Key 即用户认证 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 移除用户系统，使用 API Key + API Secret 作为身份凭证，实现单用户架构的认证机制。

**架构:**
- 前端通过拦截器自动注入 `apiKey` + `apiSecret`
- 后端通过中间件验证这两个字段的存在性
- 数据库 Model 删除所有 `user_id` 字段
- 数据隔离通过 `api_key` + `api_secret` 字段实现

**技术栈:**
- 后端: Express.js + Sequelize
- 前端: React + Zustand
- 数据库: SQLite (开发)

---

## Task 1: 创建 API 认证中间件

**文件:**
- 创建: `nodejs-server/middleware/api-auth.js`

**步骤 1: 创建认证中间件文件**

```javascript
// nodejs-server/middleware/api-auth.js
const { res.apiError } = require('../utils/api-response');

/**
 * API 认证中间件
 * 验证请求中是否包含 apiKey 和 apiSecret
 * 这两个字段由前端拦截器自动注入
 */
const apiAuth = (req, res, next) => {
  // 从 params 或 body 中提取 apiKey 和 apiSecret
  const apiKey = req.params?.apiKey || req.body?.apiKey;
  const apiSecret = req.params?.apiSecret || req.body?.apiSecret;

  // 验证是否存在
  if (!apiKey || !apiSecret) {
    return res.apiError(res, '缺少必要参数: apiKey 和 apiSecret', 400);
  }

  // 将凭证附加到 request 对象，供后续使用
  req.apiCredentials = { apiKey, apiSecret };
  next();
};

module.exports = { apiAuth };
```

**步骤 2: 在 Router 中全局应用中间件**

修改文件: `nodejs-server/routes/grid-strategy.routes.js` (假设存在，否则需要创建路由文件)

```javascript
const express = require('express');
const router = express.Router();
const { apiAuth } = require('../middleware/api-auth');
const gridStrategyController = require('../controller/grid-strategy.controller');

// 应用认证中间件到所有路由
router.use(apiAuth);

// 网格策略路由
router.get('/list', gridStrategyController.list);
router.post('/create', gridStrategyController.create);
router.post('/delete', gridStrategyController.deletes);
router.post('/update', gridStrategyController.update);
router.post('/action', gridStrategyController.action);
router.get('/query', gridStrategyController.query);
router.post('/optimize-params', gridStrategyController.optimizeParams);

module.exports = router;
```

**步骤 3: 提交**

```bash
git add nodejs-server/middleware/api-auth.js nodejs-server/routes/grid-strategy.routes.js
git commit -m "feat: 添加 API 认证中间件"
```

---

## Task 2: 删除 grid-strategy Model 中的 user_id 字段

**文件:**
- 修改: `nodejs-server/models/grid-strategy.js:34-38`

**步骤 1: 删除 user_id 字段定义**

```javascript
// 删除以下代码：
// user_id: {
//   type: DataTypes.BIGINT,
//   allowNull: true,
//   comment: "用户ID",
// },
```

**步骤 2: 更新注释说明**

```javascript
/**
 * 网格策略模型
 * 定义网格交易策略数据的结构和关联关系
 */
"use strict";

const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GridStrategy extends Model {
    /**
     * 关联关系定义
     * API Key 即为用户标识，通过 api_key + api_secret 实现数据隔离
     */
    static associate(models) {
      // 无需关联
    }
  }
```

**步骤 3: 提交**

```bash
git add nodejs-server/models/grid-strategy.js
git commit -m "refactor: 删除 grid_strategies 表的 user_id 字段"
```

---

## Task 3: 删除 grid-trade-history Model 中的 user_id 字段

**文件:**
- 修改: `nodejs-server/models/grid-trade-history.js:348-352`

**步骤 1: 删除 user_id 字段定义**

```javascript
// 删除以下代码：
// user_id: {
//   type: DataTypes.BIGINT,
//   allowNull: true,
//   comment: "用户ID",
// },
```

**步骤 2: 提交**

```bash
git add nodejs-server/models/grid-trade-history.js
git commit -m "refactor: 删除 grid_trade_history 表的 user_id 字段"
```

---

## Task 4: 检查并删除其他 Model 中的 user_id 字段

**文件:**
- 修改: `nodejs-server/models/order.js`
- 修改: `nodejs-server/models/api-error-log.js`
- 修改: `nodejs-server/models/page-view-log.js`
- 修改: `nodejs-server/models/system-logs.js`

**步骤 1: 检查每个文件中的 user_id 字段**

```bash
grep -n "user_id" nodejs-server/models/order.js
grep -n "user_id" nodejs-server/models/api-error-log.js
grep -n "user_id" nodejs-server/models/page-view-log.js
grep -n "user_id" nodejs-server/models/system-logs.js
```

**步骤 2: 删除找到的 user_id 字段**

对于每个包含 `user_id` 的文件，删除该字段定义。

**步骤 3: 提交**

```bash
git add nodejs-server/models/order.js nodejs-server/models/api-error-log.js nodejs-server/models/page-view-log.js nodejs-server/models/system-logs.js
git commit -m "refactor: 删除所有表的 user_id 字段"
```

---

## Task 5: 更新前端 binance-store 的 activeApiKey 逻辑

**文件:**
- 修改: `frontend/src/stores/binance-store.ts`

**步骤 1: 添加 activeApiKeyId 字段**

```typescript
// 在 BinanceState 接口中添加
interface BinanceState {
  apiKeyList: ApiKey[];
  activeApiKeyId: string | null;  // 新增
  initialized: boolean;
  init: () => Promise<void>;
  addApiKey: (key: Omit<ApiKey, 'id'>) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  setActiveApiKey: (id: string) => void;  // 新增
  getActiveApiKey: () => ApiKey | null;  // 新增
}

// 添加到状态
activeApiKeyId: null,

// 添加 setActiveApiKey 方法
setActiveApiKey: (id: string) => {
  set({ activeApiKeyId: id });
  // 可选：保存到 localStorage 持久化
  localStorage.setItem('activeApiKeyId', id);
},

// 添加 getActiveApiKey 计算属性方法
getActiveApiKey: () => {
  const { apiKeyList, activeApiKeyId } = get();
  return apiKeyList.find(key => key.id === activeApiKeyId) || apiKeyList[0] || null;
},
```

**步骤 2: 初始化时恢复 activeApiKeyId**

```typescript
init: async () => {
  // 从 localStorage 恢复
  const savedId = localStorage.getItem('activeApiKeyId');
  if (savedId) {
    set({ activeApiKeyId: savedId });
  }
  // ... 其他初始化逻辑
},
```

**步骤 3: 提交**

```bash
git add frontend/src/stores/binance-store.ts
git commit -m "feat: 添加全局 API Key 选择逻辑"
```

---

## Task 6: 更新前端设置页面 UI

**文件:**
- 修改: `frontend/src/pages/SettingsPage/index.tsx`

**步骤 1: 添加"设为当前"按钮**

在每个 API Key 项的操作区域添加按钮：

```tsx
<button
  className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
  onClick={() => handleSetActiveApiKey(key.id)}
>
  {isActive ? '当前使用' : '设为当前'}
</button>
```

**步骤 2: 添加 setActiveApiKey 处理函数**

```typescript
const handleSetActiveApiKey = (id: string) => {
  useBinanceStore.getState().setActiveApiKey(id);
  showSuccess('已切换 API Key');
  // 刷新相关数据
  window.location.reload();
};
```

**步骤 3: 提交**

```bash
git add frontend/src/pages/SettingsPage/index.tsx
git commit -m "feat: 添加 API Key 切换按钮"
```

---

## Task 7: 更新前端 API 请求拦截器

**文件:**
- 修改: `frontend/src/api/request.ts` (或类似文件)

**步骤 1: 确保拦截器使用当前激活的 API Key**

```typescript
// 在请求拦截器中
const activeApiKey = useBinanceStore.getState().getActiveApiKey();

if (activeApiKey) {
  // 自动注入 apiKey 和 apiSecret
  config.data = {
    ...config.data,
    apiKey: activeApiKey.api_key,
    apiSecret: activeApiKey.api_secret,
  };
}
```

**步骤 2: 提交**

```bash
git add frontend/src/api/request.ts
git commit -m "feat: 请求拦截器使用当前激活的 API Key"
```

---

## Task 8: 更新 grid-strategy 接口使用认证中间件

**文件:**
- 修改: `nodejs-server/controller/grid-strategy.controller.js`

**步骤 1: 简化接口参数提取**

使用 `req.apiCredentials` 替代直接从 body 提取：

```javascript
// 修改前
const { apiKey, apiSecret } = req.body;

// 修改后
const { apiKey, apiSecret } = req.apiCredentials;
```

**步骤 2: 更新所有接口**

对以下接口应用同样的修改：
- `list`
- `create`
- `deletes`
- `update`
- `action`
- `query`
- `optimizeParams`

**步骤 3: 提交**

```bash
git add nodejs-server/controller/grid-strategy.controller.js
git commit -m "refactor: 使用认证中间件的凭证"
```

---

## Task 9: 在 NodeJS 端添加数据库初始化逻辑

**文件:**
- 创建: `nodejs-server/models/init.js`（或类似文件）

**步骤 1: 创建数据库初始化模块**

在 NodeJS 端创建数据库初始化逻辑，接管 Go 端的表结构创建职责：

```javascript
// nodejs-server/models/init.js
const { sequelize } = require('./index');

/**
 * 初始化数据库表结构
 * 创建所有必要的表（如果不存在）
 */
async function initDatabase() {
  try {
    // 测试连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型到数据库
    // alter: true 会更新表结构以匹配模型，但不会删除现有数据
    await sequelize.sync({ alter: true });
    console.log('数据库表结构已同步');

    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

module.exports = { initDatabase };
```

**步骤 2: 在 NodeJS Server 启动时调用初始化**

修改 `nodejs-server/server.js` 或主入口文件：

```javascript
const { initDatabase } = require('./models/init');

async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
```

**步骤 3: 提交**

```bash
git add nodejs-server/models/init.js nodejs-server/server.js
git commit -m "feat: NodeJS 端接管数据库初始化逻辑"
```

---

## Task 10: 移除 Go 端的 DatabaseStore 相关代码

**文件:**
- 删除: `internal/services/database_store.go`
- 修改: `app.go`（移除 DatabaseStore 的初始化和使用）
- 修改: `main.go`（移除 DatabaseStore 的引用）

**步骤 1: 删除 DatabaseStore 文件**

```bash
rm internal/services/database_store.go
```

**步骤 2: 从 app.go 中移除 DatabaseStore**

查找并删除所有与 `DatabaseStore` 相关的代码：

```go
// 删除这些内容：
// ds *services.DatabaseStore
// ds: services.NewDatabaseStore(...)
// ds.Init()
// ds.Close()
```

**步骤 3: 更新 main.go**

移除对 `database_store.go` 的任何引用。

**步骤 4: 提交**

```bash
git add internal/services/database_store.go app.go main.go
git commit -m "refactor: 移除 Go 端的数据库操作逻辑"
```

---

## Task 11: 更新 Go 端启动逻辑

**文件:**
- 修改: `internal/services/nodejs_service.go`
- 修改: `app.go`

**步骤 1: 确保 NodeJS 服务正常启动**

验证 Go 端正确启动 NodeJS Server，让 NodeJS 端负责所有数据库操作。

**步骤 2: 移除数据库路径传递逻辑**

如果有从 Go 端传递数据库路径到 NodeJS 的逻辑，将其移除。

**步骤 3: 提交**

```bash
git add internal/services/nodejs_service.go app.go
git commit -m "refactor: 更新 Go 端启动逻辑，移除数据库依赖"
```

---

## Task 12: 测试验证

**步骤 1: 启动前端和后端服务**

```bash
# 终端 1 - 后端
cd nodejs-server && npm start

# 终端 2 - 前端
cd frontend && npm run dev
```

**步骤 2: 测试场景**

1. 打开设置页面，添加 API Key
2. 设置当前激活的 API Key
3. 创建网格策略
4. 验证策略列表显示
5. 切换 API Key，验证数据隔离

**步骤 3: 提交最终版本**

```bash
git add .
git commit -m "test: 验证 API Key 认证机制"
```

---

## 完成检查清单

- [ ] 认证中间件已创建并应用到所有路由
- [ ] 所有 Model 的 `user_id` 字段已删除
- [ ] 前端可以切换激活的 API Key
- [ ] 请求拦截器自动注入 API Key 凭证
- [ ] 数据库 `user_id` 列已物理删除
- [ ] 所有接口使用认证中间件的凭证
- [ ] 功能测试通过

---

**重要提示:**
- 此变更为**破坏性重构**，旧数据将丢失
- 确保在生产环境执行前备份重要数据
- 不考虑向后兼容性
