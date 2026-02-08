package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"ppll-native-client/internal/services"
)

// App - PPLL Native Client 应用程序结构
// PPLL Native Client 是专业的量化交易桌面客户端
// 为量化交易者提供高性能、安全可靠的跨平台桌面交易体验
type App struct {
	ctx context.Context
	// 下列服务在 startup 中初始化
	log *slog.Logger
	cfg *services.ConfigStore
	us  *services.UpdateService
	ns  *services.NotificationService
	ps  *services.PluginService

	// Node.js 服务
	njs *services.NodejsService

	// 日志文件句柄（用于关闭）
	logFile *os.File
}

// NewApp 创建新的 App 实例
func NewApp() *App {
	return &App{}
}

// initLogger 初始化日志系统
// 日志同时输出到终端和 PPLL_LOG_DIR/go.log（如果设置了环境变量）
func (a *App) initLogger() {
	logLevel := slog.LevelInfo
	if os.Getenv("DEBUG") == "true" || os.Getenv("DEBUG") == "1" {
		logLevel = slog.LevelDebug
	}

	var writer io.Writer = os.Stdout
	if logDir := os.Getenv("PPLL_LOG_DIR"); logDir != "" {
		os.MkdirAll(logDir, 0755)
		if f, err := os.OpenFile(filepath.Join(logDir, "go.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644); err == nil {
			a.logFile = f
			writer = io.MultiWriter(os.Stdout, f)
		}
	}
	a.log = slog.New(slog.NewTextHandler(writer, &slog.HandlerOptions{Level: logLevel}))
}

// startup 应用启动时调用，保存上下文以便调用运行时方法
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 初始化日志系统
	a.initLogger()

	// 读取 AES 密钥：优先使用环境变量 PPLL_AES_KEY（hex 或任意字节字符串）
	var key []byte
	if v := os.Getenv("PPLL_AES_KEY"); v != "" {
		key = []byte(v)
	}

	// 1. 配置存储：文件 + AES 加密
	a.cfg = services.NewConfigStore(ctx, a.GetAppName(), key)

	// 2. 初始化服务：更新、通知、插件
	a.ns = services.NewNotificationService(ctx, a.log)
	a.us = services.NewUpdateService(ctx, a.log, a.cfg, services.UpdateConfig{
		FeedURL:             "",       // 由前端或设置页下发
		Channel:             "stable", // 内部渠道
		AutoCheck:           false,
		CheckIntervalMinute: 30,
		AutoDownload:        false,
		SilentInstall:       true,
		HashAlgo:            "md5",
	})
	a.ps = services.NewPluginService(ctx, a.log, a.cfg)

	// 3. 启动 Node.js 后端服务（NodeJS 端已接管数据库初始化）
	// 设置环境变量 SKIP_NODEJS_AUTO_START=1 可跳过自动启动
	skipNodejs := os.Getenv("SKIP_NODEJS_AUTO_START") == "1"

	// 设置必要的环境变量
	// 3.1 设置数据库路径（如果未设置）
	if os.Getenv("SQLITE_PATH") == "" {
		// 默认使用用户数据目录
		var userDataDir string
		if homeDir, err := os.UserHomeDir(); err == nil {
			userDataDir = filepath.Join(homeDir, ".ppll-client")
		} else {
			userDataDir = filepath.Join(os.TempDir(), "ppll-client")
		}
		dbPath := filepath.Join(userDataDir, "database.sqlite")
		dbDir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dbDir, 0755); err == nil {
			os.Setenv("SQLITE_PATH", dbPath)
			a.log.Info("设置数据库路径", "path", dbPath)
		}
	}

	// 3.2 设置 NODE_ENV（如果未设置）
	if os.Getenv("NODE_ENV") == "" {
		os.Setenv("NODE_ENV", "production")
		a.log.Debug("设置 NODE_ENV=production")
	}

	// 3.3 确定 nodejs-server 路径
	// 优先级：环境变量 > 相对于可执行文件的路径
	nodejsServerDir := os.Getenv("NODEJS_SERVER_DIR")
	if nodejsServerDir == "" {
		nodejsServerDir = "./nodejs-server"
	}

	a.njs = services.NewNodejsService(ctx, a.logWrapper(), services.Config{
		ServerDir: nodejsServerDir,
		Port:      54321,
	})

	if skipNodejs {
		a.log.Info("SKIP_NODEJS_AUTO_START=1，跳过 Node.js 服务自动启动")
	} else {
		a.log.Info("正在启动 Node.js 后端服务...")
		if err := a.njs.Start(); err != nil {
			a.log.Error("Node.js 服务启动失败", "error", err)
		} else {
			a.log.Info("Node.js 后端服务启动成功")
		}
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

	// 关闭日志文件
	if a.logFile != nil {
		a.logFile.Close()
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
		return services.Err[any]("Node.js 服务未初始化")
	}

	if err := a.njs.Restart(); err != nil {
		return services.Err[any]("重启失败: " + err.Error())
	}

	return services.Ok[any](nil)
}

