# GitHub Actions 文档中心

欢迎使用 PPLL Native Client GitHub Actions 自动化构建系统！

## 🚀 快速开始

**第一次使用？** 请阅读：
- 📖 [快速开始指南](workflows/README.md) - 5 分钟上手

## 📚 文档导航

### 入门文档

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [快速开始](workflows/README.md) | 5 分钟上手指南 | 新手 |
| [私有项目问答](PRIVATE_PROJECT_GUIDE.md) | 常见问题解答 | 所有用户 |

### 进阶文档

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [工作流程可视化](ACTIONS_WORKFLOW.md) | 完整流程图和说明 | 想深入了解的用户 |
| [完整使用教程](GITHUB_ACTIONS_GUIDE.md) | 从入门到精通 | 所有用户 |

## 🎯 按场景查找

### 场景 1：我只是想用起来

```
1. 阅读：workflows/README.md（快速开始）
2. 推送代码触发构建
3. 等待邮件通知
```

### 场景 2：我想了解详细功能

```
1. 阅读：ACTIONS_WORKFLOW.md（工作流程可视化）
2. 阅读：GITHUB_ACTIONS_GUIDE.md（完整教程）
3. 自定义工作流配置
```

### 场景 3：我有疑问

```
1. 查看：PRIVATE_PROJECT_GUIDE.md（私有项目问答）
2. 问题：私有项目能用吗？需要付费吗？
3. 找到答案并开始使用
```

## ✨ 核心特性

- ✅ **完全免费** - 2000 分钟/月免费额度
- ✅ **私有项目** - 完全支持，功能无限制
- ✅ **跨平台构建** - 5 个平台并行编译
- ✅ **自动发布** - 推送标签自动创建 Release
- ✅ **邮件通知** - 构建状态自动邮件通知

## 📁 文件结构

```
.github/
├── workflows/
│   ├── build.yml              # GitHub Actions 工作流配置
│   └── README.md              # 快速开始指南
├── README.md                  # 📍 你在这里（文档导航）
├── ACTIONS_WORKFLOW.md        # 工作流程可视化
├── GITHUB_ACTIONS_GUIDE.md    # 完整使用教程
└── PRIVATE_PROJECT_GUIDE.md   # 私有项目问答
```

## 🔥 常见问题速查

### Q: 私有项目能用吗？
**A:** 能！功能和公开项目完全相同 → [详见](PRIVATE_PROJECT_GUIDE.md)

### Q: 需要付费吗？
**A:** 不需要！免费额度完全够用 → [详见](PRIVATE_PROJECT_GUIDE.md)

### Q: 构建要多久？
**A:** 12-15 分钟（5个平台并行） → [详见](PRIVATE_PROJECT_GUIDE.md)

### Q: 怎么收到通知？
**A:** GitHub 自动发送邮件通知，无需配置！

## 🎓 学习路径

```
初级（5分钟）
  ↓
  快速开始指南
  (workflows/README.md)

中级（15分钟）
  ↓
  工作流程可视化
  (ACTIONS_WORKFLOW.md)

高级（30分钟）
  ↓
  完整使用教程
  (GITHUB_ACTIONS_GUIDE.md)
```

## 📞 需要帮助？

- 📖 **查阅文档** - 上面的文档导航
- 🔧 **查看配置** - [workflows/build.yml](workflows/build.yml)
- ❓ **常见问题** - [PRIVATE_PROJECT_GUIDE.md](PRIVATE_PROJECT_GUIDE.md)

## 🎉 开始使用

```bash
# 1. 提交代码
git add .github/
git commit -m "feat: 添加 GitHub Actions 自动化构建"

# 2. 推送到 GitHub（自动触发构建）
git push origin master

# 3. 在 GitHub 查看 Actions 页面的构建进度
# 网址: https://github.com/你的用户名/你的仓库/actions

# 4. 等待邮件通知（自动发送）
```

**就这么简单！** 🚀

---

**最后更新：** 2025-12-25
**维护者：** PPLL Team
