#!/bin/bash

# PPLL Native Client 多平台构建脚本
# 使用 Wails 官方方式构建所有平台的发布包
#
# 使用方法:
# ./build-platforms.sh                    # 使用默认配置
# ./build-platforms.sh -n=npm            # 使用 npm
# ./build-platforms.sh -b=develop        # 从 develop 分支构建

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"
BRANCH_NAME="master"

for arg in "$@"; do
    case $arg in
        -n=*)
            PACKAGE_MANAGER="${arg#-n=}"
            if [ "$PACKAGE_MANAGER" != "npm" ] && [ "$PACKAGE_MANAGER" != "pnpm" ]; then
                echo "错误: 不支持的包管理器 '$PACKAGE_MANAGER'"
                exit 1
            fi
            ;;
        -b=*)
            BRANCH_NAME="${arg#-b=}"
            if [ "$BRANCH_NAME" != "develop" ] && [ "$BRANCH_NAME" != "master" ]; then
                echo "错误: 不支持的分支 '$BRANCH_NAME'"
                exit 1
            fi
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm, -b=develop|master"
            exit 1
            ;;
    esac
done

# 获取版本号
VERSION=$(grep '"productVersion"' wails.json | sed 's/.*"productVersion": "\(.*\)".*/\1/')

# 定义要构建的平台（格式：wails平台标识:产物后缀）
declare -a PLATFORMS=(
    "darwin/amd64:mac-intel-x64"
    "darwin/arm64:mac-apple-arm64"
    "darwin/universal:mac-universal"
    "windows/amd64:win-x64"
    "windows/arm64:win-arm64"
)

echo "========================================"
echo "PPLL Native Client 多平台构建"
echo "========================================"
echo "版本: $VERSION"
echo "包管理器: $PACKAGE_MANAGER"
echo "源代码分支: $BRANCH_NAME"
echo "========================================"

# 确保build目录存在
mkdir -p build

# 获取wails路径
WAILS_PATH=$(command -v wails)
if [ -z "$WAILS_PATH" ]; then
    GOPATH=$(go env GOPATH)
    if [ -f "$GOPATH/bin/wails" ]; then
        WAILS_PATH="$GOPATH/bin/wails"
    else
        echo "错误: 找不到 wails"
        exit 1
    fi
fi

echo "开始构建所有平台..."
echo ""

# 遍历所有平台
for platform_info in "${PLATFORMS[@]}"; do
    IFS=':' read -r platform suffix <<< "$platform_info"

    echo "----------------------------------------"
    echo "正在构建: $platform"

    # 清理旧的构建产物
    rm -rf build/bin/*.app build/bin/*.exe

    # 使用 wails build 构建当前平台
    # Wails 会自动处理：
    # 1. 安装前端依赖（如果需要）
    # 2. 构建前端项目
    # 3. 生成构建资源
    # 4. 编译应用
    "$WAILS_PATH" build -platform "$platform" -clean

    # 根据平台类型处理构建产物
    if [[ $platform == darwin* ]]; then
        # macOS 平台 - 处理 .app 文件并创建 .dmg
        APP_NAME="ppll-native-client.app"

        if [ -d "build/bin/$APP_NAME" ]; then
            OUTPUT_FILE="build/ppll-client-v${VERSION}-${suffix}.dmg"

            echo "正在创建 $OUTPUT_FILE..."

            # 删除旧的dmg（如果存在）
            rm -f "$OUTPUT_FILE"

            # 使用hdiutil创建dmg
            TEMP_DIR="build/temp_dmg"
            rm -rf "$TEMP_DIR"
            mkdir -p "$TEMP_DIR"
            cp -R "build/bin/$APP_NAME" "$TEMP_DIR/"

            hdiutil create -volname "PPLL Client" -srcfolder "$TEMP_DIR" -ov -format UDZO "$OUTPUT_FILE" >/dev/null 2>&1
            rm -rf "$TEMP_DIR"

            echo "✓ 已生成: $OUTPUT_FILE"
            ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
        else
            echo "警告: 未找到构建产物 build/bin/$APP_NAME"
        fi
    elif [[ $platform == windows* ]]; then
        # Windows 平台 - 处理 .exe 文件
        EXE_NAME="ppll-native-client.exe"

        if [ -f "build/bin/$EXE_NAME" ]; then
            OUTPUT_FILE="build/ppll-client-v${VERSION}-${suffix}.exe"

            echo "正在创建 $OUTPUT_FILE..."

            # 复制并重命名
            cp "build/bin/$EXE_NAME" "$OUTPUT_FILE"

            echo "✓ 已生成: $OUTPUT_FILE"
            ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
        else
            echo "警告: 未找到构建产物 build/bin/$EXE_NAME"
        fi
    fi
done

echo ""
echo "========================================"
echo "构建完成！"
echo "========================================"
echo "构建产物位于: build/"
echo ""
echo "macOS 包:"
ls -lh build/*.dmg 2>/dev/null | awk '{print "  " $9, $5}'
echo ""
echo "Windows 包:"
ls -lh build/*.exe 2>/dev/null | awk '{print "  " $9, $5}'
echo "========================================"
