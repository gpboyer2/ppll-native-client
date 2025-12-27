import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 14473,
    // API 代理配置
    // 开发环境：前端请求 /api/v1/xxx -> 代理到 -> 后端 http://localhost:PORT/api/v1/xxx
    proxy: {
      '/api': {
        // 后端服务地址（从环境变量读取，默认 3000）
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        // 不重写路径，保持 /api/v1/xxx 格式
        // 因为后端现在也使用 /api/v1 前缀
      }
    }
  }
})
