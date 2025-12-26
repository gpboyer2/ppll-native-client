#!/bin/bash

# 双仓库推送脚本
# 用法：./push-dual-repo.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           双仓库推送工具（Gitee + GitHub）                    ║"
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

# 检查远程仓库配置
check_remotes() {
    local has_origin=0
    local has_github=0

    if git remote get-url origin >/dev/null 2>&1; then
        has_origin=1
        ORIGIN_URL=$(git remote get-url origin)
    fi

    if git remote get-url github >/dev/null 2>&1; then
        has_github=1
        GITHUB_URL=$(git remote get-url github)
    fi

    echo $has_origin $has_github
}

# 检查网络连接
check_connection() {
    local remote_name=$1
    local remote_url=$2

    # 提取主机名
    if [[ $remote_url =~ @([^:]+) ]]; then
        host=${BASH_REMATCH[1]}
    elif [[ $remote_url =~ https?://([^/]+) ]]; then
        host=${BASH_REMATCH[1]}
    else
        echo "unknown"
        return
    fi

    # 简单的连接测试（超时3秒）
    if timeout 3 bash -c "echo >/dev/tcp/$host/443" 2>/dev/null; then
        echo "ok"
    else
        echo "failed"
    fi
}

# 检查 Git 代理配置
check_proxy() {
    HTTP_PROXY=$(git config --get http.proxy)
    HTTPS_PROXY=$(git config --get https.proxy)
    GITHUB_PROXY=$(git config --get http.https://github.com.proxy)

    if [[ -n "$HTTP_PROXY" || -n "$HTTPS_PROXY" || -n "$GITHUB_PROXY" ]]; then
        return 0
    fi
    return 1
}

# 配置代理
setup_proxy() {
    echo ""
    echo "─────────────────────────────────────────"
    echo "           代理配置"
    echo "─────────────────────────────────────────"
    echo ""
    echo "请选择代理方式："
    echo "  1) Clash (127.0.0.1:7890)"
    echo "  2) 自定义代理地址"
    echo "  3) 仅对 GitHub 使用代理（推荐）"
    echo "  4) 跳过代理配置"
    echo ""
    read -p "请选择 [1-4]: " proxy_choice

    case $proxy_choice in
        1)
            git config --global http.proxy http://127.0.0.1:7890
            git config --global https.proxy https://127.0.0.1:7890
            print_success "已配置全局代理：127.0.0.1:7890"
            ;;
        2)
            read -p "请输入代理地址（格式：http://host:port）: " custom_proxy
            git config --global http.proxy "$custom_proxy"
            git config --global https.proxy "$custom_proxy"
            print_success "已配置全局代理：$custom_proxy"
            ;;
        3)
            read -p "请输入代理端口（默认 7890）: " proxy_port
            proxy_port=${proxy_port:-7890}
            git config --global http.https://github.com.proxy http://127.0.0.1:$proxy_port
            print_success "已配置 GitHub 代理：127.0.0.1:$proxy_port"
            ;;
        4)
            print_info "跳过代理配置"
            ;;
        *)
            print_error "无效选择，跳过代理配置"
            ;;
    esac
    echo ""
}

# 检查是否有未提交的更改
check_uncommitted_changes() {
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        return 1
    fi
    return 0
}

# 推送到指定远程
push_to_remote() {
    local remote=$1
    local branch=$2
    local remote_name=$3

    print_step "正在推送到 $remote_name ..."

    local output
    if output=$(git push $remote $branch 2>&1); then
        print_success "$remote_name 推送成功"
        return 0
    else
        print_error "$remote_name 推送失败"
        echo "$output"
        return 1
    fi
}

