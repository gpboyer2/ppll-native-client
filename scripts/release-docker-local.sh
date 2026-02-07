#!/bin/bash

# ==========================================
# Docker 镜像本地构建脚本
# ==========================================
#
# 交互式（需确认）:
#   chmod +x release-docker-local.sh
#   ./scripts/release-docker-local.sh
#
# 命令式（无需确认）:
#   ./scripts/release-docker-local.sh --prod              # 构建生产镜像
#   ./scripts/release-docker-local.sh --dev               # 构建开发镜像
#   ./scripts/release-docker-local.sh -m prod             # 同上
#   ./scripts/release-docker-local.sh --prod -v 1.0.0     # 指定版本号
#   ./scripts/release-docker-local.sh --prod --push       # 构建并推送
#
# 选项:
#   -m MODE    构建模式: dev(开发), prod(生产), all(两者)
#   -v VERSION 指定版本号
#   -n NAME    指定镜像名称
#   -o DIR     指定输出目录
#   -r REGISTRY 指定镜像仓库
#   --push     推送到仓库
#   --no-cache 构建时不使用缓存
#

set -e

# 智能切换到项目根目录（无论从哪里执行脚本）
#   - 在根目录执行: ./scripts/release-docker-local.sh  → cd 到根目录
#   - 在 scripts 目录执行: ./release-docker-local.sh    → cd 到根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 检测 buildx 是否可用
USE_BUILDX=false
if docker buildx version >/dev/null 2>&1; then
    USE_BUILDX=true
fi

# ==========================================
# 启用 BuildKit（加速构建）
# ==========================================
if [ "$USE_BUILDX" = true ]; then
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
fi

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
OUTPUT_DIR="release-build/docker/reports"
BUILD_MODE=""
USE_CACHE=true

# 解析参数
VERSION=""
NO_TAG=false
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --prod)
            BUILD_MODE="prod"
            EXPLICIT_MODE=1
            shift
            ;;
        --dev)
            BUILD_MODE="dev"
            EXPLICIT_MODE=1
            shift
            ;;
        -m)
            BUILD_MODE="$2"
            EXPLICIT_MODE=1
            shift 2
            ;;
        -v)
            VERSION="$2"
            shift 2
            ;;
        -n)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -o)
            OUTPUT_DIR="$2"
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
        --no-tag)
            NO_TAG=true
            shift
            ;;
        --no-cache)
            USE_CACHE=false
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRM=true
            shift
            ;;
        -h|--help)
            cat << EOF
Docker 镜像本地构建脚本 (已启用 BuildKit)

用法:
    ./scripts/release-docker-local.sh [选项]

选项:
    --prod, -m prod         构建生产镜像
    --dev, -m dev           构建开发镜像
    -m all                  同时构建两者
    -v VERSION              指定版本号
    -n NAME                 指定镜像名称
    -o DIR                  指定输出目录
    -r REGISTRY             指定镜像仓库
    --push                  推送到仓库
    --no-cache              不使用缓存
    -y, --yes               跳过确认

示例:
    ./scripts/release-docker-local.sh --prod
    ./scripts/release-docker-local.sh --prod -v 1.0.0
    ./scripts/release-docker-local.sh --prod --push -r registry.cn-hangzhou.aliyuncs.com/namespace

优化说明:
    - 已启用 BuildKit 加速构建
    - 使用 cache mount 缓存 pnpm 下载
    - 第二次构建时依赖会被缓存，速度更快
EOF
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 验证构建模式
if [ -n "$BUILD_MODE" ] && [ "$BUILD_MODE" != "dev" ] && [ "$BUILD_MODE" != "prod" ] && [ "$BUILD_MODE" != "all" ]; then
    log_error "无效的构建模式: $BUILD_MODE"
    exit 1
fi

# 自动生成版本号
if [ -z "$VERSION" ]; then
    CURRENT_TIME=$(date '+%Y%m%d-%H%M%S')
    VERSION="docker-$CURRENT_TIME"