// ===== 更新相关（统一响应结构）=====

// UpdateSaveConfig 保存更新配置（feedURL/策略等）
func (a *App) UpdateSaveConfig(cfg services.UpdateConfig) services.Response[any] {
	if a.us == nil {
		return services.Err[any]("更新服务未初始化")
	}
	return a.us.SaveConfig(cfg)
}

// UpdateCheckNow 立即检查更新
func (a *App) UpdateCheckNow() services.Response[services.UpdateInfo] {
	if a.us == nil {
		return services.Err[services.UpdateInfo]("更新服务未初始化")
	}
	return a.us.CheckNow()
}

// UpdateApplyOnNextStart 标记下次启动应用更新
func (a *App) UpdateApplyOnNextStart() services.Response[any] {
	if a.us == nil {
		return services.Err[any]("更新服务未初始化")
	}
	return a.us.ApplyOnNextStart()
}

// ===== 通知相关 =====

// NotifyPush 发送应用内通知
func (a *App) NotifyPush(n services.Notification) services.Response[services.Notification] {
	if a.ns == nil {
		return services.Err[services.Notification]("通知服务未初始化")
	}
	return a.ns.Push(n)
}

// NotifyDismiss 撤销通知
func (a *App) NotifyDismiss(id string) services.Response[any] {
	if a.ns == nil {
		return services.Err[any]("通知服务未初始化")
	}
	return a.ns.Dismiss(id)
}

// ===== 插件配置相关（插拔式）=====
// 插件元数据和启用状态由前端管理，后端仅提供敏感配置的加密存储

// PluginGetConfig 读取插件运行时配置（如API密钥等敏感信息）
func (a *App) PluginGetConfig(id string) services.Response[map[string]any] {
	if a.ps == nil {
		return services.Err[map[string]any]("插件服务未初始化")
	}
	return a.ps.GetConfig(id)
}

// PluginSaveConfig 保存插件运行时配置（如API密钥等敏感信息）
func (a *App) PluginSaveConfig(id string, cfg map[string]any) services.Response[any] {
	if a.ps == nil {
		return services.Err[any]("插件服务未初始化")
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
			"error":      err.Error(),
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
		"appName":        a.GetAppName(),
		"appVersion":     a.GetAppVersion(),
		"appDescription": a.GetAppDescription(),
		"nodejsStatus":   a.GetNodejsServiceStatus(),
		"nodejsURL":      a.GetNodejsServiceURL(),
	}
}

// OpenBrowser 打开系统浏览器访问指定 URL
// 参数：url - 要访问的网址
// 在桌面客户端中打开系统浏览器，在浏览器环境中不做任何操作
func (a *App) OpenBrowser(url string) error {
	runtime.BrowserOpenURL(a.ctx, url)
	return nil
}

// ===== 开发者调试相关 =====

// DebugInfo 调试信息结构
type DebugInfo struct {
	AppPath       string            `json:"app_path"`
	AppVersion    string            `json:"app_version"`
	WorkingDir    string            `json:"working_dir"`
	LogDir        string            `json:"log_dir"`
	NodejsService map[string]any    `json:"nodejs_service"`
	Environment   map[string]string `json:"environment"`
	SystemInfo    map[string]string `json:"system_info"`
	Timestamp     string            `json:"timestamp"`
}

