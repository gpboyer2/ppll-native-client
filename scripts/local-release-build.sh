#!/bin/bash

# PPLL Native Client 本地发布构建脚本
# 根据当前主机架构自适应构建对应平台的应用
#
# 使用方法:
# chmod +x local-release-build.sh
# ./local-release-build.sh                    # 使用默认配置（pnpm）
# ./local-release-build.sh -n=npm            # 使用 npm

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Node.js 配置
NODE_VERSION="20.18.2"
NODE_BIN_DIR="build/node-bin"

# 解析命令行参数
PACKAGE_MANAGER="pnpm"

for arg in "$@"; do
    case $arg in
        -n=*)
            PACKAGE_MANAGER="${arg#-n=}"
            if [ "$PACKAGE_MANAGER" != "npm" ] && [ "$PACKAGE_MANAGER" != "pnpm" ]; then
                echo "错误: 不支持的包管理器 '$PACKAGE_MANAGER'"
                exit 1
            fi
            ;;
        *)
            echo "错误: 不支持的参数 '$arg'"
            echo "支持的参数: -n=npm|pnpm"
            exit 1
            ;;
    esac
done

# 检测当前 Mac 架构
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    HOST_ARCH="amd64"
elif [ "$ARCH" = "arm64" ]; then
    HOST_ARCH="arm64"
else
    echo "错误: 不支持的架构 $ARCH"
    exit 1
fi

# 获取版本号
VERSION=$(grep '"productVersion"' wails.json | sed 's/.*"productVersion": "\(.*\)".*/\1/')

# 定义构建平台（根据主机架构自适应）
# macOS: 始终构建
# Windows: 仅在 amd64 上构建（arm64 Mac 交叉编译 Windows 有问题）
# Linux: 仅在 amd64 上构建（arm64 Mac 交叉编译 Linux 有问题）
MACOS_PLATFORM="darwin/$HOST_ARCH"
WINDOWS_PLATFORM=""
LINUX_PLATFORM=""

if [ "$HOST_ARCH" = "amd64" ]; then
    WINDOWS_PLATFORM="windows/amd64"
    LINUX_PLATFORM="linux/amd64"
fi

echo "========================================"
echo "PPLL Native Client 本地发布构建"
echo "========================================"
echo "版本: $VERSION"
echo "包管理器: $PACKAGE_MANAGER"
echo "主机架构: $ARCH ($HOST_ARCH)"
echo "========================================"
echo "构建平台:"
echo "  - macOS: $MACOS_PLATFORM"
if [ -n "$WINDOWS_PLATFORM" ]; then
    echo "  - Windows: $WINDOWS_PLATFORM"
fi
if [ -n "$LINUX_PLATFORM" ]; then
    echo "  - Linux: $LINUX_PLATFORM"
fi
echo "========================================"
echo ""

# 创建构建目录
mkdir -p build/release
mkdir -p "$NODE_BIN_DIR/darwin-$HOST_ARCH"

# 下载 Node.js 二进制文件函数
downloadNodejs() {
    local platform=$1
    local binary_name=""
    local platform_dir=""

    case "$platform" in
        darwin/amd64|darwin/arm64)
            binary_name="node"
            platform_dir="darwin-$HOST_ARCH"
            ;;
        windows/amd64)
            binary_name="node.exe"
            platform_dir="windows-amd64"
            ;;
        linux/amd64)
            binary_name="node"
            platform_dir="linux-amd64"
            ;;
        *)
            echo "警告: 不支持的平台 $platform，跳过 Node.js 下载"
            return 0
            ;;
    esac

    local output_file="$NODE_BIN_DIR/${platform_dir}/${binary_name}"

    # 检查是否已存在
    if [ -f "$output_file" ]; then
        echo "Node.js 二进制文件已存在: $output_file"
        return 0
    fi

    echo "正在下载 Node.js for ${platform}..."
    if "$SCRIPT_DIR/scripts/download-nodejs.sh" "$platform"; then
        mkdir -p "$NODE_BIN_DIR/${platform_dir}"
        if [ "$binary_name" = "node" ]; then
            mv -f "$NODE_BIN_DIR/node" "$output_file" 2>/dev/null || true
        else
            mv -f "$NODE_BIN_DIR/node.exe" "$output_file" 2>/dev/null || true
        fi
        echo "Node.js 下载成功"
    else
        echo "警告: Node.js 下载失败，请手动运行: ./scripts/download-nodejs.sh $platform"
    fi
}

# 获取 wails 路径
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