fi

# 交互式选择构建模式
if [ -z "$BUILD_MODE" ]; then
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo "请选择构建模式"
    echo -e "${BLUE}========================================${NC}"
    echo "  1) 生产环境 (prod)   - 单容器，体积小"
    echo "  2) 开发环境 (dev)    - 支持热重载"
    echo "  3) 全部 (all)"
    echo -e "${BLUE}========================================${NC}"
    read -p "请输入选项 [1-3，默认 1]: " -n 1 -r MODE_CHOICE
    echo

    case "$MODE_CHOICE" in
        2)
            BUILD_MODE="dev"
            ;;
        3)
            BUILD_MODE="all"
            ;;
        1|"")
            BUILD_MODE="prod"
            ;;
        *)
            log_error "无效的选项"
            exit 1
            ;;
    esac
    # 交互式选择后跳过确认
    SKIP_CONFIRM=true
fi

# 确定要构建的镜像列表
BUILD_LIST=()
if [ "$BUILD_MODE" = "prod" ] || [ "$BUILD_MODE" = "all" ]; then
    BUILD_LIST+=("prod")
fi
if [ "$BUILD_MODE" = "dev" ] || [ "$BUILD_MODE" = "all" ]; then
    BUILD_LIST+=("dev")
fi

# 完整镜像名
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"
else
    FULL_IMAGE="${IMAGE_NAME}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo "Docker 镜像构建准备"
echo -e "${BLUE}========================================${NC}"
echo -e "${CYAN}镜像名称:${NC} $IMAGE_NAME"
echo -e "${CYAN}版本号:${NC} $VERSION"
echo -e "${CYAN}构建模式:${NC} $BUILD_MODE"
echo -e "${CYAN}使用缓存:${NC} $USE_CACHE"
echo -e "${CYAN}BuildKit:${NC} 已启用"
if [ -n "$REGISTRY" ]; then
    echo -e "${CYAN}仓库:${NC} $REGISTRY"
fi
echo -e "${BLUE}========================================${NC}"

# 检查 Docker
ensure_docker_running() {
    if docker info >/dev/null 2>&1; then
        return 0
    fi

    log_warn "Docker 未运行，尝试启动..."
    log_warn "首次启动可能需要下载镜像，请耐心等待..."

    if command -v colima >/dev/null 2>&1; then
        log_info "启动 Colima (显示进度)..."
        # 先检查是否已运行，避免重复启动报错
        if colima status 2>/dev/null | grep -q "running"; then
            log_info "Colima 已在运行"
        else
            colima start --cpu 4 --memory 8
        fi
    elif command -v orb >/dev/null 2>&1; then
        log_info "启动 OrbStack..."
        orb start
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "启动 Docker Desktop..."
        open -a Docker
        log_warn "等待 Docker Desktop 启动..."
        for i in {1..30}; do
            sleep 1
            docker info >/dev/null 2>&1 && break
        done
    else
        log_error "无法启动 Docker"
        return 1
    fi

    # 等待 Docker 就绪
    log_warn "等待 Docker 就绪..."
    local count=0
    while ! docker info >/dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
        if [ $count -gt 60 ]; then
            log_error "Docker 启动超时"
            return 1
        fi
    done

    log_info "Docker 已启动"
    return 0
}

ensure_docker_running || exit 1

# 检查 Dockerfile
for mode in "${BUILD_LIST[@]}"; do
    DOCKERFILE="release-build/docker/Dockerfile.$mode"
    if [ ! -f "$DOCKERFILE" ]; then
        log_error "Dockerfile 不存在: $DOCKERFILE"
        exit 1
    fi
done

# 确认（显式指定 --prod/--dev 时跳过）
if [ "$SKIP_CONFIRM" = false ] && [ -z "$EXPLICIT_MODE" ]; then
    echo ""
    echo -e "${YELLOW}即将构建: ${BUILD_LIST[*]}${NC}"
    read -p "确认构建？ " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "已取消"
        exit 0
    fi
