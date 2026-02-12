# 双仓库配置指南（Gitee + GitHub）

本指南将帮助你配置同时使用 Gitee 和 GitHub 两个远程仓库。

## 📋 当前配置

```
origin → https://gitee.com/WoDePeng/ppll-native-client.git
```

## 🎯 目标配置

```
origin  → Gitee 仓库（代码备份）
github  → GitHub 仓库（CI/CD 构建）
```

---

## 第一步：创建 GitHub 仓库

### 1. 登录 GitHub

访问：https://github.com

### 2. 创建新仓库

1. 点击右上角 `+` → `New repository`
2. 填写仓库信息：
   - **Repository name**: `ppll-native-client`（或你喜欢的名字）
   - **Description**: `PPLL Native Client - 专业量化交易桌面客户端`
   - **Visibility**: ✅ **Private**（私有项目）
   - **不要**勾选 "Add a README file"
   - **不要**勾选 "Add .gitignore"
   - **不要**勾选 "Choose a license"
3. 点击 `Create repository`

### 3. 记录仓库地址

创建后你会看到地址，类似：

```
https://github.com/你的用户名/ppll-native-client.git
```

**记下来，下一步要用！**

---

## 第二步：配置双远程仓库

### 方式A：仅添加到本地（推荐）

只在你当前的电脑上配置，不影响其他开发者：

```bash
# 添加 github 远程仓库
git remote add github https://github.com/你的用户名/ppll-native-client.git

# 验证配置
git remote -v
```

输出应该是：

```
origin  https://gitee.com/WoDePeng/ppll-native-client.git (fetch)
origin  https://gitee.com/WoDePeng/ppll-native-client.git (push)
github  https://github.com/你的用户名/ppll-native-client.git (fetch)
github  https://github.com/你的用户名/ppll-native-client.git (push)
```

### 方式B：添加到项目配置（团队协作）

如果想和其他开发者共享这个配置，创建 `git-extra-remotes.sh`：

```bash
#!/bin/bash
# 添加 GitHub 远程仓库
git remote add github https://github.com/你的用户名/ppll-native-client.git
echo "✓ 已添加 github 远程仓库"
```

提交到项目中，其他开发者运行即可。

---

## 第三步：测试双仓库推送

### 测试1：分别推送

```bash
# 推送到 Gitee
git push origin master

# 推送到 GitHub
git push github master
```

### 测试2：同时推送

```bash
# 一次命令推送到两个仓库
git push origin master && git push github master
```

### 测试3：创建推送别名（推荐）

为了方便，添加一个别名：

```bash
# 添加推送别名
git config alias.pushall '!git push origin master && git push github master'

# 使用别名推送
git pushall
```

---

## 第四步：首次推送到 GitHub

```bash
# 1. 切换到 master 分支
git checkout master

# 2. 推送所有分支和标签到 GitHub
git push github master
git push github --tags

# 3. 验证
# 打开 GitHub 仓库页面查看代码
```

---

## 日常工作流程

### 场景1：正常开发

```bash
# 1. 提交代码
git add .
git commit -m "feat: 新功能"

# 2. 推送到 Gitee（快速）
git push origin master

# 3. 需要构建时打 tag 推送到 GitHub
git tag v1.0.0
git push github v1.0.0  # 触发 GitHub Actions 构建
```

### 场景2：发布版本（推荐）

```bash
# 1. 先推送到 Gitee
git push origin master

# 2. 打标签
git tag v1.0.0

# 3. 推送标签到 GitHub（触发构建）
git push github master
git push github --tags

# 4. 等待 GitHub Actions 构建完成
# 5. 收到邮件通知
# 6. 下载构建产物
```

### 场景3：同时推送到两个仓库

```bash
# 推送代码
git push origin master && git push github master

# 推送标签（触发构建）
git push origin --tags && git push github --tags
```

---

## GitHub Actions 构建触发

### 已修改的触发条件

**之前：** 推送代码到 master/develop 就触发

```yaml
on:
  push:
    branches:
      - master
      - develop
```

**现在：** 只在推送 tag 时触发

```yaml
on:
  push:
    tags:
      - 'v*'
```

### 触发方式

**方式1：推送标签（推荐）**

```bash
# 创建并推送标签
git tag v1.0.0
git push github v1.0.0

# 或推送所有标签
git push github --tags
```

**方式2：手动触发**

1. 打开 GitHub 仓库
2. 点击 `Actions` 标签
3. 选择 `Build Multi-Platform`
4. 点击 `Run workflow` → `Run workflow`

### 标签命名规范

