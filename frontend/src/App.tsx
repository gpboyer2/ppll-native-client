import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { getPPLLMantineTheme } from './core/mantine-theme';
import logo from './assets/images/logo-universal.png';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import SystemInfoPage from './pages/SystemInfoPage';
import DatabaseManagerPage from './pages/DatabaseManagerPage';
import PluginsPage from './pages/PluginsPage';
import GridStrategyListPage from './pages/GridStrategy';
import GridStrategyEditPage from './pages/GridStrategy/edit';
import { navItems, ROUTES } from './router';
import { ThemeToggle } from './components/ThemeToggle';
import { useThemeStore } from './stores/theme-store';

// 导航组件
function Navigation() {
    const location = useLocation();

    // 检查是否在插件详情页面（路径格式：/plugins/插件ID）
    const isPluginDetailPage = location.pathname.match(/^\/plugins\/[^\/]+$/);

    // 检查是否在网格策略编辑页面
    const isGridStrategyEditPage = location.pathname.startsWith('/grid-strategy/edit');

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

    return (
        <MantineProvider theme={mantineTheme} defaultColorScheme={theme}>
            <Notifications position="top-right" />
            <div id="App">
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                </Router>
            </div>
        </MantineProvider>
    )
}

export default App
