#!/bin/bash

# PPLL Native Client macOS 构建脚本
# 重置代码、安装依赖、构建应用
#
# 使用方法:
# ./build-mac.sh                           # 默认使用 pnpm 和 master 分支，仅开发模式
# ./build-mac.sh -n=npm -b=develop         # 使用 npm 和 develop 分支
# ./build-mac.sh -m=build                  # 构建生产版本 .app
# ./build-mac.sh -m=dev                    # 启动开发模式（默认）
# ./build-mac.sh -n=pnpm -b=master -m=build # 完整示例

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 包管理器配置文件
PACKAGE_MANAGER_LOCK_FILE="$SCRIPT_DIR/.package-manager-lock"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"  # 默认使用 pnpm
BRANCH_NAME="master"    # 默认分支
BUILD_MODE="dev"        # 默认开发模式

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
            if [ "$BRANCH_NAME" != "develop" ] && [ "$BRANCH_NAME" != "master" ]; then
                echo "错误: 不支持的分支 '$BRANCH_NAME'，支持的分支: develop, master"
                exit 1
            fi
            ;;
        -m=*)
            BUILD_MODE="${arg#-m=}"
            if [ "$BUILD_MODE" != "dev" ] && [ "$BUILD_MODE" != "build" ]; then
                echo "错误: 不支持的构建模式 '$BUILD_MODE'，支持的模式: dev, build"
                exit 1
            fi
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm, -b=develop|master, -m=dev|build"
            echo "示例: ./build-mac.sh -n=pnpm -b=master -m=build"
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

# 检查并安装 wails
check_wails() {
    if ! command -v wails &> /dev/null; then
        echo "未找到 wails，正在自动安装..."
        go install github.com/wailsapp/wails/v2/cmd/wails@latest
        
        # 重新检查是否安装成功
        if ! command -v wails &> /dev/null; then
            echo "错误: wails 安装失败，请手动安装: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
            echo "提示: 请确保 GOPATH/bin 已添加到系统 PATH 中"
            exit 1
        fi
        
        echo "wails 安装成功！"
    else
        echo "wails 已安装"
    fi
}

# 检查 Go 是否安装
check_go() {
    if ! command -v go &> /dev/null; then
        echo "错误: 找不到 Go，请先安装 Go"
        exit 1
    fi
}

# 获取包管理器的完整路径
PACKAGE_MANAGER_CMD=$(get_package_manager_path "$PACKAGE_MANAGER")

# 检查上次使用的包管理器
check_package_manager_change() {
    local current_manager=$1
    local previous_manager=""

    if [ -f "$PACKAGE_MANAGER_LOCK_FILE" ]; then
        previous_manager=$(cat "$PACKAGE_MANAGER_LOCK_FILE")
    fi

    if [ "$previous_manager" != "" ] && [ "$previous_manager" != "$current_manager" ]; then
        echo "检测到包管理器从 '$previous_manager' 切换到 '$current_manager'"
        echo "正在清理旧的 node_modules..."

        if [ -d "./frontend/node_modules" ]; then
            echo "删除 ./frontend/node_modules"
            rm -rf "./frontend/node_modules"
        fi
        if [ -f "./frontend/package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
            echo "删除 ./frontend/package-lock.json"
            rm -f "./frontend/package-lock.json"
        fi
        if [ -f "./frontend/pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
            echo "删除 ./frontend/pnpm-lock.yaml"
            rm -f "./frontend/pnpm-lock.yaml"
        fi

        echo "清理完成"
    fi

    # 记录当前使用的包管理器
    echo "$current_manager" > "$PACKAGE_MANAGER_LOCK_FILE"
}

# 检查必要工具
check_go
check_wails

# 检查并处理包管理器切换
check_package_manager_change "$PACKAGE_MANAGER"

echo "========================================"
echo "PPLL Native Client macOS 构建"
echo "========================================"
echo "包管理器: $PACKAGE_MANAGER"
echo "目标分支: $BRANCH_NAME"
echo "构建模式: $BUILD_MODE"
echo "========================================"

echo "[1/5] 确认代码在 $BRANCH_NAME 分支..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo "当前分支是 '$CURRENT_BRANCH'，正在切换到 $BRANCH_NAME 分支..."
    git checkout "$BRANCH_NAME"
    git pull origin "$BRANCH_NAME"
    echo "已切换到 $BRANCH_NAME 分支并拉取最新代码"
else
    echo "当前已在 $BRANCH_NAME 分支，拉取最新代码..."
    git pull origin "$BRANCH_NAME"
fi

echo "[2/5] 安装 Go 依赖..."
go mod tidy

echo "[3/5] 安装前端依赖..."
cd ./frontend
$PACKAGE_MANAGER_CMD install
cd ..

if [ "$BUILD_MODE" = "build" ]; then
    echo "[4/5] 构建生产版本..."
    wails build -platform darwin/universal

    echo "[5/5] 构建完成！"
    echo "========================================"
    echo "构建产物位于: build/bin/"
    echo "========================================"
    ls -la build/bin/
else
    echo "[4/5] 跳过生产构建（开发模式）"
    echo "[5/5] 准备完成！"
    echo "========================================"
    echo "如需启动开发服务器，请运行: wails dev"
    echo "如需构建生产版本，请运行: ./build-mac.sh -m=build"
    echo "========================================"
fi

echo "当前分支: $BRANCH_NAME"
echo "使用的包管理器: $PACKAGE_MANAGER"
