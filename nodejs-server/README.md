# PPLL Server - 加密货币网格交易系统

基于 Node.js、Express、Sequelize 和 MySQL 构建的企业级加密货币网格交易系统，提供自动化交易策略、实时市场数据分析和完善的风险管理功能。

## 🚀 核心功能

### 🔐 用户与权限管理
- JWT 认证与授权机制
- 多角色权限控制（用户/管理员/超级管理员）
- API 密钥管理与 VIP 权限验证
- 用户行为审计与登录日志追踪

### 📊 网格交易系统
- **双向网格策略**：支持做多(LONG)和做空(SHORT)无限网格交易
- **智能风险控制**：防跌系数、持仓限制、止损止盈机制
- **Binance 集成**：U本位合约交易，API密钥管理
- **实时执行引擎**：WebSocket实时价格监控与自动化交易

### 📈 数据分析与监控
- **操作日志审计**：完整记录用户操作行为
- **系统日志追踪**：错误监控与性能分析
- **登录日志管理**：用户登录行为追踪
- **交易历史记录**：详细的交易执行历史

### 🌐 实时数据处理
- **WebSocket 连接池**：高效的共享连接管理
- **实时价格订阅**：币安标记价格和K线数据实时获取
- **事件驱动架构**：基于事件的消息分发机制

### 🔒 安全防护
- **IP 速率限制**：多层频率限制防止恶意攻击
- **XSS 防护**：输入数据清理防止跨站脚本攻击
- **SQL 注入防护**：参数化查询和数据验证
- **敏感信息脱敏**：API密钥等敏感数据自动脱敏

## 📁 项目结构

```
ppll-server/
├── app.js                      # 应用程序入口点
├── config/                     # 系统配置文件
│   ├── database.json           # 数据库连接配置
│   ├── passport.js            # JWT认证策略配置
│   └── security.js            # 安全策略配置
├── controller/                 # 控制器层 - 处理HTTP请求
├── service/                    # 服务层 - 核心业务逻辑
├── models/                     # 数据模型层 - Sequelize ORM
├── route/                      # 路由层 - API端点定义
├── middleware/                 # 中间件 - 认证、限流、日志
├── managers/                   # 连接管理器 - WebSocket池管理
├── plugin/                     # 交易插件 - 网格策略实现
├── jobs/                       # 后台任务 - 定时任务处理
├── utils/                      # 工具函数 - 通用工具集
├── migrations/                 # 数据库迁移 - 版本控制
├── test/                       # 测试文件 - 单元测试和集成测试
└── docs/                       # 项目文档 - 技术文档
```

## 🛠 技术栈

### 后端核心
- **运行环境**: Node.js v20.19.2
- **Web框架**: Express.js 4.18.2
- **数据库**: MySQL 5.7+ with Sequelize 6.25.5
- **进程管理**: PM2 5.2.2

### 交易与安全
- **币安集成**: @binance-node/cli 2.15.1
- **认证授权**: JWT + Passport.js
- **安全防护**: Helmet, CORS, Rate Limiting, XSS-Clean

### 开发工具
- **API文档**: Swagger/OpenAPI 3.0
- **日志系统**: Morgan + Winston
- **任务队列**: Bull Queue
- **数据验证**: Joi

## 🚀 快速开始

### 环境要求

- **Node.js**: >=16.16.0 (推荐 v20.19.2)
- **数据库**: MySQL 5.7+
- **包管理器**: pnpm
- **进程管理**: PM2 (生产环境)

### 安装步骤

1. 克隆项目到本地:

```bash
git clone https://github.com/your-username/ppll-server.git
cd ppll-server
```

2. 安装依赖:

```bash
pnpm install
```

3. 配置数据库:
编辑 `config/database.json` 文件，修改数据库连接参数:

```json
{
  "development": {
    "username": "your_username",
    "password": "your_password",
    "database": "ppll_server",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
```

4. 创建数据库和表:

```bash
npm run prepare:dev
```

### 运行项目

- **开发模式**:

```bash
pnpm run node:dev
```

- **测试模式**:

```bash
pnpm run node:test
```

- **生产模式** (使用 PM2):

```bash
pnpm run pm2:prod
```

## 📚 API 文档

项目启动后，可通过以下地址访问交互式 API 文档：

