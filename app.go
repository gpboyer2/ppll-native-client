package main

import (
	"context"
	"fmt"
)

// App - PPLL Native Client 应用程序结构
// PPLL Native Client 是专业的量化交易桌面客户端
// 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验
type App struct {
	ctx context.Context
}

// NewApp 创建新的 App 实例
func NewApp() *App {
	return &App{}
}

// startup 应用启动时调用，保存上下文以便调用运行时方法
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet 返回欢迎信息
func (a *App) Greet(name string) string {
	return fmt.Sprintf("欢迎使用 PPLL Native Client, %s!", name)
}

// GetAppName 获取应用名称
func (a *App) GetAppName() string {
	return "PPLL Native Client"
}

// GetAppVersion 获取应用版本
func (a *App) GetAppVersion() string {
	return "1.0.0"
}

// GetAppDescription 获取应用描述
func (a *App) GetAppDescription() string {
	return "专业量化交易桌面客户端 - 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验"
}
