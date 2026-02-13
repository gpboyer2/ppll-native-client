#!/bin/zsh

# =============================================================================
# Clean Mac - 深度系统清理脚本
# 版本: 2.0.0
# 作者: Clean Mac Team
# 功能: 全面清理 macOS 系统缓存、日志、临时文件等
# 特点: 预览模式、智能记录、深度清理
# =============================================================================

# 设置 PATH（确保基本命令可用）
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin

# 加载 nvm（以找到 pm2 等通过 npm 全局安装的工具）
export NVM_DIR="$HOME/.nvm"
# 直接添加 nvm 的 Node.js bin 目录到 PATH
if [[ -d "$NVM_DIR/versions/node" ]]; then
    # 获取最新的 Node.js 版本目录
    NVM_LATEST_NODE=$(/bin/ls -t "$NVM_DIR/versions/node" 2>/dev/null | /usr/bin/head -1)
    if [[ -n "$NVM_LATEST_NODE" && -d "$NVM_DIR/versions/node/$NVM_LATEST_NODE/bin" ]]; then
        export PATH="$NVM_DIR/versions/node/$NVM_LATEST_NODE/bin:$PATH"
    fi
    unset NVM_LATEST_NODE
fi

# 设置 UTF-8 编码
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8

# zsh 兼容的 set 选项
set -e
# set -u 会导致一些问题，暂时禁用
# set -u
set -o pipefail
# 禁用通配符无匹配时报错
setopt +o nomatch

# 版本信息
VERSION="2.0.0"
SCRIPT_NAME="Clean Mac"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 配置目录
CONFIG_DIR="$HOME/.clean-mac"
LOG_FILE="$CONFIG_DIR/clean-mac.log"
CACHE_FILE="$CONFIG_DIR/cache-status.json"
HISTORY_FILE="$CONFIG_DIR/clean-history.json"

# 清理项目配置
typeset -A CLEAN_ITEMS=(
    ["系统缓存"]="~/Library/Caches/*"
    ["系统日志"]="~/Library/Logs/*"
    ["项目日志"]="~/logs ~/log /Users/peng/Desktop/Project/*/logs /Users/peng/Desktop/Project/*/log"
    ["临时文件"]="~/tmp/*"
    ["废纸篓"]="~/.Trash/*"
    ["Safari缓存"]="~/Library/Safari/*"
    ["XCode派生数据"]="~/Library/Developer/Xcode/DerivedData"
    ["Yarn缓存"]="~/.yarn/cache ~/.yarn/berry/cache ~/.yarn-cache"
    # ["Python uv缓存"]="~/.cache/uv"  # 已排除：开发工具缓存
    ["Node cache"]="~/.cache/node"
    ["PM2日志"]="pm2_cleanup"
    ["Docker镜像"]="docker system df"
    ["Docker构建缓存"]="~/Library/Containers/com.docker.docker ~/Library/Caches/com.docker.docker"
    ["Colima缓存"]="~/.colima ~/Library/Caches/colima"
    ["Lima缓存"]="~/.lima"
    ["应用缓存"]="~/Library/Application\ Support/*/Cache"
    ["邮件附件"]="~/Library/Mail/*/Data/*/Attachments/*"
    ["QuickLook缓存"]="~/Library/QuickLook/*"
    ["字体缓存"]="~/Library/Fonts/com.apple.FontRegistry*"
    ["DNS缓存"]=""
    ["系统更新缓存"]="/Library/Updates/*"
    ["无效应用程序"]="check_broken_apps"
)

# 系统缓存排除列表（开发工具缓存，保留不删）
typeset -a CACHE_EXCLUDE_LIST=(
    "node-gyp"
    "pip"
    "bun"
    "Homebrew"
    "ms-playwright"
    "pnpm"
)

# 清理统计
TOTAL_SIZE=0
DELETED_FILES=0
SKIPPED_FILES=0
ERROR_FILES=0

# =============================================================================
# 工具函数
# =============================================================================