fi

# ==========================================
# 预拉取基础镜像（避免构建时网络超时）
# ==========================================
ensure_base_image() {
    local dockerfile="$1"
    local base_image

    # 提取 FROM 后面的镜像名（跳过注释和空行）
    base_image=$(grep -E '^FROM[[:space:]]+' "$dockerfile" | head -1 | sed 's/^FROM[[:space:]]*//' | sed 's/[[:space:]]*AS.*$//' | sed 's/[[:space:]]*$//')

    if [ -z "$base_image" ]; then
        log_error "无法从 $dockerfile 提取基础镜像名"
        return 1
    fi

    # 检查本地是否存在（使用 docker images 避免 inspect 的权限问题）
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${base_image}$"; then
        log_info "基础镜像已存在: $base_image"
        return 0
    fi

    log_warn "基础镜像不存在，开始拉取: $base_image"

    # 尝试使用国内镜像源拉取（华为云、腾讯云等）
    local mirrors=(
        "swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io"
        "docker.m.daocloud.io"
        "docker.1panel.live"
    )

    for mirror in "${mirrors[@]}"; do
        local mirror_image="${mirror}/${base_image}"
        log_info "尝试从镜像源拉取: $mirror_image"
        if docker pull "$mirror_image" 2>/dev/null; then
            log_info "镜像源拉取成功，打标签为 $base_image"
            docker tag "$mirror_image" "$base_image"
            docker rmi "$mirror_image" 2>/dev/null || true
            return 0
        fi
        log_warn "镜像源 $mirror 拉取失败，尝试下一个..."
    done

    # 所有镜像源都失败，尝试官方源
    log_warn "所有镜像源失败，尝试官方源..."
    if docker pull "$base_image"; then
        log_info "基础镜像拉取成功: $base_image"
        return 0
    else
        log_error "基础镜像拉取失败: $base_image"
        log_error "建议配置代理或检查网络连接"
        return 1
    fi
}

# ==========================================
# 清理旧的时间戳镜像（构建前）
# ==========================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo "清理旧的时间戳镜像"
echo -e "${BLUE}========================================${NC}"
for mode in "${BUILD_LIST[@]}"; do
    MODE_IMAGE_NAME="${IMAGE_NAME}-${mode}"
    # 删除所有带 docker- 时间戳的旧镜像，保留 latest
    OLD_IMAGES=$(docker images "${MODE_IMAGE_NAME}" --format "{{.Tag}}" | grep "^docker-" || true)
    if [ -n "$OLD_IMAGES" ]; then
        log_info "清理 ${MODE_IMAGE_NAME} 的旧镜像..."
        for tag in $OLD_IMAGES; do
            docker rmi "${MODE_IMAGE_NAME}:${tag}" 2>/dev/null || true
        done
    fi
done
docker image prune -f >/dev/null 2>&1 || true
log_info "清理完成"

# 预拉取所有需要的基础镜像
echo ""
echo -e "${BLUE}========================================${NC}"
echo "检查基础镜像"
echo -e "${BLUE}========================================${NC}"
for mode in "${BUILD_LIST[@]}"; do
    DOCKERFILE="release-build/docker/Dockerfile.$mode"
    ensure_base_image "$DOCKERFILE" || exit 1
done

# 构建参数
BUILD_ARGS=""
if [ "$USE_CACHE" = false ]; then
    BUILD_ARGS="--no-cache"
fi

# 记录开始时间
BUILD_START=$(date +%s)

