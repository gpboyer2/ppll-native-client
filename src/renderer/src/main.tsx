import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { initConsoleLogger } from './utils/console-logger'
import { socketio_client } from './utils/socketio-client'

// 初始化前端日志拦截器
initConsoleLogger()

// 初始化 Socket.IO 客户端
socketio_client.connect()

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