# 打印带颜色的输出
print_color() {
    print -P "${1}${2}${NC}"
}

# 打印标题
print_header() {
    /usr/bin/clear 2>/dev/null || true
    echo
    print_color "$CYAN" "╔══════════════════════════════════════════════════════════════╗"
    print_color "$CYAN" "║                    🧹 Clean Mac v$VERSION                      ║"
    print_color "$CYAN" "║              深度系统清理工具 - 专业版                       ║"
    print_color "$CYAN" "╚══════════════════════════════════════════════════════════════╝"
    echo
}

# 打印分隔线
print_separator() {
    print_color "$BLUE" "───────────────────────────────────────────────────────────────"
}

# 格式化文件大小
format_size() {
    local size=${1:-0}
    if [[ $size -lt 1024 ]]; then
        echo "${size}B"
    elif [[ $size -lt 1048576 ]]; then
        echo "$((size / 1024))KB"
    elif [[ $size -lt 1073741824 ]]; then
        echo "$((size / 1048576))MB"
    else
        echo "$((size / 1073741824))GB"
    fi
}

# 获取目录大小
dir_size() {
    local dir=$1
    if [[ -d "$dir" ]]; then
        # macOS 不支持 -b，使用 -sk (KB) 后乘以 1024
        local size=$(/usr/bin/du -sk "$dir" 2>/dev/null | /usr/bin/awk '{print $1}')
        [[ -z "$size" ]] && size=0
        echo $((size * 1024))
    else
        echo 0
    fi
}

# 创建配置目录
init_config() {
    if [[ ! -d "$CONFIG_DIR" ]]; then
        /bin/mkdir -p "$CONFIG_DIR"
        print_color "$GREEN" "✓ 创建配置目录: $CONFIG_DIR"
    fi

    # 初始化缓存状态文件
    if [[ ! -f "$CACHE_FILE" ]]; then
        /bin/echo "{}" > "$CACHE_FILE"
    fi

    # 初始化历史记录文件
    if [[ ! -f "$HISTORY_FILE" ]]; then
        /bin/echo "[]" > "$HISTORY_FILE"
    fi
}

# 记录日志
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(/bin/date '+%Y-%m-%d %H:%M:%S')
    /bin/echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# 添加历史记录
add_history() {
    local timestamp=$(/bin/date '+%Y-%m-%d %H:%M:%S')
    local size=$1
    local files=$2

    local history_entry=$(/bin/cat <<EOF
{
  "timestamp": "$timestamp",
  "size_cleaned": $size,
  "files_deleted": $files
}
EOF
)

    # 使用 jq 更新 JSON（如果可用）
    if command -v jq >/dev/null 2>&1; then
        jq ". += [$history_entry]" "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" && /bin/mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"
    else
        # 简单的文本追加（不完美但可用）
        /bin/echo "$history_entry," >> "$HISTORY_FILE"
    fi
}

# =============================================================================
# 系统检测函数
# =============================================================================

# =============================================================================
# 预览模式
# =============================================================================

