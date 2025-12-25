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

    // 新增：数据库服务和 Node.js 服务
    db  *services.DatabaseStore
    njs *services.NodejsService
}

// NewApp 创建新的 App 实例
func NewApp() *App {
	return &App{}
}

// startup 应用启动时调用，保存上下文以便调用运行时方法
func (a *App) startup(ctx context.Context) {
    a.ctx = ctx

    // 初始化日志：根据 DEBUG 环境变量设置日志级别
    // DEBUG=1 或 DEBUG=true 启用 debug 模式
    logLevel := slog.LevelInfo
    if os.Getenv("DEBUG") == "true" || os.Getenv("DEBUG") == "1" {
        logLevel = slog.LevelDebug
    }
    a.log = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))

    // 1. 初始化数据库服务（必须在最前面，因为其他服务可能依赖）
    a.log.Info("正在初始化 SQLite 数据库...")
    a.db = services.NewDatabaseStore(ctx, a.GetAppName())
    if err := a.db.Init(); err != nil {
        a.log.Error("数据库初始化失败", "error", err)
    } else {
        a.log.Info("SQLite 数据库初始化成功", "path", a.db.GetPath())
    }

    // 读取 AES 密钥：优先使用环境变量 PPLL_AES_KEY（hex 或任意字节字符串）
    var key []byte
    if v := os.Getenv("PPLL_AES_KEY"); v != "" {
        key = []byte(v)
    }

    // 2. 配置存储：文件 + AES 加密
    a.cfg = services.NewConfigStore(ctx, a.GetAppName(), key)

    // 3. 初始化服务：更新、通知、插件
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

    // 4. 启动 Node.js 后端服务
    a.log.Info("正在启动 Node.js 后端服务...")
    a.njs = services.NewNodejsService(ctx, a.logWrapper(), a.db.GetPath(), services.Config{
        ServerDir: "./nodejs-server",
        Port:      54321,
    })
    if err := a.njs.Start(); err != nil {
        a.log.Error("Node.js 服务启动失败", "error", err)
    } else {
        a.log.Info("Node.js 后端服务启动成功")
    }
}

// shutdown 应用关闭时调用
func (a *App) shutdown(ctx context.Context) {
    a.log.Info("应用正在关闭...")

    // 停止 Node.js 服务
    if a.njs != nil {
        if err := a.njs.Stop(); err != nil {
            a.log.Error("停止 Node.js 服务失败", "error", err)
        }
    }

    // 关闭数据库连接
    if a.db != nil {
        if err := a.db.Close(); err != nil {
            a.log.Error("关闭数据库失败", "error", err)
        }
    }

    a.log.Info("应用已关闭")
}

// logWrapper 将 slog.Logger 包装为 services.Logger 接口
func (a *App) logWrapper() *slogLogger {
    return &slogLogger{log: a.log}
}

// slogLogger 实现 services.Logger 接口
type slogLogger struct {
    log *slog.Logger
}

func (l *slogLogger) Info(msg string, args ...any) {
    l.log.Info(msg, args...)
}

func (l *slogLogger) Error(msg string, args ...any) {
    l.log.Error(msg, args...)
}

func (l *slogLogger) Debug(msg string, args ...any) {
    l.log.Debug(msg, args...)
}

func (l *slogLogger) Warn(msg string, args ...any) {
    l.log.Warn(msg, args...)
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

// ===== 数据库相关 =====

// GetDatabasePath 获取 SQLite 数据库文件路径
func (a *App) GetDatabasePath() string {
    if a.db == nil {
        return ""
    }
    return a.db.GetPath()
}

// IsDatabaseHealthy 检查数据库健康状态
func (a *App) IsDatabaseHealthy() bool {
    if a.db == nil {
        return false
    }
    return a.db.IsHealthy()
}

// ===== Node.js 服务相关 =====

// GetNodejsServiceURL 获取 Node.js 服务地址
func (a *App) GetNodejsServiceURL() string {
    if a.njs == nil {
        return ""
    }
    return a.njs.GetServiceURL()
}

// GetNodejsServiceStatus 获取 Node.js 服务状态
func (a *App) GetNodejsServiceStatus() map[string]any {
    if a.njs == nil {
        return map[string]any{
            "isRunning": false,
            "isHealthy": false,
            "error":     "Node.js 服务未初始化",
        }
    }
    return a.njs.GetStatus()
}

// RestartNodejsService 重启 Node.js 服务
func (a *App) RestartNodejsService() services.Response[any] {
    if a.njs == nil {
        return services.Err[any](1, "Node.js 服务未初始化")
    }

    if err := a.njs.Restart(); err != nil {
        return services.Err[any](1, "重启失败: "+err.Error())
    }

    return services.Ok[any](nil)
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

// ===== 插件配置相关（插拔式）=====
// 插件元数据和启用状态由前端管理，后端仅提供敏感配置的加密存储

// PluginGetConfig 读取插件运行时配置（如API密钥等敏感信息）
func (a *App) PluginGetConfig(id string) services.Response[map[string]any] {
    if a.ps == nil {
        return services.Err[map[string]any](1, "插件服务未初始化")
    }
    return a.ps.GetConfig(id)
}

// PluginSaveConfig 保存插件运行时配置（如API密钥等敏感信息）
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

// GetSystemInfo 获取系统信息（供前端系统信息页面使用）
func (a *App) GetSystemInfo() map[string]any {
    return map[string]any{
        "appName":         a.GetAppName(),
        "appVersion":      a.GetAppVersion(),
        "appDescription":  a.GetAppDescription(),
        "databasePath":    a.GetDatabasePath(),
        "databaseHealthy": a.IsDatabaseHealthy(),
        "nodejsStatus":    a.GetNodejsServiceStatus(),
        "nodejsURL":       a.GetNodejsServiceURL(),
    }
}
