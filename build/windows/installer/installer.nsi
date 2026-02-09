; PPLL Native Client NSIS 安装程序配置
; 此文件由 Wails 自动处理，用于生成 Windows 安装程序

!include "MUI2.nsh"
!include "x64.nsh"

; 安装程序属性
Name "PPLL Native Client"
OutFile "ppll-native-client-install.exe"
InstallDir "$PROGRAMFILES\PPLL Native Client"
InstallDirRegKey HKCU "Software\PPLL Native Client" ""
RequestExecutionLevel admin

; 版本信息
VIProductVersion "2.0.4.0"
VIAddVersionKey "ProductName" "PPLL Native Client"
VIAddVersionKey "CompanyName" "PPLL Team"
VIAddVersionKey "FileDescription" "专业量化交易桌面客户端"
VIAddVersionKey "FileVersion" "2.0.4"
VIAddVersionKey "ProductVersion" "2.0.4"
VIAddVersionKey "LegalCopyright" "Copyright 2025 PPLL Team"

; 界面设置
!define MUI_ABORTWARNING
!define MUI_ICON "appicon.ico"
!define MUI_UNICON "appicon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "welcome.bmp"

; 欢迎页面
!insertmacro MUI_PAGE_WELCOME
; 许可协议页面（可选）
; !insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
; 安装目录选择页面
!insertmacro MUI_PAGE_DIRECTORY
; 安装进度页面
!insertmacro MUI_PAGE_INSTFILES
; 完成页面
!insertmacro MUI_PAGE_FINISH

; 语言设置
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; 安装章节
Section "主程序" SecMain
  SectionIn RO

  SetOutPath $INSTDIR

  ; 安装主程序
  File "ppll-native-client.exe"

  ; 安装 Node.js（如果已嵌入）
  File "node.exe"

  ; 安装 nodejs-server
  File /r "nodejs-server"

  ; 创建快捷方式
  CreateDirectory "$SMPROGRAMS\PPLL Native Client"
  CreateShortcut "$SMPROGRAMS\PPLL Native Client\PPLL Native Client.lnk" "$INSTDIR\ppll-native-client.exe"
  CreateShortcut "$DESKTOP\PPLL Native Client.lnk" "$INSTDIR\ppll-native-client.exe"

  ; 写入卸载信息
  WriteRegStr HKCU "Software\PPLL Native Client" "" $INSTDIR
  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PPLL Native Client" "DisplayName" "PPLL Native Client"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PPLL Native Client" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PPLL Native Client" "Publisher" "PPLL Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PPLL Native Client" "DisplayVersion" "2.0.4"

SectionEnd

; 卸载章节
Section "Uninstall"
  ; 删除文件
  Delete "$INSTDIR\ppll-native-client.exe"
  Delete "$INSTDIR\node.exe"
  Delete "$INSTDIR\uninstall.exe"

  ; 删除目录
  RMDir /r "$INSTDIR\nodejs-server"

  ; 删除快捷方式
  Delete "$SMPROGRAMS\PPLL Native Client\PPLL Native Client.lnk"
  Delete "$DESKTOP\PPLL Native Client.lnk"
  RMDir "$SMPROGRAMS\PPLL Native Client"

  ; 删除卸载信息
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PPLL Native Client"
  DeleteRegKey /ifempty HKCU "Software\PPLL Native Client"

  ; 删除安装目录（如果为空）
  RMDir $INSTDIR

SectionEnd
