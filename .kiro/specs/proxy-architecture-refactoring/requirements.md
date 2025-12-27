# Requirements Document

## Introduction

本文档定义了 ppll-native-client 项目中代理配置模块的架构重构需求。当前代理相关代码存在重复、冗余和不一致的问题，需要从全局架构、代码复用、模块独立性角度进行优化，减少代码行数，提高可维护性。

## Glossary

- **Proxy_Module**: 代理配置工具模块 (utils/proxy.js)
- **WebSocket_Manager**: WebSocket 连接管理器 (managers/WebSocketConnectionManager.js)
- **WebSocket_Client_Factory**: WebSocket 客户端工厂 (plugin/websocketClient.js)
- **Request_Middleware**: HTTP 请求中间件 (middleware/request.js)
- **Proxy_Agent**: 代理代理实例（HttpsProxyAgent 或 SocksProxyAgent）
- **Binance_Client**: 币安 SDK 客户端实例
- **Proxy_Config**: 代理配置对象 { host, port, protocol }
- **WS_Proxy_URL**: WebSocket 代理 URL（SOCKS 协议格式）

## Requirements

### Requirement 1: 统一代理配置获取

**User Story:** 作为开发者，我希望所有模块通过统一的接口获取代理配置，避免重复的代理 URL 解析和配置逻辑。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 提供单一的代理配置获取接口
2. WHEN 任何模块需要代理配置 THEN THE Proxy_Module SHALL 返回缓存的配置对象
3. THE Proxy_Module SHALL 在模块加载时解析环境变量一次
4. WHEN 代理未启用 THEN THE Proxy_Module SHALL 返回 undefined 或空配置
5. THE Proxy_Module SHALL 支持 HTTP、HTTPS 和 SOCKS 代理协议

### Requirement 2: 消除重复的 Agent 创建逻辑

**User Story:** 作为开发者，我希望代理 Agent 实例被复用，避免在多个模块中重复创建相同的 Agent 对象。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 创建并缓存 HttpsProxyAgent 实例
2. THE Proxy_Module SHALL 创建并缓存 SocksProxyAgent 实例
3. WHEN 多个模块请求相同类型的 Agent THEN THE Proxy_Module SHALL 返回缓存的实例
4. WHEN 代理未启用 THEN THE Proxy_Module SHALL 返回 undefined
5. THE Proxy_Module SHALL 提供 getHttpsProxyAgent 和 getSocksProxyAgent 方法

### Requirement 3: 统一 WebSocket 代理配置

**User Story:** 作为开发者，我希望 WebSocket 相关模块使用统一的代理配置方法，消除重复的代理 URL 转换逻辑。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 提供 getWebSocketProxyAgent 方法
2. WHEN WebSocket_Manager 需要代理配置 THEN THE System SHALL 调用 Proxy_Module 的统一接口
3. WHEN WebSocket_Client_Factory 需要代理配置 THEN THE System SHALL 调用 Proxy_Module 的统一接口
4. THE Proxy_Module SHALL 自动处理 HTTP/HTTPS 到 SOCKS 协议的转换
5. THE System SHALL 移除 WebSocket_Manager 和 WebSocket_Client_Factory 中的重复代理逻辑

### Requirement 4: 简化 Binance SDK 代理配置

**User Story:** 作为开发者，我希望为 Binance SDK 配置代理时使用简化的接口，减少样板代码。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 提供 getBinanceClientConfig 方法
2. WHEN 创建 Binance_Client 实例 THEN THE System SHALL 使用 getBinanceClientConfig 获取完整配置
3. THE getBinanceClientConfig 方法 SHALL 返回包含 api_key、api_secret、beautify 和 wsOptions 的配置对象
4. THE System SHALL 移除各个 service 文件中重复的 getProxyConfig 调用
5. THE Proxy_Module SHALL 自动处理生产环境和非生产环境的代理启用逻辑

### Requirement 5: 优化 WebSocket 配置创建

