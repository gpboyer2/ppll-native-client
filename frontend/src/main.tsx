import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';
import App from './App';
import { initConsoleLogger } from './utils/console-logger';

// 初始化前端日志拦截器
initConsoleLogger();

const container = document.getElementById('root');

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
