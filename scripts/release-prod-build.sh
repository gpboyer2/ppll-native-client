#!/bin/bash

# 生产环境打包脚本 - pkg 单文件可执行程序
# 使用方法:
# ./scripts/release-prod-build.sh

set -e

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 版本信息
VERSION=$(date '+%Y%m%d-%H%M%S')
BUILD_DIR="./release-build/pkg"
SOURCE_DIR="$BUILD_DIR/source"
FINAL_DIR="$BUILD_DIR/dist/release-$VERSION"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        体系级全流程设计系统 - 生产环境打包 (pkg单文件)         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  版本: $VERSION"
echo "  构建目录: $BUILD_DIR"
echo ""

# ============================================
# 步骤 1: 清理旧构建产物
# ============================================
echo "[1/7] 清理旧的构建产物..."
rm -rf "$BUILD_DIR/dist"
mkdir -p "$FINAL_DIR"

# 确保 source 目录结构存在
mkdir -p "$SOURCE_DIR/server"
mkdir -p "$SOURCE_DIR/client/dist"

# ============================================
# 步骤 2: 构建前端
# ============================================
echo "[2/7] 构建前端..."
cd ./client
pnpm run build
cd ..

# 更新标记文件时间
touch "$SOURCE_DIR/.frontend_build_time"

# ============================================
# 步骤 3: 复制文件到 source 目录
# ============================================
echo "[3/7] 复制文件到 source 目录..."

# 先保护 source/app.js（如果已存在）
if [ -f "$SOURCE_DIR/app.js" ]; then
    BACKUP_APP="$SOURCE_DIR/app.js.backup"
    cp "$SOURCE_DIR/app.js" "$BACKUP_APP"
fi

# 复制 server 目录（排除 node_modules 和不必要的文件）
rsync -a --exclude='node_modules' \
    --exclude='logs' \
    --exclude='data' \
    --exclude='*.sqlite' \
    --exclude='.cache' \
    ./server/ "$SOURCE_DIR/server/"

# 恢复 app.js（如果有备份）
if [ -f "$BACKUP_APP" ]; then
    mv "$BACKUP_APP" "$SOURCE_DIR/app.js"
fi

# 复制前端构建产物
cp -r ./client/dist/* "$SOURCE_DIR/client/dist/"

# 复制 code_gen 目录
rsync -a --exclude='node_modules' \
    --exclude='tests' \
    ./code_gen/ "$SOURCE_DIR/code_gen/"

# 复制 favicon.ico
cp ./server/favicon.ico "$SOURCE_DIR/" 2>/dev/null || true

# ============================================
# 步骤 4: 创建单文件入口 app.js
# ============================================
echo "[4/7] 创建单文件入口 app.js..."

# 这个文件已经存在于 source/app.js，是 pkg 打包的主入口
# 它包含了完整的启动逻辑，支持 pkg 虚拟文件系统
if [ ! -f "$SOURCE_DIR/app.js" ]; then
    echo "错误: source/app.js 不存在，请先创建此文件"
    exit 1
fi

# ============================================
# 步骤 5: 创建发布版 package.json 并安装依赖
# ============================================
echo "[5/7] 安装后端依赖..."

cat > "$SOURCE_DIR/package.json" << 'EOF'
{
  "name": "cssc-node-view",
  "version": "1.0.0",
  "main": "app.js",
  "bin": "app.js",
  "pkg": {
    "scripts": [
      "app.js",
      "server/**/*.js"
    ],
    "assets": [
      "client/dist/**/*",
      "favicon.ico",
      "node_modules/sqlite3/build/Release/*.node"
    ],
    "targets": [
      "node18-linux-x64",
      "node18-linux-arm64",
      "node18-win-x64",
      "node18-macos-x64",
      "node18-macos-arm64"
    ]
  },
  "dependencies": {
    "archiver": "^7.0.1",
    "axios": "^1.13.2",
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.4",
    "cors": "^2.8.5",
    "dayjs": "^1.11.19",
    "dotenv": "^16.6.1",
    "express": "^4.22.1",
    "iconv-lite": "^0.6.3",
    "jsonwebtoken": "^9.0.3",
    "jszip": "^3.10.1",
    "lodash": "^4.17.21",
    "log4js": "^6.9.1",
    "moment": "^2.30.1",
    "multer": "^2.0.2",
    "nats": "^2.29.3",
    "sequelize": "^6.37.7",
    "serve-favicon": "^2.5.1",
    "socket.io": "^4.8.3",
    "sqlite3": "^5.1.7",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^7.0.3"
  }
}
EOF

