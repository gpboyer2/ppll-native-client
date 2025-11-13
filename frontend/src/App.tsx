import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import logo from './assets/images/logo-universal.png';
import './App.css';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import PluginsPage from './pages/PluginsPage';
import { navItems, ROUTES } from './router';

// 导航组件
function Navigation() {
    const location = useLocation();

    return (
        <nav className="surface p-12 mb-16">
            <div className="flex items-center space-between">
                <div className="flex items-center gap-12">
                    <img src={logo} alt="PPLL Logo" style={{ width: '32px', height: '32px' }} />
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>PPLL 量化交易客户端</span>
                </div>
                <div className="flex gap-8">
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
                </div>
            </div>
        </nav>
    );
}

function App() {
    return (
        <div id="App">
            <Router>
                <Navigation />
                <Routes>
                    <Route path={ROUTES.HOME} element={<HomePage />} />
                    <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                    <Route path={ROUTES.PLUGINS} element={<PluginsPage />} />
                    <Route path={ROUTES.PLUGIN_DETAIL} element={<PluginsPage />} />
                </Routes>
            </Router>
        </div>
    )
}

export default App
