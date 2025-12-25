package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

// NodejsService Node.js 后端服务管理
// 职责：
// 1. 查找并启动 Node.js 进程
// 2. 监听进程输出日志
// 3. 管理进程生命周期（启动/停止/重启）
// 4. 健康检查
// 5. 提供服务地址
type NodejsService struct {
	ctx        context.Context
	log        Logger
	dbPath     string // SQLite 数据库路径
	serverDir  string // Node.js 服务目录

	mu             sync.RWMutex
	cmd            *exec.Cmd
	process        *os.Process
	isRunning      bool
	port           int
	startTime      time.Time
	lastHealthCheck time.Time
	isHealthy      bool

	cancel         context.CancelFunc
	outputDone     chan struct{}
	healthCheckDone chan struct{}
}

// Config NodejsService 配置
type Config struct {
	ServerDir string   // Node.js 服务目录路径
	Port      int      // 监听端口
	Args      []string // 额外启动参数
	Env       []string // 额外环境变量
}

// Logger 日志接口
type Logger interface {
	Info(msg string, args ...any)
	Error(msg string, args ...any)
	Debug(msg string, args ...any)
	Warn(msg string, args ...any)
}

// NewNodejsService 创建 Node.js 服务实例
func NewNodejsService(ctx context.Context, log Logger, dbPath string, cfg Config) *NodejsService {
	if cfg.Port == 0 {
		cfg.Port = 54321 // 默认端口
	}

	return &NodejsService{
		ctx:       ctx,
		log:       log,
		dbPath:    dbPath,
		serverDir: cfg.ServerDir,
		port:      cfg.Port,
		isRunning: false,
		isHealthy: false,
	}
}

// Start 启动 Node.js 服务
func (s *NodejsService) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.isRunning {
		return fmt.Errorf("Node.js 服务已在运行中")
	}

	// 查找 Node.js 可执行文件
	nodePath, err := s.findNodeExecutable()
	if err != nil {
		return fmt.Errorf("查找 Node.js 失败: %w", err)
	}

	// 创建带取消的上下文
	ctx, cancel := context.WithCancel(s.ctx)
	s.cancel = cancel

	// 检查服务目录
	serverDir := s.resolveServerDir()
	if _, err := os.Stat(serverDir); os.IsNotExist(err) {
		return fmt.Errorf("Node.js 服务目录不存在: %s", serverDir)
	}

	// 检查入口文件
	entryPoint := filepath.Join(serverDir, "app.js")
	if _, err := os.Stat(entryPoint); os.IsNotExist(err) {
		return fmt.Errorf("Node.js 入口文件不存在: %s", entryPoint)
	}

	// 构建启动命令
	cmd := exec.CommandContext(ctx, nodePath, entryPoint)
	cmd.Dir = serverDir

	// 设置环境变量
	cmd.Env = s.buildEnv(os.Environ())

	// 设置标准输出/错误管道
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("创建 stdout 管道失败: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("创建 stderr 管道失败: %w", err)
	}

	// 设置进程组（便于清理）
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}

	s.log.Info("[Node.js] 启动命令: "+nodePath+" "+entryPoint, "dir", serverDir, "port", s.port)

	// 启动进程
	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("启动 Node.js 进程失败: %w", err)
	}

	s.cmd = cmd
	s.process = cmd.Process
	s.isRunning = true
	s.startTime = time.Now()
	s.outputDone = make(chan struct{})
	s.healthCheckDone = make(chan struct{})

	// 启动日志监听
	s.goLogListener(stdout, stderr)

	// 等待进程结束
	s.goWaitForExit()

	// 启动健康检查
	s.goHealthChecker()

	s.log.Info("[Node.js] 服务启动成功", "pid", s.process.Pid)

	return nil
}

// Stop 停止 Node.js 服务
func (s *NodejsService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return nil
	}

	s.log.Info("[Node.js] 正在停止服务...")

	// 停止健康检查
	if s.healthCheckDone != nil {
		close(s.healthCheckDone)
		s.healthCheckDone = nil
	}

	// 取消上下文
	if s.cancel != nil {
		s.cancel()
	}

	// 发送 SIGTERM 信号
	if s.process != nil {
		// 杀死整个进程组
		pgid, err := syscall.Getpgid(s.process.Pid)
		if err == nil {
			syscall.Kill(-pgid, syscall.SIGTERM)
		} else {
			s.process.Signal(syscall.SIGTERM)
		}

		// 等待最多 5 秒
		done := make(chan error, 1)
		go func() {
			_, err := s.process.Wait()
			done <- err
		}()

		select {
		case <-done:
			s.log.Info("[Node.js] 服务已停止")
		case <-time.After(5 * time.Second):
			s.log.Warn("[Node.js] 停止超时，强制杀死进程")
			s.process.Kill()
		}
	}

	s.isRunning = false
	s.isHealthy = false

	return nil
}

// Restart 重启 Node.js 服务
func (s *NodejsService) Restart() error {
	if err := s.Stop(); err != nil {
		return err
	}

	// 等待进程完全退出
	time.Sleep(500 * time.Millisecond)

	return s.Start()
}

// GetPort 获取服务端口
func (s *NodejsService) GetPort() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.port
}

// GetServiceURL 获取服务地址
func (s *NodejsService) GetServiceURL() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d", s.port)
}

// IsRunning 检查服务是否运行中
func (s *NodejsService) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isRunning
}

// IsHealthy 检查服务是否健康
func (s *NodejsService) IsHealthy() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isHealthy
}

// GetStartTime 获取服务启动时间
func (s *NodejsService) GetStartTime() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.startTime
}

