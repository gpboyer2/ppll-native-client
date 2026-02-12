# GitHub Actions 跨平台构建教程

## 概述

本项目使用 GitHub Actions 实现自动化跨平台构建，支持：

- **macOS**: Intel (amd64)、Apple Silicon (arm64)、Universal
- **Windows**: x64 (amd64)、ARM64

所有构建产物会自动上传为 GitHub Artifacts，并在推送标签时自动创建 Release。

## 工作流程

### 触发条件

工作流会在以下情况下自动触发：

1. **推送到主分支**

   ```bash
   git push origin master
   git push origin develop
   ```

2. **推送版本标签**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Pull Request**
   - 创建或更新 PR 到 master/develop 分支

4. **手动触发**
   - 在 GitHub 网页上：Actions → Build Multi-Platform → Run workflow

### 构建矩阵

工作流会并行构建以下 5 个平台：

| 平台    | 架构      | 产物名称                                |
| ------- | --------- | --------------------------------------- |
| macOS   | Intel x64 | ppll-client-v{版本}-mac-intel-x64.dmg   |
| macOS   | Apple ARM | ppll-client-v{版本}-mac-apple-arm64.dmg |
| macOS   | Universal | ppll-client-v{版本}-mac-universal.dmg   |
| Windows | x64       | ppll-client-v{版本}-win-x64.exe         |
| Windows | ARM64     | ppll-client-v{版本}-win-arm64.exe       |

## 快速开始

### 方法一：自动触发构建

推送代码到 GitHub，构建会自动开始：

```bash
# 提交代码
git add .
git commit -m "feat: 新功能"

# 推送到远程（自动触发构建）
git push origin master
```

### 方法二：创建发布版本

```bash
# 1. 创建并推送标签（自动触发构建 + 创建 Release）
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions 会自动：
#    - 构建 5 个平台的版本
#    - 创建 Release
#    - 上传所有构建产物到 Release
```

### 方法三：手动触发

1. 打开项目 GitHub 页面
2. 点击 **Actions** 标签
3. 选择 **Build Multi-Platform** 工作流
4. 点击 **Run workflow** 按钮
5. 选择分支，点击运行

## 监控构建进度

### 在 GitHub 上查看

1. 进入项目页面
2. 点击 **Actions** 标签
3. 查看最近的构建记录
4. 点击具体构建查看详细日志

### 构建时间参考

- macOS 单平台构建：约 5-10 分钟
- Windows 单平台构建：约 5-10 分钟
- 总计（5个平台并行）：约 10-15 分钟

## 下载构建产物

### 方式一：从 Actions 下载

1. 进入 **Actions** 页面
2. 点击成功的构建记录
3. 滚动页面到底部 **Artifacts** 区域
4. 下载需要的平台包

注意：Artifacts 保留 30 天后自动删除。

### 方式二：从 Release 下载（仅标签构建）

当推送版本标签时，所有产物会自动上传到 Release：

1. 进入项目 **Code** 页面
2. 点击右侧 **Releases**
3. 找到对应版本
4. 下载需要的平台包

## 工作流配置详解

### 文件位置

```
.github/workflows/build.yml
```

### 主要配置项

#### 1. 环境变量

```yaml
env:
  GO_VERSION: '1.21' # Go 版本
  NODE_VERSION: '22' # Node.js 版本
```

如需修改版本，编辑 `build.yml` 中的这些值。

#### 2. 构建矩阵

```yaml
strategy:
  matrix:
    include:
      - target: amd64
        platform: darwin/amd64
        suffix: mac-intel-x64
```

如需添加新平台，在 `matrix.include` 下添加新条目。

#### 3. Artifacts 保留时间

```yaml
- name: 上传构建产物
  uses: actions/upload-artifact@v4
  with:
    retention-days: 30 # 保留 30 天
```

修改 `retention-days` 可调整保留时间。

## 常见问题

### Q1: 构建失败怎么办？

1. 查看 Actions 日志找到错误信息
2. 检查依赖版本是否兼容
3. 本地测试 `wails build` 验证
4. 确认网络连接正常

### Q2: 如何修改构建产物名称？

编辑 `.github/workflows/build.yml`，修改 `OUTPUT_FILE` 变量：

```yaml
OUTPUT_FILE="build/ppll-client-v${VERSION}-${{ matrix.suffix }}.dmg"
```

### Q3: 如何禁用某个平台的构建？

在 `matrix.include` 中注释掉对应的平台配置：

```yaml
# - target: arm64
#   platform: darwin/arm64
#   suffix: mac-apple-arm64
```

### Q4: Windows 构建很慢怎么办？

这是正常现象，Windows 构建比 macOS 慢约 20-30%。可以考虑：

- 使用缓存加速依赖安装
- 减少 Windows 平台构建数量

### Q5: 如何在 PR 中跳过构建？

在 commit message 中添加 `[skip ci]` 或 `[ci skip]`：

```bash
git commit -m "docs: 更新文档 [skip ci]"
```

## 高级用法

### 添加缓存加速构建

在 `.github/workflows/build.yml` 中添加缓存步骤：

```yaml
- name: 缓存 Go 模块
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-

- name: 缓存 pnpm
  uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

### 定时构建（Nightly Builds）

在 `on` 部分添加定时触发：

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # 每天凌晨 2 点运行
```

### 矩阵策略优化

使用 `max-parallel` 限制并行任务数：

```yaml
strategy:
  max-parallel: 2 # 最多同时运行 2 个任务
  matrix:
    include:
      # ...
```

## 最佳实践

1. **标签命名规范**

   ```bash
   # 推荐
   git tag v1.0.0
   git tag v1.0.1-beta
   git tag v2.0.0-rc1

   # 不推荐
   git tag 1.0.0
   git tag release-1
   ```

2. **本地测试后再推送**

   ```bash
   # 1. 本地测试构建
   ./build-platforms.sh

   # 2. 确认无误后推送
   git push origin master
   ```

3. **使用分支保护**
   - 在 GitHub 设置中启用分支保护
   - 要求 PR 必须通过 CI 检查才能合并

4. **定期更新依赖**

   ```bash
   # 更新 Go 依赖
   go get -u ./...
   go mod tidy

   # 更新前端依赖
   cd frontend
   pnpm update
   ```

## 相关文件

- `.github/workflows/build.yml` - GitHub Actions 工作流配置
- `build-platforms.sh` - 本地多平台构建脚本
- `wails.json` - Wails 项目配置（包含版本号）

## 参考资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Wails 官方文档](https://wails.io/docs/introduction)
- [Actions Marketplace](https://github.com/marketplace?type=actions)

## 总结

使用 GitHub Actions 后，你只需要：

1. ✅ 推送代码或标签
2. ✅ 等待自动构建完成
3. ✅ 下载构建产物

无需手动配置构建环境，所有平台自动并行构建！