# 主函数
main() {
    print_header

    # 检查 Git 仓库
    check_git_repo

    # 获取当前分支
    CURRENT_BRANCH=$(get_current_branch)
    print_info "当前分支：$CURRENT_BRANCH"

    # 检查远程仓库
    read has_origin has_github < <(check_remotes)

    if [[ $has_origin -eq 0 && $has_github -eq 0 ]]; then
        print_error "未配置任何远程仓库"
        echo ""
        echo "请先运行 ./setup-dual-repo.sh 配置远程仓库"
        exit 1
    fi

    # 显示当前远程仓库配置
    echo ""
    echo "─────────────────────────────────────────"
    echo "           远程仓库配置"
    echo "─────────────────────────────────────────"
    if [[ $has_origin -eq 1 ]]; then
        print_success "Gitee (origin): $ORIGIN_URL"
    fi
    if [[ $has_github -eq 1 ]]; then
        print_success "GitHub (github): $GITHUB_URL"
    fi
    echo ""

    # 检查未提交的更改
    if ! check_uncommitted_changes; then
        print_warning "检测到未提交的更改"
        echo ""
        git status --short
        echo ""
        read -p "是否继续推送？(y/N): " continue_anyway
        if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
            print_info "已取消"
            exit 0
        fi
    fi

    # 检查代理配置
    echo "─────────────────────────────────────────"
    if check_proxy; then
        print_success "已检测到代理配置"
        if [[ -n "$HTTP_PROXY" ]]; then
            echo "  全局 HTTP 代理：$HTTP_PROXY"
        fi
        if [[ -n "$GITHUB_PROXY" ]]; then
            echo "  GitHub 代理：$GITHUB_PROXY"
        fi
    else
        print_warning "未检测到代理配置"
        if [[ $has_github -eq 1 ]]; then
            read -p "是否配置代理以连接 GitHub？(y/N): " need_proxy
            if [[ $need_proxy == "y" || $need_proxy == "Y" ]]; then
                setup_proxy
            fi
        fi
    fi
    echo ""

    # 选择推送目标
    echo "─────────────────────────────────────────"
    echo "           选择推送目标"
    echo "─────────────────────────────────────────"
    echo ""
    local options=()
    if [[ $has_origin -eq 1 ]]; then
        options+=("仅推送到 Gitee")
    fi
    if [[ $has_github -eq 1 ]]; then
        options+=("仅推送到 GitHub")
    fi
    if [[ $has_origin -eq 1 && $has_github -eq 1 ]]; then
        options+=("同时推送到 Gitee 和 GitHub")
    fi
    options+=("取消")

    local option_count=0
    for opt in "${options[@]}"; do
        ((option_count++))
        echo "  $option_count) $opt"
    done
    echo ""

    read -p "请选择 [1-$option_count]: " push_choice

    local push_origin=0
    local push_github=0

    # 根据实际存在的仓库和用户选择来确定推送目标
    if [[ $has_origin -eq 1 && $has_github -eq 1 ]]; then
        # 两个仓库都存在
        case $push_choice in
            1) push_origin=1 ;;
            2) push_github=1 ;;
            3) push_origin=1; push_github=1 ;;
            *) print_info "已取消"; exit 0 ;;
        esac
    elif [[ $has_origin -eq 1 ]]; then
        # 只有 Gitee
        case $push_choice in
            1) push_origin=1 ;;
            *) print_info "已取消"; exit 0 ;;
        esac
    else
        # 只有 GitHub
        case $push_choice in
            1) push_github=1 ;;
            *) print_info "已取消"; exit 0 ;;
        esac
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           开始推送"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local origin_success=0
    local github_success=0

    # 推送到 Gitee
    if [[ $push_origin -eq 1 ]]; then
        if push_to_remote "origin" "$CURRENT_BRANCH" "Gitee"; then
            origin_success=1
        else
            echo ""
            read -p "Gitee 推送失败，是否继续推送到 GitHub？(y/N): " continue_github
            if [[ $continue_github != "y" && $continue_github != "Y" ]]; then
                exit 1
            fi
        fi
        echo ""
    fi

    # 推送到 GitHub
    if [[ $push_github -eq 1 ]]; then
        if push_to_remote "github" "$CURRENT_BRANCH" "GitHub"; then
            github_success=1
        fi
        echo ""
    fi

    # 显示结果
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           推送结果"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [[ $push_origin -eq 1 ]]; then
        if [[ $origin_success -eq 1 ]]; then
            print_success "Gitee 推送成功"
        else
            print_error "Gitee 推送失败"
        fi
    fi

    if [[ $push_github -eq 1 ]]; then
        if [[ $github_success -eq 1 ]]; then
            print_success "GitHub 推送成功"
        else
            print_error "GitHub 推送失败"
        fi
    fi

    echo ""

    # 全部成功
    if [[ ($push_origin -eq 0 || $origin_success -eq 1) && ($push_github -eq 0 || $github_success -eq 1) ]]; then
        print_success "所有推送操作已完成"
        echo ""
        exit 0
    else
        print_error "部分推送失败，请检查网络或代理配置"
        echo ""
        exit 1
    fi
}

# 运行主函数
main
