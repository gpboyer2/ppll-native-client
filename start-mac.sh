#!/bin/bash

# PPLL Native Client macOS 一键启动脚本
# Wails 桌面应用开发环境启动

set -e

# 添加 Go bin 目录到 PATH（Wails 安装在这里）
export PATH="$PATH:$HOME/go/bin"

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

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
    else
        print_success "前端依赖已就绪"
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

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "  PPLL Native Client 启动脚本 (macOS)"
    echo "=========================================="
    echo ""

    # 检查环境
    print_info "检查开发环境..."
    check_go
    check_node
    check_npm
    check_wails

    echo ""

    # 检查并安装依赖
    check_dependencies

    echo ""
    echo "=========================================="
    print_info "启动 Wails 开发服务器..."
    echo "=========================================="
    echo ""

    # 启动 Wails 开发模式
    cd "${PROJECT_ROOT}"
    wails dev
}

main "$@"
