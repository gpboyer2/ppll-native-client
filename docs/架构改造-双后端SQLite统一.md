# PPLL Native Client 架构改造文档

> **重要说明**：本文档是最初的架构设计方案，其中提出由 Go 端负责 SQLite 数据库管理。
>
> **实际实施时采用了更简化的方案**：Go 端完全不负责数据库操作，所有数据库相关功能（模型定义、初始化、CRUD 操作）完全由 NodeJS 端负责。
>
> 实际架构变更请参考：`docs/plans/2025-12-28-remove-user-system-api-key-auth.md`
>
> **当前实际架构**：
> - Go 端：桌面客户端框架、配置存储、进程管理
> - NodeJS 端：业务逻辑、数据库操作、API 接口
> - 数据库：完全由 NodeJS 端管理，通过 Sequelize ORM + SQLite
>
> **文档状态**：本文档作为历史记录保留，实际实施以 NodeJS 端完全管理数据库为准。

---

## 当前实际架构（2025-12-28）

### 职责划分

**Go 端负责（系统级）：**
- 桌面应用框架（Wails2）
- 配置存储（AES 加密文件）
- Node.js 进程管理（启动、停止、监控、重启）
- 系统原生通知
- 应用更新服务
- 插件系统管理
- 原生文件操作

**NodeJS 端负责（业务级）：**
- 数据库初始化和表结构创建
- 所有数据表的 CRUD 操作
- 业务逻辑处理
- API 接口提供
- 数据库管理功能

### 数据存储

**统一配置目录：**
```
~/.config/ppll-client/
├── config.enc.json    # Go 端加密配置
└── data.db            # SQLite 数据库（由 NodeJS 端管理）
```

### 数据库管理

- 数据库完全由 NodeJS 端管理
- Go 端不涉及任何数据库表操作
- 前端通过 HTTP API 与 NodeJS 端交互
- 所有数据库操作都通过 NodeJS 端的 Service 层进行

---

## 一、需求背景（原始方案）

### 1.1 原始需求

用户希望将现有的 Node.js 后端代码集成到 Wails 桌面应用中，实现以下目标：

1. 桌面应用的外壳由 Go 语言构建，提供原生窗口和系统能力
2. 显示的页面是 React 前端的 HTML 页面
3. 后端接口有两套：Go 自带的接口和 Node.js 的接口
4. Node.js 端复用 Go 端的 SQLite 数据库配置
5. 所有 22 张数据表全部迁移到 SQLite
6. Go 端不再负责业务逻辑，只负责系统硬件调用和原生功能
7. 所有业务逻辑（网格策略、用户操作等）由 Node.js 负责
8. 数据库在 Go 应用启动时自动创建

### 1.2 项目现状

**Go 端（ppll-native-client）**
- 使用 Wails v2 框架构建桌面应用
- 前端使用 React + Mantine UI
- 数据存储使用加密的 JSON 文件（config.enc.json）
- 未使用 SQLite 数据库

**Node.js 端（nodejs-server）**
- 使用 Express + Sequelize 框架
- 数据库使用 MySQL
- 包含完整的量化交易业务逻辑
- 有 22 张数据表：用户、角色、权限、网格策略、订单、交易历史、各种日志等

---

## 二、架构设计方案

### 2.1 整体架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    桌面应用客户端                              │
│  用户看到的只是一个 .app 文件（macOS）或 .exe 文件（Windows）   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐          │
│  │   Go 外壳        │          │  Node.js 后端    │          │
│  │  ─────────────   │          │  ─────────────   │          │
│  │  • 原生窗口管理   │          │  • 所有业务逻辑  │          │
│  │  • SQLite 管理   │  启动    │  • 网格策略      │          │
│  │  • 进程管理      │  ────>   │  • 用户管理      │          │
│  │  • 系统通知      │          │  • 订单处理      │          │
│  │  • 更新服务      │          │  • Binance API   │          │
│  │  • 插件系统      │          │  • WebSocket     │          │
│  └──────────────────┘          └──────────────────┘          │
│            │                            │                     │
│            │         共享               │                     │
│            └────────────────────────────┘                     │
│                         ↓                                     │
│              SQLite 数据库文件                                 │
│         ~/.config/ppll-client/data.db                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    React 前端页面                              │
│  ┌────────────────────────────────────────────────┐          │
│  │  Mantine UI 组件                               │          │
│  │  • 用户界面                                     │          │
│  │  • 策略配置                                     │          │
│  │  • 数据展示                                     │          │
│  └────────────────────────────────────────────────┘          │
│         │                        │                            │
│         │ 调用                   │ 调用                        │
│         ↓                        ↓                            │
│  Go Bind API            Node.js HTTP API                     │
│  (系统级操作)            (业务级操作)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 职责划分

