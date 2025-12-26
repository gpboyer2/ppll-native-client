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
func (s *NodejsService) setupProcessPlatformSpecific(cmd *exec.Cmd) {
	// Windows 不需要设置进程组
	// Windows 使用 Job Objects 来管理进程组，但这对于简单的用例不是必需的
}

// stopProcessPlatformSpecific Windows 平台特定的进程停止逻辑
func (s *NodejsService) stopProcessPlatformSpecific() error {
	if s.process == nil {
		return nil
	}

	// Windows 发送中断信号
	if err := s.process.Signal(os.Interrupt); err != nil {
		s.log.Warn("[Node.js Windows] 发送中断信号失败", "error", err)
	}

	// 等待最多 5 秒
	done := make(chan error, 1)
	go func() {
		_, err := s.process.Wait()
		done <- err
	}()

	select {
	case <-done:
		s.log.Info("[Node.js Windows] 进程已停止")
		return nil
	case <-time.After(5 * time.Second):
		s.log.Warn("[Node.js Windows] 停止超时，强制杀死进程")
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
	entryPoint := serverDir + "\\app.js"
	if _, err := os.Stat(entryPoint); os.IsNotExist(err) {
		return fmt.Errorf("Node.js 入口文件不存在: %s", entryPoint)
	}

	// 构建启动命令 - 支持热重载
	var nodeArgs []string
	// 通过 NODE_HOT_RELOAD 环境变量控制是否启用 nodemon 热重载
	if os.Getenv("NODE_HOT_RELOAD") == "true" {
		// 查找 nodemon 可执行文件
		nodemonPath := serverDir + "\\node_modules\\.bin\\nodemon.cmd"
		if _, err := os.Stat(nodemonPath); err == nil {
			nodePath = nodemonPath
			nodeArgs = []string{entryPoint, "--watch", serverDir, "--ext", "js,json", "--ignore", "node_modules/*"}
			s.log.Info("[Node.js Windows] 热重载已启用 (nodemon)")
		} else {
			nodeArgs = []string{entryPoint}
			s.log.Warn("[Node.js Windows] nodemon 未找到，使用普通 node 启动")
		}
	} else {
		nodeArgs = []string{entryPoint}
	}

	cmd := exec.CommandContext(ctx, nodePath, nodeArgs...)
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

	// Windows 平台特定的进程设置
	s.setupProcessPlatformSpecific(cmd)

	s.log.Info("[Node.js Windows] 启动命令: "+nodePath+" "+entryPoint, "dir", serverDir, "port", s.port)

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

	s.log.Info("[Node.js Windows] 服务启动成功", "pid", s.process.Pid)

	return nil
}

// Stop 停止 Node.js 服务（Windows 版本）
func (s *NodejsService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return nil
	}

	s.log.Info("[Node.js Windows] 正在停止服务...")

	// 停止健康检查
	if s.healthCheckDone != nil {
		close(s.healthCheckDone)
		s.healthCheckDone = nil
	}

	// 取消上下文
	if s.cancel != nil {
		s.cancel()
	}

	// Windows 平台特定的进程停止逻辑
	if err := s.stopProcessPlatformSpecific(); err != nil {
		s.log.Error("[Node.js Windows] 停止进程失败", "error", err)
	}

	s.isRunning = false
	s.isHealthy = false

	return nil
}
