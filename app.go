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

// GetAppName 获取应用名称 (关系到应用配置目录和数据储存目录)
func (a *App) GetAppName() string {
	return "ppll-client"
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

// ===== 通用配置存储 API (用于前端状态持久化) =====

// GetConfig 获取配置项
func (a *App) GetConfig(key string) string {
    if a.cfg == nil {
        return ""
    }
    
    m, err := a.cfg.LoadMap()
    if err != nil {
        a.log.Error("加载配置失败", "error", err, "key", key)
        return ""
    }
    
    if value, exists := m[key]; exists {
        if str, ok := value.(string); ok {
            return str
        }
    }
    
    return ""
}

// SetConfig 设置配置项
func (a *App) SetConfig(key, value string) error {
    if a.cfg == nil {
        return fmt.Errorf("配置服务未初始化")
    }
    
    m, err := a.cfg.LoadMap()
    if err != nil {
        a.log.Error("加载配置失败", "error", err, "key", key)
        return err
    }
    
    m[key] = value
    
    if err := a.cfg.SaveMap(m); err != nil {
        a.log.Error("保存配置失败", "error", err, "key", key)
        return err
    }
    
    a.log.Info("配置已保存", "key", key)
    return nil
}

// RemoveConfig 删除配置项
func (a *App) RemoveConfig(key string) error {
    if a.cfg == nil {
        return fmt.Errorf("配置服务未初始化")
    }
    
    m, err := a.cfg.LoadMap()
    if err != nil {
        a.log.Error("加载配置失败", "error", err, "key", key)
        return err
    }
    
    delete(m, key)
    
    if err := a.cfg.SaveMap(m); err != nil {
        a.log.Error("保存配置失败", "error", err, "key", key)
        return err
    }
    
    a.log.Info("配置已删除", "key", key)
    return nil
}

// ===== 数据清理 API =====

// ClearAllData 清理所有应用数据
func (a *App) ClearAllData() error {
    if a.cfg == nil {
        return fmt.Errorf("配置服务未初始化")
    }
    
    a.log.Info("开始清理所有应用数据")
    
    // 清空配置存储
    emptyConfig := map[string]any{}
    if err := a.cfg.SaveMap(emptyConfig); err != nil {
        a.log.Error("清理配置数据失败", "error", err)
        return fmt.Errorf("清理配置数据失败: %w", err)
    }
    
    a.log.Info("所有应用数据已清理完成")
    return nil
}

// GetDataSize 获取当前数据大小信息
func (a *App) GetDataSize() map[string]any {
    if a.cfg == nil {
        return map[string]any{
            "configSize": 0,
            "configPath": "配置服务未初始化",
            "totalItems": 0,
        }
    }
    
    // 获取配置文件路径和大小
    configPath, err := a.cfg.LoadMap()
    if err != nil {
        a.log.Error("获取配置数据失败", "error", err)
        return map[string]any{
            "configSize": 0,
            "configPath": "获取失败",
            "totalItems": 0,
            "error": err.Error(),
        }
    }
    
    // 计算配置项数量
    totalItems := len(configPath)
    
    // 估算数据大小（序列化后的大小）
    configSize := 0
    for key, value := range configPath {
        keySize := len(key)
        valueSize := 0
        if str, ok := value.(string); ok {
            valueSize = len(str)
        } else {
            // 对于非字符串值，估算序列化后的大小
            valueSize = len(fmt.Sprintf("%v", value))
        }
        configSize += keySize + valueSize
    }
    
    return map[string]any{
        "configSize":  configSize,
        "configPath":  "~/.config/ppll-client/config.enc.json",
        "totalItems":  totalItems,
        "itemDetails": configPath,
    }
}
