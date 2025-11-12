package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

// PPLL Native Client - 专业量化交易桌面客户端
// 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验

func main() {
	// 创建应用实例
	app := NewApp()

	// 配置并运行应用
	err := wails.Run(&options.App{
		Title:  "PPLL Native Client",
		Width:  1200,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 24, G: 26, B: 34, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