```bash
# 正式版本
git tag v1.0.0
git tag v2.0.0

# Beta 版本
git tag v1.0.0-beta

# RC 版本
git tag v1.0.0-rc1

# Alpha 版本
git tag v1.0.0-alpha
```

所有以 `v` 开头的标签都会触发构建！

---

## 常用命令速查

### 远程仓库操作

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add github <GitHub仓库地址>

# 删除远程仓库
git remote remove github

# 修改远程仓库地址
git remote set-url github <新的GitHub仓库地址>

# 查看远程仓库详情
git remote show origin
git remote show github
```

### 推送操作

```bash
# 推送到 Gitee
git push origin master

# 推送到 GitHub
git push github master

# 同时推送
git push origin master && git push github master

# 推送标签到 Gitee
git push origin --tags

# 推送标签到 GitHub（触发构建）
git push github --tags

# 推送特定标签
git push github v1.0.0

# 删除远程标签
git push github --delete v1.0.0
```

### 标签操作

```bash
# 创建标签
git tag v1.0.0

# 创建带注释的标签
git tag -a v1.0.0 -m "版本 1.0.0"

# 查看所有标签
git tag

# 查看标签详情
git show v1.0.0

# 删除本地标签
git tag -d v1.0.0

# 推送所有标签
git push github --tags

# 推送特定标签
git push github v1.0.0
```

---

## 故障排查

### 问题1：推送失败

**错误：** `fatal: 'github' does not appear to be a git repository`

**解决：**

```bash
# 检查远程仓库
git remote -v

# 如果没有 github，添加它
git remote add github https://github.com/你的用户名/ppll-native-client.git
```

### 问题2：认证失败

**错误：** `fatal: Authentication failed`

**解决：**

```bash
# 使用 GitHub Personal Access Token
# 1. Settings → Developer settings → Personal access tokens → Tokens (classic)
# 2. Generate new token (classic)
# 3. 勾选 repo 权限
# 4. 复制 token

# 使用 token 推送
git push github master
# 用户名：你的 GitHub 用户名
# 密码：粘贴 token（不是密码）
```

### 问题3：GitHub Actions 没有触发

**检查：**

1. 标签是否以 `v` 开头？

   ```bash
   git tag  # 查看标签
   ```

2. 是否推送到正确的远程仓库？

   ```bash
   git push github v1.0.0  # 推送到 github，不是 origin
   ```

3. 检查 GitHub Actions 页面是否有构建记录

---

## 优势总结

### 双仓库优势

| 优势               | 说明                       |
| ------------------ | -------------------------- |
| 🇨🇳 **Gitee 快速**  | 国内访问快，适合日常开发   |
| 🌍 **GitHub 稳定** | 国际化，CI/CD 功能强大     |
| 🔄 **自动备份**    | 一个仓库出问题，另一个还在 |
| 👥 **团队协作**    | 团队成员用不同平台都行     |

### Tag触发优势

| 优势               | 说明                   |
| ------------------ | ---------------------- |
| 💰 **节省额度**    | 不浪费免费分钟数       |
| 🎯 **按需构建**    | 只在发布版本时构建     |
| 📦 **自动Release** | Tag触发自动创建Release |
| 🚀 **更专业**      | 符合正规发布流程       |

---

## 快速配置脚本

创建 `setup-dual-repo.sh`：

```bash
#!/bin/bash

echo "配置双仓库（Gitee + GitHub）"
echo "================================"

# 提示输入 GitHub 仓库地址
read -p "请输入 GitHub 仓库地址: " GITHUB_REPO

# 添加 github 远程仓库
git remote add github $GITHUB_REPO

# 验证
echo ""
echo "✓ 配置完成！"
echo ""
echo "远程仓库："
git remote -v

echo ""
echo "测试推送："
echo "  git push origin master   # 推送到 Gitee"
echo "  git push github master   # 推送到 GitHub"
echo ""
echo "触发构建："
echo "  git tag v1.0.0"
echo "  git push github v1.0.0"
```

使用方法：

```bash
chmod +x setup-dual-repo.sh
./setup-dual-repo.sh
```

---

## 总结

✅ **完成配置后：**

1. 日常开发推送到 Gitee（快速）
2. 发布版本时打 tag 推送到 GitHub（触发构建）
3. 两个仓库互为备份，更安全

✅ **典型工作流：**

```bash
# 开发阶段
git add .
git commit -m "feat: 新功能"
git push origin master  # 推送到 Gitee

# 发布阶段
git tag v1.0.0
git push github master  # 推送代码到 GitHub
git push github --tags  # 推送标签，触发构建

# 等待构建完成...
# 收到邮件通知
# 下载构建产物
```

就这么简单！🚀
