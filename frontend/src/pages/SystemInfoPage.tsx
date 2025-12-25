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

                setSystemInfo({
                    frontendUrl: window.location.origin,
                    appVersion,
                    appDescription,
                    databasePath,
                    databaseHealthy,
                    nodejsUrl,
                    nodejsStatus: nodejsStatus as SystemInfo['nodejsStatus'],
                    environment: import.meta.env.MODE || 'production'
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
            <div className="container">
                <div className="card">
                    <div className="card-content" style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="loading"></div>
                        <p className="text-muted" style={{ marginTop: '16px' }}>加载中...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="system-info-page">
                <h1 style={{ marginBottom: '24px', color: 'var(--color-primary)' }}>系统信息</h1>

                <div className="system-info-grid">
                    {/* 服务地址卡片 */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ margin: 0 }}>服务地址</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-item-list">
                                <InfoItem label="前端地址" value={systemInfo?.frontendUrl || 'N/A'} />
                                <InfoItem label="API 地址" value={systemInfo?.nodejsUrl || 'N/A'} />
                                <InfoItem label="API 文档" value={`${systemInfo?.nodejsUrl || 'N/A'}/v1/docs`} isLink />
                            </div>
                        </div>
                    </div>

                    {/* 环境信息卡片 */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ margin: 0 }}>环境信息</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-item-list">
                                <InfoItem label="应用版本" value={`v${systemInfo?.appVersion || 'N/A'}`} />
                                <InfoItem label="运行环境" value={systemInfo?.environment || 'N/A'} />
                                <InfoItem label="应用描述" value={systemInfo?.appDescription || 'N/A'} />
                            </div>
                        </div>
                    </div>

                    {/* 后端服务卡片 */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ margin: 0 }}>后端服务</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-item-list">
                                <InfoItem
                                    label="Node.js 服务"
                                    value={systemInfo?.nodejsStatus?.isRunning ? '运行中' : '未运行'}
                                    status={systemInfo?.nodejsStatus?.isRunning ? 'success' : 'danger'}
                                />
                                <InfoItem
                                    label="服务健康状态"
                                    value={systemInfo?.nodejsStatus?.isHealthy ? '健康' : '异常'}
                                    status={systemInfo?.nodejsStatus?.isHealthy ? 'success' : 'danger'}
                                />
                                <InfoItem label="服务端口" value={systemInfo?.nodejsStatus?.port?.toString() || 'N/A'} />
                                {systemInfo?.nodejsStatus?.pid && (
                                    <InfoItem label="进程 PID" value={systemInfo.nodejsStatus.pid.toString()} />
                                )}
                                {systemInfo?.nodejsStatus?.uptime && (
                                    <InfoItem label="运行时长" value={systemInfo.nodejsStatus.uptime} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 数据存储卡片 */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ margin: 0 }}>数据存储</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-item-list">
                                <InfoItem
                                    label="数据库状态"
                                    value={systemInfo?.databaseHealthy ? '正常' : '异常'}
                                    status={systemInfo?.databaseHealthy ? 'success' : 'danger'}
                                />
                                <InfoItem
                                    label="数据库路径"
                                    value={systemInfo?.databasePath || 'N/A'}
                                    isPath
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ height: '16px' }}></div>
        </div>
    );
}

interface InfoItemProps {
    label: string;
    value: string;
    status?: 'success' | 'danger';
    isLink?: boolean;
    isPath?: boolean;
}

function InfoItem({ label, value, status, isLink, isPath }: InfoItemProps) {
    const renderValue = () => {
        if (!value || value === 'N/A') {
            return <span className="text-muted">N/A</span>;
        }

        if (status === 'success') {
            return <span className="info-status success">{value}</span>;
        }

        if (status === 'danger') {
            return <span className="info-status danger">{value}</span>;
        }

        if (isLink) {
            return (
                <a href={value} target="_blank" rel="noopener noreferrer" className="info-link">
                    {value}
                </a>
            );
        }

        if (isPath) {
            return <span className="info-path">{value}</span>;
        }

        return <span className="info-value">{value}</span>;
    };

    return (
        <div className="info-item">
            <span className="info-label">{label}</span>
            {renderValue()}
        </div>
    );
}

export default SystemInfoPage;