// GetUptime 获取服务运行时长
func (s *NodejsService) GetUptime() time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.startTime.IsZero() {
		return 0
	}
	return time.Since(s.startTime)
}

// GetStatus 获取服务状态信息
func (s *NodejsService) GetStatus() map[string]any {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := map[string]any{
		"isRunning": s.isRunning,
		"isHealthy": s.isHealthy,
		"port":      s.port,
		"url":       fmt.Sprintf("http://localhost:%d", s.port),
	}

	if !s.startTime.IsZero() {
		status["startTime"] = s.startTime.Format("2006-01-02 15:04:05")
		status["uptime"] = time.Since(s.startTime).String()
	}

	if s.process != nil {
		status["pid"] = s.process.Pid
	}

	return status
}

// ==================== 私有方法 ====================

// findNodeExecutable 查找 Node.js 可执行文件
func (s *NodejsService) findNodeExecutable() (string, error) {
	// 1. 检查 PATH 中的 node
	if path, err := exec.LookPath("node"); err == nil {
		return path, nil
	}

	// 2. 检查常见安装路径
	homeDir, _ := os.UserHomeDir()
	commonPaths := []string{
		filepath.Join(homeDir, ".nvm", "versions", "node", "*", "bin", "node"),
		"/usr/local/bin/node",
		"/opt/homebrew/bin/node",
		"/usr/bin/node",
		filepath.Join(homeDir, "node", "node.exe"), // Windows
	}

	for _, pattern := range commonPaths {
		matches, _ := filepath.Glob(pattern)
		for _, match := range matches {
			if _, err := os.Stat(match); err == nil {
				return match, nil
			}
		}
	}

	return "", fmt.Errorf("未找到 Node.js，请确保已安装 Node.js")
}

// resolveServerDir 解析服务目录路径
func (s *NodejsService) resolveServerDir() string {
	if filepath.IsAbs(s.serverDir) {
		return s.serverDir
	}

	// 相对于当前工作目录
	wd, _ := os.Getwd()
	return filepath.Join(wd, s.serverDir)
}

// buildEnv 构建环境变量
func (s *NodejsService) buildEnv(baseEnv []string) []string {
	env := append([]string{}, baseEnv...)

	// 添加必要的环境变量
	env = append(env, "NODE_ENV=production")
	env = append(env, fmt.Sprintf("PORT=%d", s.port))
	env = append(env, "DISABLE_RATE_LIMIT=true")

	// 添加 SQLite 数据库路径
	if s.dbPath != "" {
		env = append(env, "DB_TYPE=sqlite")
		env = append(env, "SQLITE_PATH="+s.dbPath)
	}

	return env
}

// goLogListener 启动日志监听协程
// stdout: 仅在 debug 模式打印
// stderr: 始终打印（错误日志）
func (s *NodejsService) goLogListener(stdout io.Reader, stderr io.Reader) {
	// stdout 监听：仅 debug 模式打印
	if stdout != nil {
		go func() {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				line := scanner.Text()
				s.log.Debug("[Node.js stdout] " + line)
			}
		}()
	}

	// stderr 监听：始终打印（错误日志）
	if stderr != nil {
		go func() {
			scanner := bufio.NewScanner(stderr)
			for scanner.Scan() {
				line := scanner.Text()
				s.log.Error("[Node.js stderr] " + line)
			}
		}()
	}
}

// goWaitForExit 等待进程退出
func (s *NodejsService) goWaitForExit() {
	go func() {
		err := s.cmd.Wait()

		s.mu.Lock()
		s.isRunning = false
		s.isHealthy = false
		s.process = nil
		s.mu.Unlock()

		close(s.outputDone)

		if err != nil {
			if s.ctx.Err() == context.Canceled {
				s.log.Info("[Node.js] 服务已停止")
			} else {
				s.log.Error("[Node.js] 服务异常退出", "error", err)
			}
		}
	}()
}

// goHealthChecker 启动健康检查协程
// 定期检查 Node.js API 服务是否正常响应
func (s *NodejsService) goHealthChecker() {
	go func() {
		// 健康检查间隔
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		// 首次检查延迟，等待服务启动
		time.Sleep(2 * time.Second)

		for {
			select {
			case <-s.healthCheckDone:
				// 收到停止信号
				return
			case <-ticker.C:
				s.performHealthCheck()
			}
		}
	}()
}

// performHealthChecker 执行单次健康检查
// 通过调用 /v1/hello 端点来验证服务是否正常
func (s *NodejsService) performHealthCheck() {
	// 构建健康检查 URL
	healthURL := fmt.Sprintf("http://localhost:%d/v1/hello", s.port)

	// 创建 HTTP 客户端，设置超时
	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	// 发送 GET 请求
	resp, err := client.Get(healthURL)
	if err != nil {
		s.mu.Lock()
		wasHealthy := s.isHealthy
		s.isHealthy = false
		s.lastHealthCheck = time.Now()
		s.mu.Unlock()

		if wasHealthy {
			s.log.Warn("[Node.js] 健康检查失败", "error", err)
		}
		return
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode == http.StatusOK {
		s.mu.Lock()
		wasHealthy := s.isHealthy
		s.isHealthy = true
		s.lastHealthCheck = time.Now()
		s.mu.Unlock()

		if !wasHealthy {
			s.log.Info("[Node.js] 健康检查通过")
		}
	} else {
		s.mu.Lock()
		wasHealthy := s.isHealthy
		s.isHealthy = false
		s.lastHealthCheck = time.Now()
		s.mu.Unlock()

		if wasHealthy {
			s.log.Warn("[Node.js] 健康检查失败", "statusCode", resp.StatusCode)
		}
	}
}
