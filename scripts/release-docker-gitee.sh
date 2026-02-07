#!/bin/bash

# Docker 镜像 Gitee 发布脚本
# 使用相对路径，可复制到其他设备使用
# 适用于 Gitee 仓库，本地构建镜像并推送
#
# 使用方法:
# chmod +x release-docker-gitee.sh
# ./release-docker-gitee.sh                    # 构建镜像、创建标签并推送到 Gitee
# ./release-docker-gitee.sh -v 1.0.0           # 指定版本号
# ./release-docker-gitee.sh -v 1.0.0 --push    # 构建并推送到镜像仓库
# ./release-docker-gitee.sh --dry-run          # 预览模式

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

# 默认配置
IMAGE_NAME="${IMAGE_NAME:-cssc-node-view}"
REGISTRY="${REGISTRY:-}"
PUSH_IMAGE=false
PUSH_TAG=false

# 显示帮助信息
show_help() {
    cat << EOF
Docker 镜像 Gitee 发布脚本

适用于 Gitee 仓库，本地构建 Docker 镜像

用法:
    ./release-docker-gitee.sh [选项]

选项:
    -v VERSION              指定版本号 (默认: 自动生成)
    -n NAME                 指定镜像名称 (默认: cssc-node-view)
    -r REGISTRY             指定镜像仓库地址 (默认: 不推送)
    --push                  构建后推送到镜像仓库
    --push-tag              同时推送 git 标签到远程
    --dry-run               预览模式，不实际执行
    -h, --help              显示帮助信息

版本号格式:
    手动指定: 1.0.0, 2.1.3 等
    自动生成: docker-YYYYMMDD-HHMMSS

========================================
使用示例
========================================

1. 本地构建并创建 Gitee 标签
   ./release-docker-gitee.sh

2. 本地构建、创建标签并推送到 Gitee
   ./release-docker-gitee.sh -v 1.0.0 --push-tag

3. 构建并推送到阿里云
   ./release-docker-gitee.sh -v 1.0.0 -r registry.cn-hangzhou.aliyuncs.com/你的命名空间 --push

4. 完整发布（构建、推送标签、推送镜像）
   ./release-docker-gitee.sh -v 1.0.0 -r registry.cn-hangzhou.aliyuncs.com/你的命名空间 --push --push-tag

========================================
镜像仓库地址
========================================
  阿里云（杭州）:   registry.cn-hangzhou.aliyuncs.com
  阿里云（北京）:   registry.cn-beijing.aliyuncs.com
  阿里云（上海）:   registry.cn-shanghai.aliyuncs.com
  阿里云（广州）:   registry.cn-guangzhou.aliyuncs.com
  腾讯云:           ccr.ccs.tencentyun.com
  Docker Hub:      docker.io

========================================
推送前准备
========================================

推送镜像前需要先登录镜像仓库:
  阿里云: docker login registry.cn-hangzhou.aliyuncs.com
  腾讯云: docker login ccr.ccs.tencentyun.com
  Docker Hub: docker login

EOF
}

# 解析参数
VERSION=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v)
            VERSION="$2"
            shift 2
            ;;
        -n)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -r)
            REGISTRY="$2"
            shift 2
            ;;
        --push)
            PUSH_IMAGE=true
            shift
            ;;
        --push-tag)
            PUSH_TAG=true
            shift
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

# 自动生成版本号
if [ -z "$VERSION" ]; then
    CURRENT_TIME=$(date '+%Y%m%d-%H%M%S')
    VERSION="docker-$CURRENT_TIME"
fi

# 完整镜像名
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"
else
    FULL_IMAGE="${IMAGE_NAME}"
fi

# 获取 Gitee 仓库信息
REPO_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename -s .git "$REPO_URL" 2>/dev/null || echo "cssc-node-view")

echo "========================================="
echo "Docker 镜像 Gitee 发布准备"
echo "========================================="
echo "Gitee 仓库: $REPO_NAME"
echo "镜像名称: $IMAGE_NAME"
echo "版本号: $VERSION"
if [ -n "$REGISTRY" ]; then
    echo "镜像仓库: $REGISTRY"
    echo "完整地址: ${FULL_IMAGE}:${VERSION}"
else
    echo "镜像仓库: 本地（不推送）"
fi
echo "========================================="

# 检查是否是 Gitee 仓库
if [[ ! "$REPO_URL" =~ gitee\.com ]]; then
    log_warn "当前仓库不是 Gitee 仓库"
    echo "仓库地址: $REPO_URL"
fi

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    log_error "Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 Dockerfile 是否存在
if [ ! -f "release-build/docker/Dockerfile.prod" ]; then
    log_error "Dockerfile 不存在: release-build/docker/Dockerfile.prod"
    exit 1
fi

# 检查是否需要推送且是否已登录
if [ "$PUSH_IMAGE" = true ] && [ -n "$REGISTRY" ]; then
    if ! docker info | grep -q "Username"; then
        log_warn "未检测到 Docker 登录状态"
        echo "推送前请先登录: docker login $REGISTRY"
    fi
fi

# 显示即将执行的操作
echo "========================================="
echo "即将执行的操作"
echo "========================================="
echo "[步骤 1/4] 构建 Docker 镜像"
echo "[步骤 2/4] 打标签"
echo "[步骤 3/4] 创建 git 标签 v$VERSION"
if [ "$PUSH_TAG" = true ]; then
    echo "[步骤 4/4] 推送标签到 Gitee"
fi
if [ "$PUSH_IMAGE" = true ]; then
    echo "[步骤 5/5] 推送镜像到 $REGISTRY"
fi
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

