#!/bin/bash
echo "=== 开始检查并禁用Ollama系统守护进程 ==="
echo "注意：此操作需要管理员权限。"

# 1. 检查服务状态
echo ""
echo "1. 检查Ollama服务状态..."
sudo launchctl list | grep -i ollama
if [ $? -eq 0 ]; then
    echo "   ⚠️  Ollama系统守护进程正在运行。"
else
    echo "   ✓ 未发现运行的Ollama系统守护进程。"
fi

# 2. 查找并处理系统级服务配置文件
echo ""
echo "2. 查找系统级服务配置文件..."
SERVICE_FILE=""
# 在LaunchDaemons目录中精确查找
if [ -f "/Library/LaunchDaemons/com.ollama.ollama.plist" ]; then
    SERVICE_FILE="/Library/LaunchDaemons/com.ollama.ollama.plist"
    echo "   ✅ 找到服务文件: $SERVICE_FILE"
elif [ -f "/Library/LaunchDaemons/com.ollama.server.plist" ]; then
    SERVICE_FILE="/Library/LaunchDaemons/com.ollama.server.plist"
    echo "   ✅ 找到服务文件: $SERVICE_FILE"
else
    echo "   ℹ️  在标准位置未找到Ollama的plist文件，尝试全盘搜索（可能需要较长时间）..."
    sudo find / -name "*ollama*.plist" 2>/dev/null | grep -E "(LaunchDaemons|LaunchAgents)" | head -5
    echo "   请将上述找到的完整路径记录下来，并替换下面命令中的【完整路径】。"
fi

# 3. 如果找到文件，则进行处理
if [ ! -z "$SERVICE_FILE" ]; then
    echo ""
    echo "3. 正在停止并禁用服务..."
    
    # 停止服务
    sudo launchctl bootout system "$SERVICE_FILE" 2>/dev/null
    sudo launchctl unload "$SERVICE_FILE" 2>/dev/null
    echo "   → 已尝试停止服务。"
    
    # 备份并删除配置文件（重要：备份到桌面）
    BACKUP_PATH="$HOME/Desktop/$(basename "$SERVICE_FILE").backup"
    echo "   正在备份服务文件到桌面..."
    sudo cp "$SERVICE_FILE" "$BACKUP_PATH"
    sudo chown $(whoami) "$BACKUP_PATH"
    echo "   → 服务文件已备份至: $BACKUP_PATH"
    
    # 可选择是否删除原文件（注释掉的危险操作）
    # sudo rm "$SERVICE_FILE"
    echo "   ⚠️  原文件 $SERVICE_FILE 已被保留。如需永久禁用，请手动删除或移走它。"
    echo "   提示：可直接执行：sudo mv \"$SERVICE_FILE\" \"$HOME/Desktop/\""
fi

# 4. 最终验证
echo ""
echo "4. 最终验证..."
echo "   再次检查服务状态（应无输出）："
sudo launchctl list | grep -i ollama || echo "   ✓ 验证通过，系统中已无Ollama服务。"

echo ""
echo "=== 脚本主要步骤执行完毕 ==="
echo ""
echo "后续操作建议："
echo "1. 重启你的Mac电脑，这是验证自动开机问题是否解决的最佳方式。"
echo "2. 如果你未来需要重新启用Ollama服务，可以："
echo "   a. 将备份文件移回原处: sudo mv \"$BACKUP_PATH\" \"$SERVICE_FILE\""
echo "   b. 加载服务: sudo launchctl load -w \"$SERVICE_FILE\""
echo ""
echo "如果重启后问题依旧，请检查："
echo "- 系统设置 > 通用 > 登录项（用户级启动）"
echo "- 是否有其他与Ollama相关的进程（如通过Docker安装的）"