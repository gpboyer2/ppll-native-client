#!/bin/bash

# CSSC Node-View macOS 一键启动脚本
# 同时启动前端和后端服务

set -e

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 端口配置
CLIENT_PORT=9300
SERVER_PORT=9200
WS_PORT=9210

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

# 检查 pnpm 是否安装
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm 未安装，请先安装 pnpm"
        echo "安装命令: npm install -g pnpm"
        exit 1
    fi
    print_success "pnpm 已安装"
}

# 释放端口
kill_port() {
    local port=$1
    local pids=$(lsof -ti:${port} 2>/dev/null)
    if [ -n "$pids" ]; then
        print_warning "端口 ${port} 被占用，正在释放..."
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "端口 ${port} 已释放"
    fi
}

# 检查依赖是否安装
check_dependencies() {
    local dir=$1
    local name=$2
    if [ ! -d "${dir}/node_modules" ]; then
        print_warning "${name} 依赖未安装，正在安装..."
        cd "${dir}"
        pnpm install
        cd ..
        print_success "${name} 依赖安装完成"
    else
        print_success "${name} 依赖已就绪"
    fi
}

# 启动服务端
start_server() {
    print_info "启动服务端..."
    cd ./server
    pnpm start &
    SERVER_PID=$!
    cd ..
    print_success "服务端已启动 (PID: ${SERVER_PID})"
}

# 启动客户端
start_client() {
    print_info "启动客户端..."
    cd ./client
    pnpm dev &
    CLIENT_PID=$!
    cd ..
    print_success "客户端已启动 (PID: ${CLIENT_PID})"
}

# 清理函数
cleanup() {
    echo ""
    print_warning "正在停止服务..."
    
    # 终止子进程
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ -n "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi
    
    # 释放端口
    kill_port $CLIENT_PORT
    kill_port $SERVER_PORT
    kill_port $WS_PORT
    
    print_success "服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "  CSSC Node-View 启动脚本 (macOS)"
    echo "=========================================="
    echo ""
    
    # 检查 pnpm
    check_pnpm
    
    # 释放可能被占用的端口
    kill_port $CLIENT_PORT
    kill_port $SERVER_PORT
    kill_port $WS_PORT
    
    # 检查并安装依赖
    check_dependencies "./client" "客户端"
    check_dependencies "./server" "服务端"
    
    echo ""
    echo "=========================================="
    print_info "启动服务..."
    echo "=========================================="
    echo ""
    
    # 启动服务
    start_server
    sleep 2
    start_client
    
    echo ""
    echo "=========================================="
    print_success "所有服务已启动"
    echo "=========================================="
    echo ""
    echo "  前端地址: http://localhost:${CLIENT_PORT}"
    echo "  后端地址: http://localhost:${SERVER_PORT}"
    echo "  WebSocket: ws://localhost:${WS_PORT}"
    echo "  API文档:  http://localhost:${SERVER_PORT}/api-docs"
    echo ""
    echo "  按 Ctrl+C 停止所有服务"
    echo "=========================================="
    echo ""
    
    # 等待子进程
    wait
}

main "$@"
