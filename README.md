# PPLL Native Client

## 项目简介

PPLL Native Client 是 PPLL 量化交易生态系统的专业桌面客户端，为量化交易者提供高性能、安全可靠的跨平台桌面交易体验。作为 PPLL 平台生态的重要组成部分，它整合了网格交易、资产管理、风险控制等核心功能，为专业用户提供原生级的操作体验。

## 核心特性

### 🚀 原生性能体验
- 基于 Wails 框架的跨平台桌面应用
- Go 后端提供高性能并发处理
- React + TypeScript 前端提供现代化用户界面
- 支持多窗口同时操作，提高交易效率

### 💼 专业量化交易功能
- **网格策略管理**：双向网格（LONG/SHORT）策略实时监控
- **实时价格监控**：毫秒级价格更新，WebSocket 实时推送
- **风险控制工具**：止损止盈、仓位管理、风险预警
- **交易执行引擎**：高性能订单处理，支持高频交易需求

### 📊 高级数据分析
- **专业图表系统**：K线图、深度图、技术指标分析
- **多时间维度**：支持1分钟到1周的不同周期分析
- **策略回测**：历史数据回测，优化策略参数
- **收益分析**：实时收益统计、资金流向分析

### 🛡️ 安全与隐私
- **本地密钥存储**：与 Quantum Bandit 系统集成
- **数据加密传输**：端到端加密，保护交易隐私
- **离线缓存**：关键数据本地存储，网络断开仍可查看
- **权限管理**：细粒度权限控制，确保账户安全

### 🌐 多平台支持
- **Windows**：Windows 10/11 x64
- **macOS**：macOS 10.15+ (Intel/Apple Silicon)
- **Linux**：主流发行版支持

## 技术架构

### 后端技术栈
- **Go 1.21+**：高性能后端服务
- **Gin**：轻量级 Web 框架
- **GORM**：ORM 数据库操作
- **WebSocket**：实时数据推送
- **SQLite**：本地数据存储

### 前端技术栈
- **React 18**：现代化 UI 框架
- **TypeScript**：类型安全开发
- **Zustand**：轻量级状态管理
- **Ant Design**：企业级 UI 组件库
- **ECharts**：专业数据可视化

### 系统集成
- **PPLL Server**：连接核心交易服务
- **PPLL Asset Watcher**：资产监控数据
- **PPLL Quantum Bandit**：密钥管理系统
- **Binance API**：实时交易数据

## 安装与配置

### 系统要求
- Node.js 16.16.0+
- Go 1.21+
- Git

### 开发环境搭建

1. **克隆项目**
```bash
git clone https://github.com/your-repo/ppll-native-client.git
cd ppll-native-client
```

2. **安装依赖**
```bash
# 安装前端依赖
npm install

# 安装 Go 依赖
go mod download
```

3. **配置环境**
```bash
# 复制配置文件
cp config.example.json config.json

# 编辑配置文件，填入 API 密钥等信息
```

### 开发模式运行

```bash
# 启动开发服务器
wails dev

# 或者使用浏览器开发模式
# 访问 http://localhost:34115
```

### 生产构建

```bash
# 构建所有平台
wails build

# 构建特定平台
wails build -platform windows/amd64
wails build -platform darwin/amd64
wails build -platform darwin/arm64
wails build -platform linux/amd64
```

## 项目结构

```
ppll-native-client/
├── app.go                 # 主应用入口
├── main.go               # 主程序入口
├── wails.json            # Wails 配置文件
├── frontend/             # 前端源码
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── store/        # 状态管理
│   │   ├── services/     # API 服务
│   │   └── utils/        # 工具函数
│   ├── public/           # 静态资源
│   └── package.json      # 前端依赖配置
├── embed.go              # 嵌入资源
├── backend/              # Go 后端代码
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑
│   ├── handlers/         # HTTP 处理器
│   └── utils/            # Go 工具函数
├── config/               # 配置文件
├── docs/                 # 项目文档
└── build/                # 构建输出
```

## 核心功能模块

### 1. 交易面板
- 实时价格展示
- 快速下单/平仓
- 订单簿深度显示
- 成交历史记录

### 2. 策略管理
- 网格策略创建/编辑
- 参数动态调整
- 策略性能监控
- 批量策略操作

### 3. 资产管理
- 账户余额总览
- 持仓分布统计
- 资金流水记录
- 盈亏分析报告

### 4. 风控中心
- 实时风险监控
- 预警设置管理
- 强制平仓保护
- 风险事件记录

### 5. 数据分析
- K线图表分析
- 技术指标计算
- 策略回测报告
- 数据导出功能

## 开发指南

### 添加新功能

1. **后端 API**
```go
// 在 backend/handlers/ 添加新的处理器
func NewAPIHandler() *APIHandler {
    return &APIHandler{}
}

func (h *APIHandler) HandleRequest(ctx context.Context, data string) (string, error) {
    // 处理逻辑
    return "success", nil
}
```

2. **前端组件**
```typescript
// 在 frontend/src/components/ 添加新组件
import React from 'react';

export const NewComponent: React.FC = () => {
    return <div>New Component</div>;
};
```

### 调试技巧

- 使用 `wails dev` 启动开发模式
- 浏览器开发者工具调试前端
- 使用 `fmt.Println()` 在后端输出调试信息
- 检查 `app.log` 查看运行日志

## 性能优化

- 使用 React.memo 优化组件渲染
- 实现虚拟滚动处理大量数据
- 使用 Web Worker 处理复杂计算
- 合理使用缓存减少 API 调用

## 安全最佳实践

- API 密钥加密存储
- 使用 HTTPS/WSS 安全连接
- 实施请求频率限制
- 定期更新依赖库版本

## 常见问题

### Q: 如何配置 API 密钥？
A: 编辑 `config.json` 文件，填入 Binance API Key 和 Secret。

### Q: 支持哪些交易所？
A: 目前主要支持 Binance，后续会逐步支持其他主流交易所。

### Q: 如何离线使用？
A: 应用会缓存必要的数据，断网情况下仍可查看历史数据，但交易功能需要网络连接。

### Q: 数据存储在哪里？
A: 本地数据存储在 SQLite 数据库中，配置文件存储在用户目录下。

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目主页：https://github.com/your-repo/ppll-native-client
- 问题反馈：https://github.com/your-repo/ppll-native-client/issues
- 邮箱：your-email@example.com

---

**PPLL Native Client** - 为专业量化交易者打造的桌面交易平台
