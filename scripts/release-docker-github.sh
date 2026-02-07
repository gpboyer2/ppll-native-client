#!/bin/bash

# Docker 镜像发布脚本
# 使用相对路径，可复制到其他设备使用
# 通过推送 git tag 触发 GitHub Actions 自动构建 Docker 镜像
#
# 使用方法:
# chmod +x release-docker.sh
# ./release-docker.sh                           # 自动生成版本标签并推送
# ./release-docker.sh -v 1.0.0                  # 手动指定版本号
# ./release-docker.sh -v 1.0.0 -b=master        # 从 master 分支发布
# ./release-docker.sh -v 1.0.0 --dry-run        # 仅显示信息不执行
#
# 发布后 GitHub Actions 会自动构建并推送镜像到 ghcr.io

set -e

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
Docker 镜像发布脚本

通过推送 git tag 触发 GitHub Actions 自动构建 Docker 镜像

用法:
    ./release-docker.sh [选项]

选项:
    -v VERSION              指定版本号 (默认: 自动生成)
    -b BRANCH               指定源分支 (默认: 当前分支)
    --dry-run               仅显示信息不执行
    -h, --help              显示帮助信息

版本号格式:
    手动指定: 1.0.0, 2.1.3 等 (推荐使用语义化版本)
    自动生成: docker-YYYYMMDD-HHMMSS

========================================
使用示例
========================================

1. 快速发布（自动生成版本号）
   ./release-docker.sh

2. 指定版本号发布
   ./release-docker.sh -v 1.0.0

3. 从指定分支发布
   ./release-docker.sh -v 1.0.0 -b master

4. 预览模式（不实际执行）
   ./release-docker.sh -v 1.0.0 --dry-run

========================================
发布流程
========================================

1. 检查当前分支状态
2. 创建版本标签 (v1.0.0)
3. 推送标签到远程仓库
4. GitHub Actions 自动触发构建
5. 镜像构建完成并推送至 ghcr.io

========================================
常见镜像仓库地址
========================================
  GitHub Container Registry:  ghcr.io
  Docker Hub:                 docker.io
  阿里云（杭州）:              registry.cn-hangzhou.aliyuncs.com
  阿里云（北京）:              registry.cn-beijing.aliyuncs.com
  阿里云（上海）:              registry.cn-shanghai.aliyuncs.com
  阿里云（广州）:              registry.cn-guangzhou.aliyuncs.com
  腾讯云:                      ccr.ccs.tencentyun.com
  网易云:                      hub-mirror.c.163.com

========================================
镜像使用
========================================

发布成功后，镜像地址为:
  ghcr.io/你的用户名/cssc-node-view:1.0.0
  ghcr.io/你的用户名/cssc-node-view:latest

拉取镜像:
  docker pull ghcr.io/你的用户名/cssc-node-view:1.0.0

运行容器:
  docker run -d -p 3000:3000 --name cssc-node-view ghcr.io/你的用户名/cssc-node-view:1.0.0

EOF
}

# 解析参数
VERSION=""
BRANCH=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v)
            VERSION="$2"
            shift 2
            ;;
        -b)
            BRANCH="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 获取当前分支
if [ -z "$BRANCH" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
fi

# 自动生成版本号
if [ -z "$VERSION" ]; then
    CURRENT_TIME=$(date '+%Y%m%d-%H%M%S')
    VERSION="docker-$CURRENT_TIME"
fi

# 添加 v 前缀（如果没有）
TAG_VERSION="v$VERSION"

# 获取仓库信息
REPO_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename -s .git "$REPO_URL" 2>/dev/null || echo "cssc-node-view")

echo "========================================="
echo "Docker 镜像发布准备"
echo "========================================="
echo "仓库: $REPO_NAME"
echo "分支: $BRANCH"
echo "版本: $TAG_VERSION"
echo "========================================="

# 检查是否在正确的分支上
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    log_error "当前分支 '$CURRENT_BRANCH' 与指定分支 '$BRANCH' 不一致"
    echo "请先切换到 $BRANCH 分支，或使用 -b $CURRENT_BRANCH 指定当前分支"
    exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    log_error "工作区有未提交的更改"
    echo "请先提交或暂存更改后再发布"
    exit 1
fi

# 检查标签是否已存在
if git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
    log_error "标签 '$TAG_VERSION' 已存在"
    echo "如需覆盖，请先删除："
    echo "  git tag -d $TAG_VERSION"
    echo "  git push origin --delete refs/tags/$TAG_VERSION"
    exit 1
fi

# 检查当前 commit 是否已有其他标签
EXISTING_TAGS=$(git tag --points-at HEAD)
if [ -n "$EXISTING_TAGS" ]; then
    log_warn "当前 commit 已有标签:"
    echo "$EXISTING_TAGS" | sed 's/^/  - /'
    echo ""
fi

# 显示即将执行的操作
echo "========================================="
echo "即将执行的操作"
echo "========================================="
echo "[步骤 1/3] 创建标签 $TAG_VERSION"
echo "[步骤 2/3] 推送标签到远程仓库"
echo "[步骤 3/3] GitHub Actions 自动构建镜像"
echo "========================================="

if [ "$DRY_RUN" = true ]; then
    echo "========================================="
    log_info "预览模式，跳过实际执行"
    echo "========================================="
    exit 0
fi

# 确认执行
read -p "确认发布？(Y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    log_info "已取消发布"
    exit 0
fi

# 创建标签
echo "[步骤 1/3] 创建标签 $TAG_VERSION..."
git tag -a "$TAG_VERSION" -m "Docker 镜像版本 $TAG_VERSION

版本信息:
- 分支: $BRANCH
- 发布时间: $(date '+%Y-%m-%d %H:%M:%S')
- 标签类型: Docker 镜像发布标签

此标签将触发 GitHub Actions 自动构建 Docker 镜像。"

log_info "标签创建成功"

# 推送标签
echo "[步骤 2/3] 推送标签到远程仓库..."
git push origin "$TAG_VERSION"
log_info "标签推送成功"

# 显示完成信息
echo "========================================="
log_info "Docker 镜像发布流程已触发！"
echo "========================================="
echo "标签版本: $TAG_VERSION"
echo "提交哈希: $(git rev-parse HEAD)"
echo "源分支: $BRANCH"
echo "========================================="
echo "GitHub Actions 构建状态:"
echo "  $REPO_URL/actions"
echo "========================================="
echo "镜像地址（构建完成后）:"
echo "  ghcr.io/你的用户名/$REPO_NAME:$TAG_VERSION"
echo "  ghcr.io/你的用户名/$REPO_NAME:latest"
echo "========================================="
echo "拉取命令:"
echo "  docker pull ghcr.io/你的用户名/$REPO_NAME:$TAG_VERSION"
echo "========================================="
echo "运行命令:"
echo "  docker run -d -p 3000:3000 --name $REPO_NAME ghcr.io/你的用户名/$REPO_NAME:$TAG_VERSION"
echo "========================================="
