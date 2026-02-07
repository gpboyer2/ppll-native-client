# Claude Code Hook 安装脚本 (Windows)
#
# 使用方法：
#   1. 右键点击此文件，选择"使用 PowerShell 运行"
#   2. 或在 PowerShell 中运行: .\install-claude-hooks.ps1
#
# 功能：为 Claude Code 添加语音提示功能（权限请求、危险操作前）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Claude Code Hook 安装程序" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 PowerShell 版本
Write-Host "[1/6] 检查系统环境..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion.Major
if ($psVersion -lt 3) {
    Write-Host "错误: 需要 PowerShell 3.0 或更高版本" -ForegroundColor Red
    Write-Host "当前版本: $psVersion" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "  PowerShell 版本: $psVersion (OK)" -ForegroundColor Green

# 查找 Claude 配置目录
Write-Host "[2/6] 查找 Claude 配置目录..." -ForegroundColor Yellow

$possiblePaths = @(
    "$env:APPDATA\claude\settings.json",
    "$env:USERPROFILE\.claude\settings.json",
    "$env:LOCALAPPDATA\claude\settings.json"
)

$settingsPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $settingsPath = $path
        break
    }
}

# 如果没找到，使用默认路径
if (-not $settingsPath) {
    $settingsPath = "$env:APPDATA\claude\settings.json"
    $settingsDir = Split-Path $settingsPath
    if (-not (Test-Path $settingsDir)) {
        New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
    }
    Write-Host "  创建新配置目录: $settingsDir" -ForegroundColor Green
} else {
    Write-Host "  找到配置文件: $settingsPath" -ForegroundColor Green
}

# 备份原配置
Write-Host "[3/6] 备份原配置..." -ForegroundColor Yellow
if (Test-Path $settingsPath) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$settingsPath.backup_$timestamp"
    Copy-Item $settingsPath $backupPath
    Write-Host "  备份到: $backupPath" -ForegroundColor Green
} else {
    Write-Host "  无需备份（新安装）" -ForegroundColor Gray
}

# 创建 TTS 语音脚本目录
Write-Host "[4/6] 创建语音脚本..." -ForegroundColor Yellow
$scriptDir = "$env:USERPROFILE\.claude\scripts"
if (-not (Test-Path $scriptDir)) {
    New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
    Write-Host "  创建目录: $scriptDir" -ForegroundColor Green
}

# 创建 Windows 语音合成脚本（使用 .cmd 扩展名避免 PowerShell 执行策略问题）
$cmdScriptPath = "$scriptDir\speak.cmd"
$cmdContent = @'
@echo off
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Speech; `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; `$s.Rate = 2; `$s.Speak('%*')"
'@

$cmdContent | Out-File -FilePath $cmdScriptPath -Encoding ASCII
Write-Host "  创建语音脚本: $cmdScriptPath" -ForegroundColor Green

# 测试语音
Write-Host ""
Write-Host "  测试语音功能..." -ForegroundColor Gray
try {
    $testResult = & $cmdScriptPath "测试" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  语音测试成功!" -ForegroundColor Green
    }
} catch {
    Write-Host "  语音测试失败，但将继续安装" -ForegroundColor Yellow
}

# 读取现有配置
Write-Host "[5/6] 配置 Hooks..." -ForegroundColor Yellow

if (Test-Path $settingsPath) {
    try {
        $settingsContent = Get-Content $settingsPath -Raw -Encoding UTF8
        $settings = $settingsContent | ConvertFrom-Json
        Write-Host "  读取现有配置" -ForegroundColor Gray
    } catch {
        Write-Host "  配置文件格式错误，创建新配置" -ForegroundColor Yellow
        $settings = @{}
    }
} else {
    $settings = @{}
}

# 构建 hooks 配置
$hooksConfig = @{
    PermissionRequest = @(
        @{
            matcher = "*rm*|*mv*|*rmdir*|*sudo*|*cp -rf*|*rm -rf*"
            hooks = @(
                @{
                    type = "command"
                    command = "`"$cmdScriptPath`" `"请授权`""
                }
            )
        }
    )
    PreToolUse = @(
        @{
            matcher = "*rm*|*mv*|*rmdir*|*sudo*|*cp -rf*|*rm -rf*"
            hooks = @(
                @{
                    type = "command"
                    command = "`"$cmdScriptPath`" `"请授权`""
                }
            )
        }
    )
    Notification = @(
        @{
            matcher = "*"
            hooks = @(
                @{
                    type = "command"
                    command = "`"$cmdScriptPath`" `"请授权`""
                }
            )
        }
    )
}

# 添加 hooks 到配置
$settings | Add-Member -NotePropertyName "hooks" -NotePropertyValue $hooksConfig -Force

# 写入配置文件
try {
    $jsonOutput = $settings | ConvertTo-Json -Depth 10
    $jsonOutput | Out-File -FilePath $settingsPath -Encoding UTF8
    Write-Host "  配置已写入" -ForegroundColor Green
} catch {
    Write-Host "  错误: $_" -ForegroundColor Red
    pause
    exit 1
}

# 完成
Write-Host "[6/6] 安装完成!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  安装成功!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置文件: $settingsPath" -ForegroundColor White
Write-Host "语音脚本: $cmdScriptPath" -ForegroundColor White
Write-Host ""
Write-Host "Hook 功能说明:" -ForegroundColor Yellow
Write-Host "  - 权限请求时: 语音提示 '请授权'" -ForegroundColor White
Write-Host "  - 危险操作前: 语音提示 '请授权'" -ForegroundColor White
Write-Host "  - 收到通知时: 语音提示 '请授权'" -ForegroundColor White
Write-Host ""
Write-Host "手动测试语音:" -ForegroundColor Yellow
Write-Host "  $cmdScriptPath 你好" -ForegroundColor Gray
Write-Host ""
Write-Host "如果遇到问题:" -ForegroundColor Yellow
Write-Host "  1. 确保Windows音频输出正常" -ForegroundColor White
Write-Host "  2. 重启 Claude Code" -ForegroundColor White
Write-Host "  3. 检查配置文件: $settingsPath" -ForegroundColor White
Write-Host ""

pause