cd "$SOURCE_DIR"

# 清理旧的 pnpm 相关文件
rm -f pnpm-lock.yaml .npmrc

# 清理 node_modules 并重新安装
rm -rf node_modules package-lock.json
npm install --production --legacy-peer-deps --silent

# ============================================
# 步骤 6: 使用 pkg 打包单文件可执行程序
# ============================================
echo "[6/7] 使用 pkg 打包单文件可执行程序..."

# 确定当前平台的目标
case "$(uname -s)" in
    Darwin)
        case "$(uname -m)" in
            x86_64)  PKG_TARGET="node18-macos-x64" ;;
            arm64)   PKG_TARGET="node18-macos-arm64" ;;
        esac
        ;;
    Linux)
        case "$(uname -m)" in
            x86_64)  PKG_TARGET="node18-linux-x64" ;;
            aarch64) PKG_TARGET="node18-linux-arm64" ;;
        esac
        ;;
esac

echo "  目标平台: $PKG_TARGET"

# 使用 pkg 打包（仅打包当前平台）
npx pkg . --targets "$PKG_TARGET" --output "$FINAL_DIR/cssc-node-view"

# 如果是 Windows，添加 .exe 后缀
if [ "$(uname -s)" = "Darwin" ] || [ "$(uname -s)" = "Linux" ]; then
    EXECUTABLE="cssc-node-view"
else
    EXECUTABLE="cssc-node-view.exe"
fi

# 设置可执行权限
chmod +x "$FINAL_DIR/cssc-node-view"

# 获取文件大小
file_size=$(du -sh "$FINAL_DIR/cssc-node-view" | cut -f1)

# ============================================
# 步骤 7: 复制 .env.prod 到发布目录
# ============================================
echo "[7/7] 复制配置文件..."
cp ./.env.prod "$FINAL_DIR/.env.prod"

# ============================================
# 步骤 8: 创建启动脚本
# ============================================
cat > "$FINAL_DIR/start.sh" << 'EOF'
#!/bin/bash
# 体系级全流程设计系统 - 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "正在启动体系级全流程设计系统..."
./cssc-node-view
EOF
chmod +x "$FINAL_DIR/start.sh"

# ============================================
# 步骤 9: 创建 README
# ============================================
cat > "$FINAL_DIR/README.txt" << EOF
体系级全流程设计系统 - 生产版 (单文件可执行程序)
========================================

版本: $VERSION
构建时间: $(date '+%Y-%m-%d %H:%M:%S')

快速开始:
---------
1. 双击 cssc-node-view 或命令行运行: ./cssc-node-view
2. 浏览器访问显示的地址（默认 http://localhost:9200）

数据存储:
---------
所有数据存储在用户目录:
  Linux/mac:  ~/.cssc-node-view/
  Windows:   C:\\Users\\<用户名>\\.cssc-node-view/

包含:
  - database.sqlite    (数据库文件)
  - logs/              (日志目录)
  - data/              (生成的代码等数据)

配置文件:
---------
.env.prod 文件包含运行时配置，可根据需要修改

注意事项:
---------
- 首次运行会自动初始化数据库
- 默认登录账号请查看启动日志
- 确保端口 9200 未被占用
- 单文件可执行程序，无需安装 Node.js
- 当前平台: $(uname -s) $(uname -m)

========================================
EOF

# 创建 tar.gz 压缩包
cd "$BUILD_DIR/dist"
tar czf "cssc-node-view-$VERSION-$(uname -s)-$(uname -m).tar.gz" "release-$VERSION"

# 获取压缩包大小
tar_size=$(du -sh "$BUILD_DIR/dist/cssc-node-view-$VERSION-$(uname -s)-$(uname -m).tar.gz" | cut -f1)

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║                    构建完成！                               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  发布包: $FINAL_DIR/"
echo ""
echo "  单文件可执行程序:"
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │  cssc-node-view  ($file_size)                                │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
echo "  使用方法:"
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │  1. 直接运行:  ./cssc-node-view                              │"
echo "  │  2. 使用脚本:  ./start.sh                                    │"
echo "  │  3. 双击运行 (macOS/Windows)                                 │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
echo "  压缩包:"
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │  cssc-node-view-$VERSION-$(uname -s)-$(uname -m).tar.gz ($tar_size)  │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        复制 cssc-node-view 单文件到生产环境即可运行              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