**Go 端负责（系统级）：**
- SQLite 数据库的初始化和表结构创建
- Node.js 进程的启动、停止、监控和重启
- 数据库文件路径的管理和暴露
- 系统原生通知
- 应用自动更新
- 插件系统管理
- 原生文件操作

**Node.js 端负责（业务级）：**
- 用户注册、登录、权限管理
- 网格交易策略的创建、执行、管理
- 订单的创建、查询、取消
- 交易历史记录
- 与 Binance 交易所的 API 交互
- WebSocket 实时价格订阅
- 所有业务数据的增删改查

### 2.3 数据存储设计

**统一配置目录：**
```
~/.config/ppll-client/
├── config.enc.json    # Go 端加密配置（已有）
└── data.db            # SQLite 数据库（新增）
```

**数据表列表（22 张）：**
1. roles - 角色表
2. permissions - 权限表
3. users - 用户表
4. robots - 机器人表
5. grid_strategies - 网格策略表
6. orders - 订单表
7. grid_trade_history - 网格交易历史表
8. mark_price - 标记价格表
9. login_logs - 登录日志表
10. operation_logs - 操作日志表
11. api_error_log - API 错误日志表
12. system_logs - 系统日志表
13. page_view_log - 页面访问日志表
14. spot_account - 现货账户表
15. usd_m_futures_account - U 本位合约账户表
16. coin_m_futures_account - 币本位合约账户表
17. binance_exchange_info - 币安交易所信息表
18. chat - 聊天表
19. token - Token 表
20. banned_ip - 封禁 IP 表
21. （还有其他辅助表）

### 2.4 进程通信设计

**Go 启动 Node.js 的方式：**
1. Go 在应用启动时查找 Node.js 可执行文件
2. 通过环境变量将数据库路径传递给 Node.js
3. 启动 Node.js 子进程，监听指定端口（54321）
4. 监听 Node.js 进程的输出日志
5. 应用关闭时自动停止 Node.js 进程

**前端调用后端的方式：**
- 系统级操作（如获取数据库路径、重启服务）：通过 Wails Bind 直接调用 Go 方法
- 业务级操作（如创建策略、查询订单）：通过 HTTP 请求调用 Node.js 接口

---

## 三、实施步骤

### 3.1 Go 端改造

**第一步：添加 SQLite 依赖**
- 在 go.mod 中添加 modernc.org/sqlite 驱动
- 执行 go mod tidy 更新依赖

**第二步：创建数据库服务**
- 创建 internal/services/database_store.go 文件
- 实现 DatabaseStore 结构体，包含以下功能：
  - 获取数据库文件路径（与 config.enc.json 同目录）
  - 初始化 SQLite 连接
  - 创建所有 22 张表的表结构
  - 提供数据库路径供 Node.js 使用
  - 管理数据库生命周期

**第三步：创建 Node.js 进程管理服务**
- 创建 internal/services/nodejs_service.go 文件
- 实现 NodejsService 结构体，包含以下功能：
  - 查找系统中的 Node.js 可执行文件
  - 启动 Node.js 子进程
  - 监听进程输出日志
  - 管理进程生命周期（启动、停止、重启）
  - 提供服务状态查询

**第四步：集成到 App**
- 修改 app.go，添加数据库和 Node.js 服务字段
- 在 startup 函数中初始化数据库并启动 Node.js 服务
- 在 shutdown 函数中停止 Node.js 服务并关闭数据库
- 添加获取数据库路径、服务状态等方法供前端调用
- 修改 main.go，添加 OnShutdown 回调

### 3.2 Node.js 端改造

**第一步：修改数据库配置**
- 修改 config/database.json，将 dialect 从 mysql 改为 sqlite
- 将 storage 设置为 "auto"，表示从环境变量获取路径

**第二步：修改数据库连接代码**
- 修改 models/index.js，支持 SQLite 连接
- 从环境变量 SQLITE_PATH 获取数据库路径
- 如果环境变量未设置，使用默认路径 ~/.config/ppll-client/data.db
- 确保 SQLite 的单写模式配置（连接池 max: 1）
- 设置 busy timeout 避免并发冲突

**第三步：安装 SQLite 驱动**
- 执行 pnpm add sqlite3 安装 Sequelize 的 SQLite 驱动
- 更新 package.json 依赖

### 3.3 构建脚本改造

**修改 prepare-dev.sh：**
- 添加 Node.js 检查函数
- 添加安装 Node.js 后端依赖的步骤
- 更新构建流程，包含前端、后端、Go 三部分的构建

---

## 四、实施结果

### 4.1 新增文件

| 文件路径 | 说明 |
|---------|------|
| internal/services/database_store.go | SQLite 数据库服务，包含 22 张表的创建逻辑 |
| internal/services/nodejs_service.go | Node.js 进程管理服务 |