**Swagger UI**: [http://localhost:7002/v1/docs](http://localhost:7002/v1/docs)

服务器默认运行在端口 `7002`，确保端口未被占用。

## 🔧 核心模块详解

### 网格交易策略系统

#### 主要特性
- **双向交易支持**：同时支持做多(LONG)和做空(SHORT)策略
- **智能网格计算**：自动计算网格价格差和交易数量
- **风险管理机制**：
  - 最大/最小持仓数量限制
  - 防跌系数调节
  - 止损止盈价格设置
  - 每日利润限制
- **实时监控执行**：基于WebSocket的实时价格监控
- **策略状态管理**：支持手动暂停/继续策略执行

#### 策略配置参数
```javascript
const gridConfig = {
  positionSide: 'LONG',           // 持仓方向(LONG/SHORT)
  tradingPair: 'BTCUSDT',         // 交易对
  apiKey: 'your_api_key',         // Binance API密钥
  apiSecret: 'your_api_secret',   // Binance API密钥Secret
  gridPriceDifference: 100,       // 网格价差
  gridTradeQuantity: 0.001,        // 网格交易数量
  maxOpenPositionQuantity: 0.1,   // 最大持仓数量
  minOpenPositionQuantity: 0.01,  // 最小持仓数量
  fallPreventionCoefficient: 0.5, // 防跌系数
  leverage: 20,                   // 杠杆倍数
  pollingInterval: 10000          // 轮询间隔(毫秒)
};
```

### 用户权限管理系统

#### 角色权限模型
- **普通用户(user)**：基础功能访问权限
- **管理员(admin)**：用户管理和策略监控权限
- **超级管理员(super_admin)**：系统完全控制权限

#### 认证机制
- JWT Token 认证
- API密钥/VIP权限验证
- 多层权限校验

### 日志审计系统

#### 操作日志(operation_logs)
记录用户的所有操作行为，包括：
- 操作类型和描述
- 操作时间和IP地址
- 操作系统和浏览器信息
- 操作状态(成功/失败)

#### 系统日志(system_logs)
记录系统级别的错误和异常：
- API调用错误
- HTTP状态码分析
- 系统性能监控
- 错误堆栈追踪

#### 登录日志(login_logs)
记录用户登录行为：
- 登录时间/IP地址
- 登录方式和状态
- 设备和浏览器信息

## 🏗 架构设计原则

### 分层架构模式
```
┌─────────────────┐
│    Client       │
├─────────────────┤
│    Routes       │ ← API端点定义
├─────────────────┤
│  Controllers    │ ← 请求处理和参数验证
├─────────────────┤
│   Services      │ ← 业务逻辑实现
├─────────────────┤
│    Models       │ ← 数据库操作
└─────────────────┘
```

### 核心设计模式

#### 1. 中间件模式
- 认证中间件：JWT验证和权限控制
- 限流中间件：IP频率限制和防护
- 日志中间件：请求日志记录和Git信息注入

#### 2. 事件驱动模式
- WebSocket连接管理器：共享连接池和事件分发
- 策略执行引擎：基于价格事件的交易决策

#### 3. 工厂模式
- 数据库模型工厂：统一的模型初始化
- 服务工厂：可扩展的服务实例化

## 📊 数据库设计

### 核心数据表

#### 用户表(users)
- 用户基本信息管理
- 权限和角色控制
- API密钥存储

#### 网格策略表(grid_strategies)
- 策略配置参数
- 运行状态和统计数据
- 风险控制设置

#### 操作日志表(operation_logs)
- 用户操作行为记录
- 安全审计追踪

#### 系统日志表(system_logs)
- 系统错误和异常记录
- 性能监控数据

## 🔧 部署与运维

### 环境配置

#### 开发环境
```bash
NODE_ENV=development
PORT=7002
```

#### 生产环境
```bash
NODE_ENV=production
PORT=7002
```


### 监控与日志

#### 应用监控
- PM2 内置监控面板
- 自定义健康检查端点
- 性能指标收集

#### 日志管理
- 应用日志轮转
- 错误日志分离
- 审计日志持久化

## 🔒 安全最佳实践

### 数据安全
- 敏感信息加密存储
- API密钥脱敏显示
- 数据传输HTTPS加密

### 访问控制
- 多层身份验证
- 细粒度权限控制
- IP白名单机制

### 攻击防护
- SQL注入防护
- XSS攻击过滤
- CSRF攻击防护
- DDoS攻击缓解

## 📈 性能优化

### 数据库优化
- 索引优化策略
- 查询语句优化
- 连接池配置

### 应用优化
- 缓存机制实现
- 异步处理优化
- 内存泄漏检测

### 网络优化
- WebSocket连接复用
- 请求压缩启用
- CDN静态资源加速

## 🤝 贡献指南

我们欢迎社区贡献！在提交Pull Request之前，请确保：

1. 遵循项目编码规范
2. 添加适当的测试用例
3. 更新相关文档
4. 通过所有测试

## 📄 许可证

[MIT](https://choosealicense.com/licenses/mit/)

## 📞 支持与联系

如有问题或建议，请通过以下方式联系我们：
- 提交 GitHub Issue
- 发送邮件至 support@ppll.com
