#!/bin/bash

# PPLL Native Client macOS 开发环境准备脚本
# 重置代码、安装依赖、准备开发环境
#
# 使用方法:
# ./prepare-dev.sh                         # 默认使用 pnpm 和当前分支
# ./prepare-dev.sh -n=npm -b=feature-xxx  # 使用 npm 并切换到指定分支

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 包管理器配置文件
PACKAGE_MANAGER_LOCK_FILE="$SCRIPT_DIR/.package-manager-lock"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"  # 默认使用 pnpm
BRANCH_NAME=$(git branch --show-current)  # 默认使用当前分支

for arg in "$@"; do
    case $arg in
        -n=*)
            PACKAGE_MANAGER="${arg#-n=}"
            if [ "$PACKAGE_MANAGER" != "npm" ] && [ "$PACKAGE_MANAGER" != "pnpm" ]; then
                echo "错误: 不支持的包管理器 '$PACKAGE_MANAGER'，支持的包管理器: npm, pnpm"
                exit 1
            fi
            ;;
        -b=*)
            BRANCH_NAME="${arg#-b=}"
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm, -b=<分支名>"
            echo "示例: ./prepare-dev.sh -n=pnpm -b=feature-xxx"
            exit 1
            ;;
    esac
done

# 优先使用系统 PATH 中的包管理器
get_package_manager_path() {
    local manager=$1

    if command -v "$manager" &> /dev/null; then
        echo "$manager"
        return 0
    elif [ -f "/usr/local/bin/$manager" ]; then
        echo "/usr/local/bin/$manager"
        return 0
    elif [ -f "/opt/homebrew/bin/$manager" ]; then
        echo "/opt/homebrew/bin/$manager"
        return 0
    else
        echo "错误: 找不到 $manager，请先安装 $manager"
        exit 1
    fi
}

# 检查 Node.js 是否安装
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "错误: 找不到 Node.js，请先安装 Node.js"
        echo "Node.js 是运行后端服务所必需的"
        exit 1
    fi
    echo "Node.js 版本: $(node -v)"
}

# 获取包管理器的完整路径
PACKAGE_MANAGER_CMD=$(get_package_manager_path "$PACKAGE_MANAGER")

