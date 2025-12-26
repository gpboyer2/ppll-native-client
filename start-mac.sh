#!/bin/bash

#===============================================================================
# PPLL Native Client macOS 一键启动脚本
#===============================================================================
#
# 用途：启动 Wails 桌面应用开发环境
#
# 使用方法：
#   ./start-mac.sh          # 完整启动（首次使用推荐，执行环境检查）
#   ./start-mac.sh -q       # 快速启动（跳过环境检查）
#   ./start-mac.sh --help   # 显示帮助信息
#
# 依赖要求：
#   - Go 1.20+              # 下载地址: https://go.dev/dl/
#   - Node.js 16+          # 下载地址: https://nodejs.org/
#   - Wails v2             # 安装命令: go install github.com/wailsapp/wails/v2/cmd/wails@latest
#
# 注意事项：
#   - 确保已启动 Clash 代理（端口 7890），用于访问海外 API
#   - 首次运行会自动安装前端依赖
#   - 按 Ctrl+C 停止服务
#
#===============================================================================

set -e

# 添加 Go bin 目录到 PATH（Wails 安装在这里）
export PATH="$PATH:$HOME/go/bin"

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
ENV_CHECK_FILE="${PROJECT_ROOT}/.env_checked"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查 Wails 是否安装
check_wails() {
    if ! command -v wails &> /dev/null; then
        print_error "Wails 未安装，请先安装 Wails"
        echo "安装命令: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
        exit 1
    fi
    print_success "Wails 已安装"
}

# 检查 Go 是否安装
check_go() {
    if ! command -v go &> /dev/null; then
        print_error "Go 未安装，请先安装 Go"
        echo "下载地址: https://go.dev/dl/"
        exit 1
    fi
    print_success "Go 已安装"
}

# 检查 Node.js 是否安装
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi
    print_success "Node.js 已安装"
}

# 检查 npm 是否安装
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    print_success "npm 已安装"
}

# 检查前端依赖是否安装
check_dependencies() {
    if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
        print_warning "前端依赖未安装，正在安装..."
        cd "${FRONTEND_DIR}"
        npm install
        print_success "前端依赖安装完成"
    fi
}

# 完整环境检查（首次运行）
full_env_check() {
    print_info "首次运行，检查开发环境..."
    check_go
    check_node
    check_npm
    check_wails
    check_dependencies
    # 标记环境已检查（使用时间戳：年月日时分秒）
    echo "$(date +%Y%m%d%H%M%S)" > "${ENV_CHECK_FILE}"
    print_success "环境检查完成，后续启动将跳过检查"
    echo ""
}

# 快速检查（仅检查 node_modules）
quick_check() {
    if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
        print_warning "前端依赖缺失，正在安装..."
        cd "${FRONTEND_DIR}"
        npm install
    fi
}

# 清理函数
cleanup() {
    echo ""
    print_warning "正在停止服务..."
    print_success "服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -q, --quick   快速启动（跳过环境检查）"
    echo "  -h, --help    显示帮助信息"
    echo ""
    echo "默认行为: 执行完整环境检查"
}

# 主流程
main() {
    # 解析参数
    QUICK_START=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            -q|--quick)
                QUICK_START=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done

    echo ""
    echo "=========================================="
    echo "  PPLL Native Client 启动"
    echo "=========================================="
    echo ""

    # 判断启动模式
    if [ "$QUICK_START" = true ]; then
        print_info "快速启动模式"
        quick_check
    else
        full_env_check
    fi

    print_info "启动 Wails 开发服务器..."
    echo ""

    # 启动 Wails 开发模式
    cd "${PROJECT_ROOT}"
    wails dev
}

main "$@"
