# GitHub Actions 工作流程可视化

## 🎯 工作流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     触发构建                                │
├─────────────────────────────────────────────────────────────┤
│  ✓ 推送代码到 master/develop                                │
│  ✓ 创建/更新 Pull Request                                   │
│  ✓ 推送版本标签 (v1.0.0)                                    │
│  ✓ 手动触发 (Run workflow)                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions 开始运行                         │
├─────────────────────────────────────────────────────────────┤
│  1. 并行构建 5 个平台（同时进行）                           │
│     ├─ macOS Intel x64       (约 5-10 分钟)                │
│     ├─ macOS Apple ARM       (约 5-10 分钟)                │
│     ├─ macOS Universal       (约 5-10 分钟)                │
│     ├─ Windows x64           (约 5-10 分钟)                │
│     └─ Windows ARM64         (约 5-10 分钟)                │
│                                                              │
│  2. 每个 Job 的任务流程：                                   │
│     ├─ Checkout 代码                                        │
│     ├─ 设置 Go 环境 (v1.21)                                 │
│     ├─ 设置 Node.js 环境 (v22)                              │
│     ├─ 安装 pnpm 和 Wails                                   │
│     ├─ 安装所有依赖                                         │
│     ├─ 执行 wails build                                     │
│     ├─ 创建安装包 (.dmg / .exe)                             │
│     └─ 上传构建产物 (Artifacts)                             │
│                                                              │
│  总计耗时：约 10-15 分钟（5个平台并行）                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   构建产物处理                               │
├─────────────────────────────────────────────────────────────┤
│  如果是普通推送 (push):                                     │
│  └─ 产物上传到 Actions Artifacts（保留 30 天）              │
│                                                              │
│  如果是版本标签 (tag v*):                                   │
│  ├─ 产物上传到 Actions Artifacts                            │
│  └─ 自动创建 Release 并上传所有产物                         │
│                                                              │
│  产物列表：                                                 │
│  ├─ ppll-client-v1.0.0-mac-intel-x64.dmg        (6.5MB)   │
│  ├─ ppll-client-v1.0.0-mac-apple-arm64.dmg      (6.2MB)   │
│  ├─ ppll-client-v1.0.0-mac-universal.dmg         (12MB)    │
│  ├─ ppll-client-v1.0.0-win-x64.exe              (~20MB)   │
│  └─ ppll-client-v1.0.0-win-arm64.exe            (~20MB)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     下载与使用                               │
├─────────────────────────────────────────────────────────────┤
│  方式 1: 从 Actions 页面下载                                │
│  └─ Actions → 选择构建记录 → Artifacts → 下载              │
│                                                              │
│  方式 2: 从 Release 下载（仅标签构建）                      │
│  └─ Code → Releases → 选择版本 → 下载安装包                │
└─────────────────────────────────────────────────────────────┘
```

## 📊 构建矩阵

### macOS 平台构建（3个）

| Job             | 运行环境       | Wails 平台         | 产物   | 大小   |
| --------------- | -------------- | ------------------ | ------ | ------ |
| macOS Intel     | `macos-latest` | `darwin/amd64`     | `.dmg` | ~6.5MB |
| macOS ARM       | `macos-latest` | `darwin/arm64`     | `.dmg` | ~6.2MB |
| macOS Universal | `macos-latest` | `darwin/universal` | `.dmg` | ~12MB  |

### Windows 平台构建（2个）

| Job           | 运行环境         | Wails 平台      | 产物   | 大小  |
| ------------- | ---------------- | --------------- | ------ | ----- |
| Windows x64   | `windows-latest` | `windows/amd64` | `.exe` | ~20MB |
| Windows ARM64 | `windows-latest` | `windows/arm64` | `.exe` | ~20MB |

## 🔄 触发场景对比

### 场景 1: 开发推送

```bash
git add .
git commit -m "feat: 新功能"
git push origin master
```

**结果：**

- ✅ 自动构建 5 个平台
- ✅ 产物保存到 Artifacts (30天)
- ❌ 不创建 Release

---

### 场景 2: 发布版本

```bash
git tag v1.0.0
git push origin v1.0.0
```

**结果：**

- ✅ 自动构建 5 个平台
- ✅ 产物保存到 Artifacts (30天)
- ✅ 自动创建 Release
- ✅ 产物上传到 Release

---

### 场景 3: Pull Request

```bash
# 创建 PR
gh pr create --title "新功能" --body "描述"
```

**结果：**

- ✅ 自动构建 5 个平台
- ✅ 构建结果显示在 PR 页面
- ❌ 不创建 Release
- ❌ 不保存 Artifacts

---

### 场景 4: 手动触发

**操作：**

1. 打开 GitHub Actions 页面
2. 点击 "Run workflow"
3. 选择分支
4. 点击运行

**结果：**

- ✅ 自动构建 5 个平台
- ✅ 产物保存到 Artifacts (30天)
- ❌ 不创建 Release

## 📁 文件结构

```
项目根目录/
├── .github/
│   └── workflows/
│       ├── build.yml          # GitHub Actions 工作流配置
│       └── README.md          # 快速开始指南
├── build-platforms.sh         # 本地多平台构建脚本
├── release-build.sh           # 本地发布脚本
├── prepare-dev.sh             # 开发环境准备脚本
├── GITHUB_ACTIONS_GUIDE.md    # 详细使用文档
├── BUILD_GUIDE.md             # 本地构建指南
└── wails.json                 # Wails 项目配置
```

## ⚙️ 配置说明

### 环境变量 (build.yml)

```yaml
env:
  GO_VERSION: '1.21' # Go 编译器版本
  NODE_VERSION: '22' # Node.js 版本
```

### 构建产物保留时间

```yaml
retention-days: 30 # Artifacts 保留 30 天
```

可修改范围：1-90 天

### 并行构建策略

```yaml
strategy:
  max-parallel: 5 # 最多同时运行 5 个任务
```

GitHub 免费账户限制：最多 20 个并发任务

## 💰 成本分析

### GitHub Actions 免费额度

| 账户类型 | 每月免费分钟 | 存储空间 |
| -------- | ------------ | -------- |
| Free     | 2000 分钟    | 500 MB   |
| Pro      | 3000 分钟    | 2 GB     |
| Team     | 10000 分钟   | 10 GB    |

### 本项目构建成本估算

单次构建消耗：

```
macOS: 10 分钟 × 3 个任务 = 30 分钟
Windows: 10 分钟 × 2 个任务 = 20 分钟
总计: 50 分钟
```

免费额度可构建次数：

```
Free:  2000 ÷ 50 = 40 次/月
Pro:   3000 ÷ 50 = 60 次/月
```

**结论：** 对于个人项目，免费额度完全够用！

## 🚀 优化建议

### 1. 添加缓存加速构建

```yaml
- name: 缓存 Go 模块
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
```

**效果：** 减少 2-3 分钟构建时间

### 2. 条件构建（仅构建变更的平台）

```yaml
- name: 检测平台变更
  if: contains(github.event.commits[0].message, '[build all]')
```

### 3. 矩阵策略优化

如果只需要特定平台，可以减少矩阵数量：

```yaml
strategy:
  matrix:
    include:
      - platform: darwin/universal
        suffix: mac-universal
      # 只构建通用版本，节省时间
```

## 📚 相关链接

- 📖 [详细文档](../GITHUB_ACTIONS_GUIDE.md)
- 🔧 [工作流配置](./build.yml)
- 🚀 [快速开始](./README.md)
- 📦 [本地构建](../BUILD_GUIDE.md)
