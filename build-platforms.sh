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

# Node.js 配置
NODE_VERSION="20.18.2"
NODE_BIN_DIR="build/node-bin"

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
mkdir -p "$NODE_BIN_DIR/darwin-amd64"
mkdir -p "$NODE_BIN_DIR/darwin-arm64"
mkdir -p "$NODE_BIN_DIR/windows-amd64"
mkdir -p "$NODE_BIN_DIR/windows-arm64"

# 下载 Node.js 二进制文件函数
downloadNodejs() {
    local platform=$1
    local binary_name=""
    local platform_dir=""

    # 确定二进制文件名和存储目录
    case "$platform" in
        darwin/amd64)
            binary_name="node"
            platform_dir="darwin-amd64"
            ;;
        darwin/arm64)
            binary_name="node"
            platform_dir="darwin-arm64"
            ;;
        darwin/universal)
            binary_name="node"
            platform_dir="darwin-arm64"
            ;;
        windows/amd64)
            binary_name="node.exe"
            platform_dir="windows-amd64"
            ;;
        windows/arm64)
            binary_name="node.exe"
            platform_dir="windows-arm64"
            ;;
        *)
            echo "警告: 不支持的平台 $platform，跳过 Node.js 下载"
            return 0
            ;;
    esac

    local output_file="$NODE_BIN_DIR/${platform_dir}/${binary_name}"

    # 检查是否已存在
    if [ -f "$output_file" ]; then
        echo "✓ Node.js 二进制文件已存在: $output_file"
        return 0
    fi

    echo "正在下载 Node.js for ${platform}..."
    if "$SCRIPT_DIR/scripts/download-nodejs.sh" "$platform"; then
        # 移动到对应的平台目录
        mkdir -p "$NODE_BIN_DIR/${platform_dir}"
        if [ "$binary_name" = "node" ]; then
            mv -f "$NODE_BIN_DIR/node" "$output_file" 2>/dev/null || true
        else
            mv -f "$NODE_BIN_DIR/node.exe" "$output_file" 2>/dev/null || true
        fi
        echo "✓ Node.js 下载成功"
    else
        echo "警告: Node.js 下载失败，请手动运行: ./scripts/download-nodejs.sh $platform"
    fi
}

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

    # 下载对应平台的 Node.js
    downloadNodejs "$platform"

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
            # 将 Node.js 复制到 .app 的 Resources 目录
            # 根据当前平台选择正确的 Node.js 文件
            case "$platform" in
                darwin/amd64)
                    NODE_SRC="$NODE_BIN_DIR/darwin-amd64/node"
                    ;;
                darwin/arm64)
                    NODE_SRC="$NODE_BIN_DIR/darwin-arm64/node"
                    ;;
                darwin/universal)
                    # universal 版本使用 arm64 的 node
                    NODE_SRC="$NODE_BIN_DIR/darwin-arm64/node"
                    ;;
            esac

            if [ -f "$NODE_SRC" ]; then
                RESOURCES_DIR="build/bin/$APP_NAME/Contents/Resources"
                mkdir -p "$RESOURCES_DIR"
                cp -f "$NODE_SRC" "$RESOURCES_DIR/node"
                chmod +x "$RESOURCES_DIR/node"
                echo "✓ Node.js 已嵌入到: $RESOURCES_DIR/node"
            fi

            # 复制 nodejs-server 到 .app（排除 logs 目录）
            if [ -d "nodejs-server" ]; then
                RESOURCES_DIR="build/bin/$APP_NAME/Contents/Resources"
                mkdir -p "$RESOURCES_DIR"
                if command -v rsync >/dev/null 2>&1; then
                    rsync -av --exclude='logs' --exclude='*.log' nodejs-server/ "$RESOURCES_DIR/nodejs-server/"
                else
                    mkdir -p "$RESOURCES_DIR/nodejs-server"
                    tar -cf - --exclude='logs' --exclude='*.log' -C nodejs-server . | tar -xf - -C "$RESOURCES_DIR/nodejs-server"
                fi
                echo "✓ nodejs-server 已复制到: $RESOURCES_DIR/nodejs-server"
            fi

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
        # Windows 平台 - 使用 NSIS 生成安装程序
        EXE_NAME="ppll-native-client.exe"

        if [ -f "build/bin/$EXE_NAME" ]; then
            # 根据当前平台选择正确的 Node.js 文件
            case "$platform" in
                windows/amd64)
                    NODE_SRC="$NODE_BIN_DIR/windows-amd64/node.exe"
                    ;;
                windows/arm64)
                    NODE_SRC="$NODE_BIN_DIR/windows-arm64/node.exe"
                    ;;
            esac

            OUTPUT_FILE="build/ppll-client-v${VERSION}-${suffix}-installer.exe"

            echo "正在准备 NSIS 安装程序..."

            # 先复制依赖文件到 build/bin（在生成 NSIS 之前）
            # 复制 node.exe 到 exe 同目录（用于运行时查找）
            if [ -f "$NODE_SRC" ]; then
                cp -f "$NODE_SRC" "build/bin/node.exe"
                echo "✓ Node.js 已复制到: build/bin/node.exe"
            fi

            # 复制 nodejs-server 到 exe 同目录（排除 logs 目录）
            if [ -d "nodejs-server" ]; then
                if command -v rsync >/dev/null 2>&1; then
                    rsync -av --exclude='logs' --exclude='*.log' nodejs-server/ build/bin/nodejs-server/
                else
                    mkdir -p build/bin/nodejs-server
                    tar -cf - --exclude='logs' --exclude='*.log' -C nodejs-server . | tar -xf - -C build/bin/nodejs-server
                fi
                echo "✓ nodejs-server 已复制到: build/bin/nodejs-server"
            fi

            # 使用 Wails 的 -nsis 参数生成安装程序（不带 -clean，避免删除刚复制的文件）
            "$WAILS_PATH" build -platform "$platform" -nsis

            # 查找生成的安装程序并重命名
            if [ -f "build/bin/ppll-native-client-install.exe" ]; then
                mv "build/bin/ppll-native-client-install.exe" "$OUTPUT_FILE"
                echo "✓ 已生成 NSIS 安装程序: $OUTPUT_FILE"
                ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
            else
                echo "警告: 未找到 NSIS 安装程序，使用原始 exe"
                cp "build/bin/$EXE_NAME" "$OUTPUT_FILE"
                echo "✓ 已生成: $OUTPUT_FILE"
                ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
            fi
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
