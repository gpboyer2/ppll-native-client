//go:build windows
// +build windows

package services

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// setupProcessPlatformSpecific Windows 平台特定的进程设置
func (s *NodejsService) setupProcessPlatformSpecific(cmd *exec.Cmd) {}

// stopProcessPlatformSpecific Windows 平台特定的进程停止逻辑
func (s *NodejsService) stopProcessPlatformSpecific() error {
	if s.process == nil {
		return nil
	}
	if err := s.process.Signal(os.Interrupt); err != nil {
		s.log.Warn("[Node.js] 发送中断信号失败", "error", err)
	}
	done := make(chan error, 1)
	go func() {
		_, err := s.process.Wait()
		done <- err
	}()
	select {
	case <-done:
		s.log.Info("[Node.js] 进程已停止")
		return nil
	case <-time.After(5 * time.Second):
		s.log.Warn("[Node.js] 停止超时，强制杀死进程")
		return s.process.Kill()
	}
}

// Start 启动 Node.js 服务（Windows 版本）
func (s *NodejsService) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.isRunning {
		return fmt.Errorf("Node.js 服务已在运行中")
	}

	startCmd, err := s.buildStartCommand()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(s.ctx)
	s.cancel = cancel

	cmd := exec.CommandContext(ctx, startCmd.executable, startCmd.args...)
	cmd.Dir = startCmd.workingDir
	cmd.Env = s.buildEnv(os.Environ())

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

	s.setupProcessPlatformSpecific(cmd)
	s.log.Info("[Node.js] 启动中", "dir", startCmd.workingDir, "port", s.port)

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

	s.goLogListener(stdout, stderr)
	s.goWaitForExit()
	s.goHealthChecker()

	s.log.Info("[Node.js] 服务启动成功", "pid", s.process.Pid)
	return nil
}

// Stop 停止 Node.js 服务（Windows 版本）
func (s *NodejsService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return nil
	}

	s.log.Info("[Node.js] 正在停止服务...")

	if s.healthCheckDone != nil {
		close(s.healthCheckDone)
		s.healthCheckDone = nil
	}

	if s.cancel != nil {
		s.cancel()
	}

	if err := s.stopProcessPlatformSpecific(); err != nil {
		s.log.Error("[Node.js] 停止进程失败", "error", err)
	}

	s.isRunning = false
	s.isHealthy = false
	return nil
}
