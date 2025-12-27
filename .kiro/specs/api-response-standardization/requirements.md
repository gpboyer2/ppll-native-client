# Requirements Document

## Introduction

本文档定义了 ppll-native-client 项目后端 API 响应格式标准化的需求。当前项目存在多种不一致的响应格式，导致前后端对接混乱，需要统一规范所有 API 接口的返回格式。

## Glossary

- **API_Response**: API 接口返回给客户端的 HTTP 响应体
- **Success_Response**: 操作成功时的响应格式
- **Error_Response**: 操作失败时的响应格式
- **Controller**: Express 路由控制器，处理 HTTP 请求并返回响应
- **ApiResponse_Util**: 统一响应工具函数，位于 utils/ApiResponse.js
- **HTTP_Status_Code**: HTTP 协议标准状态码（200, 400, 500等）

## Requirements

### Requirement 1: 统一成功响应格式

**User Story:** 作为前端开发者，我希望所有成功的 API 响应都使用统一的数据结构，以便我可以用一致的方式处理响应数据。

#### Acceptance Criteria

1. WHEN 任何 API 操作成功时 THEN THE API_Response SHALL 返回包含 status、message、data 三个字段的 JSON 对象
2. THE Success_Response SHALL 包含 status 字段且值为 "success"
3. THE Success_Response SHALL 包含 message 字段且值为描述性的成功消息字符串
4. THE Success_Response SHALL 包含 data 字段且值为实际返回的业务数据
5. WHEN 返回列表数据时 THEN THE data 字段 SHALL 包含 list 数组和 pagination 对象
6. THE pagination 对象 SHALL 包含 currentPage、pageSize、total 三个字段

### Requirement 2: 统一错误响应格式

**User Story:** 作为前端开发者，我希望所有失败的 API 响应都使用统一的数据结构，以便我可以用一致的方式处理错误信息。

#### Acceptance Criteria

1. WHEN 任何 API 操作失败时 THEN THE API_Response SHALL 返回包含 status、message、data 三个字段的 JSON 对象
2. THE Error_Response SHALL 包含 status 字段且值为 "error"
3. THE Error_Response SHALL 包含 message 字段且值为描述性的错误消息字符串
4. THE Error_Response SHALL 包含 data 字段且值为 null
5. WHEN 发生服务器错误时 THEN THE HTTP_Status_Code SHALL 为 500
6. WHEN 发生客户端错误时 THEN THE HTTP_Status_Code SHALL 为 4xx 系列状态码

### Requirement 3: 废弃旧的响应格式

**User Story:** 作为系统维护者，我希望移除所有旧的不一致的响应格式，以确保代码库的一致性和可维护性。

#### Acceptance Criteria

1. THE ApiResponse_Util SHALL 不再使用 code 和 msg 字段
2. THE ApiResponse_Util SHALL 使用 status 和 message 字段替代
3. THE ApiResponse_Util SHALL 将 success 方法重命名为 sendSuccess
4. THE ApiResponse_Util SHALL 将 error 方法重命名为 sendError
5. WHEN Controller 返回响应时 THEN THE Controller SHALL 只使用 ApiResponse_Util 的 sendSuccess 和 sendError 方法
6. THE Controller SHALL 不直接使用 res.status().send() 构造响应对象
7. WHEN 更新 ApiResponse_Util 后 THEN 所有现有 Controller SHALL 保持功能不变

### Requirement 4: 更新所有 Controller 使用新格式

**User Story:** 作为系统维护者，我希望所有 Controller 都使用统一的响应格式，以确保整个系统的一致性。

#### Acceptance Criteria

1. WHEN 扫描所有 Controller 文件时 THEN THE System SHALL 识别所有不符合规范的响应格式
2. WHEN 发现不符合规范的响应时 THEN THE System SHALL 将其更新为使用 ApiResponse_Util
3. THE Controller SHALL 使用 sendSuccess(res, data, message) 返回成功响应
4. THE Controller SHALL 使用 sendError(res, message, statusCode) 返回错误响应
5. WHEN Controller 返回列表数据时 THEN THE data 对象 SHALL 包含 list 和 pagination 字段
6. THE System SHALL 充分复用已有代码，避免冗余变量和函数
7. THE System SHALL 将 utils 目录下的文件名统一为小写加横杠命名（kebab-case）

### Requirement 5: 代码优化与架构改进

**User Story:** 作为系统架构师，我希望代码具有高度的复用性和模块独立性，以确保系统的可维护性和扩展性。

#### Acceptance Criteria

1. WHEN 更新 ApiResponse_Util 时 THEN THE System SHALL 保持 sendSuccess 和 sendError 方法的函数签名清晰
2. WHEN 更新 Controller 时 THEN THE System SHALL 保持业务逻辑不变
3. WHEN 发现重复代码时 THEN THE System SHALL 提取为全局函数或常量
4. THE System SHALL 将 utils 目录下所有文件名改为 kebab-case 命名
5. THE System SHALL 确保模块之间的独立性和低耦合
6. THE System SHALL 减少代码行数，提高代码复用率
7. WHEN 更新完成后 THEN 所有现有的 API 端点 SHALL 继续正常工作

### Requirement 6: 文档同步更新

**User Story:** 作为开发者，我希望项目文档与实际代码保持一致，以便我可以准确理解和使用 API。

#### Acceptance Criteria

1. WHEN 更新响应格式后 THEN THE CLAUDE.md 文档 SHALL 反映实际的响应格式
2. THE CLAUDE.md 文档 SHALL 包含完整的成功响应示例
3. THE CLAUDE.md 文档 SHALL 包含完整的错误响应示例
4. THE CLAUDE.md 文档 SHALL 说明分页字段的具体含义
5. WHEN 开发者查看文档时 THEN 文档示例 SHALL 与实际代码完全一致
