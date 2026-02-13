#!/bin/bash

# Mac 系统资源监控与清理脚本
# 适用于 Intel Mac，帮助定位高 CPU/内存占用进程并清理不必要的后台程序

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 分隔线
LINE="============================================================"

echo -e "${BLUE}${LINE}${NC}"
echo -e "${BLUE}       Mac 系统资源监控与清理工具${NC}"
echo -e "${BLUE}       运行时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}${LINE}${NC}"
echo ""

# 1. 显示 CPU 占用最高的前 15 个进程
echo -e "${YELLOW}【CPU 占用排行榜 - 前 15 名】${NC}"
echo -e "${YELLOW}风扇狂转的罪魁祸首通常在这里！${NC}"
echo "------------------------------------------------------------"
printf "%-8s %-6s %-6s %s\n" "PID" "CPU%" "MEM%" "进程名称"
echo "------------------------------------------------------------"
ps aux | sort -nrk 3 | head -15 | awk '{printf "%-8s %-6s %-6s %s\n", $2, $3, $4, $11}'
echo ""

# 2. 显示内存占用最高的前 10 个进程
echo -e "${YELLOW}【内存占用排行榜 - 前 10 名】${NC}"
echo "------------------------------------------------------------"
printf "%-8s %-6s %-6s %s\n" "PID" "CPU%" "MEM%" "进程名称"
echo "------------------------------------------------------------"
ps aux | sort -nrk 4 | head -10 | awk '{printf "%-8s %-6s %-6s %s\n", $2, $3, $4, $11}'
echo ""

# 3. 检测可疑的后台进程
echo -e "${RED}【可疑进程检测】${NC}"
echo "------------------------------------------------------------"

# 检测常见的可疑进程模式
SUSPICIOUS_PATTERNS=(
    "cryptominer"
    "xmrig"
    "coinhive"
    "minergate"
    "nicehash"
    "cpuminer"
    "minerd"
    "cgminer"
    "bfgminer"
    "ethminer"
)

FOUND_SUSPICIOUS=0
for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    result=$(pgrep -fil "$pattern" 2>/dev/null)
    if [ -n "$result" ]; then
        echo -e "${RED}⚠️  发现可疑进程: $result${NC}"
        FOUND_SUSPICIOUS=1
    fi
done

if [ $FOUND_SUSPICIOUS -eq 0 ]; then
    echo -e "${GREEN}✓ 未发现已知的恶意挖矿程序${NC}"
fi
echo ""

# 4. 检测异常的 CPU 占用进程（超过 80%）
echo -e "${RED}【高 CPU 占用警告 (>80%)】${NC}"
echo "------------------------------------------------------------"
HIGH_CPU=$(ps aux | awk '$3 > 80 {print $2, $3"%", $11}')
if [ -n "$HIGH_CPU" ]; then
    echo -e "${RED}$HIGH_CPU${NC}"
else
    echo -e "${GREEN}✓ 没有进程 CPU 占用超过 80%${NC}"
fi
echo ""

# 5. 列出常见的可清理后台程序
echo -e "${YELLOW}【可清理的后台程序】${NC}"
echo "------------------------------------------------------------"

# 定义常见的可清理程序列表
CLEANABLE_APPS=(
    "Spotlight:mds_stores:系统索引服务，高占用时可临时禁用"
    "Spotlight:mds:系统索引服务"
    "Spotlight:mdworker:系统索引工作进程"
    "Google更新:Google:谷歌自动更新服务"
    "Adobe更新:Adobe:Adobe后台服务"
    "Microsoft更新:Microsoft AutoUpdate:微软自动更新"
    "Dropbox:Dropbox:云同步服务"
    "OneDrive:OneDrive:微软云同步"
    "iCloud同步:bird:iCloud后台同步"
    "时间机器:backupd:Time Machine备份"
    "照片分析:photoanalysisd:照片面部识别分析"
    "Siri:assistantd:Siri后台服务"
    "Siri:siriknowledged:Siri知识服务"
)

echo ""
echo "正在检测运行中的可清理程序..."
echo ""

for item in "${CLEANABLE_APPS[@]}"; do
    IFS=':' read -r name pattern desc <<< "$item"
    pid=$(pgrep -f "$pattern" 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
        cpu=$(ps -p $pid -o %cpu= 2>/dev/null | tr -d ' ')
        if [ -n "$cpu" ]; then
            echo -e "  ${YELLOW}▸${NC} $name (PID: $pid, CPU: ${cpu}%) - $desc"
        fi
    fi
done
echo ""

# 6. 交互式清理菜单
echo -e "${BLUE}${LINE}${NC}"
echo -e "${BLUE}【清理选项】${NC}"
echo -e "${BLUE}${LINE}${NC}"
echo ""
echo "  1) 清理 DNS 缓存"
echo "  2) 清理系统缓存"
echo "  3) 关闭 Spotlight 索引 (临时)"
echo "  4) 清理内存 (purge)"
echo "  5) 查看并关闭指定 PID 的进程"
echo "  6) 重启 Finder"
echo "  7) 显示所有登录启动项"
echo "  8) 退出"
echo ""
read -p "请选择操作 (1-8): " choice

case $choice in
    1)
        echo "正在清理 DNS 缓存..."
        sudo dscacheutil -flushcache
        sudo killall -HUP mDNSResponder
        echo -e "${GREEN}✓ DNS 缓存已清理${NC}"
        ;;
    2)
        echo "正在清理系统缓存..."
        rm -rf ~/Library/Caches/* 2>/dev/null
        echo -e "${GREEN}✓ 用户缓存已清理${NC}"
        ;;
    3)
        echo "正在临时关闭 Spotlight 索引..."
        sudo mdutil -a -i off
        echo -e "${GREEN}✓ Spotlight 索引已关闭${NC}"
        echo -e "${YELLOW}提示: 使用 'sudo mdutil -a -i on' 可重新开启${NC}"
        ;;
    4)
        echo "正在清理内存..."
        sudo purge
        echo -e "${GREEN}✓ 内存已清理${NC}"
        ;;
    5)
        read -p "请输入要关闭的进程 PID: " target_pid
        if [ -n "$target_pid" ]; then
            ps -p $target_pid -o pid,comm= 2>/dev/null
            read -p "确认关闭此进程? (y/n): " confirm
            if [ "$confirm" = "y" ]; then
                kill -9 $target_pid 2>/dev/null
                echo -e "${GREEN}✓ 进程 $target_pid 已关闭${NC}"
            fi
        fi
        ;;
    6)
        echo "正在重启 Finder..."
        killall Finder
        echo -e "${GREEN}✓ Finder 已重启${NC}"
        ;;
    7)
        echo ""
        echo -e "${YELLOW}【登录启动项列表】${NC}"
        echo "------------------------------------------------------------"
        osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null
        echo ""
        echo -e "${YELLOW}【LaunchAgents (用户级)】${NC}"
        ls -la ~/Library/LaunchAgents/ 2>/dev/null | grep -v "^total"
        echo ""
        echo -e "${YELLOW}【LaunchDaemons (系统级)】${NC}"
        ls -la /Library/LaunchDaemons/ 2>/dev/null | grep -v "^total" | head -20
        ;;
    8)
        echo "退出脚本"
        exit 0
        ;;
    *)
        echo "无效选项"
        ;;
esac

echo ""
echo -e "${BLUE}${LINE}${NC}"
echo -e "${GREEN}脚本执行完毕！${NC}"
echo -e "${BLUE}${LINE}${NC}"