# 循环构建
BUILT_IMAGES=()
for mode in "${BUILD_LIST[@]}"; do
    echo ""
    echo -e "${BLUE}========================================${NC}"
    log_info "构建 $mode 镜像"
    echo -e "${BLUE}========================================${NC}"

    MODE_IMAGE_NAME="${IMAGE_NAME}-${mode}"
    MODE_DOCKERFILE="release-build/docker/Dockerfile.${mode}"

    MODE_START=$(date +%s)

    # 构建（使用 buildx 或传统模式）
    if [ "$USE_BUILDX" = true ]; then
        docker buildx build \
            -f "$MODE_DOCKERFILE" \
            -t "${MODE_IMAGE_NAME}:${VERSION}" \
            --load \
            $BUILD_ARGS \
            .
    else
        docker build \
            -f "$MODE_DOCKERFILE" \
            -t "${MODE_IMAGE_NAME}:${VERSION}" \
            $BUILD_ARGS \
            .
    fi

    MODE_END=$(date +%s)
    MODE_TIME=$((MODE_END - MODE_START))

    log_info "$mode 镜像构建完成 (用时: ${MODE_TIME}秒)"

    # 打标签
    docker tag "${MODE_IMAGE_NAME}:${VERSION}" "${MODE_IMAGE_NAME}:latest"

    if [ -n "$REGISTRY" ]; then
        docker tag "${MODE_IMAGE_NAME}:${VERSION}" "${FULL_IMAGE}-${mode}:${VERSION}"
        docker tag "${MODE_IMAGE_NAME}:latest" "${FULL_IMAGE}-${mode}:latest"
    fi

    # 显示镜像大小
    IMAGE_SIZE=$(docker images "${MODE_IMAGE_NAME}:${VERSION}" --format "{{.Size}}")
    log_info "镜像大小: $IMAGE_SIZE"

    BUILT_IMAGES+=("$mode")
done

BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

# 创建 git 标签
if [ "$NO_TAG" = false ]; then
    echo ""
    TAG_VERSION="v$VERSION"
    if ! git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
        git tag -a "$TAG_VERSION" -m "Docker $VERSION" >/dev/null 2>&1 || true
        log_info "标签创建: $TAG_VERSION"
    fi
fi

# 推送镜像
if [ "$PUSH_IMAGE" = true ] && [ -n "$REGISTRY" ]; then
    echo ""
    for mode in "${BUILT_IMAGES[@]}"; do
        log_info "推送 $mode 镜像..."
        docker push "${FULL_IMAGE}-${mode}:${VERSION}"
        docker push "${FULL_IMAGE}-${mode}:latest"
    done
fi

# 导出镜像
echo ""
echo -e "${BLUE}========================================${NC}"
echo "导出镜像"
echo -e "${BLUE}========================================${NC}"

mkdir -p "$OUTPUT_DIR"

EXPORTED_FILES=()
for mode in "${BUILT_IMAGES[@]}"; do
    MODE_IMAGE_NAME="${IMAGE_NAME}-${mode}"
    IMAGE_FILE="${OUTPUT_DIR}/${MODE_IMAGE_NAME}-${VERSION}.tar"

    docker save "${MODE_IMAGE_NAME}:${VERSION}" -o "$IMAGE_FILE"
    FILE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
    log_info "导出: $IMAGE_FILE ($FILE_SIZE)"

    EXPORTED_FILES+=("$IMAGE_FILE")
done

# 删除已构建的镜像和临时容器（只保留 tar 文件）
echo ""
echo -e "${BLUE}========================================${NC}"
echo "删除已构建镜像和临时容器（保留 tar 文件）"
echo -e "${BLUE}========================================${NC}"

# 先停止所有项目相关容器（通过名称前缀匹配）
log_info "停止项目相关容器..."
docker ps -a --filter "name=cssc-" -q | xargs -r docker stop -t 0 2>/dev/null || true

# 再删除所有项目相关容器
log_info "删除项目相关容器..."
docker ps -a --filter "name=cssc-" -q | xargs -r docker rm 2>/dev/null || true

# 删除镜像
for mode in "${BUILT_IMAGES[@]}"; do
    MODE_IMAGE_NAME="${IMAGE_NAME}-${mode}"
    # 删除镜像
    docker rmi "${MODE_IMAGE_NAME}:${VERSION}" 2>/dev/null || true
    docker rmi "${MODE_IMAGE_NAME}:latest" 2>/dev/null || true
    log_info "已删除: ${MODE_IMAGE_NAME}"