# 构建 macOS 平台
buildMacos() {
    echo "----------------------------------------"
    echo "正在构建: $MACOS_PLATFORM"
    echo ""

    # 清理旧的构建产物
    rm -rf build/bin/*.app

    # 下载 Node.js
    downloadNodejs "$MACOS_PLATFORM"

    # 构建
    "$WAILS_PATH" build -platform "$MACOS_PLATFORM" -clean

    # 处理 .app 文件
    APP_NAME="ppll-native-client.app"

    if [ -d "build/bin/$APP_NAME" ]; then
        # 嵌入 Node.js
        NODE_SRC="$NODE_BIN_DIR/darwin-$HOST_ARCH/node"
        if [ -f "$NODE_SRC" ]; then
            RESOURCES_DIR="build/bin/$APP_NAME/Contents/Resources"
            mkdir -p "$RESOURCES_DIR"
            cp -f "$NODE_SRC" "$RESOURCES_DIR/node"
            chmod +x "$RESOURCES_DIR/node"
            echo "Node.js 已嵌入到: $RESOURCES_DIR/node"
        fi

        # 复制 nodejs-server（排除 logs 目录）
        if [ -d "nodejs-server" ]; then
            RESOURCES_DIR="build/bin/$APP_NAME/Contents/Resources"
            mkdir -p "$RESOURCES_DIR"
            # 使用 rsync 排除 logs 目录
            if command -v rsync >/dev/null 2>&1; then
                rsync -av --exclude='logs' --exclude='*.log' nodejs-server/ "$RESOURCES_DIR/nodejs-server/"
            else
                # 备用方案：使用 tar 过滤
                mkdir -p "$RESOURCES_DIR/nodejs-server"
                tar -cf - --exclude='logs' --exclude='*.log' -C nodejs-server . | tar -xf - -C "$RESOURCES_DIR/nodejs-server"
            fi
            echo "nodejs-server 已复制到: $RESOURCES_DIR/nodejs-server"
        fi

        # 创建 .dmg
        OUTPUT_FILE="build/release/ppll-native-client-macos-${HOST_ARCH}.dmg"
        echo "正在创建 $OUTPUT_FILE..."

        rm -f "$OUTPUT_FILE"
        TEMP_DIR="build/temp_dmg"
        rm -rf "$TEMP_DIR"
        mkdir -p "$TEMP_DIR"
        cp -R "build/bin/$APP_NAME" "$TEMP_DIR/"

        hdiutil create -volname "PPLL Client" -srcfolder "$TEMP_DIR" -ov -format UDZO "$OUTPUT_FILE" >/dev/null 2>&1
        rm -rf "$TEMP_DIR"

        echo "已生成: $OUTPUT_FILE"
        ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
    else
        echo "警告: 未找到构建产物 build/bin/$APP_NAME"
    fi
}

# 构建 Windows 平台
buildWindows() {
    if [ -z "$WINDOWS_PLATFORM" ]; then
        return
    fi

    echo ""
    echo "----------------------------------------"
    echo "正在构建: $WINDOWS_PLATFORM (使用 NSIS 安装程序)"
    echo ""

    # 清理旧的构建产物
    rm -rf build/bin/*.exe

    # 下载 Node.js
    downloadNodejs "$WINDOWS_PLATFORM"

    # 先构建基础 exe（不带 -nsis）
    "$WAILS_PATH" build -platform "$WINDOWS_PLATFORM" -clean

    # 处理 .exe 文件
    EXE_NAME="ppll-native-client.exe"

    if [ -f "build/bin/$EXE_NAME" ]; then
        NODE_SRC="$NODE_BIN_DIR/windows-amd64/node.exe"

        # 复制 node.exe（在生成 NSIS 之前）
        if [ -f "$NODE_SRC" ]; then
            cp -f "$NODE_SRC" "build/bin/node.exe"
            echo "Node.js 已复制到: build/bin/node.exe"
        fi

        # 复制 nodejs-server（排除 logs 目录）
        if [ -d "nodejs-server" ]; then
            if command -v rsync >/dev/null 2>&1; then
                rsync -av --exclude='logs' --exclude='*.log' nodejs-server/ build/bin/nodejs-server/
            else
                mkdir -p build/bin/nodejs-server
                tar -cf - --exclude='logs' --exclude='*.log' -C nodejs-server . | tar -xf - -C build/bin/nodejs-server
            fi
            echo "nodejs-server 已复制到: build/bin/nodejs-server"
        fi

        # 生成 NSIS 安装程序（不带 -clean，避免删除刚复制的文件）
        echo "正在生成 NSIS 安装程序..."
        "$WAILS_PATH" build -platform "$WINDOWS_PLATFORM" -nsis

        # 查找 NSIS 安装程序
        INSTALLER_NAME="ppll-native-client-install.exe"
        OUTPUT_FILE="build/release/ppll-native-client-windows-${HOST_ARCH}-installer.exe"

        if [ -f "build/bin/$INSTALLER_NAME" ]; then
            echo "正在创建 NSIS 安装程序: $OUTPUT_FILE..."
            cp "build/bin/$INSTALLER_NAME" "$OUTPUT_FILE"
            echo "已生成 NSIS 安装程序: $OUTPUT_FILE"
        else
            # 回退到原始 exe
            echo "警告: 未找到 NSIS 安装程序，使用原始 exe"
            OUTPUT_FILE="build/release/ppll-native-client-windows-${HOST_ARCH}.exe"
            cp "build/bin/$EXE_NAME" "$OUTPUT_FILE"
            echo "已生成: $OUTPUT_FILE"
        fi
        ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
    else
        echo "警告: 未找到构建产物 build/bin/$EXE_NAME"
    fi
}

# 构建 Linux 平台
buildLinux() {
    if [ -z "$LINUX_PLATFORM" ]; then
        return
    fi

    echo ""
    echo "----------------------------------------"
    echo "正在构建: $LINUX_PLATFORM"
    echo ""

    # 清理旧的构建产物
    rm -rf build/bin/*

    # 下载 Node.js
    downloadNodejs "$LINUX_PLATFORM"

    # 构建
    "$WAILS_PATH" build -platform "$LINUX_PLATFORM" -clean

    # 处理 Linux 二进制文件
    BIN_NAME="ppll-native-client"

    if [ -f "build/bin/$BIN_NAME" ]; then
        NODE_SRC="$NODE_BIN_DIR/linux-amd64/node"

        # 创建 AppDir 结构
        APPDIR="build/temp_appdir"
        rm -rf "$APPDIR"
        mkdir -p "$APPDIR/usr/bin"
        mkdir -p "$APPDIR/usr/share/applications"
        mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"

        # 复制主程序
        cp "build/bin/$BIN_NAME" "$APPDIR/usr/bin/ppll-native-client"
        chmod +x "$APPDIR/usr/bin/ppll-native-client"

        # 嵌入 Node.js
        if [ -f "$NODE_SRC" ]; then
            cp -f "$NODE_SRC" "$APPDIR/usr/bin/node"
            chmod +x "$APPDIR/usr/bin/node"
        fi

        # 复制 nodejs-server（排除 logs 目录）
        if [ -d "nodejs-server" ]; then
            if command -v rsync >/dev/null 2>&1; then
                rsync -av --exclude='logs' --exclude='*.log' nodejs-server/ "$APPDIR/usr/bin/nodejs-server/"
            else
                mkdir -p "$APPDIR/usr/bin/nodejs-server"
                tar -cf - --exclude='logs' --exclude='*.log' -C nodejs-server . | tar -xf - -C "$APPDIR/usr/bin/nodejs-server"
            fi
        fi

        # 创建 .desktop 文件
        cat > "$APPDIR/ppll-native-client.desktop" << 'EOF'
[Desktop Entry]
Name=PPLL Native Client
Comment=PPLL Trading Client
Exec=/usr/bin/ppll-native-client
Icon=ppll-native-client
Type=Application
Categories=Finance;Office;
EOF
        cp "$APPDIR/ppll-native-client.desktop" "$APPDIR/usr/share/applications/"

        # 创建 AppRun
        cat > "$APPDIR/AppRun" << 'EOF'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
exec "${HERE}/usr/bin/ppll-native-client" "$@"
EOF
        chmod +x "$APPDIR/AppRun"

        # 创建 AppImage（需要 appimagetool）
        OUTPUT_FILE="build/release/ppll-native-client-linux-${HOST_ARCH}.AppImage"
        echo "正在创建 $OUTPUT_FILE..."

        if command -v appimagetool >/dev/null 2>&1; then
            appimagetool "$APPDIR" "$OUTPUT_FILE" >/dev/null 2>&1
            echo "已生成: $OUTPUT_FILE"
            ls -lh "$OUTPUT_FILE" | awk '{print "  文件大小: " $5}'
        else
            echo "警告: 未找到 appimagetool，跳过 .AppImage 创建"
            echo "请安装: wget https://github.com/AppImage/AppImageKit/releases/download/13/appimagetool-x86_64.AppImage"
            echo "       chmod +x appimagetool-x86_64.AppImage"
            echo "       sudo mv appimagetool-x86_64.AppImage /usr/local/bin/appimagetool"
            # 打包为 tar.gz 作为替代
            tar -czf "$OUTPUT_FILE.tar.gz" -C "$APPDIR" usr
            echo "已生成 (tar.gz): ${OUTPUT_FILE}.tar.gz"
        fi

        rm -rf "$APPDIR"
    else
        echo "警告: 未找到构建产物 build/bin/$BIN_NAME"
    fi
}

# 执行构建
buildMacos
buildWindows
buildLinux

# 打包所有产物为压缩包
echo ""
echo "----------------------------------------"
echo "正在打包发布文件..."

RELEASE_ARCHIVE="build/ppll-native-client-${VERSION}-${HOST_ARCH}-release.tar.gz"
tar -czf "$RELEASE_ARCHIVE" -C build/release .

echo "已生成发布包: $RELEASE_ARCHIVE"
ls -lh "$RELEASE_ARCHIVE" | awk '{print "  文件大小: " $5}'

# 显示构建结果
echo ""
echo "========================================"
echo "构建完成！"
echo "========================================"
echo "构建产物位于: build/release/"
echo ""
echo "产物列表:"
ls -lh build/release/ 2>/dev/null | grep -v "^total" | awk '{print "  " $9, $5}'
echo ""
echo "发布包: $RELEASE_ARCHIVE"
echo "========================================"
