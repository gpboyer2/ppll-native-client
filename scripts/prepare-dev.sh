#!/bin/bash

# 重置代码、安装依赖、启动服务
# 使用相对路径，可复制到其他设备使用
#
# 使用方法:
# ./prepare-dev.sh                           # 默认使用 pnpm 和当前分支
# ./prepare-dev.sh -n=npm -b=develop         # 使用 npm 并切换到 develop 分支
# ./prepare-dev.sh -b=develop                # 使用默认 pnpm 并切换到 develop 分支
# ./prepare-dev.sh -b=future/feature-branch  # 使用默认 pnpm 并切换到指定分支
# ./prepare-dev.sh -f=build                  # 默认使用 pnpm、当前分支并构建前端
# ./prepare-dev.sh -n=npm -b=develop -f=build # 使用 npm、develop 分支并构建前端

set -e

# 加载 nvm 环境（非交互式 shell 需要手动加载）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 包管理器配置文件
PACKAGE_MANAGER_LOCK_FILE="$SCRIPT_DIR/.package-manager-lock"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"  # 默认使用 pnpm
BRANCH_NAME=""          # 默认使用当前分支（空表示不切换）
FRONTEND_BUILD="false"  # 是否构建前端

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
        -f=*)
            FRONTEND_BUILD="${arg#-f=}"
            if [ "$FRONTEND_BUILD" != "build" ]; then
                echo "错误: 不支持的前端操作 '$FRONTEND_BUILD'，支持的操作: build"
                exit 1
            fi
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm, -b=<分支名>, -f=build"
            echo "示例: ./prepare-dev.sh -n=npm -b=develop -f=build"
            exit 1
            ;;
    esac
done

# 优先使用系统 PATH 中的包管理器，找不到则使用服务器绝对路径
get_package_manager_path() {
    local manager=$1

    if command -v "$manager" &> /dev/null; then
        echo "$manager"
        return 0
    elif [ -f "/usr/local/bin/$manager" ]; then
        echo "/usr/local/bin/$manager"
        return 0
    else
        echo "错误: 找不到 $manager，请先安装 $manager"
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

        # 清理各个目录的 node_modules
        local dirs=("./server" "./client" "./code_gen/nodegen")
        for dir in "${dirs[@]}"; do
            if [ -d "$dir/node_modules" ]; then
                echo "删除 $dir/node_modules"
                rm -rf "$dir/node_modules"
            fi
            if [ -f "$dir/package-lock.json" ] && [ "$current_manager" = "pnpm" ]; then
                echo "删除 $dir/package-lock.json"
                rm -f "$dir/package-lock.json"
            fi
            if [ -f "$dir/pnpm-lock.yaml" ] && [ "$current_manager" = "npm" ]; then
                echo "删除 $dir/pnpm-lock.yaml"
                rm -f "$dir/pnpm-lock.yaml"
            fi
        done

        echo "清理完成"
    fi

    # 记录当前使用的包管理器
    echo "$current_manager" > "$PACKAGE_MANAGER_LOCK_FILE"
}

# 检查并处理包管理器切换
check_package_manager_change "$PACKAGE_MANAGER"

echo "使用包管理器: $PACKAGE_MANAGER"

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)

# 如果用户指定了分支且与当前分支不同，则切换
if [ -n "$BRANCH_NAME" ] && [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo "[1/7] 当前分支是 '$CURRENT_BRANCH'，正在切换到 $BRANCH_NAME 分支..."
    git checkout "$BRANCH_NAME"
    git pull origin "$BRANCH_NAME"
    echo "已切换到 $BRANCH_NAME 分支并拉取最新代码"
else
    echo "[1/7] 使用当前分支: $CURRENT_BRANCH"
    BRANCH_NAME="$CURRENT_BRANCH"  # 设置为当前分支，用于后续提示
fi

echo "[2/7] 安装 server 依赖..."
cd ./server
$PACKAGE_MANAGER_CMD install

echo "[3/7] 安装 client 依赖..."
cd ./client
$PACKAGE_MANAGER_CMD install

echo "[4/7] 拉取 code_gen 子模块..."
cd ..
# 清理子模块中的未跟踪文件，避免 checkout 冲突
git submodule foreach --recursive git clean -fdx
git submodule foreach --recursive git reset --hard
git submodule update --init --recursive

echo "[5/7] 安装 code_gen/nodegen 依赖..."
cd ./code_gen/nodegen
$PACKAGE_MANAGER_CMD install

# 如果需要构建前端
if [ "$FRONTEND_BUILD" = "build" ]; then
    echo "[6/7] 构建前端项目..."
    cd ../../client
    $PACKAGE_MANAGER_CMD run build
    echo "前端构建完成，构建产物位于 client/dist 目录"
else
    echo "[6/7] 跳过前端构建"
fi

echo "[7/7] 所有构建完成！"
echo "当前分支: $BRANCH_NAME"
echo "使用的包管理器: $PACKAGE_MANAGER"
if [ "$FRONTEND_BUILD" = "build" ]; then
    echo "前端构建: 已执行，构建产物位于 client/dist"
else
    echo "前端构建: 未执行，如需构建请添加 -f=build 参数"
fi
echo "如需启动开发服务器，请手动运行相应的启动命令"