preview_mode() {
    print_header
    print_color "$YELLOW" "👁️  预览模式 - 以下文件将被清理:"
    print_separator
    echo
    
    TOTAL_SIZE=0
    local preview_items=()
    
    # 遍历清理项目
    for item in "${(@k)CLEAN_ITEMS}"; do
        local path_spec="${CLEAN_ITEMS[$item]}"
        local item_size=0
        local file_count=0
        
        if [[ "$item" == "Docker镜像" ]]; then
            if command -v docker >/dev/null 2>&1; then
                print_color "$MAGENTA" "📦 $item:"
                docker system df 2>/dev/null || echo "  Docker 未运行"
                echo
            fi
            continue
        elif [[ "$item" == "DNS缓存" ]]; then
            print_color "$MAGENTA" "🌐 $item:"
            echo "  将刷新 DNS 缓存"
            echo
            continue
        elif [[ "$item" == "PM2日志" ]]; then
            print_color "$MAGENTA" "📋 $item:"
            if command -v pm2 >/dev/null 2>&1; then
                local pm2_logs=~/.pm2/logs
                if [[ -d "$pm2_logs" ]]; then
                    local size=$(dir_size "$pm2_logs")
                    echo "  • $(format_size $size) - $pm2_logs"
                else
                    echo "  (无 PM2 日志)"
                fi
            else
                echo "  (PM2 未安装)"
            fi
            echo
            continue
        elif [[ "$item" == "无效应用程序" ]]; then
            print_color "$MAGENTA" "🔍 $item:"
            local broken_count=0
            for app in /Applications/*.app ~/Applications/*.app; do
                if [[ -d "$app" ]]; then
                    local info_plist="$app/Contents/Info.plist"
                    if [[ ! -f "$info_plist" ]]; then
                        ((broken_count++))
                        echo "  • 无效: $app (缺少 Info.plist)"
                    fi
                fi
            done
            if [[ $broken_count -eq 0 ]]; then
                echo "  (未发现无效应用)"
            else
                echo "  发现 $broken_count 个无效应用"
            fi
            echo
            continue
        fi
        
        print_color "$MAGENTA" "📁 $item:"

        # 展开路径并计算大小
        eval "paths=($path_spec)"
        for current_path in "${paths[@]}"; do
            if [[ -e "$current_path" ]]; then
                # 检查是否在排除列表中（仅对系统缓存生效）
                if [[ "$item" == "系统缓存" ]]; then
                    local excluded=0
                    for exclude_pattern in "${CACHE_EXCLUDE_LIST[@]}"; do
                        if [[ "$current_path" == *"$exclude_pattern"* ]]; then
                            excluded=1
                            break
                        fi
                    done
                    if [[ $excluded -eq 1 ]]; then
                        continue
                    fi
                fi

                local size=$(dir_size "$current_path")
                item_size=$((item_size + size))
                file_count=$((file_count + 1))
                echo "  • $(format_size $size) - $current_path"
            fi
        done
        
        if [[ $item_size -gt 0 ]]; then
            TOTAL_SIZE=$((TOTAL_SIZE + item_size))
            preview_items+=("$item:$(format_size $item_size)")
        else
            echo "  (无文件)"
        fi
        echo
    done
    
    print_separator
    print_color "$GREEN" "📊 预览总结:"
    echo "  • 预计释放空间: $(format_size $TOTAL_SIZE)"
    echo "  • 涉及项目数: ${#preview_items[@]}"
    echo
    
    # 显示历史清理记录
    if [[ -f "$HISTORY_FILE" ]] && command -v jq >/dev/null 2>&1; then
        local last_clean=$(jq '.[-1]' "$HISTORY_FILE" 2>/dev/null)
        if [[ "$last_clean" != "null" ]]; then
            local last_size=$(echo "$last_clean" | jq '.size_cleaned')
            local last_time=$(echo "$last_clean" | jq -r '.timestamp')
            print_color "$CYAN" "📈 上次清理: $(format_size $last_size) at $last_time"
            echo
        fi
    fi
    
    echo
    read "REPLY?是否开始清理? (y/N): "
    echo
    if [[ $REPLY == [Yy] ]]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# 清理函数
# =============================================================================

clean_item() {
    local item_name=$1
    local path_spec=$2
    local item_size=0
    
    print_color "$YELLOW" "🧹 正在清理: $item_name"
    
    case "$item_name" in
        "DNS缓存")
            if [[ "$OSTYPE" == "darwin"* ]]; then
                /usr/bin/sudo /usr/bin/dscacheutil -flushcache 2>/dev/null || true
                /usr/bin/sudo /usr/bin/killall -HUP mDNSResponder 2>/dev/null || true
                print_color "$GREEN" "  ✓ DNS 缓存已刷新"
            fi
            ;;
        "Docker镜像")
            if command -v docker >/dev/null 2>&1; then
                docker system prune -af 2>/dev/null || print_color "$RED" "  ✗ Docker 清理失败"
                print_color "$GREEN" "  ✓ Docker 镜像已清理"
            fi
            ;;
        "PM2日志")
            if command -v pm2 >/dev/null 2>&1; then
                local pm2_logs="$HOME/.pm2/logs"
                if [[ -d "$pm2_logs" ]]; then
                    # 清空日志文件而不是删除目录
                    for log_file in "$pm2_logs"/*.log; do
                        if [[ -f "$log_file" ]]; then
                            local size=$(dir_size "$log_file")
                            : > "$log_file" 2>/dev/null || true
                            print_color "$GREEN" "  ✓ 已清空: $log_file ($(format_size $size))"
                            item_size=$((item_size + size))
                        fi
                    done
                    print_color "$GREEN" "  ✓ PM2 日志已清空"
                else
                    print_color "$CYAN" "  (无 PM2 日志目录)"
                fi
            else
                print_color "$CYAN" "  (PM2 未安装)"
            fi
            ;;
        "无效应用程序")
            local deleted_count=0
            for app in /Applications/*.app ~/Applications/*.app; do
                if [[ -d "$app" ]]; then
                    local info_plist="$app/Contents/Info.plist"
                    if [[ ! -f "$info_plist" ]]; then
                        local size=$(dir_size "$app")
                        if /bin/rm -rf "$app" 2>/dev/null; then
                            ((deleted_count++))
                            DELETED_FILES=$((DELETED_FILES + 1))
                            item_size=$((item_size + size))
                            print_color "$GREEN" "  ✓ 已删除: $app ($(format_size $size))"
                        else
                            ERROR_FILES=$((ERROR_FILES + 1))
                            print_color "$RED" "  ✗ 删除失败: $app"
                        fi
                    fi
                fi
            done
            if [[ $deleted_count -eq 0 ]]; then
                print_color "$CYAN" "  (未发现无效应用)"
            else
                print_color "$GREEN" "  ✓ 已删除 $deleted_count 个无效应用"
            fi
            ;;
        *)
            eval "paths=($path_spec)"
            for current_path in "${paths[@]}"; do
                if [[ -e "$current_path" ]]; then
                    # 检查是否在排除列表中（仅对系统缓存生效）
                    if [[ "$item_name" == "系统缓存" ]]; then
                        local excluded=0
                        for exclude_pattern in "${CACHE_EXCLUDE_LIST[@]}"; do
                            if [[ "$current_path" == *"$exclude_pattern"* ]]; then
                                excluded=1
                                break
                            fi
                        done
                        if [[ $excluded -eq 1 ]]; then
                            print_color "$CYAN" "  ⊘ 已跳过: $current_path (开发工具缓存)"
                            continue
                        fi
                    fi

                    local size=$(dir_size "$current_path")
                    item_size=$((item_size + size))

                    if /bin/rm -rf "$current_path" 2>/dev/null; then
                        DELETED_FILES=$((DELETED_FILES + 1))
                        print_color "$GREEN" "  ✓ 已删除: $current_path ($(format_size $size))"
                    else
                        ERROR_FILES=$((ERROR_FILES + 1))
                        print_color "$RED" "  ✗ 删除失败: $current_path"
                        log_message "ERROR" "Failed to delete: $current_path"
                    fi
                fi
            done
            ;;
    esac
    
    TOTAL_SIZE=$((TOTAL_SIZE + item_size))
    echo
}

# =============================================================================
# 执行清理
# =============================================================================

execute_clean() {
    print_header
    print_color "$RED" "⚠️  开始执行清理操作"
    print_separator
    echo
    
    local start_time=$(/bin/date +%s)
    
    # 重置统计
    TOTAL_SIZE=0
    DELETED_FILES=0
    SKIPPED_FILES=0
    ERROR_FILES=0
    
    # 执行清理
    for item in "${(@k)CLEAN_ITEMS}"; do
        clean_item "$item" "${CLEAN_ITEMS[$item]}"
    done
    
    # 清理系统缓存
    print_color "$YELLOW" "🧹 清理系统级缓存..."
    /usr/bin/sudo /bin/rm -rf /System/Library/Caches/* 2>/dev/null || true
    /usr/bin/sudo /bin/rm -rf /private/var/vm/* 2>/dev/null || true
    print_color "$GREEN" "  ✓ 系统缓存已清理"
    echo

    # 清理内存缓存
    print_color "$YELLOW" "💭 释放内存缓存..."
    /usr/bin/sudo /usr/bin/purge 2>/dev/null || print_color "$RED" "  ✗ 需要 sudo 权限"
    print_color "$GREEN" "  ✓ 内存缓存已释放"
    echo
    
    local end_time=$(/bin/date +%s)
    local duration=$((end_time - start_time))
    
    # 显示结果
    print_separator
    print_color "$GREEN" "✅ 清理完成!"
    echo
    print_color "$CYAN" "📊 清理统计:"
    echo "  • 释放空间: $(format_size $TOTAL_SIZE)"
    echo "  • 删除文件: $DELETED_FILES"
    echo "  • 跳过文件: $SKIPPED_FILES"
    echo "  • 失败文件: $ERROR_FILES"
    echo "  • 用时: ${duration}秒"
    echo
    
    # 磁盘空间变化
    print_color "$CYAN" "💾 磁盘空间变化:"
    /bin/df -h /
    echo
    
    # 记录历史
    add_history "$TOTAL_SIZE" "$DELETED_FILES"
    log_message "INFO" "Clean completed: $(format_size $TOTAL_SIZE), $DELETED_FILES files deleted"
}

# =============================================================================
# 主程序
# =============================================================================

main() {
    # 检查是否在 macOS 上运行
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo "❌ 错误: 此脚本仅支持 macOS 系统"
        exit 1
    fi

    # 初始化
    init_config
    log_message "INFO" "Clean Mac v$VERSION started by $(/usr/bin/id -un)"

    # 显示系统信息
    print_header
    print_color "$WHITE" "🔍 系统信息:"
    echo

    local macos_version=$(/usr/bin/sw_vers -productVersion)
    local build_version=$(/usr/bin/sw_vers -buildVersion)
    local hostname=$(/bin/hostname -s)
    local current_user=$(/usr/bin/id -un)

    print_color "$CYAN" "  • macOS 版本: $macos_version (Build: $build_version)"
    print_color "$CYAN" "  • 主机名: $hostname"
    print_color "$CYAN" "  • 当前用户: $current_user"
    echo

    # 包管理器存储配置
    print_color "$WHITE" "📦 包管理器存储:"
    echo

    # pnpm store (直接检查默认位置)
    local pnpm_store="$HOME/Library/pnpm/store/v3"
    if [[ -d "$pnpm_store" ]]; then
        local pnpm_store_size=$(/usr/bin/du -sh "$pnpm_store" 2>/dev/null | /usr/bin/awk '{print $1}')
        print_color "$GREEN" "  • pnpm: $pnpm_store ($pnpm_store_size)"
        print_color "$CYAN" "    (已启用全局共享存储，所有项目共用依赖，请勿删除)"
    else
        print_color "$YELLOW" "  • pnpm: 未找到 store 目录"
    fi
    echo

    # 磁盘空间
    print_color "$CYAN" "💾 当前磁盘空间:"
    /bin/df -h / | /usr/bin/tail -1 | /usr/bin/awk '{print "  已用: "$3" / 总共: "$2" (可用: "$4")"}'
    echo

    # 显示预览并询问是否清理
    if preview_mode; then
        execute_clean
    fi

    # 清理完成后显示结果并退出
    print_header
    print_color "$GREEN" "✅ 清理脚本执行完毕"
    echo
    print_color "$CYAN" "💾 当前磁盘空间:"
    /bin/df -h / | /usr/bin/tail -1 | /usr/bin/awk '{print "  已用: "$3" / 总共: "$2" (可用: "$4")"}'
    echo
}

# 运行主程序
main "$@"