# 步骤 1: 构建镜像
echo "[步骤 1/5] 构建 Docker 镜像..."
docker build \
    -f release-build/docker/Dockerfile.prod \
    -t "${IMAGE_NAME}:${VERSION}" \
    --build-arg NODE_VERSION=22 \
    --build-arg MIRROR_URL=https://registry.npmmirror.com \
    .

log_info "镜像构建完成: ${IMAGE_NAME}:${VERSION}"

# 步骤 2: 打标签
echo "[步骤 2/5] 打标签..."
docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
log_info "已打 latest 标签"

if [ -n "$REGISTRY" ]; then
    docker tag "${IMAGE_NAME}:${VERSION}" "${FULL_IMAGE}:${VERSION}"
    docker tag "${IMAGE_NAME}:latest" "${FULL_IMAGE}:latest"
    log_info "已打仓库标签"
fi

# 步骤 3: 创建 git 标签
echo "[步骤 3/5] 创建 git 标签..."

TAG_VERSION="v$VERSION"

# 检查标签是否已存在
if git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
    log_warn "标签 '$TAG_VERSION' 已存在"
    read -p "是否删除现有标签并重新创建？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d "$TAG_VERSION"
        if [ "$PUSH_TAG" = true ]; then
            git push origin --delete refs/tags/"$TAG_VERSION" 2>/dev/null || true
        fi
        log_info "已删除现有标签"
    else
        log_info "保留现有标签，跳过创建"
    fi
fi

# 检查是否有未提交的更改
HAS_UNCOMMITTED=false
if [ -n "$(git status --porcelain)" ]; then
    log_warn "工作区有未提交的更改"
    HAS_UNCOMMITTED=true
fi

# 重新创建标签（如果已删除或不存在）
if ! git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
    git tag -a "$TAG_VERSION" -m "Docker 镜像版本 $TAG_VERSION

版本信息:
- Gitee 仓库: $REPO_NAME
- 镜像名称: $IMAGE_NAME
- 版本: $VERSION
- 构建时间: $(date '+%Y-%m-%d %H:%M:%S')
- 标签类型: Docker 镜像 Gitee 发布标签

此标签标记了本地构建的 Docker 镜像版本。"

    log_info "标签创建成功: $TAG_VERSION"
fi

# 步骤 4: 推送标签到 Gitee
if [ "$PUSH_TAG" = true ]; then
    echo "[步骤 4/5] 推送标签到 Gitee..."
    git push origin "$TAG_VERSION"
    log_info "标签推送成功"
    echo ""
    echo "Gitee 标签地址:"
    echo "  $REPO_URL/tags/$TAG_VERSION"
else
    echo "[步骤 4/5] 跳过推送标签"
    echo ""
    echo "提示: 使用 --push-tag 参数可将标签推送到 Gitee"
fi

# 步骤 5: 推送镜像
if [ "$PUSH_IMAGE" = true ]; then
    if [ -z "$REGISTRY" ]; then
        log_warn "未指定镜像仓库，跳过推送"
    else
        echo "[步骤 5/5] 推送镜像到 $REGISTRY..."
        docker push "${FULL_IMAGE}:${VERSION}"
        docker push "${FULL_IMAGE}:latest"
        log_info "镜像推送成功"
    fi
else
    echo "[步骤 5/5] 跳过镜像推送"
    echo ""
    echo "提示: 使用 -r 指定仓库地址并配合 --push 可推送镜像"
fi

# 显示完成信息
echo ""
echo "========================================="
log_info "Docker 镜像 Gitee 发布完成！"
echo "========================================="
echo "Gitee 仓库: $REPO_NAME"
echo "镜像名称: $IMAGE_NAME"
echo "版本号: $VERSION"
echo "Git 标签: v$VERSION"
echo "========================================="
echo "本地镜像:"
echo "  ${IMAGE_NAME}:${VERSION}"
echo "  ${IMAGE_NAME}:latest"
if [ -n "$REGISTRY" ]; then
    echo "仓库镜像:"
    echo "  ${FULL_IMAGE}:${VERSION}"
    echo "  ${FULL_IMAGE}:latest"
fi
echo "========================================="

if [ "$HAS_UNCOMMITTED" = true ]; then
    echo ""
    echo "========================================="
    log_warn "注意: 工作区有未提交的更改"
    echo "========================================="
    echo "Git 标签仅在本地创建，未推送到远程"
    echo "如需推送，请先提交更改后执行:"
    echo "  git push origin $TAG_VERSION"
    echo "========================================="
fi

echo ""
echo "========================================="
echo "使用命令"
echo "========================================="
echo "运行容器:"
echo "  docker run -d -p 3000:3000 --name $IMAGE_NAME ${IMAGE_NAME}:${VERSION}"
echo ""
echo "查看镜像:"
echo "  docker images | grep $IMAGE_NAME"
echo ""
echo "查看运行中的容器:"
echo "  docker ps"
echo ""
echo "停止容器:"
echo "  docker stop $IMAGE_NAME"
echo ""
echo "删除容器:"
echo "  docker rm $IMAGE_NAME"
echo "========================================="

if [ "$PUSH_IMAGE" = false ] && [ -n "$REGISTRY" ]; then
    echo ""
    echo "========================================="
    echo "推送命令提示:"
    echo "========================================="
    echo "如需推送镜像，请执行:"
    echo "  docker push ${FULL_IMAGE}:${VERSION}"
    echo "  docker push ${FULL_IMAGE}:latest"
    echo "========================================="
fi

if [ "$PUSH_TAG" = false ]; then
    echo ""
    echo "========================================="
    echo "推送标签提示:"
    echo "========================================="
    echo "如需推送标签到 Gitee，请执行:"
    echo "  git push origin $TAG_VERSION"
    echo "========================================="
fi
