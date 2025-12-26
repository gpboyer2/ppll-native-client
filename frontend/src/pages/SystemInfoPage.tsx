import { useState, useEffect } from 'react';
import {
    GetAppVersion,
    GetAppDescription,
    GetDatabasePath,
    IsDatabaseHealthy,
    GetNodejsServiceURL,
    GetNodejsServiceStatus
} from '../../wailsjs/go/main/App';

interface SystemInfo {
    frontendUrl: string;
    appVersion: string;
    appDescription: string;
    databasePath: string;
    databaseHealthy: boolean;
    nodejsUrl: string;
    nodejsStatus: {
        isRunning: boolean;
        isHealthy: boolean;
        port: number;
        url: string;
        startTime?: string;
        uptime?: string;
        pid?: number;
    };
    environment: string;
    ipv4List: string[];
}

// 图标组件
const IconNetwork = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
);

const IconWorld = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
);

const IconServer = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/>
        <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
);

const IconDatabase = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
);

// 等待 Node.js 服务健康检查，最多等待 10 秒
async function waitForNodejsHealthy(nodejsUrl: string, maxRetries: number = 10): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${nodejsUrl}/v1/hello`, {
                method: 'GET',
                signal: AbortSignal.timeout(1000)
            });
            if (response.ok) {
                return true;
            }
        } catch {
            // 服务还未就绪，继续等待
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

function SystemInfoPage() {
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSystemInfo() {
            try {
                const [appVersion, appDescription, databasePath, databaseHealthy, nodejsUrl, nodejsStatus] = await Promise.all([
                    GetAppVersion(),
                    GetAppDescription(),
                    GetDatabasePath(),
                    IsDatabaseHealthy(),
                    GetNodejsServiceURL(),
                    GetNodejsServiceStatus()
                ]);

                // 等待 Node.js 服务健康后再请求 IPv4 列表
                let ipv4List: string[] = [];
                if (nodejsUrl && (nodejsStatus as SystemInfo['nodejsStatus'])?.isRunning) {
                    const isHealthy = await waitForNodejsHealthy(nodejsUrl, 10);
                    if (isHealthy) {
                        try {
                            const ipResponse = await fetch(`${nodejsUrl}/v1/system/ipv4-list`);
                            const ipData = await ipResponse.json();
                            if (ipData.code === 200 && Array.isArray(ipData.data)) {
                                ipv4List = ipData.data;
                            }
                        } catch (error) {
                            console.error('获取 IP 地址列表失败:', error);
                        }
                    } else {
                        console.warn('Node.js 服务健康检查超时');
                    }
                }

                setSystemInfo({
                    frontendUrl: window.location.origin,
                    appVersion,
                    appDescription,
                    databasePath,
                    databaseHealthy,
                    nodejsUrl,
                    nodejsStatus: nodejsStatus as SystemInfo['nodejsStatus'],
                    environment: import.meta.env.MODE || 'production',
                    ipv4List
                });
            } catch (error) {
                console.error('获取系统信息失败:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSystemInfo();
    }, []);

    if (loading) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }}></div>
                    <div className="text-muted">加载中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container system-info-page">
            <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>系统信息</h2>

            <div className="grid-2">
                {/* 本机 IPv4 地址列表 */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-header">
                        <div className="flex items-center gap-8">
                            <IconNetwork />
                            <span>本机 IPv4 地址</span>
                        </div>
                    </div>
                    <div className="card-content">
                        {systemInfo?.ipv4List && systemInfo.ipv4List.length > 0 ? (
                            <div className="info-item-list">
                                {systemInfo.ipv4List.map((ip, index) => (
                                    <div key={index} className="info-item">
                                        <span className="info-label">网卡 {index + 1}</span>
                                        <span className="tag">{ip}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>未检测到 IPv4 地址</div>
                        )}
                    </div>
                </div>

                {/* 服务地址 */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-8">
                            <IconWorld />
                            <span>服务地址</span>
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="info-item-list">
                            <div className="info-item">
                                <span className="info-label">前端地址</span>
                                <span className="info-value">{systemInfo?.frontendUrl || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">API 地址</span>
                                <span className="info-value">{systemInfo?.nodejsUrl || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">API 文档</span>
                                <span
                                    className="info-link"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => window.open(`${systemInfo?.nodejsUrl || ''}/v1/docs`, '_blank')}
                                >
                                    {`${systemInfo?.nodejsUrl || 'N/A'}/v1/docs`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 环境信息 */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-8">
                            <IconServer />
                            <span>环境信息</span>
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="info-item-list">
                            <div className="info-item">
                                <span className="info-label">应用版本</span>
                                <span className={`info-status success`}>v{systemInfo?.appVersion || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">运行环境</span>
                                <span className="info-status" style={{ background: 'color-mix(in srgb, #17a2b8 20%, var(--color-bg))', color: '#17a2b8' }}>
                                    {systemInfo?.environment || 'N/A'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">应用描述</span>
                                <span className="info-value" style={{ maxWidth: '60%', textAlign: 'right' }}>
                                    {systemInfo?.appDescription || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 后端服务 */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-8">
                            <IconServer />
                            <span>后端服务</span>
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="info-item-list">
                            <div className="info-item">
                                <span className="info-label">Node.js 服务</span>
                                <span className={`info-status ${systemInfo?.nodejsStatus?.isRunning ? 'success' : 'danger'}`}>
                                    {systemInfo?.nodejsStatus?.isRunning ? '运行中' : '未运行'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">服务健康状态</span>
                                <span className={`info-status ${systemInfo?.nodejsStatus?.isHealthy ? 'success' : 'danger'}`}>
                                    {systemInfo?.nodejsStatus?.isHealthy ? '健康' : '异常'}
                                </span>
                            </div>
                            {systemInfo?.nodejsStatus?.pid && (
                                <div className="info-item">
                                    <span className="info-label">进程 PID</span>
                                    <span className="info-value">{systemInfo.nodejsStatus.pid}</span>
                                </div>
                            )}
                            {systemInfo?.nodejsStatus?.uptime && (
                                <div className="info-item">
                                    <span className="info-label">运行时长</span>
                                    <span className="info-value">{systemInfo.nodejsStatus.uptime}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 数据存储 */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-8">
                            <IconDatabase />
                            <span>数据存储</span>
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="info-item-list">
                            <div className="info-item">
                                <span className="info-label">数据库状态</span>
                                <span className={`info-status ${systemInfo?.databaseHealthy ? 'success' : 'danger'}`}>
                                    {systemInfo?.databaseHealthy ? '正常' : '异常'}
                                </span>
                            </div>
                            <div className="info-item" style={{ alignItems: 'flex-start' }}>
                                <span className="info-label">数据库路径</span>
                                <span className="info-path">
                                    {systemInfo?.databasePath || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SystemInfoPage;
