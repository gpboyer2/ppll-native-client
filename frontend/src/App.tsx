import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { getPPLLMantineTheme } from './core/mantine-theme';
import logo from './assets/images/logo-universal.png';
import HomePage from './pages/home-page';
import SettingsPage from './pages/settings';
import SystemInfoPage from './pages/system-info';
import DatabaseManagerPage from './pages/database-manager';
import PluginsPage from './pages/plugins';
import GridStrategyListPage from './pages/grid-strategy';
import GridStrategyEditPage from './pages/grid-strategy/edit';
import { navItems, ROUTES } from './router';
import { ThemeToggle } from './components/theme-toggle';
import { useThemeStore } from './stores/theme-store';
import { GlobalLoading } from './components/global-loading';
import { useAppInitStore } from './stores/app-init-store';
import { useBinanceStore } from './stores/binance-store';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

// 路由日志监听组件（就像 Vue Router 的 beforeEach）
function RouteLogger() {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const routeIdRef = useRef(0);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    const timestamp = dayjs().format('HH:mm:ss.SSS');

    // 记录路由跳转
    const routeId = ++routeIdRef.current;
    console.log(
      `%c[${timestamp}] [路由 #${routeId}] ${prevPath} → ${location.pathname}`,
      'color: #9900cc; font-weight: bold'
    );

    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return null;
}

// API Key 守卫组件
function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { api_key_list, initialized, init } = useBinanceStore();
  const hasShownNotification = useRef(false);

  useEffect(() => {
    // 初始化 binance store
    init();
  }, [init]);

  useEffect(() => {
    // 如果未完成初始化，等待完成
    if (!initialized) {
      return;
    }

    // 如果当前已经在设置页面，不需要检查和跳转
    if (location.pathname === ROUTES.SETTINGS) {
      return;
    }

    // 检查是否已配置 API Key
    if (api_key_list.length === 0) {
      // 跳转到设置页面
      navigate(ROUTES.SETTINGS, { replace: true });

      // 显示通知（只显示一次）
      if (!hasShownNotification.current) {
        notifications.show({
          title: '请先配置 API Key',
          message: '欢迎使用 PPLL 量化交易客户端！为了正常使用系统功能，请先配置 Binance API Key。',
          color: 'blue',
          autoClose: false,
        });
        hasShownNotification.current = true;
      }
    } else {
      // 重置标志位，以便下次删除所有 API Key 后能再次显示通知
      hasShownNotification.current = false;
    }
  }, [api_key_list.length, initialized, location.pathname, navigate]);

  return <>{children}</>;
}

// 导航组件
function Navigation() {
  const location = useLocation();

  // 检查是否在插件详情页面（路径格式：/plugins/插件ID）
  const isPluginDetailPage = location.pathname.match(/^\/plugins\/[^\/]+$/);

  // 如果在插件详情页面，不显示导航栏
  if (isPluginDetailPage) {
    return null;
  }

  return (
    <nav className="surface p-12 mb-16">
      <div className="flex items-center space-between">
        <div className="flex items-center gap-12">
          <img src={logo} alt="PPLL Logo" style={{ width: '32px', height: '32px' }} />
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>PPLL 量化交易客户端</span>
        </div>
        <div className="flex gap-8 items-center">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
                            (item.path === '/plugins' && location.pathname.startsWith('/plugins'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* 主题切换按钮 */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

function App() {
  const mantineTheme = getPPLLMantineTheme();
  const { theme } = useThemeStore();
  const { appReady } = useAppInitStore();

  // 如果应用环境未就绪，显示全局 loading
  if (!appReady) {
    return (
      <>
        <GlobalLoading />
      </>
    );
  }

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={theme}>
      <Notifications position="top-right" zIndex={4000} />
      <div id="App">
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouteLogger />
          <ApiKeyGuard>
            <Navigation />
            <Routes>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              <Route path={ROUTES.SYSTEM_INFO} element={<SystemInfoPage />} />
              <Route path={ROUTES.DATABASE_MANAGER} element={<DatabaseManagerPage />} />
              <Route path={ROUTES.PLUGINS} element={<PluginsPage />} />
              <Route path={ROUTES.PLUGIN_DETAIL} element={<PluginsPage />} />
              {/* 做T网格插件重定向到网格策略页面 */}
              <Route path="/plugins/u-grid-t" element={<Navigate to={ROUTES.GRID_STRATEGY} replace />} />
              <Route path={ROUTES.GRID_STRATEGY} element={<GridStrategyListPage />} />
              <Route path={ROUTES.GRID_STRATEGY_CREATE} element={<GridStrategyEditPage />} />
              <Route path={ROUTES.GRID_STRATEGY_EDIT} element={<GridStrategyEditPage />} />
            </Routes>
          </ApiKeyGuard>
        </Router>
      </div>
    </MantineProvider>
  );
}

export default App;