// GetDebugInfo 获取完整的调试信息
func (a *App) GetDebugInfo() DebugInfo {
	info := DebugInfo{
		AppPath:       "",
		AppVersion:    a.GetAppVersion(),
		WorkingDir:    "",
		LogDir:        os.Getenv("PPLL_LOG_DIR"),
		NodejsService: map[string]any{},
		Environment:   make(map[string]string),
		SystemInfo:    make(map[string]string),
		Timestamp:     time.Now().Format("2006-01-02 15:04:05"),
	}

	// 获取可执行文件路径
	if execPath, err := os.Executable(); err == nil {
		info.AppPath = execPath
	}

	// 获取当前工作目录
	if wd, err := os.Getwd(); err == nil {
		info.WorkingDir = wd
	}

	// Node.js 服务调试信息
	if a.njs != nil {
		nodejsDebug := a.njs.GetDebugInfo()
		info.NodejsService = map[string]any{
			"serverDir":   nodejsDebug.ServerDir,
			"resolvedDir": nodejsDebug.ResolvedDir,
			"isRunning":   nodejsDebug.IsRunning,
			"isHealthy":   nodejsDebug.IsHealthy,
			"port":        nodejsDebug.Port,
			"serviceURL":  nodejsDebug.ServiceURL,
			"processInfo": nodejsDebug.ProcessInfo,
			"startTime":   nodejsDebug.StartTime,
			"uptime":      nodejsDebug.Uptime,
		}
	}

	// 关键环境变量
	envKeys := []string{
		"NODE_ENV", "PORT", "SQLITE_PATH",
		"HTTPS_PROXY", "HTTP_PROXY",
		"PPLL_LOG_DIR", "DEBUG", "SKIP_NODEJS_AUTO_START",
	}
	for _, key := range envKeys {
		info.Environment[key] = os.Getenv(key)
	}

	// 系统信息
	info.SystemInfo = map[string]string{
		"os":   runtime.Environment(a.ctx).Platform,
		"arch": runtime.Environment(a.ctx).Arch,
	}

	return info
}

// DebugLogEntry 日志条目
type DebugLogEntry struct {
	Timestamp string `json:"timestamp"`
	Source    string `json:"source"` // "go" 或 "nodejs"
	Level     string `json:"level"`  // "info", "error", "debug", "warn"
	Message   string `json:"message"`
}

// GetDebugLogs 获取 Go 后端和 Node.js 服务的日志
// 参数：lines - 返回的日志行数，默认 100
func (a *App) GetDebugLogs(lines int) map[string]any {
	if lines <= 0 {
		lines = 100
	}

	result := map[string]any{
		"go_logs":     []string{},
		"nodejs_logs": []string{},
		"log_dir":     os.Getenv("PPLL_LOG_DIR"),
		"max_lines":   lines,
	}

	logDir := os.Getenv("PPLL_LOG_DIR")
	if logDir == "" {
		return result
	}

	// 读取 Go 日志
	goLogPath := filepath.Join(logDir, "go.log")
	if goLogs, err := a.readLastNLines(goLogPath, lines); err == nil {
		result["go_logs"] = goLogs
	}

	// 读取 Node.js 日志
	nodejsLogPath := filepath.Join(logDir, "nodejs-server.log")
	if nodejsLogs, err := a.readLastNLines(nodejsLogPath, lines); err == nil {
		result["nodejs_logs"] = nodejsLogs
	}

	return result
}

// readLastNLines 读取文件的最后 N 行
func (a *App) readLastNLines(filePath string, n int) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	// 返回最后 N 行
	if len(lines) > n {
		return lines[len(lines)-n:], nil
	}
	return lines, nil
}

// WriteDebugLog 写入调试日志
// 参数：message - 日志消息
func (a *App) WriteDebugLog(message string) {
	a.log.Info("[前端调试] " + message)
}
