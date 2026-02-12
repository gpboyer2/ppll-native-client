#!/bin/bash

# 禁用不必要的启动项脚本

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo "       禁用不必要的启动项"
echo "============================================================"
echo ""

# 用户级 LaunchAgents
USER_AGENTS=(
    "$HOME/Library/LaunchAgents/com.google.GoogleUpdater.wake.plist:Google自动更新唤醒"
    "$HOME/Library/LaunchAgents/com.google.keystone.agent.plist:Google更新代理"
    "$HOME/Library/LaunchAgents/com.google.keystone.xpcservice.plist:Google更新XPC服务"
)

# 系统级 LaunchDaemons (需要sudo)
SYSTEM_DAEMONS=(
    "/Library/LaunchDaemons/com.oray.sunlogin.helper.plist:向日葵远程助手"
    "/Library/LaunchDaemons/com.oray.sunlogin.plist:向日葵远程服务"
    "/Library/LaunchDaemons/com.youqu.todesk.service.plist:ToDesk远程服务"
    "/Library/LaunchDaemons/com.youqu.todesk.UninstallerHelper.plist:ToDesk卸载助手"
    "/Library/LaunchDaemons/com.youqu.todesk.UninstallerWatcher.plist:ToDesk卸载监控"
    "/Library/LaunchDaemons/org.filezilla-project.filezilla-server.service.plist:FileZilla FTP服务"
)

echo -e "${YELLOW}【用户级启动项】${NC}"
echo "------------------------------------------------------------"
for item in "${USER_AGENTS[@]}"; do
    IFS=':' read -r path name <<< "$item"
    if [ -f "$path" ]; then
        echo -e "  ${GREEN}▸${NC} $name"
        echo "    路径: $path"
    fi
done

echo ""
echo -e "${YELLOW}【系统级启动项】${NC}"
echo "------------------------------------------------------------"
for item in "${SYSTEM_DAEMONS[@]}"; do
    IFS=':' read -r path name <<< "$item"
    if [ -f "$path" ]; then
        echo -e "  ${GREEN}▸${NC} $name"
        echo "    路径: $path"
    fi
done

echo ""
echo "============================================================"
echo "请选择要执行的操作："
echo "============================================================"
echo ""
echo "  1) 禁用 Google 自动更新 (推荐)"
echo "  2) 禁用向日葵远程控制"
echo "  3) 禁用 ToDesk 远程控制"
echo "  4) 禁用 FileZilla FTP 服务"
echo "  5) 禁用以上全部"
echo "  6) 退出"
echo ""
read -p "请选择 (1-6): " choice

disable_agent() {
    local path=$1
    local name=$2
    if [ -f "$path" ]; then
        launchctl unload "$path" 2>/dev/null
        # 移动到禁用目录而不是删除
        mkdir -p "$HOME/Library/LaunchAgents.disabled" 2>/dev/null
        mv "$path" "$HOME/Library/LaunchAgents.disabled/" 2>/dev/null
        echo -e "${GREEN}✓ 已禁用: $name${NC}"
    else
        echo -e "${YELLOW}⚠ 未找到: $name${NC}"
    fi
}

disable_daemon() {
    local path=$1
    local name=$2
    if [ -f "$path" ]; then
        sudo launchctl unload "$path" 2>/dev/null
        sudo mkdir -p "/Library/LaunchDaemons.disabled" 2>/dev/null
        sudo mv "$path" "/Library/LaunchDaemons.disabled/" 2>/dev/null
        echo -e "${GREEN}✓ 已禁用: $name${NC}"
    else
        echo -e "${YELLOW}⚠ 未找到: $name${NC}"
    fi
}

case $choice in
    1)
        echo ""
        echo "正在禁用 Google 自动更新..."
        disable_agent "$HOME/Library/LaunchAgents/com.google.GoogleUpdater.wake.plist" "Google更新唤醒"
        disable_agent "$HOME/Library/LaunchAgents/com.google.keystone.agent.plist" "Google更新代理"
        disable_agent "$HOME/Library/LaunchAgents/com.google.keystone.xpcservice.plist" "Google更新XPC"
        ;;
    2)
        echo ""
        echo "正在禁用向日葵远程控制..."
        disable_daemon "/Library/LaunchDaemons/com.oray.sunlogin.helper.plist" "向日葵助手"
        disable_daemon "/Library/LaunchDaemons/com.oray.sunlogin.plist" "向日葵服务"
        ;;
    3)
        echo ""
        echo "正在禁用 ToDesk..."
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.service.plist" "ToDesk服务"
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.UninstallerHelper.plist" "ToDesk卸载助手"
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.UninstallerWatcher.plist" "ToDesk卸载监控"
        ;;
    4)
        echo ""
        echo "正在禁用 FileZilla FTP..."
        disable_daemon "/Library/LaunchDaemons/org.filezilla-project.filezilla-server.service.plist" "FileZilla FTP"
        ;;
    5)
        echo ""
        echo "正在禁用所有可选启动项..."
        # Google
        disable_agent "$HOME/Library/LaunchAgents/com.google.GoogleUpdater.wake.plist" "Google更新唤醒"
        disable_agent "$HOME/Library/LaunchAgents/com.google.keystone.agent.plist" "Google更新代理"
        disable_agent "$HOME/Library/LaunchAgents/com.google.keystone.xpcservice.plist" "Google更新XPC"
        # 向日葵
        disable_daemon "/Library/LaunchDaemons/com.oray.sunlogin.helper.plist" "向日葵助手"
        disable_daemon "/Library/LaunchDaemons/com.oray.sunlogin.plist" "向日葵服务"
        # ToDesk
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.service.plist" "ToDesk服务"
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.UninstallerHelper.plist" "ToDesk卸载助手"
        disable_daemon "/Library/LaunchDaemons/com.youqu.todesk.UninstallerWatcher.plist" "ToDesk卸载监控"
        # FileZilla
        disable_daemon "/Library/LaunchDaemons/org.filezilla-project.filezilla-server.service.plist" "FileZilla FTP"
        ;;
    6)
        echo "退出"
        exit 0
        ;;
    *)
        echo "无效选项"
        ;;
esac

echo ""
echo -e "${GREEN}操作完成！${NC}"
echo "提示: 被禁用的文件已移动到 .disabled 目录，如需恢复可手动移回。"
