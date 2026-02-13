# GitHub Actions 工作流

本目录包含项目的 CI/CD 工作流配置。

## 工作流概述

### CI 工作流 (ci.yml)

持续集成工作流，在每次代码推送和 PR 时自动运行。

**触发条件**:

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 手动触发

**执行步骤**:

1. 安装依赖（使用 pnpm，带缓存）
2. Lint 前端代码
3. Lint 后端代码
4. 运行后端测试
5. 构建前端（验证 TypeScript 编译）

**环境要求**:

- Node.js 18
- pnpm

### Build 工作流 (build.yml)

多平台构建工作流，用于创建 Electron 应用的发布版本。

**触发条件**:

- Push 标签（格式: `v*`，如 `v1.0.0`）
- 手动触发（可选择特定平台）

**构建平台**:

- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)
- macOS universal (通用二进制)
- Windows x64
- Windows arm64

**执行步骤**:

1. 安装依赖（使用 pnpm，带缓存）
2. 构建前端
3. 使用 electron-builder 构建平台特定的安装包
4. 上传构建产物
5. 创建 GitHub Release（仅标签推送时）

**环境要求**:

- Node.js 18
- pnpm
- electron-builder

## 使用指南

### 触发 CI 检查

CI 会在以下情况自动运行：

- 推送代码到 main 或 develop 分支
- 创建或更新 Pull Request

### 创建发布版本

1. 确保代码已合并到 main 分支
2. 创建并推送版本标签：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions 会自动构建所有平台的安装包
4. 构建完成后会自动创建 GitHub Release

### 手动触发构建

1. 进入 GitHub Actions 页面
2. 选择 "Build Multi-Platform" 工作流
3. 点击 "Run workflow"
4. 选择要构建的平台（或选择 "all" 构建所有平台）
5. 点击 "Run workflow" 确认

## 缓存策略

两个工作流都使用多级缓存来加速构建：

1. **pnpm store 缓存**: 通过 `setup-node` action 自动管理
2. **node_modules 缓存**: 基于 `pnpm-lock.yaml` 的哈希值

缓存键格式: `{OS}-pnpm-{lock-file-hash}`

## 构建产物

### CI 工作流

- 不上传构建产物（仅验证构建成功）

### Build 工作流

- macOS: `.dmg` 文件
- Windows: `.exe` 安装程序
- 保留期: 30 天

产物命名格式: `ppll-client-v{version}-{platform}-{arch}.{ext}`

示例:

- `ppll-client-v1.0.0-mac-intel-x64.dmg`
- `ppll-client-v1.0.0-win-x64-installer.exe`

## 故障排查

### CI 失败

1. **Lint 错误**: 运行 `pnpm run lint:fix` 修复代码风格问题
2. **测试失败**: 检查测试日志，修复失败的测试
3. **构建失败**: 检查 TypeScript 编译错误

### Build 失败

1. **依赖安装失败**: 检查 `pnpm-lock.yaml` 是否同步
2. **前端构建失败**: 检查 TypeScript 和 Vite 配置
3. **electron-builder 失败**: 检查 `package.json` 中的 build 配置

### 缓存问题

如果遇到缓存相关的问题：

1. 手动清除 GitHub Actions 缓存
2. 更新 `pnpm-lock.yaml` 会自动使缓存失效

## 测试

工作流配置有完整的测试套件，位于 `tests/workflows/` 目录。

运行测试：

```bash
npm test
```

详细信息请参考 [测试文档](../../tests/workflows/TEST_DOCUMENTATION.md)。

## 维护

### 更新 Node.js 版本

修改两个工作流文件中的 `NODE_VERSION` 环境变量：

```yaml
env:
  NODE_VERSION: '18' # 更新为新版本
```

### 添加新平台

在 `build.yml` 的 matrix 配置中添加新的平台组合：

```yaml
strategy:
  matrix:
    include:
      - arch: 新架构
        suffix: 平台-架构
        electron_arch: electron架构
```

### 修改缓存策略

更新 `actions/cache` 步骤的配置：

```yaml
- uses: actions/cache@v3
  with:
    path: |
      # 添加或删除缓存路径
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

## 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [electron-builder 文档](https://www.electron.build/)
- [pnpm 文档](https://pnpm.io/)
- [测试文档](../../tests/workflows/TEST_DOCUMENTATION.md)
- [需求文档](../../.kiro/specs/github-actions-ci-cd-workflow/requirements.md)
- [设计文档](../../.kiro/specs/github-actions-ci-cd-workflow/design.md)