done
docker image prune -f >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true
log_info "清理完成"

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo "构建完成！"
echo -e "${GREEN}========================================${NC}"
echo -e "${CYAN}总用时:${NC} ${BUILD_TIME}秒"
echo ""
echo -e "${CYAN}导出文件:${NC}"
for file in "${EXPORTED_FILES[@]}"; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  $file ($SIZE)"
done
echo ""
echo -e "${CYAN}运行命令（从头开始）:${NC}"
for file in "${EXPORTED_FILES[@]}"; do
    # 提取 mode 和 VERSION 从文件名
    MODE=$(basename "$file" | sed "s/${IMAGE_NAME}-//" | sed "s/-${VERSION}.tar//")
    echo "  docker load -i $file"
    echo "  docker tag ${IMAGE_NAME}-${MODE}:${VERSION} ${IMAGE_NAME}-${MODE}:latest"
    echo "  docker run -d -p 9300:9300 -p 9200:9200 ${IMAGE_NAME}-${MODE}:latest"
    echo ""
done
echo -e "${GREEN}========================================${NC}"

# ==========================================
# 基础镜像拉取原理与注意事项
# ==========================================
#
# 【原理说明】
#
# 1. 镜像名称提取
#    - 从 Dockerfile 中提取 FROM 后的镜像名
#    - 自动处理 AS 别名（如 "FROM node:22-alpine AS build-tools"）
#    - 只提取第一个 FROM 指令的基础镜像
#
# 2. 存在性检查
#    - 使用 "docker images" 而非 "docker image inspect"
#    - 原因：inspect 在某些环境下可能因权限问题失败
#    - 检查格式为 "repository:tag" 的精确匹配
#
# 3. 国内镜像源 Fallback
#    - 按优先级尝试多个镜像源：
#      1. 华为云: swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io
#      2. DaoCloud: docker.m.daocloud.io
#      3. 1Panel: docker.1panel.live
#      4. Docker 官方源（最后尝试）
#    - 拉取成功后自动打标签为原始名称，删除镜像源标签
#
# 【约束与限制】
#
# 1. 网络环境
#    - 国内访问 Docker Hub 官方源经常超时
#    - 建议配置代理或确保镜像源可用
#    - 镜像源可能随时失效，需要定期更新
#
# 2. Docker 环境
#    - 需要 Docker daemon 运行中
#    - Colima/Docker Desktop 启动需要一定时间
#    - 确保有足够的磁盘空间存储镜像
#
# 3. 镜像版本
#    - 脚本只检查基础镜像，不检查依赖镜像
#    - 如果 Dockerfile 使用多个 FROM，只预拉取第一个
#
# 【注意事项】
#
# 1. Colima 镜像缓存
#    - 首次启动会下载 ~381MB 的 VM 磁盘镜像
#    - 镜像缓存位置: ~/Library/Caches/colima/caches/
#    - 本地存储位置: ~/.colima-storage/ (避免被清理软件删除)
#
# 2. 代理配置
#    - 如果使用代理，宿主机代理地址会自动转换为 VM 内地址
#    - 例如: 127.0.0.1:7890 -> 192.168.5.2:7890
#    - 转换由 Colima 自动处理，无需手动配置
#
# 3. 镜像清理
#    - 构建后会自动清理 1 小时前的中间镜像
#    - 已导出的镜像不会被删除
#    - 可手动运行 "docker image prune -f" 清理
#
# 【故障排查】
#
# 问题: 基础镜像拉取失败
# 解决: 检查网络连接，或配置代理 http_proxy=http://127.0.0.1:7890
#
# 问题: Docker 启动超时
# 解决: 检查 Colima 状态，运行 "colima status" 和 "colima start"
#
# 问题: 构建缓存不生效
# 解决: 首次构建会下载依赖，第二次构建会使用缓存
# ==========================================
