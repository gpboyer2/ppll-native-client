#!/bin/bash

# PPLL Native Client 构建发布脚本
# 构建 macOS 和 Windows 应用并打标签
#
# 使用方法:
# chmod +x release-build.sh
# ./release-build.sh                           # 自动生成版本标签，默认使用 pnpm 和 master 分支
# ./release-build.sh -n=npm                    # 使用 npm，自动生成版本标签
# ./release-build.sh -b=develop                # 从 develop 分支构建，自动生成版本标签
# ./release-build.sh -v=1.0.0                  # 手动指定标签版本（不推荐）
# ./release-build.sh -n=npm -b=develop         # 使用 npm 从 develop 分支构建

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"  # 默认使用 pnpm
BRANCH_NAME="master"    # 默认分支
TAG_VERSION=""          # 标签版本，可选，未指定则自动生成
PUSH_BRANCH="master"    # 推送的目标分支

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
        -v=*)
            TAG_VERSION="${arg#-v=}"
            if [ -z "$TAG_VERSION" ]; then
                echo "错误: 标签版本不能为空"
                exit 1
            fi
            ;;
        -p=*)
            PUSH_BRANCH="${arg#-p=}"
            if [ "$PUSH_BRANCH" != "develop" ] && [ "$PUSH_BRANCH" != "master" ]; then
                echo "错误: 不支持的推送分支 '$PUSH_BRANCH'，支持的分支: develop, master"
                exit 1
            fi
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm, -b=develop|master, -v=版本号(可选), -p=develop|master"
            echo "示例: ./release-build.sh -n=npm"
            echo "示例: ./release-build.sh -b=develop"
            echo "示例: ./release-build.sh -v=1.0.0 (不推荐，建议使用自动生成)"
            exit 1
            ;;
    esac
done

# 初始化标签跳过标志
SKIP_TAG=false

# 自动生成标签版本（如果未手动指定）
if [ -z "$TAG_VERSION" ]; then
    # 获取当前时间，格式：YYYYMMDD-HHMMSS
    CURRENT_TIME=$(date '+%Y%m%d-%H%M%S')
    # 获取分支名称前缀
    BRANCH_PREFIX=$(echo "$BRANCH_NAME" | sed 's/master/prod/' | sed 's/develop/dev/')
    # 获取包管理器缩写
    MANAGER_ABBR=$(echo "$PACKAGE_MANAGER" | sed 's/pnpm/p/' | sed 's/npm/n/')
    # 生成标签：格式：build-分支-包管理器-时间
    TAG_VERSION="build-$BRANCH_PREFIX-$MANAGER_ABBR-$CURRENT_TIME"
    echo "自动生成标签版本: $TAG_VERSION"
fi

# 检查当前commit是否已有标签
CURRENT_COMMIT=$(git rev-parse HEAD)
EXISTING_TAGS=$(git tag --points-at "$CURRENT_COMMIT")

# 检查要创建的标签是否已存在
if git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
    echo "提示: 标签 '$TAG_VERSION' 已存在"
    echo "当前commit已有以下标签:"
    if [ -n "$EXISTING_TAGS" ]; then
        echo "$EXISTING_TAGS" | sed 's/^/  - /'
        echo "跳过标签创建，继续推送..."
        SKIP_TAG=true
    else
        echo "  无"
        echo "但标签 '$TAG_VERSION' 指向其他commit，如需覆盖请先删除"
        echo "删除远程标签: git push origin --delete refs/tags/$TAG_VERSION"
        echo "删除本地标签: git tag -d $TAG_VERSION"
        exit 1
    fi
else
    if [ -n "$EXISTING_TAGS" ]; then
        echo "提示: 当前commit已有以下标签:"
        echo "$EXISTING_TAGS" | sed 's/^/  - /'
        echo "但计划创建的新标签 '$TAG_VERSION' 不存在，将继续创建新标签"
        SKIP_TAG=false
    else
        echo "当前commit无任何标签，将创建新标签 '$TAG_VERSION'"
        SKIP_TAG=false
    fi
fi

echo "========================================="
echo "PPLL Native Client 发布构建"
echo "========================================="
echo "包管理器: $PACKAGE_MANAGER"
echo "源代码分支: $BRANCH_NAME"
echo "推送目标分支: $PUSH_BRANCH"
echo "标签版本: $TAG_VERSION"
echo "========================================="

# 1. 执行多平台构建
echo "[步骤 1/5] 执行多平台构建..."
./build-platforms.sh -n="$PACKAGE_MANAGER" -b="$BRANCH_NAME"

# 2. 添加构建产物到git
echo "[步骤 2/5] 添加构建产物到git..."
git add -f build/*.dmg build/*.exe

# 3. 提交构建产物
echo "[步骤 3/5] 提交构建产物..."
COMMIT_MESSAGE="build: 部署构建产物 - 版本 $TAG_VERSION

构建信息:
- 包管理器: $PACKAGE_MANAGER
- 源代码分支: $BRANCH_NAME
- 构建时间: $(date '+%Y-%m-%d %H:%M:%S')
- 标签版本: $TAG_VERSION
- 平台: macOS (Intel/ARM/Universal) + Windows (x64/arm64)

此提交包含跨平台应用安装包，仅用于发布目的。"

git commit -m "$COMMIT_MESSAGE"

# 4. 推送到指定分支
echo "[步骤 4/5] 推送到 $PUSH_BRANCH 分支..."
if [ "$BRANCH_NAME" != "$PUSH_BRANCH" ]; then
    git checkout "$PUSH_BRANCH"
    git pull origin "$PUSH_BRANCH"
    git merge "$BRANCH_NAME" --no-ff -m "merge: 合并 $BRANCH_NAME 的构建提交到 $PUSH_BRANCH"
fi

git push origin "$PUSH_BRANCH"

# 5. 创建标签（如果需要）
if [ "$SKIP_TAG" = true ]; then
    echo "[步骤 5/5] 跳过标签创建（当前commit已有标签）..."
    echo "已存在的标签: $EXISTING_TAGS"
else
    echo "[步骤 5/5] 创建标签 $TAG_VERSION..."
    git tag -a "$TAG_VERSION" -m "版本 $TAG_VERSION

版本信息:
- 源代码分支: $BRANCH_NAME
- 部署分支: $PUSH_BRANCH
- 包管理器: $PACKAGE_MANAGER
- 构建时间: $(date '+%Y-%m-%d %H:%M:%S')
- 平台: macOS (Intel/ARM/Universal) + Windows (x64/arm64)
- 标签类型: 构建发布标签

此标签标记了 PPLL Native Client 跨平台应用的发布版本。"
    git push origin "$TAG_VERSION"
fi

# 6. 显示完成信息
echo "========================================="
echo "构建和发布完成！"
echo "========================================="
echo "提交哈希: $(git rev-parse HEAD)"
echo "标签版本: $TAG_VERSION"
echo "源代码分支: $BRANCH_NAME"
echo "部署分支: $PUSH_BRANCH"
echo "构建产物: build/"

if [ "$SKIP_TAG" = true ]; then
    echo "标签状态: 跳过创建（当前commit已有标签）"
    echo "已有标签: $EXISTING_TAGS"
else
    echo "标签推送: origin $TAG_VERSION"
fi

echo "========================================="
echo "构建产物列表:"
ls -lh build/*.dmg build/*.exe 2>/dev/null || ls -lh build/
echo "========================================="
echo "如需切换到此版本: git checkout $TAG_VERSION"
