#!/bin/bash

# 交互式文件批量替换脚本

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           文件批量覆盖工具 - Batch File Replacer              ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  功能: 用指定文件覆盖本机所有同名文件                          ║"
echo "║  范围: 全局搜索 (排除系统目录和 node_modules 等)               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "请输入源文件路径 (将作为覆盖的模板文件):"
read -r source_path

# 检查源文件是否存在
if [ ! -f "$source_path" ]; then
  echo "错误: 文件不存在: $source_path"
  exit 1
fi

# 提取文件名
filename=$(basename "$source_path")
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "目标文件名: $filename"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 搜索本机所有同名文件（排除源文件本身）
echo "正在搜索同名文件..."
echo ""

# 使用 find 搜索，从根目录开始，排除一些系统目录
found_files=()
while IFS= read -r -d '' file; do
  if [ "$file" != "$source_path" ]; then
    found_files+=("$file")
  fi
done < <(find / -name "$filename" -type f -print0 2>/dev/null | grep -v -z -e "/System/" -e "/Library/" -e "/ private/" -e "/.Trash/" -e "/node_modules/" -e "/.git/")

# 显示搜索结果
if [ ${#found_files[@]} -eq 0 ]; then
  echo "未找到其他同名文件，无需覆盖"
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "找到 ${#found_files[@]} 个同名文件，将被以下文件覆盖:"
echo ""

index=1
for file in "${found_files[@]}"; do
  echo "  [$index] $file"
  ((index++))
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "确认覆盖? 直接回车 = [Y]es，输入 n = [N]o"
read -r confirm

# 默认为 Y
if [ -z "$confirm" ] || [ "$confirm" = "Y" ] || [ "$confirm" = "y" ]; then
  echo "正在执行覆盖操作..."
  echo ""
  success_count=0
  fail_count=0

  for file in "${found_files[@]}"; do
    if cp "$source_path" "$file"; then
      echo "  ✓ 已覆盖: $file"
      ((success_count++))
    else
      echo "  ✗ 失败: $file"
      ((fail_count++))
    fi
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "覆盖完成! 成功: $success_count 个，失败: $fail_count 个"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "操作已取消，未进行任何修改"
  exit 0
fi
