/**
 * Electron 主进程入口
 * 负责启动后端服务和加载前端页面
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { spawn, execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'

// 全局变量
let mainWindow: BrowserWindow | null = null
let backendProcess: ReturnType<typeof spawn> | null = null

// 是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * 获取 node 可执行文件路径
 * 优先使用当前进程的 node 路径（Electron 内置），其次尝试 nvm，最后使用系统 node
 */
function getNodePath(): string {
  // 方案1: 使用当前 Electron 进程的 node 路径
  // Electron 内置了 Node.js，process.execPath 指向 Electron 可执行文件
  // 但我们需要的是纯 Node.js 可执行文件

  // 方案2: 从环境变量 PATH 中查找 node
  try {
    const pathEnv = process.env.PATH || ''
    const pathDirs = pathEnv.split(':')

    for (const dir of pathDirs) {
      const nodePath = join(dir, 'node')
      if (existsSync(nodePath)) {
        console.log(`[Backend] 从 PATH 找到 node: ${nodePath}`)
        return nodePath
      }
    }
  } catch (error) {
    console.warn('[Backend] 从 PATH 查找 node 失败:', error)
  }

  // 方案3: 尝试从 nvm 获取 node 路径
  try {
    const nvmDir = process.env.NVM_DIR || join(homedir(), '.nvm')
    const nvmScript = join(nvmDir, 'nvm.sh')

    if (existsSync(nvmScript)) {
      // 使用 bash 加载 nvm 并获取 node 路径
      const nodePath = execSync(
        `bash -c 'source "${nvmScript}" && which node'`,
        {
          encoding: 'utf-8',
          env: { ...process.env, NVM_DIR: nvmDir }
        }
      ).trim()

      if (nodePath && existsSync(nodePath)) {
        console.log(`[Backend] 使用 nvm node: ${nodePath}`)
        return nodePath
      }
    }
  } catch (error) {
    console.warn('[Backend] 无法从 nvm 获取 node 路径:', error)
  }

  // 方案4: 尝试常见的 node 安装路径
  const commonPaths = [
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node'
  ]

  for (const path of commonPaths) {
    if (existsSync(path)) {
      console.log(`[Backend] 使用常见路径 node: ${path}`)
      return path
    }
  }

  // 方案5: 尝试从 nvm 版本目录中查找
  try {
    const nvmDir = process.env.NVM_DIR || join(homedir(), '.nvm')
    const versionsDir = join(nvmDir, 'versions', 'node')

    if (existsSync(versionsDir)) {
      const versions = readdirSync(versionsDir)
      if (versions.length > 0) {
        // 使用第一个找到的版本
        const nodePath = join(versionsDir, versions[0], 'bin', 'node')
        if (existsSync(nodePath)) {
          console.log(`[Backend] 使用 nvm 版本目录 node: ${nodePath}`)
          return nodePath
        }
      }
    }
  } catch (error) {
    console.warn('[Backend] 从 nvm 版本目录查找失败:', error)
  }

  // 如果都找不到，返回 'node' 让系统尝试查找
  console.warn('[Backend] 无法找到 node 可执行文件，使用默认命令')
  return 'node'
}

/**
 * 启动后端服务
 */
function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[Backend] 正在启动后端服务...')

    // 开发模式使用源代码目录，生产模式使用编译后的目录
    const backendPath = isDev
      ? join(__dirname, '../../src/main/backend')
      : join(__dirname, 'backend')

    const backendEnv = {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production'
    }

    // 获取 node 可执行文件路径
    const nodePath = getNodePath()

    console.log(`[Backend] 后端路径: ${backendPath}`)
    console.log(`[Backend] Node 路径: ${nodePath}`)

    // 使用完整的 node 路径启动后端
    backendProcess = spawn(nodePath, ['app.js'], {
      cwd: backendPath,
      env: backendEnv,
      stdio: 'pipe'
    })

    backendProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim()
      if (message) {
        console.log(`[Backend] ${message}`)
        mainWindow?.webContents.send('backend-log', { type: 'stdout', message })
      }
    })

    backendProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim()
      if (message) {
        console.error(`[Backend Error] ${message}`)
        mainWindow?.webContents.send('backend-log', { type: 'stderr', message })
      }
    })

    backendProcess.on('error', (error) => {
      console.error('[Backend] 启动失败:', error)
      reject(error)
    })

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Backend] 进程退出，代码: ${code}, 信号: ${signal}`)
    })

    setTimeout(() => {
      if (backendProcess && backendProcess.pid) {
        console.log(`[Backend] 后端服务已启动，PID: ${backendProcess.pid}`)
        resolve()
      } else {
        reject(new Error('后端进程启动失败'))
      }
    }, 2000)
  })
}

/**
 * 停止后端服务
 */
function stopBackend(): void {
  if (backendProcess) {
    console.log('[Backend] 正在停止后端服务...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:14473').catch((err) => {
      console.error('[Frontend] 无法连接到开发服务器:', err)
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((err) => {
      console.error('[Frontend] 加载失败:', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    console.log('[Window] 主窗口已显示')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'F12') {
        mainWindow?.webContents.toggleDevTools()
      }
    })
  }
}

/**
 * 应用程序就绪事件
 */
app.whenReady().then(async () => {
  console.log('[Electron] 应用程序启动中...')

  try {
    await startBackend()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })

    console.log('[Electron] 应用程序启动完成')
  } catch (error) {
    console.error('[Electron] 启动失败:', error)
    app.quit()
  }
})

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
  console.log('[Electron] 所有窗口已关闭')
  if (process.platform !== 'darwin') {
    stopBackend()
    app.quit()
  }
})

/**
 * 应用程序退出前清理
 */
app.on('before-quit', () => {
  console.log('[Electron] 应用程序即将退出')
  stopBackend()
})

/**
 * IPC 事件处理
 */

// 获取后端日志
ipcMain.handle('get-backend-logs', async () => {
  return []
})

// 重启后端服务
ipcMain.handle('restart-backend', async () => {
  stopBackend()
  await startBackend()
  return { success: true }
})

// 检查后端状态
ipcMain.handle('check-backend-status', async () => {
  return {
    running: backendProcess !== null && backendProcess.pid !== undefined,
    pid: backendProcess?.pid || null
  }
})