# 检查上次使用的包管理器（前端、主进程、后端）
check_package_manager_change() {
    local current_manager=$1
    local previous_manager=""

    if [ -f "$PACKAGE_MANAGER_LOCK_FILE" ]; then
        previous_manager=$(cat "$PACKAGE_MANAGER_LOCK_FILE")
    fi

    if [ "$previous_manager" != "" ] && [ "$previous_manager" != "$current_manager" ]; then
        echo "检测到包管理器从 '$previous_manager' 切换到 '$current_manager'"
        echo "正在清理旧的 node_modules..."

        # 清理根目录
        if [ -d "./node_modules" ]; then
            echo "删除 ./node_modules"
            rm -rf "./node_modules"
        fi
        if [ -f "./package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
            echo "删除 ./package-lock.json"
            rm -f "./package-lock.json"
        fi
        if [ -f "./pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
            echo "删除 ./pnpm-lock.yaml"
            rm -f "./pnpm-lock.yaml"
        fi

        # 清理前端
        if [ -d "./app/frontend/node_modules" ]; then
            echo "删除 ./app/frontend/node_modules"
            rm -rf "./app/frontend/node_modules"
        fi
        if [ -f "./app/frontend/package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
            echo "删除 ./app/frontend/package-lock.json"
            rm -f "./app/frontend/package-lock.json"
        fi
        if [ -f "./app/frontend/pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
            echo "删除 ./app/frontend/pnpm-lock.yaml"
            rm -f "./app/frontend/pnpm-lock.yaml"
        fi

        # 清理 Electron 主进程
        if [ -d "./electron/node_modules" ]; then
            echo "删除 ./electron/node_modules"
            rm -rf "./electron/node_modules"
        fi
        if [ -f "./electron/package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
            echo "删除 ./electron/package-lock.json"
            rm -f "./electron/package-lock.json"
        fi
        if [ -f "./electron/pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
            echo "删除 ./electron/pnpm-lock.yaml"
            rm -f "./electron/pnpm-lock.yaml"
        fi

        # 清理后端
        if [ -d "./app/backend/node_modules" ]; then
            echo "删除 ./app/backend/node_modules"
            rm -rf "./app/backend/node_modules"
        fi
        if [ -f "./app/backend/package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
            echo "删除 ./app/backend/package-lock.json"
            rm -f "./app/backend/package-lock.json"
        fi
        if [ -f "./app/backend/pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
            echo "删除 ./app/backend/pnpm-lock.yaml"
            rm -f "./app/backend/pnpm-lock.yaml"
        fi

        echo "清理完成"
    fi

    # 记录当前使用的包管理器
    echo "$current_manager" > "$PACKAGE_MANAGER_LOCK_FILE"
}

# 检查必要工具
check_nodejs

# 检查并处理包管理器切换
check_package_manager_change "$PACKAGE_MANAGER"

echo "========================================"
echo "PPLL Native Client macOS 开发环境准备"
echo "========================================"
echo "包管理器: $PACKAGE_MANAGER"
echo "使用分支: $BRANCH_NAME"
echo "========================================"

echo "[1/6] 确认代码在分支 $BRANCH_NAME 上..."
# 动态获取第一个远程仓库名称
GIT_REMOTE=$(git remote | head -n 1)
if [ -z "$GIT_REMOTE" ]; then
    echo "错误: 未找到 git remote，请检查仓库配置"
    exit 1
fi
echo "使用远程仓库: $GIT_REMOTE"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo "当前分支是 '$CURRENT_BRANCH'，正在切换到 $BRANCH_NAME 分支..."
    git checkout "$BRANCH_NAME"
    git pull "$GIT_REMOTE" "$BRANCH_NAME"
    echo "已切换到 $BRANCH_NAME 分支并拉取最新代码"
else
    echo "当前已在 $BRANCH_NAME 分支，拉取最新代码..."
    git pull "$GIT_REMOTE" "$BRANCH_NAME"
fi

echo "[2/6] 安装前端依赖..."
cd ./app/frontend
$PACKAGE_MANAGER_CMD install
cd ../..

echo "[3/6] 安装 Electron 主进程依赖..."
if [ -d "./electron" ]; then
    cd ./electron
    if [ -f "package.json" ]; then
        $PACKAGE_MANAGER_CMD install
        echo "Electron 主进程依赖安装完成"
    else
        echo "警告: electron/package.json 不存在，跳过依赖安装"
    fi
    cd ..
else
    echo "警告: electron 目录不存在，跳过依赖安装"
fi

echo "[4/6] 安装 Node.js 后端依赖..."
if [ -d "./app/backend" ]; then
    cd ./app/backend
    if [ -f "package.json" ]; then
        $PACKAGE_MANAGER_CMD install
        echo "Node.js 后端依赖安装完成"
    else
        echo "警告: app/backend/package.json 不存在，跳过依赖安装"
    fi
    cd ../..
else
    echo "警告: app/backend 目录不存在，跳过依赖安装"
fi

echo "[5/6] 安装根目录依赖（Electron 启动器）..."
if [ -f "./package.json" ]; then
    $PACKAGE_MANAGER_CMD install
    echo "根目录依赖安装完成"
else
    echo "警告: 根目录 package.json 不存在，跳过依赖安装"
fi

echo "[6/6] 准备完成！"
echo "========================================"
echo "开发模式信息:"
echo "  - Electron 主进程 + Node.js 后端服务"
echo "  - 前端热重载已启用"
echo "  - SQLite 数据库: ~/.config/ppll-client/data.db"
echo ""
echo "如需启动开发服务器，请运行: npm run dev:full"
echo "========================================"

echo "当前分支: $BRANCH_NAME"
echo "使用的包管理器: $PACKAGE_MANAGER"
