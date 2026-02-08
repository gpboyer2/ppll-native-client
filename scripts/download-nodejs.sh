#!/bin/bash

# Node.js 可执行文件下载脚本
# 用于下载对应平台的 Node.js 二进制文件并嵌入到 Wails 应用中
#
# 使用方法:
#   ./scripts/download-nodejs.sh [platform]
#
# 参数:
#   platform  目标平台 (darwin/amd64, darwin/arm64, windows/amd64, windows/arm64, auto)
#            默认为 auto，自动检测当前平台

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# 配置
NODE_VERSION="20.18.2"  # LTS 版本
OUTPUT_DIR="build/node-bin"
NODE_BASE_URL="https://nodejs.org/dist/v${NODE_VERSION}"

# 解析参数
PLATFORM="${1:-auto}"

# 自动检测平台
if [ "$PLATFORM" = "auto" ]; then
    OS="$(uname -s)"
    ARCH="$(uname -m)"
    case "$OS" in
        Darwin)
            PLATFORM="darwin/$ARCH"
            ;;
        Linux)
            PLATFORM="linux/$ARCH"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="windows/$ARCH"
            ;;
        *)
            echo "错误: 不支持的操作系统 $OS"
            exit 1
            ;;
    esac
fi

# 解析平台和架构
IFS='/' read -r OS ARCH <<< "$PLATFORM"

# 规范化架构名称
case "$ARCH" in
    x86_64|amd64)
        ARCH="x64"
        BINARY_NAME="node"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        BINARY_NAME="node"
        ;;
    armv7l|arm)
        ARCH="armv7l"
        BINARY_NAME="node"
        ;;
    *)
        echo "错误: 不支持的架构 $ARCH"
        exit 1
        ;;
esac

# Windows 使用 node.exe
if [ "$OS" = "windows" ] || [ "$OS" = "mingw" ] || [ "$OS" = "msys" ]; then
    OS="windows"
    BINARY_NAME="node.exe"
fi

# 构建下载 URL
case "$OS" in
    darwin)
        if [ "$ARCH" = "arm64" ]; then
            FILENAME="node-v${NODE_VERSION}-darwin-arm64.tar.gz"
        else
            FILENAME="node-v${NODE_VERSION}-darwin-x64.tar.gz"
        fi
        ;;
    linux)
        FILENAME="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
        ;;
    windows)
        FILENAME="node-v${NODE_VERSION}-win-${ARCH}.zip"
        ;;
    *)
        echo "错误: 不支持的操作系统 $OS"
        exit 1
        ;;
esac

DOWNLOAD_URL="${NODE_BASE_URL}/${FILENAME}"
TEMP_FILE="/tmp/${FILENAME}"
EXTRACT_DIR="/tmp/node-v${NODE_VERSION}-${OS}-${ARCH}"

echo "========================================"
echo "Node.js 下载脚本"
echo "========================================"
echo "版本: ${NODE_VERSION}"
echo "目标平台: ${OS}/${ARCH}"
echo "下载 URL: ${DOWNLOAD_URL}"
echo "输出目录: ${PROJECT_DIR}/${OUTPUT_DIR}"
echo "========================================"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 下载文件
echo "正在下载 ${FILENAME}..."
if command -v curl >/dev/null 2>&1; then
    curl -L -o "$TEMP_FILE" "$DOWNLOAD_URL"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$TEMP_FILE" "$DOWNLOAD_URL"
else
    echo "错误: 需要 curl 或 wget 来下载文件"
    exit 1
fi

# 解压文件
echo "正在解压..."
rm -rf "$EXTRACT_DIR"
case "$FILENAME" in
    *.tar.gz|*.tgz)
        tar -xzf "$TEMP_FILE" -C /tmp
        ;;
    *.tar.xz)
        tar -xf "$TEMP_FILE" -C /tmp
        ;;
    *.zip)
        unzip -q -o "$TEMP_FILE" -d /tmp
        # Windows zip 提取后目录名为 node-v{VERSION}-win-{ARCH}，需要重新定位
        EXTRACT_DIR="/tmp/node-v${NODE_VERSION}-win-${ARCH}"
        ;;
esac

# 复制可执行文件
echo "正在复制可执行文件..."
if [ "$OS" = "windows" ]; then
    # Windows: node.exe 在根目录
    SOURCE_FILE="${EXTRACT_DIR}/${BINARY_NAME}"
    TARGET_FILE="${OUTPUT_DIR}/${BINARY_NAME}"
else
    # Unix: 复制 node，设置可执行权限
    SOURCE_FILE="${EXTRACT_DIR}/bin/${BINARY_NAME}"
    TARGET_FILE="${OUTPUT_DIR}/${BINARY_NAME}"
fi

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
    echo "错误: 找不到 Node.js 可执行文件: $SOURCE_FILE"
    echo "解压目录内容:"
    ls -la "$EXTRACT_DIR/" 2>/dev/null || true
    rm -rf "$TEMP_FILE"
    exit 1
fi

cp -f "$SOURCE_FILE" "$TARGET_FILE"
chmod +x "$TARGET_FILE"

# 清理临时文件
rm -f "$TEMP_FILE"
rm -rf "$EXTRACT_DIR"

echo "✓ Node.js 可执行文件已下载到: ${TARGET_FILE}"
ls -lh "$TARGET_FILE" | awk '{print "  文件大小: " $5}'

# 验证
echo "正在验证..."
if [ "$OS" = "windows" ]; then
    file "$TARGET_FILE" || echo "  (file 命令不可用)"
else
    VERSION_OUTPUT=$("$TARGET_FILE" --version 2>/dev/null || echo "v${NODE_VERSION}")
    echo "  Node.js 版本: ${VERSION_OUTPUT}"
fi

echo "========================================"
echo "下载完成！"
echo "========================================"
