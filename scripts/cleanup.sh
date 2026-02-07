#!/bin/bash

# 项目清理脚本
# 用法: ./cleanup.sh [选项]
#   --safe    安全清理（日志、构建产物、缓存等）
#   --full    完整清理（包含 node_modules）
#   --docker  Docker 清理
#   无参数    交互式选择

set -e

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
GRAY='\033[0;90m'
NC='\033[0m'

# 统计释放的空间
TOTAL_FREED=0

# 分隔线
separator() {
    echo -e "${GRAY}────────────────────────────────────${NC}"
}

# 标题
title() {
    echo ""
    echo -e "${GREEN}$1${NC}"
    separator
}

# 执行清理并显示结果
clean_item() {
    local item="$1"
    local path="$2"
    local action="$3"  # delete (删除文件) 或 clear (清空目录)

    if [ ! -e "$path" ]; then
        echo -e "  ${GRAY}⊘${NC} $item ${GRAY}(0B)${NC}"
        return
    fi

    local size
    if [ -d "$path" ]; then
        size=$(du -sh "$path" 2>/dev/null | cut -f1 | tr -d ' ')
    else
        size=$(du -h "$path" 2>/dev/null | cut -f1 | tr -d ' ')
    fi

    if [ "$action" = "delete" ]; then
        rm -rf "$path" 2>/dev/null
        if [ $? -eq 0 ] && [ ! -e "$path" ]; then
            echo -e "  ${GREEN}✓${NC} $item ${GRAY}($size)${NC}"
            TOTAL_FREED=$((TOTAL_FREED + 1))
        else
            echo -e "  ${YELLOW}⊗${NC} $item ${GRAY}（失败）${NC}"
        fi
    elif [ "$action" = "clear" ]; then
        rm -rf "${path:?}"/* 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓${NC} $item ${GRAY}($size)${NC}"
            TOTAL_FREED=$((TOTAL_FREED + 1))
        else
            echo -e "  ${YELLOW}⊗${NC} $item ${GRAY}（失败）${NC}"
        fi
    fi
}

# 清理指定路径的文件
clean_files() {
    local item="$1"
    local pattern="$2"
    local base_dir="${3:-.}"
    local extra_args="${4:-}"
    local count

    count=$(eval "find \"$base_dir\" $extra_args -name \"$pattern\" 2>/dev/null" | wc -l | tr -d ' ')

    if [ "$count" -eq 0 ]; then
        echo -e "  ${GRAY}⊘${NC} $item ${GRAY}(0B)${NC}"
        return
    fi

    eval "find \"$base_dir\" $extra_args -name \"$pattern\" -delete 2>/dev/null"
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $item ${GRAY}($count 个)${NC}"
        TOTAL_FREED=$((TOTAL_FREED + 1))
    else
        echo -e "  ${YELLOW}⊗${NC} $item ${GRAY}（失败）${NC}"
    fi
}

# 清理日志
clear_logs() {
    title "清理日志文件"

    clean_item "server/logs" "server/logs" "clear"
    clean_item "console.log" "console.log" "delete"
    clean_files "测试报告日志 (*.log)" "*.log" "server/test/reports" ""
    clean_files "根目录日志 (*.log)" "*.log" "." "-maxdepth 1"
}

# 清理构建产物
clear_dist() {
    title "清理构建产物"

    clean_item "client/dist" "client/dist" "delete"
    clean_item "根目录 dist" "dist" "delete"
}

# 清理系统文件
clear_system_files() {
    title "清理系统文件"

    clean_files ".DS_Store 文件" ".DS_Store"

    if [ -d "server/node_modules/.cache" ]; then
        clean_item "node_modules/.cache" "server/node_modules/.cache" "delete"
    else
        echo -e "  ${GRAY}⊘${NC} node_modules/.cache ${GRAY}(0B)${NC}"
    fi
}

# 清理 Docker 报告
clear_docker_reports() {
    title "清理 Docker 报告"

    clean_item "release-build/docker/reports" "release-build/docker/reports" "clear"
}

# 清理 npm 缓存
clear_npm_cache() {
    title "清理包管理器缓存"

    # npm 缓存
    local npm_size
    npm_size=$(du -sh ~/.npm 2>/dev/null | cut -f1 | tr -d ' ' || echo "0B")
    npm cache clean --force >/dev/null 2>&1
    echo -e "  ${GREEN}✓${NC} npm 缓存 ${GRAY}($npm_size)${NC}"

    # pnpm store
    if [ -d ~/.pnpm-store ]; then
        local pnpm_size
        pnpm_size=$(du -sh ~/.pnpm-store 2>/dev/null | cut -f1 | tr -d ' ')
        pnpm store prune >/dev/null 2>&1
        echo -e "  ${GREEN}✓${NC} pnpm store ${GRAY}($pnpm_size)${NC}"
    else
        echo -e "  ${GRAY}⊘${NC} pnpm store ${GRAY}(0B)${NC}"
    fi

    # node-gyp
    if [ -d ~/Library/Caches/node-gyp ]; then
        local gyp_size
        gyp_size=$(du -sh ~/Library/Caches/node-gyp 2>/dev/null | cut -f1 | tr -d ' ')
        rm -rf ~/Library/Caches/node-gyp/* 2>/dev/null
        echo -e "  ${GREEN}✓${NC} node-gyp 缓存 ${GRAY}($gyp_size)${NC}"
    fi

    TOTAL_FREED=$((TOTAL_FREED + 1))
}

# 清理 node_modules
clear_node_modules() {
    title "清理 node_modules"

    clean_item "client/node_modules" "client/node_modules" "delete"
    clean_item "server/node_modules" "server/node_modules" "delete"
}

# 清理 Docker
clear_docker() {
    title "清理 Docker 资源"

    if ! docker info &>/dev/null; then
        echo -e "  ${GRAY}⊘${NC} Docker 未运行 (0B)${NC}"
        return
    fi

    # 获取所有容器
    local containers
    containers=$(docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null)

    if [ -z "$containers" ]; then
        echo -e "  ${GRAY}⊘${NC} 容器 (0B)${NC}"
    else
        echo ""
        echo "  当前容器:"
        local idx=1
        local id_list=""
        while IFS=$'\t' read -r id name status image; do
            echo "    [$idx] $id  $name  $status  $image"
            id_list="$id_list $id"
            idx=$((idx + 1))
        done <<< "$containers"
        echo ""
        read -p "  删除容器 [直接回车=全部, 输入序号=选择]: " input

        local ids_to_remove=""
        if [ -z "$input" ]; then
            ids_to_remove=$id_list
        else
            for num in $input; do
                local id=$(echo "$id_list" | awk -v n=$num '{print $n}')
                if [ -n "$id" ]; then
                    ids_to_remove="$ids_to_remove $id"
                fi
            done
        fi

        if [ -n "$ids_to_remove" ]; then
            local count=$(echo "$ids_to_remove" | wc -w | tr -d ' ')
            docker rm -f $ids_to_remove >/dev/null 2>&1
            echo -e "  ${GREEN}✓${NC} 容器 ($count 个)"
        fi
    fi

    # 删除所有镜像
    local all_images
    all_images=$(docker images -q 2>/dev/null)
    if [ -n "$all_images" ]; then
        local count=$(echo "$all_images" | wc -w | tr -d ' ')
        docker rmi -f $all_images >/dev/null 2>&1 || true
        echo -e "  ${GREEN}✓${NC} 镜像 ($count 个)"
    fi

    # 删除未使用的卷
    docker volume prune -f >/dev/null 2>&1
    echo -e "  ${GREEN}✓${NC} 未使用的卷"

    # 删除构建缓存
    docker builder prune -af >/dev/null 2>&1
    echo -e "  ${GREEN}✓${NC} 构建缓存"

    TOTAL_FREED=$((TOTAL_FREED + 1))
}

# 显示清理完成
show_summary() {
    echo ""
    separator
    echo -e "${GREEN}清理完成${NC}"
    separator
    echo ""
}

# 交互式菜单
interactive_menu() {
    echo ""
    separator
    echo -e "  ${GREEN}项目清理工具${NC}"
    separator
    echo ""
    echo "  1) 安全清理   日志、构建产物、缓存"
    echo "  2) 完整清理   包含 node_modules"
    echo "  3) Docker 清理"
    echo "  4) 全部清理"
    echo "  0) 退出"
    echo ""
    read -p "  选择 [1-4, 默认:1]: " choice
    choice=${choice:-1}

    case $choice in
        1)
            clear_logs
            clear_dist
            clear_system_files
            clear_docker_reports
            clear_npm_cache
            show_summary
            ;;
        2)
            clear_logs
            clear_dist
            clear_system_files
            clear_docker_reports
            clear_npm_cache
            clear_node_modules
            show_summary
            echo -e "${YELLOW}  请运行: pnpm install${NC}"
            echo ""
            ;;
        3)
            clear_docker
            show_summary
            ;;
        4)
            clear_logs
            clear_dist
            clear_system_files
            clear_docker_reports
            clear_npm_cache
            clear_node_modules
            clear_docker
            show_summary
            echo -e "${YELLOW}  请运行: pnpm install${NC}"
            echo ""
            ;;
        0)
            echo ""
            exit 0
            ;;
        *)
            echo -e "${YELLOW}  无效选项${NC}"
            exit 1
            ;;
    esac
}

# 主逻辑
case "$1" in
    --safe)
        clear_logs
        clear_dist
        clear_system_files
        clear_docker_reports
        clear_npm_cache
        show_summary
        ;;
    --full)
        clear_logs
        clear_dist
        clear_system_files
        clear_docker_reports
        clear_npm_cache
        clear_node_modules
        show_summary
        echo -e "${YELLOW}  请运行: pnpm install${NC}"
        echo ""
        ;;
    --docker)
        clear_docker
        show_summary
        ;;
    *)
        interactive_menu
        ;;
esac
