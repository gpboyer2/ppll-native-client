#!/bin/bash

# 控制台日志清理脚本
# 用于清理前端项目 console.log 中的冗余堆栈信息
# 过滤掉文件路径、行号、匿名函数等噪音，保留核心日志内容
# 清理后的日志会按时间戳保存到 console.log 目录

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="${SCRIPT_DIR}/console.log/t.log"
OUTPUT_DIR="${SCRIPT_DIR}/console.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}正在读取: ${INPUT_FILE}${NC}"
echo ""

if [[ ! -f "$INPUT_FILE" ]]; then
    echo -e "${YELLOW}文件不存在，已创建空文件，请粘贴日志后保存${NC}"
    mkdir -p "$OUTPUT_DIR"
    touch "$INPUT_FILE"
    ${EDITOR:-vi} "$INPUT_FILE"
    echo ""
    echo -e "${YELLOW}文件已保存，按回车继续清理...${NC}"
    read
fi

echo -e "${GREEN}====== 清理结果 ======${NC}"
echo ""

# 清理并输出，同时保存
perl -pe 's/^[a-zA-Z0-9_.\/-]+\.(js|ts|vue):[0-9]+\s*//' "$INPUT_FILE" | \
    grep -vE '^[[:space:]]*(anonymous|Promise\.then|chunk-)' | \
    grep -vE '^\(anonymous\)|Promise\.then$|^run$|^patch$|^call$|^setup$|^mount$|^process$|^flush$|^queue$|^effect$|^trigger$|^notify$|^job$|^wrap$|^request$|^watch$' | \
    grep -vE '@.*:[0-9]+$' | \
    grep -vE '^[[:space:]]*$' | \
    grep -v '^Port connected$' | \
    grep -v '^Disconnected from' | \
    grep -v 'await in ' | \
    grep -vE 'Vue |If this is a native custom element' | \
    grep -vE 'Proxy\(Object\)' | \
    grep -v '^$' | \
    tee "$OUTPUT_DIR/${TIMESTAMP}.log"

echo ""
echo -e "${GREEN}已保存到: ${OUTPUT_DIR}/${TIMESTAMP}.log${NC}"
