package main

import (
    "context"
    "fmt"
    "log/slog"
    "os"

    "ppll-native-client/internal/services"
)

// App - PPLL Native Client 应用程序结构
// PPLL Native Client 是专业的量化交易桌面客户端
// 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验
type App struct {
    ctx context.Context
    // 下列服务在 startup 中初始化
    log  *slog.Logger
    cfg  *services.ConfigStore
    us   *services.UpdateService
    ns   *services.NotificationService
    ps   *services.PluginService
}

// NewApp 创建新的 App 实例
func NewApp() *App {
	return &App{}
}

// startup 应用启动时调用，保存上下文以便调用运行时方法
func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    // 初始化日志（控制台简单日志）
    a.log = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
    // 读取 AES 密钥：优先使用环境变量 PPLL_AES_KEY（hex 或任意字节字符串）
    var key []byte
    if v := os.Getenv("PPLL_AES_KEY"); v != "" {
        key = []byte(v)
    }
    // 配置存储：文件 + AES 加密
    a.cfg = services.NewConfigStore(ctx, a.GetAppName(), key)

    // 初始化服务：更新、通知、插件
    a.ns = services.NewNotificationService(ctx, a.log)
    a.us = services.NewUpdateService(ctx, a.log, a.cfg, services.UpdateConfig{
        FeedURL:             "",      // 由前端或设置页下发
        Channel:             "stable", // 内部渠道
        AutoCheck:           false,
        CheckIntervalMinute: 30,
        AutoDownload:        false,
        SilentInstall:       true,
        HashAlgo:            "md5",
    })
    a.ps = services.NewPluginService(ctx, a.log, a.cfg)
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

// ===== 更新相关（统一响应结构）=====

// UpdateSaveConfig 保存更新配置（feedURL/策略等）
func (a *App) UpdateSaveConfig(cfg services.UpdateConfig) services.Response[any] {
    if a.us == nil {
        return services.Err[any](1, "更新服务未初始化")
    }
    return a.us.SaveConfig(cfg)
}

// UpdateCheckNow 立即检查更新
func (a *App) UpdateCheckNow() services.Response[services.UpdateInfo] {
    if a.us == nil {
        return services.Err[services.UpdateInfo](1, "更新服务未初始化")
    }
    return a.us.CheckNow()
}

// UpdateApplyOnNextStart 标记下次启动应用更新
func (a *App) UpdateApplyOnNextStart() services.Response[any] {
    if a.us == nil {
        return services.Err[any](1, "更新服务未初始化")
    }
    return a.us.ApplyOnNextStart()
}

// ===== 通知相关 =====

// NotifyPush 发送应用内通知
func (a *App) NotifyPush(n services.Notification) services.Response[services.Notification] {
    if a.ns == nil {
        return services.Err[services.Notification](1, "通知服务未初始化")
    }
    return a.ns.Push(n)
}

// NotifyDismiss 撤销通知
func (a *App) NotifyDismiss(id string) services.Response[any] {
    if a.ns == nil {
        return services.Err[any](1, "通知服务未初始化")
    }
    return a.ns.Dismiss(id)
}

// ===== 插件相关（插拔式）=====

// PluginList 返回插件元数据列表
func (a *App) PluginList() services.Response[services.PluginMetaList] {
    if a.ps == nil {
        return services.Err[services.PluginMetaList](1, "插件服务未初始化")
    }
    return a.ps.List()
}

// PluginEnable 启用插件
func (a *App) PluginEnable(id string) services.Response[services.PluginMeta] {
    if a.ps == nil {
        return services.Err[services.PluginMeta](1, "插件服务未初始化")
    }
    return a.ps.Enable(id)
}

// PluginDisable 禁用插件
func (a *App) PluginDisable(id string) services.Response[services.PluginMeta] {
    if a.ps == nil {
        return services.Err[services.PluginMeta](1, "插件服务未初始化")
    }
    return a.ps.Disable(id)
}

// PluginGetConfig 读取插件配置
func (a *App) PluginGetConfig(id string) services.Response[map[string]any] {
    if a.ps == nil {
        return services.Err[map[string]any](1, "插件服务未初始化")
    }
    return a.ps.GetConfig(id)
}

// PluginSaveConfig 保存插件配置
func (a *App) PluginSaveConfig(id string, cfg map[string]any) services.Response[any] {
    if a.ps == nil {
        return services.Err[any](1, "插件服务未初始化")
    }
    return a.ps.SaveConfig(id, cfg)
}