### 4.2 修改文件

| 文件路径 | 修改内容 |
|---------|----------|
| go.mod | 添加 modernc.org/sqlite v1.41.0 依赖 |
| go.sum | 同步更新依赖校验和 |
| main.go | 添加 OnShutdown: app.shutdown 回调 |
| app.go | 集成 DatabaseStore 和 NodejsService，添加相关方法 |
| prepare-dev.sh | 添加 Node.js 检查和后端依赖安装步骤 |
| nodejs-server/config/database.json | 从 MySQL 改为 SQLite 配置 |
| nodejs-server/models/index.js | 支持 SQLite 连接和环境变量读取 |
| nodejs-server/package.json | 添加 sqlite3 依赖 |

### 4.3 实现的功能

**Go 端新增方法：**
- GetDatabasePath() - 获取 SQLite 数据库文件路径
- IsDatabaseHealthy() - 检查数据库健康状态
- GetNodejsServiceURL() - 获取 Node.js 服务地址
- GetNodejsServiceStatus() - 获取 Node.js 服务状态
- RestartNodejsService() - 重启 Node.js 服务

**数据库特性：**
- 启用 WAL 模式提高并发性能
- 设置 30 秒 busy timeout 避免锁冲突
- 启用外键约束
- 单写模式（连接池 max: 1）

**Node.js 环境变量：**
- SQLITE_PATH - 数据库文件路径（由 Go 注入）
- DB_TYPE=sqlite - 数据库类型标识
- PORT=54321 - 服务端口
- DISABLE_RATE_LIMIT=true - 开发环境禁用频率限制

### 4.4 运行流程

**应用启动时的执行顺序：**
1. 用户双击启动应用
2. Go 外壳启动
3. 初始化日志系统
4. 创建/打开 SQLite 数据库，创建所有表结构
5. 初始化配置存储服务
6. 初始化通知、更新、插件服务
7. 启动 Node.js 子进程
   - 查找 Node.js 可执行文件
   - 设置环境变量（包含数据库路径）
   - 执行 node nodejs-server/app.js
8. Node.js 服务启动，监听 54321 端口
9. React 前端加载完成
10. 用户可以正常使用应用

**应用关闭时的执行顺序：**
1. 用户关闭应用
2. 触发 shutdown 回调
3. 停止 Node.js 子进程
4. 关闭 SQLite 数据库连接
5. 应用退出

---

## 五、验证方法

### 5.1 开发模式验证

```bash
# 执行开发模式准备
./prepare-dev.sh -m=dev

# 启动开发服务器
/Users/peng/go/bin/wails dev
```

**预期结果：**
- SQLite 数据库在 ~/.config/ppll-client/data.db 创建
- 控制台显示数据库初始化成功
- 控制台显示 Node.js 服务启动成功
- 浏览器打开应用界面
- 访问 http://localhost:54321 可以测试 Node.js 接口

### 5.2 生产构建验证

```bash
# 构建生产版本
./prepare-dev.sh -m=build
```

**预期结果：**
- 生成 build/bin/PPLL Native Client.app
- 双击可以正常启动
- 应用包含完整的 Node.js 后端功能

### 5.3 数据库验证

```bash
# 检查数据库文件
ls -la ~/.config/ppll-client/data.db

# 使用 sqlite3 查看表结构
sqlite3 ~/.config/ppll-client/data.db ".tables"
sqlite3 ~/.config/ppll-client/data.db ".schema users"
```

---

## 六、注意事项

### 6.1 Node.js 必须安装

由于本方案将 Node.js 作为子进程运行，用户的系统必须安装 Node.js。如果用户没有安装，应用会在启动时提示错误。

未来的优化方向：
- 将 Node.js 运行时打包进应用
- 或使用 pkg/nexe 将 Node.js 代码编译成可执行文件

### 6.2 SQLite 并发限制

SQLite 在写入时需要独占锁，因此：
- 连接池最大连接数设置为 1
- Node.js 端也使用单连接
- 设置了 30 秒的 busy timeout
- 建议尽量让 Node.js 负责所有写操作

### 6.3 数据迁移

本次改造不涉及 MySQL 数据的迁移，数据库是从空开始创建的。如果需要迁移历史数据，需要另外编写数据迁移脚本。

---

## 七、后续优化方向

1. **Node.js 运行时打包** - 将 Node.js 也打包进应用，用户无需安装
2. **服务健康检查** - 定期检查 Node.js 服务状态，异常时自动重启
3. **日志统一管理** - Go 和 Node.js 的日志统一收集和展示
4. **数据备份恢复** - 添加数据库备份和恢复功能
5. **性能监控** - 添加 CPU、内存使用情况监控
