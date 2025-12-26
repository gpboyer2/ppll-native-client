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
# 日志文件：
#   - go.log           # Go/Wails 后端日志
#   - nodejs-server.log # Node.js 服务日志
#   - web.log          # Vite 前端开发服务器日志
#
# 注意事项：
#   - 确保已启动 Clash 代理（端口 7890），用于访问海外 API
#   - 首次运行会自动安装前端依赖
#   - 按 Ctrl+C 停止服务
#
#===============================================================================

set -e

export PATH="$PATH:$HOME/go/bin"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
ENV_CHECK_FILE="${PROJECT_ROOT}/.env_checked"

# 日志目录配置（格式：yyyyMMddHH0000，分秒固定为0000）
LOG_TIMESTAMP=$(date +%Y%m%d%H)0000
LOG_DIR="${PROJECT_ROOT}/process-monitoring/${LOG_TIMESTAMP}"
export PPLL_LOG_DIR="${LOG_DIR}"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}ℹ $1${NC}"; }
ok() { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err() { echo -e "${RED}✗ $1${NC}"; }

# 环境检查
check_env() {
    local missing=0
    for cmd in go node npm wails; do
        command -v $cmd &>/dev/null || { err "$cmd 未安装"; missing=1; }
    done
    [ $missing -eq 1 ] && exit 1
    ok "环境检查通过"
}

# 依赖检查
check_deps() {
    [ ! -d "${FRONTEND_DIR}/node_modules" ] && {
        warn "安装前端依赖..."
        cd "${FRONTEND_DIR}" && npm install
    }
}

# 清理函数
cleanup() {
    echo ""
    warn "正在停止服务..."
    ok "服务已停止"
    log "日志目录: ${LOG_DIR}"
    exit 0
}

# 设置进程组，便于信号传递
trap cleanup SIGINT SIGTERM

# 显示帮助
show_help() {
    echo "用法: $0 [-q|--quick] [-h|--help]"
    echo "  -q  快速启动（跳过环境检查）"
    echo "  -h  显示帮助"
}

main() {
    local quick=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            -q|--quick) quick=true; shift ;;
            -h|--help) show_help; exit 0 ;;
            *) shift ;;
        esac
    done

    echo ""
    echo "=========================================="
    echo "  PPLL Native Client 启动"
    echo "=========================================="
    echo ""

    # 环境检查
    if [ "$quick" = false ]; then
        [ ! -f "${ENV_CHECK_FILE}" ] && { check_env; echo "${LOG_TIMESTAMP}" > "${ENV_CHECK_FILE}"; }
    fi
    check_deps

    # 初始化日志目录和文件
    mkdir -p "${LOG_DIR}"
    touch "${LOG_DIR}/go.log" "${LOG_DIR}/nodejs-server.log" "${LOG_DIR}/web.log"
    log "日志目录: ${LOG_DIR}"
    log "  ├─ go.log            (Go/Wails)"
    log "  ├─ nodejs-server.log (Node.js)"
    log "  └─ web.log           (Vite)"
    echo ""

    # 启动 Wails（前端日志通过 tee 写入 web.log）
    cd "${PROJECT_ROOT}"
    # 使用 bash -c 设置进程组，确保信号正确传递
    bash -c "trap 'exit 0' SIGINT SIGTERM; wails dev 2>&1 | tee -a '${LOG_DIR}/web.log'"
}

main "$@"
