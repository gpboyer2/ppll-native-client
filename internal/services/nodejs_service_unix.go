//go:build darwin || linux
// +build darwin linux

package services

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"time"
)

// setupProcessPlatformSpecific Unix 平台特定的进程设置
func (s *NodejsService) setupProcessPlatformSpecific(cmd *exec.Cmd) {
	// 设置进程组（便于清理）
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}
}

// stopProcessPlatformSpecific Unix 平台特定的进程停止逻辑
func (s *NodejsService) stopProcessPlatformSpecific() error {
	if s.process == nil {
		return nil
	}

	// 发送 SIGTERM 信号到整个进程组
	pgid, err := syscall.Getpgid(s.process.Pid)
	if err == nil {
		// 杀死整个进程组
		syscall.Kill(-pgid, syscall.SIGTERM)
	} else {
		// 如果获取进程组失败，直接向进程发送信号
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
		s.log.Info("[Node.js] Unix 进程组已停止")
		return nil
	case <-time.After(5 * time.Second):
		s.log.Warn("[Node.js] 停止超时，强制杀死进程")
		return s.process.Kill()
	}
}

// Start 启动 Node.js 服务（Unix 版本）
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
	if _, err := exec.Command("test", "-d", serverDir).CombinedOutput(); err != nil {
		return fmt.Errorf("Node.js 服务目录不存在: %s", serverDir)
	}

	// 检查入口文件
	entryPoint := serverDir + "/app.js"
	if _, err := exec.Command("test", "-f", entryPoint).CombinedOutput(); err != nil {
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
		cancel()
		return fmt.Errorf("创建 stdout 管道失败: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("创建 stderr 管道失败: %w", err)
	}

	// Unix 平台特定的进程设置
	s.setupProcessPlatformSpecific(cmd)

	s.log.Info("[Node.js Unix] 启动命令: "+nodePath+" "+entryPoint, "dir", serverDir, "port", s.port)

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

	s.log.Info("[Node.js Unix] 服务启动成功", "pid", s.process.Pid)

	return nil
}

// Stop 停止 Node.js 服务（Unix 版本）
func (s *NodejsService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return nil
	}

	s.log.Info("[Node.js Unix] 正在停止服务...")

	// 停止健康检查
	if s.healthCheckDone != nil {
		close(s.healthCheckDone)
		s.healthCheckDone = nil
	}

	// 取消上下文
	if s.cancel != nil {
		s.cancel()
	}

	// Unix 平台特定的进程停止逻辑
	if err := s.stopProcessPlatformSpecific(); err != nil {
		s.log.Error("[Node.js Unix] 停止进程失败", "error", err)
	}

	s.isRunning = false
	s.isHealthy = false

	return nil
}
