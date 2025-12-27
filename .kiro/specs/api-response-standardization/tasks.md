# Implementation Plan: API Response Standardization

## Overview

本实现计划将统一 ppll-native-client 项目后端所有 API 接口的响应格式，从当前混乱的 {code, message, data} 格式统一为 {status, message, data} 格式。实施过程将保持业务逻辑不变，仅修改响应格式，并优化代码结构，提高复用性。

## Tasks

- [x] 1. 更新 api-response.js 工具函数
  - 修改 sendSuccess 方法，返回 {status: "success", message, data} 格式
  - 修改 sendError 方法，返回 {status: "error", message, data: null} 格式
  - 移除 code 字段，使用 status 字段替代
  - 确保 HTTP 状态码设置正确（成功200，客户端错误4xx，服务器错误5xx）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

- [ ]* 1.1 为 api-response.js 编写单元测试
  - 测试 sendSuccess 返回正确的响应格式
  - 测试 sendError 返回正确的响应格式
  - 测试 HTTP 状态码设置正确
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_


- [x] 2. 批量更新 Controller 文件（第一批：认证和账户相关）
  - [x] 2.1 更新 auth.controller.js
    - 将所有 success() 调用改为 sendSuccess()
    - 将所有 error() 调用改为 sendError()
    - 确保导入语句正确：const { sendSuccess, sendError } = require('../utils/api-response')
    - 验证所有响应格式符合规范
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 更新 binance-account.controller.js
    - 移除所有直接使用 res.status().send() 的代码
    - 统一使用 sendSuccess 和 sendError
    - 移除 handleError 函数，直接使用 sendError
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.3 更新 binance-api-key.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_


- [x] 3. 批量更新 Controller 文件（第二批：网格策略相关）
  - [x] 3.1 更新 grid-strategy.controller.js
    - 确认已使用 sendSuccess 和 sendError
    - 验证响应格式符合规范
    - _Requirements: 4.3, 4.4_

  - [x] 3.2 更新 grid-trade-history.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 3.3 更新 orders.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_


- [x] 4. 批量更新 Controller 文件（第三批：交易所和市场数据）
  - [x] 4.1 更新 binance-exchange-info.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 4.2 更新 mark-price.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 4.3 更新 trading-pairs-comparison.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 4.4 更新 gate-coin-list.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_


- [x] 5. 批量更新 Controller 文件（第四批：日志和分析）
  - [x] 5.1 更新 analytics.controller.js
    - 统一使用 sendSuccess 和 sendError
    - 确保列表响应包含 pagination 字段
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.2 更新 login-logs.controller.js
    - 统一使用 sendSuccess 和 sendError
    - 确保列表响应包含 pagination 字段
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.3 更新 operation-logs.controller.js
    - 统一使用 sendSuccess 和 sendError
    - 确保列表响应包含 pagination 字段
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.4 更新 system-logs.controller.js
    - 统一使用 sendSuccess 和 sendError
    - 确保列表响应包含 pagination 字段
    - _Requirements: 4.3, 4.4, 4.5_


- [x] 6. 批量更新 Controller 文件（第五批：其他功能）
  - [x] 6.1 更新 dashboard.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.2 更新 database-admin.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.3 更新 fund-flows.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.4 更新 smart-money-flow.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.5 更新 chat.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.6 更新 twitter.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.7 更新 information.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 6.8 更新 robot.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_


- [x] 7. 批量更新 Controller 文件（第六批：系统和权限）
  - [x] 7.1 更新 system.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 7.2 更新 permission.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 7.3 更新 banned-ip.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 7.4 更新 template.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 7.5 更新 utils.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_

  - [x] 7.6 更新 hello.controller.js
    - 统一使用 sendSuccess 和 sendError
    - _Requirements: 4.3, 4.4_


- [x] 8. Checkpoint - 验证所有 Controller 更新完成
  - 确保所有 Controller 都使用 sendSuccess 和 sendError
  - 确保没有直接使用 res.status().send() 的代码
  - 确保所有响应格式符合 {status, message, data} 规范
  - 运行现有测试，确保功能正常


- [x] 9. 更新 CLAUDE.md 文档
  - 更新 API 接口设计规范中的出参规范示例
  - 确保文档中的响应格式与实际代码一致
  - 添加 sendSuccess 和 sendError 的使用说明
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [ ]* 10. 编写集成测试
  - 测试各个 API 端点的响应格式
  - 验证成功响应包含 status: "success"
  - 验证错误响应包含 status: "error"
  - 验证列表响应包含 pagination 字段
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4_


- [x] 11. Final Checkpoint - 全面验证
  - 运行所有测试，确保通过
  - 手动测试关键业务流程
  - 验证前端集成无问题
  - 确认所有响应格式统一

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，便于追溯
- Controller 更新按功能模块分批进行，便于管理和验证
- 保持业务逻辑不变，只修改响应格式
- 所有更新完成后需要进行全面测试
