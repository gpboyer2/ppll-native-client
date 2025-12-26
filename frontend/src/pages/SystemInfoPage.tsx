import { useState, useEffect } from 'react';
import { Card, Text, Badge, Group, Stack, Title, Loader, Center, Grid } from '@mantine/core';
import { IconServer, IconDatabase, IconWorld, IconNetwork } from '@tabler/icons-react';
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

                // 从 Node.js API 获取 IP 地址列表
                let ipv4List: string[] = [];
                try {
                    const ipResponse = await fetch(`${nodejsUrl}/v1/system/ipv4-list`);
                    const ipData = await ipResponse.json();
                    if (ipData.code === 200 && Array.isArray(ipData.data)) {
                        ipv4List = ipData.data;
                    }
                } catch (error) {
                    console.error('获取 IP 地址列表失败:', error);
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
            <Center h="100vh">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">加载中...</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <Stack p="xl" gap="xl">
            <Title order={2}>系统信息</Title>

            <Grid>
                {/* 本机 IPv4 地址列表 - 大卡片 */}
                <Grid.Col span={12}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group mb="md">
                            <IconNetwork size={24} />
                            <Text fw={600} size="lg">本机 IPv4 地址</Text>
                        </Group>
                        {systemInfo?.ipv4List && systemInfo.ipv4List.length > 0 ? (
                            <Stack gap="xs">
                                {systemInfo.ipv4List.map((ip, index) => (
                                    <Group key={index} justify="space-between">
                                        <Text size="sm" c="dimmed">网卡 {index + 1}</Text>
                                        <Badge size="lg" variant="light" color="blue">
                                            {ip}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        ) : (
                            <Text c="dimmed" size="sm">未检测到 IPv4 地址</Text>
                        )}
                    </Card>
                </Grid.Col>

                {/* 服务地址卡片 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                        <Group mb="md">
                            <IconWorld size={24} />
                            <Text fw={600} size="lg">服务地址</Text>
                        </Group>
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">前端地址</Text>
                                <Text size="sm" fw={500}>{systemInfo?.frontendUrl || 'N/A'}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">API 地址</Text>
                                <Text size="sm" fw={500}>{systemInfo?.nodejsUrl || 'N/A'}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">API 文档</Text>
                                <Text
                                    size="sm"
                                    fw={500}
                                    c="blue"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => window.open(`${systemInfo?.nodejsUrl || ''}/v1/docs`, '_blank')}
                                >
                                    {`${systemInfo?.nodejsUrl || 'N/A'}/v1/docs`}
                                </Text>
                            </Group>
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* 环境信息卡片 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                        <Group mb="md">
                            <IconServer size={24} />
                            <Text fw={600} size="lg">环境信息</Text>
                        </Group>
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">应用版本</Text>
                                <Badge variant="light" color="green">v{systemInfo?.appVersion || 'N/A'}</Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">运行环境</Text>
                                <Badge variant="light" color="cyan">{systemInfo?.environment || 'N/A'}</Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">应用描述</Text>
                                <Text size="sm" fw={500} style={{ maxWidth: '60%', textAlign: 'right' }}>
                                    {systemInfo?.appDescription || 'N/A'}
                                </Text>
                            </Group>
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* 后端服务卡片 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                        <Group mb="md">
                            <IconServer size={24} />
                            <Text fw={600} size="lg">后端服务</Text>
                        </Group>
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Node.js 服务</Text>
                                <Badge
                                    variant="filled"
                                    color={systemInfo?.nodejsStatus?.isRunning ? 'green' : 'red'}
                                >
                                    {systemInfo?.nodejsStatus?.isRunning ? '运行中' : '未运行'}
                                </Badge>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">服务健康状态</Text>
                                <Badge
                                    variant="filled"
                                    color={systemInfo?.nodejsStatus?.isHealthy ? 'green' : 'red'}
                                >
                                    {systemInfo?.nodejsStatus?.isHealthy ? '健康' : '异常'}
                                </Badge>
                            </Group>
                            {systemInfo?.nodejsStatus?.pid && (
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">进程 PID</Text>
                                    <Text size="sm" fw={500}>{systemInfo.nodejsStatus.pid}</Text>
                                </Group>
                            )}
                            {systemInfo?.nodejsStatus?.uptime && (
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">运行时长</Text>
                                    <Text size="sm" fw={500}>{systemInfo.nodejsStatus.uptime}</Text>
                                </Group>
                            )}
                        </Stack>
                    </Card>
                </Grid.Col>

                {/* 数据存储卡片 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                        <Group mb="md">
                            <IconDatabase size={24} />
                            <Text fw={600} size="lg">数据存储</Text>
                        </Group>
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">数据库状态</Text>
                                <Badge
                                    variant="filled"
                                    color={systemInfo?.databaseHealthy ? 'green' : 'red'}
                                >
                                    {systemInfo?.databaseHealthy ? '正常' : '异常'}
                                </Badge>
                            </Group>
                            <Group justify="space-between" align="flex-start">
                                <Text size="sm" c="dimmed">数据库路径</Text>
                                <Text
                                    size="xs"
                                    fw={500}
                                    style={{ maxWidth: '70%', textAlign: 'right', wordBreak: 'break-all' }}
                                >
                                    {systemInfo?.databasePath || 'N/A'}
                                </Text>
                            </Group>
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}

export default SystemInfoPage;
