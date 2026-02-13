#!/bin/bash

# 双仓库快速配置脚本
# 用法：./setup-dual-repo.sh

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         配置双仓库（Gitee + GitHub）                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 检查是否已有 github 远程仓库
if git remote get-url github &>/dev/null; then
    echo "⚠️  检测到已存在 github 远程仓库"
    echo ""
    echo "当前配置："
    git remote -v
    echo ""
    read -p "是否要重新配置？(y/N): " RECONFIGURE
    if [[ $RECONFIGURE != "y" && $RECONFIGURE != "Y" ]]; then
        echo "取消配置"
        exit 0
    fi
    echo ""
    echo "删除旧的 github 远程仓库..."
    git remote remove github
fi

echo "请准备你的 GitHub 仓库地址"
echo ""
echo "如何获取："
echo "1. 访问 https://github.com"
echo "2. 创建新仓库（如果还没有）"
echo "3. 复制仓库地址，格式类似："
echo "   https://github.com/你的用户名/ppll-native-client.git"
echo ""

# 提示输入 GitHub 仓库地址
read -p "请输入 GitHub 仓库地址: " GITHUB_REPO

# 验证地址格式
if [[ ! $GITHUB_REPO =~ ^https://github\.com/.*\.git$ ]]; then
    echo ""
    echo "❌ 错误：GitHub 仓库地址格式不正确"
    echo ""
    echo "正确格式示例："
    echo "  https://github.com/username/ppll-native-client.git"
    echo ""
    exit 1
fi

# 添加 github 远程仓库
echo ""
echo "正在添加 github 远程仓库..."
git remote add github "$GITHUB_REPO"

# 验证配置
echo ""
echo "✓ 配置完成！"
echo ""
echo "当前远程仓库："
echo "────────────────────────────────────"
git remote -v
echo "────────────────────────────────────"
echo ""

# 测试连接
echo "测试连接到 GitHub..."
if git ls-remote github &>/dev/null; then
    echo "✓ GitHub 连接成功"
else
    echo "⚠️  无法连接到 GitHub，可能需要认证"
    echo ""
    echo "后续推送时会提示输入用户名和密码（或 Personal Access Token）"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "配置完成！现在你可以："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "【日常开发】推送到 Gitee（快速）"
echo "  git push origin master"
echo ""
echo "【发布版本】推送到 GitHub 并触发构建"
echo "  git push github master      # 推送代码"
echo "  git tag v1.0.0               # 打标签"
echo "  git push github --tags      # 推送标签（触发构建）"
echo ""
echo "【同时推送】推送到两个仓库"
echo "  git push origin master && git push github master"
echo ""
echo "【查看标签】"
echo "  git tag"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 详细文档：.github/DUAL_REPO_SETUP.md"
echo ""