**User Story:** 作为开发者，我希望 WebSocket 配置创建逻辑被集中管理，避免在多个地方重复相同的配置代码。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 提供 createWebSocketConfig 方法
2. THE createWebSocketConfig 方法 SHALL 返回包含 wsOptions 和 logger 的配置对象
3. WHEN 在非生产环境且代理启用 THEN THE System SHALL 自动添加 SocksProxyAgent
4. THE System SHALL 移除 WebSocket_Manager 中的 _createWsConfig 方法
5. THE System SHALL 使用 Proxy_Module 的 createWebSocketConfig 替代本地实现

### Requirement 6: 移除冗余的代理配置方法

**User Story:** 作为开发者，我希望移除不必要的代理配置方法，保持 API 简洁明了。

#### Acceptance Criteria

1. THE System SHALL 移除 getHttpProxyAgent 方法（与 getHttpsProxyAgent 重复）
2. THE System SHALL 移除 getRequestProxy 方法（使用 getProxyUrlString 替代）
3. THE System SHALL 移除 getProxyConfig 方法（使用 getBinanceClientConfig 替代）
4. THE System SHALL 移除 applyProxyToAxiosConfig 方法（直接使用 getHttpsProxyAgent）
5. THE System SHALL 保留 applyProxyToRequestOptions 方法（request 库特定需求）

### Requirement 7: 修复 WebSocket_Manager 中的未定义变量

**User Story:** 作为开发者，我希望修复代码中的错误，确保所有变量都正确定义和引用。

#### Acceptance Criteria

1. WHEN WebSocket_Manager 使用 ws_proxy 变量 THEN THE System SHALL 从 Proxy_Module 获取该值
2. THE System SHALL 移除 WebSocket_Manager 中未使用的 getProxyConfig 导入
3. THE System SHALL 移除 WebSocket_Manager 中未使用的 RECONNECT_DELAY 常量
4. THE System SHALL 确保所有代理相关变量都有明确的来源
5. THE System SHALL 通过 TypeScript 或 JSDoc 类型检查验证变量定义

### Requirement 8: 统一日志记录器配置

**User Story:** 作为开发者，我希望 WebSocket 日志记录器配置被统一管理，避免重复的日志配置代码。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 提供 createWebSocketLogger 方法
2. THE createWebSocketLogger 方法 SHALL 接受 verbose 参数控制日志详细程度
3. THE System SHALL 在生产环境自动静默非关键日志
4. THE System SHALL 移除 WebSocket_Manager 中的日志配置逻辑
5. THE System SHALL 移除 WebSocket_Client_Factory 中的重复日志配置

### Requirement 9: 优化模块导出接口

**User Story:** 作为开发者，我希望 Proxy_Module 的导出接口清晰、简洁，只暴露必要的方法。

#### Acceptance Criteria

1. THE Proxy_Module SHALL 导出 isEnabled 方法
2. THE Proxy_Module SHALL 导出 getHttpsProxyAgent 方法
3. THE Proxy_Module SHALL 导出 getSocksProxyAgent 方法
4. THE Proxy_Module SHALL 导出 getBinanceClientConfig 方法
5. THE Proxy_Module SHALL 导出 createWebSocketConfig 方法
6. THE Proxy_Module SHALL 导出 applyProxyToRequestOptions 方法
7. THE Proxy_Module SHALL 移除所有冗余的导出方法

### Requirement 10: 更新所有依赖模块

**User Story:** 作为开发者，我希望所有使用代理配置的模块都更新为使用新的统一接口。

#### Acceptance Criteria

1. WHEN 更新 Proxy_Module THEN THE System SHALL 同步更新 WebSocket_Manager
2. WHEN 更新 Proxy_Module THEN THE System SHALL 同步更新 WebSocket_Client_Factory
3. WHEN 更新 Proxy_Module THEN THE System SHALL 同步更新所有 service 文件
4. WHEN 更新 Proxy_Module THEN THE System SHALL 同步更新 Request_Middleware
5. THE System SHALL 确保所有模块使用一致的代理配置方法
6. THE System SHALL 验证所有更新后的模块功能正常

