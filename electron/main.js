/**
 * Electron 主进程入口
 * 负责启动后端服务和加载前端页面
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 全局变量
let mainWindow = null;
let backendProcess = null;

// 是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 获取后端和前端路径
const backendPath = path.join(projectRoot, 'app', 'backend');
const frontendPath = path.join(projectRoot, 'app', 'frontend');

/**
 * 启动后端服务
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('[Backend] 正在启动后端服务...');

    // 设置后端环境变量
    const backendEnv = {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
    };

    // 启动后端进程
    backendProcess = spawn('node', ['app.js'], {
      cwd: backendPath,
      env: backendEnv,
      stdio: 'pipe',
      shell: true,
    });

    // 捕获后端输出
    backendProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[Backend] ${message}`);
        // 通过 IPC 将后端日志发送到渲染进程
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('backend-log', { type: 'stdout', message });
        }
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[Backend Error] ${message}`);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('backend-log', { type: 'stderr', message });
        }
      }
    });

    backendProcess.on('error', (error) => {
      console.error('[Backend] 启动失败:', error);
      reject(error);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Backend] 进程退出，代码: ${code}, 信号: ${signal}`);
      if (code !== 0 && code !== null) {
        console.error(`[Backend] 异常退出，代码: ${code}`);
      }
    });

    // 等待一段时间确保后端启动
    setTimeout(() => {
      if (backendProcess.pid) {
        console.log(`[Backend] 后端服务已启动，PID: ${backendProcess.pid}`);
        resolve();
      } else {
        reject(new Error('后端进程启动失败'));
      }
    }, 2000);
  });
}

/**
 * 停止后端服务
 */
function stopBackend() {
  if (backendProcess) {
    console.log('[Backend] 正在停止后端服务...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // 等待加载完成后再显示
  });

  // 开发模式：加载 Vite 开发服务器
  // 生产模式：加载打包后的 dist 目录
  if (isDev) {
    console.log('[Frontend] 加载开发服务器: http://localhost:14473');
    mainWindow.loadURL('http://localhost:14473').catch((err) => {
      console.error('[Frontend] 无法连接到开发服务器，请确保前端服务已启动');
      console.error('[Frontend] 请在 app/frontend 目录下运行 npm run dev');
      app.quit();
    });

    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[Frontend] 加载生产构建');
    mainWindow.loadFile(path.join(frontendPath, 'dist', 'index.html')).catch((err) => {
      console.error('[Frontend] 加载失败:', err);
      app.quit();
    });
  }

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[Window] 主窗口已显示');
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发模式下支持 F12 打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

/**
 * 应用程序就绪事件
 */
app.whenReady().then(async () => {
  console.log('[Electron] 应用程序启动中...');

  try {
    // 先启动后端服务
    await startBackend();

    // 再创建窗口
    createWindow();

    // macOS 特殊处理：点击 Dock 图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    console.log('[Electron] 应用程序启动完成');
  } catch (error) {
    console.error('[Electron] 启动失败:', error);
    app.quit();
  }
});

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
  console.log('[Electron] 所有窗口已关闭');
  if (process.platform !== 'darwin') {
    // 停止后端服务
    stopBackend();
    app.quit();
  }
});

/**
 * 应用程序退出前清理
 */
app.on('before-quit', () => {
  console.log('[Electron] 应用程序即将退出');
  stopBackend();
});

/**
 * IPC 事件处理
 */

// 获取后端日志
ipcMain.handle('get-backend-logs', async () => {
  // 可以从缓冲区返回日志
  return [];
});

// 重启后端服务
ipcMain.handle('restart-backend', async () => {
  stopBackend();
  await startBackend();
  return { success: true };
});

// 检查后端状态
ipcMain.handle('check-backend-status', async () => {
  return {
    running: backendProcess !== null && backendProcess.pid !== undefined,
    pid: backendProcess?.pid || null,
  };
});
