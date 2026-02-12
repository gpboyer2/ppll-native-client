#!/bin/bash

# GitHub Release 自动构建脚本
# 通过创建版本标签触发 GitHub Actions 多平台构建
#
# 用法：./scripts/github-release-build.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

# 绘制边框
print_header() {
    clear
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           GitHub Release 自动构建工具                         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查是否在 Git 仓库中
check_git_repo() {
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_error "当前目录不是 Git 仓库"
        exit 1
    fi
}

# 获取当前分支
get_current_branch() {
    git branch --show-current
}

# 检查 github 远程仓库
check_github_remote() {
    if git remote get-url github >/dev/null 2>&1; then
        GITHUB_URL=$(git remote get-url github)
        return 0
    fi

    if git remote get-url origin >/dev/null 2>&1; then
        local origin_url=$(git remote get-url origin)
        if [[ $origin_url =~ github\.com ]]; then
            GITHUB_URL="$origin_url"
            return 0
        fi
    fi

    return 1
}

# 检查是否有未提交的更改
check_uncommitted_changes() {
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        return 1
    fi
    return 0
}

# 获取当前版本号
get_current_version() {
    if [ -f "package.json" ]; then
        grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
    elif [ -f "wails.json" ]; then
        grep '"productVersion"' wails.json | sed 's/.*"productVersion": "\(.*\)".*/\1/'
    else
        echo "0.0.0"
    fi
}

# 更新版本号文件
update_version_files() {
    local version=$1
    local updated=false

    # 更新 package.json
    if [ -f "package.json" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's/"version": "[^"]*"/"version": "'"$version"'"/' package.json
        else
            sed -i 's/"version": "[^"]*"/"version": "'"$version"'"/' package.json
        fi
        print_success "package.json 已更新"
        updated=true
    fi

    # 更新 wails.json
    if [ -f "wails.json" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's/"productVersion": "[^"]*"/"productVersion": "'"$version"'"/' wails.json
        else
            sed -i 's/"productVersion": "[^"]*"/"productVersion": "'"$version"'"/' wails.json
        fi
        print_success "wails.json 已更新"
        updated=true
    fi

    return 0
}

# 获取已有的版本标签
get_existing_tags() {
    git tag -l "v*" | sort -V
}

# 检查标签是否已存在
tag_exists() {
    local tag=$1
    git rev-parse "$tag" >/dev/null 2>&1
}

# 推送标签到 GitHub
push_tag_to_github() {
    local tag=$1

    print_step "正在推送提交和标签到 GitHub..."

    local output
    # 先推送当前分支的 commit（包含版本号更新）
    if output=$(git push github $(get_current_branch) 2>&1); then
        print_success "提交已推送到 GitHub"
    else
        print_error "推送提交失败"
        echo "$output"
        return 1
    fi

    # 再推送标签
    if output=$(git push github "$tag" 2>&1); then
        print_success "标签 $tag 已推送到 GitHub"
        print_info "GitHub Actions 正在构建，请稍候..."
        return 0
    else
        print_error "推送标签失败"
        echo "$output"
        return 1
    fi
}

# 显示构建进度提示
show_build_progress_hint() {
    local tag=$1

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           构建进度监控"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "GitHub Actions 正在后台构建多平台版本..."
    echo ""
    echo "📊 查看构建进度："
    echo "   https://github.com/gpboyer2/ppll-native-client/actions"
    echo ""
    echo "📦 构建完成后，下载地址："
    echo "   https://github.com/gpboyer2/ppll-native-client/releases"
    echo ""
    echo "预计构建时间：10-20 分钟"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "构建产物包括："
    echo "  • macOS Intel (x64)              .dmg"
    echo "  • macOS Apple Silicon (arm64)     .dmg"
    echo "  • macOS Universal                 .dmg"
    echo "  • Windows x64                     .exe (NSIS 安装程序)"
    echo "  • Windows ARM64                   .exe (NSIS 安装程序)"
    echo ""
}

# 主函数
main() {
    print_header

    # 检查 Git 仓库
    check_git_repo

    # 获取当前分支
    CURRENT_BRANCH=$(get_current_branch)
    print_info "当前分支：$CURRENT_BRANCH"

    # 检查 GitHub 远程仓库
    echo "─────────────────────────────────────────"
    echo "           检查远程仓库"
    echo "─────────────────────────────────────────"

    if ! check_github_remote; then
        print_error "未找到 GitHub 远程仓库"
        echo ""
        echo "请先配置 GitHub 远程仓库："
        echo "  git remote add github https://github.com/用户名/仓库名.git"
        echo ""
        echo "或运行：./setup-dual-repo.sh"
        exit 1
    fi

    print_success "GitHub 远程仓库：$GITHUB_URL"
    echo ""

    # 检查未提交的更改
    echo "─────────────────────────────────────────"
    echo "           检查工作区状态"
    echo "─────────────────────────────────────────"

    if ! check_uncommitted_changes; then
        print_warning "检测到未提交的更改"
        echo ""
        git status --short
        echo ""
        read -p "是否继续发布？(Y/n): " continue_anyway
        if [[ $continue_anyway == "n" || $continue_anyway == "N" ]]; then
            print_info "已取消"
            exit 0
        fi
    else
        print_success "工作区干净"
    fi
    echo ""

    # 获取当前版本
    CURRENT_VERSION=$(get_current_version)
    print_info "当前版本号：$CURRENT_VERSION"
    echo ""

    # 显示已有版本标签
    echo "─────────────────────────────────────────"
    echo "           已有版本标签"
    echo "─────────────────────────────────────────"
    echo ""

    existing_tags=$(get_existing_tags)
    if [[ -n "$existing_tags" ]]; then
        echo "$existing_tags"
        echo ""
    else
        print_info "暂无版本标签"
        echo ""
    fi

    # 输入新版本号
    echo "─────────────────────────────────────────"
    echo "           版本升级"
    echo "─────────────────────────────────────────"
    echo ""
    print_info "当前版本号：${MAGENTA}$CURRENT_VERSION${NC}"
    echo ""

    # 解析当前版本号
    if [[ $CURRENT_VERSION =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        current_major=${BASH_REMATCH[1]}
        current_minor=${BASH_REMATCH[2]}
        current_patch=${BASH_REMATCH[3]}

        # 自动计算的 patch 版本
        auto_patch="v${current_major}.${current_minor}.$((current_patch + 1))"

        echo -e "推荐版本：${CYAN}${auto_patch}${NC} (自动 +1)"
        echo ""

        # 询问是否升级大版本
        read -p "是否升级大版本号？(y/N，默认 n): " upgrade_major
        upgrade_major=${upgrade_major:-n}

        if [[ $upgrade_major == "y" || $upgrade_major == "Y" ]]; then
            echo ""
            read -p "请输入新的主版本号 (当前 $current_major): " new_major
            new_major=${new_major:-$((current_major + 1))}

            if [[ ! $new_major =~ ^[0-9]+$ ]]; then
                print_error "主版本号必须是数字"
                exit 1
            fi

            NEW_VERSION="v${new_major}.0.0"
            print_info "将升级到重大版本：${MAGENTA}$NEW_VERSION${NC}"
        else
            NEW_VERSION="$auto_patch"
            print_info "将使用小版本自增：${MAGENTA}$NEW_VERSION${NC}"
        fi
    else
        print_warning "当前版本号格式不符合语义化版本规范"
        echo ""
        read -p "请输入新版本号 (如 v1.0.0): " NEW_VERSION
        if [[ ! $NEW_VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            print_error "版本号格式不正确，应为 v1.0.0 格式"
            exit 1
        fi
    fi

    echo ""

    # 检查标签是否已存在
    if tag_exists "$NEW_VERSION"; then
        print_error "标签 $NEW_VERSION 已存在"
        echo ""
        read -p "是否删除旧标签并重新创建？(y/N): " recreate_tag
        if [[ $recreate_tag == "y" || $recreate_tag == "Y" ]]; then
            git tag -d "$NEW_VERSION" 2>/dev/null || true
            git push github ":refs/tags/$NEW_VERSION" 2>/dev/null || true
            print_success "已删除旧标签"
        else
            print_info "已取消"
            exit 0
        fi
    fi

    # 输入发布说明
    echo "─────────────────────────────────────────"
    echo "           发布说明"
    echo "─────────────────────────────────────────"
    echo ""
    echo "请输入本次发布的主要内容（留空则使用默认说明）："
    echo ""
    read -p "发布说明 [默认: Release $NEW_VERSION - 自动构建多平台版本]: " release_notes
    release_notes=${release_notes:-"Release $NEW_VERSION - 自动构建多平台版本"}

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           确认发布信息"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "版本号：     $NEW_VERSION"
    echo "当前分支：   $CURRENT_BRANCH"
    echo "远程仓库：   $GITHUB_URL"
    echo "发布说明：   $release_notes"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    read -p "确认创建并推送？(Y/n): " confirm
    if [[ $confirm == "n" || $confirm == "N" ]]; then
        print_info "已取消"
        exit 0
    fi

    # 提取纯版本号（去掉 v 前缀）
    VERSION_NUMBER=${NEW_VERSION#v}

    # 更新版本文件
    echo ""
    print_step "正在更新版本号到 $VERSION_NUMBER..."

    update_version_files "$VERSION_NUMBER"

    # 提交版本号更新
    print_step "正在提交版本号更新..."
    if [ -f "package.json" ]; then
        git add package.json
    fi
    if [ -f "wails.json" ]; then
        git add wails.json
    fi
    git commit -m "chore: bump version to $VERSION_NUMBER"
    print_success "版本号更新已提交"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           开始发布流程"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 创建标签（先确保本地不存在同名标签）
    print_step "正在创建标签 $NEW_VERSION..."
    git tag -d "$NEW_VERSION" 2>/dev/null || true
    git tag -a "$NEW_VERSION" -m "$release_notes"
    print_success "标签 $NEW_VERSION 已创建"

    # 推送标签
    echo ""
    if push_tag_to_github "$NEW_VERSION"; then
        echo ""

        # 显示构建进度提示
        show_build_progress_hint "$NEW_VERSION"

        print_success "发布流程完成！"
        echo ""
        print_info "后续步骤："
        echo "  1. 等待 10-20 分钟让 GitHub Actions 完成构建"
        echo "  2. 访问 Releases 页面下载构建产物"
        echo "  3. 测试各个平台的安装包"
        echo ""
        exit 0
    else
        echo ""
        print_error "发布失败，请检查网络或代理配置"
        echo ""
        exit 1
    fi
}

# 运行主函数
main
