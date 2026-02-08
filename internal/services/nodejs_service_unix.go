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
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// stopProcessPlatformSpecific Unix 平台特定的进程停止逻辑
func (s *NodejsService) stopProcessPlatformSpecific() error {
	if s.process == nil {
		return nil
	}
	pgid, err := syscall.Getpgid(s.process.Pid)
	if err == nil {
		syscall.Kill(-pgid, syscall.SIGTERM)
	} else {
		s.process.Signal(syscall.SIGTERM)
	}
	done := make(chan error, 1)
	go func() {
		_, err := s.process.Wait()
		done <- err
	}()
	select {
	case <-done:
		s.log.Info("[Node.js] 进程组已停止")
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

	// 预检查
	s.log.Info("[Node.js] 执行启动前预检查...")
	checkInfo, checkErr := s.PreflightCheck()
	if checkErr != nil {
		s.log.Error("[Node.js] 预检查失败", "error", checkErr)
		s.log.Debug("[Node.js] 预检查详情", "info", checkInfo)
		return fmt.Errorf("预检查失败: %w", checkErr)
	}
	s.log.Info("[Node.js] 预检查通过", "entryPoint", checkInfo["entryPointExists"])

	startCmd, err := s.buildStartCommand()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(s.ctx)
	s.cancel = cancel

	cmd := exec.CommandContext(ctx, startCmd.executable, startCmd.args...)
	cmd.Dir = startCmd.workingDir
	cmd.Env = s.buildEnv(os.Environ())

	s.log.Debug("[Node.js] 启动命令", "executable", startCmd.executable, "args", startCmd.args)
	s.log.Debug("[Node.js] 工作目录", "dir", startCmd.workingDir)
	s.log.Debug("[Node.js] 环境变量", "env_count", len(cmd.Env))

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

// Stop 停止 Node.js 服务（Unix 版本）
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
