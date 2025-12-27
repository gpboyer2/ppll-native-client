# Design Document

## Overview

本设计文档描述了 ppll-native-client 项目后端 API 响应格式标准化的实现方案。当前项目存在多种不一致的响应格式（code/msg、status/message、status/code/message 混用），导致前后端对接混乱。本设计将统一所有 API 接口的返回格式，采用 CLAUDE.md 中定义的标准格式。

核心目标：
- 统一所有 API 响应为 {status, message, data} 格式
- 更新 ApiResponse 工具函数
- 批量更新所有 Controller 文件
- 保持业务逻辑不变，仅修改响应格式
- 同步更新项目文档

## Architecture

### 系统架构

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────┐
│      Express Router             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│      Controller Layer           │
│  ┌──────────────────────────┐  │
│  │  使用 ApiResponse 工具   │  │
│  │  - success(res, data, msg)│  │
│  │  - error(res, msg, code) │  │
│  └──────────────────────────┘  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│      Service Layer              │
│  (业务逻辑，不涉及响应格式)     │
└─────────────────────────────────┘
```

### 响应格式标准

成功响应：
```json
{
  "status": "success",
  "message": "操作成功",
  "data": {
    // 业务数据
  }
}
```

错误响应：
```json
{
  "status": "error",
  "message": "错误描述",
  "data": null
}
```

列表响应：
```json
{
  "status": "success",
  "message": "获取列表成功",
  "data": {
    "list": [...],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

## Components and Interfaces

### 1. ApiResponse 工具模块

文件：`nodejs-server/utils/api-response.js`（重命名为 kebab-case）

接口定义：

```javascript
/**
 * 成功响应
 * @param {Object} res - Express 响应对象
 * @param {*} data - 返回的业务数据
 * @param {String} message - 成功消息，默认为"操作成功"
 * @returns {Object} Express 响应对象
 */
function sendSuccess(res, data, message = '操作成功')

/**
 * 错误响应
 * @param {Object} res - Express 响应对象
 * @param {String} message - 错误消息
 * @param {Number} statusCode - HTTP 状态码，默认为 400
 * @returns {Object} Express 响应对象
 */
function sendError(res, message, statusCode = 400)
```

实现要点：
- sendSuccess 方法返回 HTTP 200 状态码
- sendError 方法根据 statusCode 返回对应的 HTTP 状态码
- 5xx 错误使用实际状态码，4xx 错误统一返回 HTTP 200（业务错误）
- 响应体始终包含 status、message、data 三个字段
- 字段名使用 message 而不是 msg

### 2. Controller 层更新策略

需要更新的 Controller 文件列表：
- analytics.controller.js
- auth.controller.js
- banned-ip.controller.js
- binance-account.controller.js
- binance-api-key.controller.js
- binance-exchange-info.controller.js
- chat.controller.js
- dashboard.controller.js
- database-admin.controller.js
- fund-flows.controller.js
- gate-coin-list.controller.js
- grid-strategy.controller.js
- grid-trade-history.controller.js
- hello.controller.js
- information.controller.js
- login-logs.controller.js
- mark-price.controller.js
- operation-logs.controller.js
- orders.controller.js
- permission.controller.js
- robot.controller.js
- smart-money-flow.controller.js
- system-logs.controller.js
- system.controller.js
- template.controller.js
- trading-pairs-comparison.controller.js
- twitter.controller.js
- utils.controller.js

更新规则：
1. 所有直接使用 `res.status().send({status, code, message, data})` 的地方改为使用 api-response
2. 所有使用旧格式 `{code, msg, data}` 的地方改为新格式 `{status, message, data}`
3. 将所有 `success()` 调用改为 `sendSuccess()`
4. 将所有 `error()` 调用改为 `sendError()`
5. 保持业务逻辑不变，只修改响应格式
6. 保持错误处理逻辑不变
7. 提取重复代码为全局函数或常量

### 3. 分页数据结构

对于返回列表的接口，data 字段结构：

```javascript
{
  list: Array,           // 数据列表
  pagination: {
    currentPage: Number, // 当前页码（从1开始）
    pageSize: Number,    // 每页数量
    total: Number        // 总记录数
  }
}
```

## Data Models

### Response 数据模型

```typescript
// 成功响应
interface SuccessResponse<T> {
  status: 'success';
  message: string;
  data: T;
}

// 错误响应
interface ErrorResponse {
  status: 'error';
  message: string;
  data: null;
}

// 列表数据
interface ListData<T> {
  list: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

// 通用响应
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

## Code Architecture Improvements

### 1. Utils 目录文件命名规范

将所有 utils 目录下的文件名改为 kebab-case：

- `ApiResponse.js` → `api-response.js`
- `catchAsync.js` → `catch-async.js`（如果存在大写）
- 其他文件类似处理

### 2. 代码复用策略

识别并提取重复代码：

1. 通用错误处理函数
   - 统一的参数验证错误处理
   - 统一的数据库错误处理
   - 统一的第三方 API 错误处理

2. 通用响应构造函数
   - 列表响应构造器
   - 分页数据构造器

3. 常量提取
   - HTTP 状态码常量
   - 通用错误消息常量
   - 默认分页参数常量

示例：

```javascript
// constants/http-status.js
module.exports = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// utils/response-builder.js
const { sendSuccess } = require('./api-response');

// 构造列表响应
function buildListResponse(list, pagination) {
  return {
    list,
    pagination: {
      currentPage: pagination.page || 1,
      pageSize: pagination.limit || 20,
      total: pagination.total || 0
    }
  };
}

module.exports = { buildListResponse };
```

### 3. 模块独立性原则

- Controller 层只负责请求处理和响应返回
- Service 层只负责业务逻辑
- Utils 层提供通用工具函数
- 避免跨层直接调用
- 每个模块职责单一明确

## Correctness Properties

属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。

### Property 1: 成功响应结构完整性

*For any* 成功的 API 调用，返回的响应对象必须包含 status 字段（值为 "success"）、message 字段（非空字符串）、data 字段（任意类型）

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: 错误响应结构完整性

*For any* 失败的 API 调用，返回的响应对象必须包含 status 字段（值为 "error"）、message 字段（非空字符串）、data 字段（值为 null）

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: 列表响应分页结构完整性

*For any* 返回列表数据的 API 调用，data 对象必须包含 list 数组和 pagination 对象，且 pagination 对象必须包含 currentPage、pageSize、total 三个数字字段

**Validates: Requirements 1.5, 1.6**

### Property 4: 客户端错误状态码范围

*For any* 客户端错误（参数错误、权限错误等），HTTP 状态码必须在 400-499 范围内

**Validates: Requirements 2.6**

## Error Handling

### 错误分类

1. 客户端错误（4xx）
   - 400 Bad Request: 参数错误、验证失败
   - 401 Unauthorized: 未认证
   - 403 Forbidden: 无权限
   - 404 Not Found: 资源不存在
   - 409 Conflict: 资源冲突

2. 服务器错误（5xx）
   - 500 Internal Server Error: 服务器内部错误
   - 503 Service Unavailable: 服务不可用

### 错误响应处理

所有错误都通过 api-response.sendError() 方法统一处理：

```javascript
// 客户端错误示例
if (!requiredParam) {
  return sendError(res, '缺少必要参数', 400);
}

// 服务器错误示例
try {
  // 业务逻辑
} catch (err) {
  console.error('操作失败:', err);
  return sendError(res, err.message || '操作失败', 500);
}
```

### 错误消息规范

- 使用中文描述错误
- 消息应该清晰、具体、可操作
- 避免暴露敏感的系统信息
- 包含足够的上下文帮助定位问题

## Testing Strategy

### 单元测试

使用 Jest 框架进行单元测试，重点测试：

1. ApiResponse 工具函数
   - success 方法返回正确的响应格式
   - error 方法返回正确的响应格式
   - HTTP 状态码设置正确

2. Controller 响应格式
   - 成功场景返回正确格式
   - 错误场景返回正确格式
   - 列表数据包含分页信息

### 属性测试

使用 fast-check 库进行属性测试（每个测试至少 100 次迭代）：

1. 测试成功响应结构（Property 1）
2. 测试错误响应结构（Property 2）
3. 测试列表响应分页结构（Property 3）
4. 测试客户端错误状态码范围（Property 4）

### 集成测试

通过实际 HTTP 请求测试：

1. 调用各个 API 端点
2. 验证响应格式符合规范
3. 验证业务逻辑正确
4. 验证错误处理正确

### 回归测试

确保更新后所有现有功能正常：

1. 运行现有的所有测试用例
2. 手动测试关键业务流程
3. 验证前端集成无问题
