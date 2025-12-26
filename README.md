# PPLL Native Client

> PPLL 量化交易生态系统的专业桌面客户端

## 📖 完整文档

请查看 [完整项目文档](.github/README.md) 了解详细信息。

## 🚀 快速开始

### 方式一：一键启动（推荐）

使用启动脚本自动启动所有服务：

```bash
# 克隆项目
git clone https://github.com/gpboyer2/ppll-native-client.git
cd ppll-native-client

# 一键启动（首次使用会进行环境检查）
./start-mac.sh

# 快速启动（跳过环境检查）
./start-mac.sh -q
```

脚本会自动：
- 检查 Go、Node.js、Wails 环境
- 安装前端依赖
- 启动 Wails 开发服务器
- 日志输出到 `process-monitoring/` 目录

### 方式二：手动分离启动

分别启动桌面客户端和后端服务（适合调试）：

```bash
# 终端1：启动桌面客户端（Go + 前端）
cd /path/to/ppll-native-client
wails dev

# 终端2：启动 Node.js 后端服务
cd /path/to/ppll-native-client/nodejs-server
npm run node:dev
```

### 依赖要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Go | 1.20+ | 后端语言 |
| Node.js | 16+ | 运行时环境 |
| Wails | v2 | 桌面应用框架 |

安装 Wails：
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## 📚 文档导航

- [完整项目文档](.github/README.md) - 项目介绍、技术架构、开发指南
- [GitHub Actions 文档](.github/workflows/README.md) - 自动化构建指南
- [工作流程可视化](.github/ACTIONS_WORKFLOW.md) - CI/CD 流程图
- [完整使用教程](.github/GITHUB_ACTIONS_GUIDE.md) - 从入门到精通

## 核心特性

- 🚀 基于 Wails 的跨平台桌面应用（Windows/macOS/Linux）
- 💼 专业量化交易功能（网格策略、实时监控、风险控制）
- 📊 高级数据分析（K线图、技术指标、策略回测）
- 🛡️ 安全与隐私（本地密钥存储、数据加密传输）

## 技术栈

- **后端**: Go 1.21+ / Gin / GORM / WebSocket / SQLite
- **前端**: React 18 / TypeScript / Zustand / Mantine UI / ECharts

## 联系方式

- 项目主页：https://github.com/gpboyer2/ppll-native-client
- 问题反馈：https://github.com/gpboyer2/ppll-native-client/issues
- 邮箱：team@ppll.com

---

**PPLL Native Client** - 为专业量化交易者打造的桌面交易平台
