package main

import (
	"embed"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

// PPLL Native Client - 专业量化交易桌面客户端
// 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验

func main() {
	// 创建应用实例
	app := NewApp()

	// 自动设置日志目录（用于调试）
	if os.Getenv("PPLL_LOG_DIR") == "" {
		// 优先使用用户日志目录，否则使用 /tmp
		var logDir string
		if homeDir, err := os.UserHomeDir(); err == nil {
			logDir = filepath.Join(homeDir, "Library", "Logs", "ppll-client")
		} else {
			logDir = "/tmp/ppll-logs"
		}
		os.MkdirAll(logDir, 0755)
		os.Setenv("PPLL_LOG_DIR", logDir)
	}

	// 检查是否启用调试模式
	debugMode := os.Getenv("DEBUG") == "true" || os.Getenv("DEBUG") == "1"

	// 配置并运行应用
	err := wails.Run(&options.App{
		Title:  "PPLL Native Client",
		Width:  1300,
		Height: 900,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 24, G: 26, B: 34, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		Bind: []interface{}{
			app,
		},
		// 调试选项
		Debug: options.Debug{
			OpenInspectorOnStartup: debugMode, // DEBUG=true 时自动打开开发者工具
		},
		// macOS 特定选项
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            true,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			About: &mac.AboutInfo{
				Title:   "PPLL Native Client",
				Message: "专业量化交易桌面客户端\n\n版本: " + app.GetAppVersion(),
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
