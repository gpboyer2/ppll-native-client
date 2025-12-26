import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { ApiEndpoints } from '../api/endpoints';

// 图标组件
const IconDatabase = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
);

const IconTable = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
);

const IconRefresh = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
);

const IconSearch = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
);

const IconPlus = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);

const IconEdit = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

const IconTrash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
);

const IconCode = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
    </svg>
);

type TabType = 'browse' | 'structure' | 'sql';

interface DatabaseInfo {
    filePath: string;
    fileSizeFormatted: string;
    tableCount: number;
    totalRows: number;
    version: string;
}

interface TableItem {
    name: string;
    rowCount: number;
    size: string;
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: any;
    primaryKey: boolean;
}

interface TableDetail {
    tableName: string;
    columns: ColumnInfo[];
    indexes: Array<{ name: string; unique: boolean; columns: string[] }>;
    rowCount: number;
    createSql: string;
}

interface TableDataResponse {
    columns: string[];
    list: any[];
    pagination: {
        currentPage: number;
        pageSize: number;
        total: number;
    };
}

function DatabaseManagerPage() {
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
    const [tableList, setTableList] = useState<TableItem[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableDetail, setTableDetail] = useState<TableDetail | null>(null);
    const [tableData, setTableData] = useState<TableDataResponse | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('browse');
    const [keyword, setKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
    const [loading, setLoading] = useState(false);
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10');
    const [queryResult, setQueryResult] = useState<any>(null);

    // 获取数据库概览信息
    const fetchDatabaseInfo = useCallback(async () => {
        const response = await ApiEndpoints.getDatabaseInfo();
        if (response.code === 200) {
            setDbInfo(response.data);
        }
    }, []);

    // 获取表列表
    const fetchTableList = useCallback(async () => {
        setLoading(true);
        const response = await ApiEndpoints.getDatabaseTables({
            currentPage: 1,
            pageSize: 100,
            keyword
        });
        if (response.code === 200) {
            setTableList(response.data.list);
        }
        setLoading(false);
    }, [keyword]);

    // 获取表结构详情
    const fetchTableDetail = useCallback(async (tableName: string) => {
        setLoading(true);
        const response = await ApiEndpoints.getTableDetail(tableName);
        if (response.code === 200) {
            setTableDetail(response.data);
        }
        setLoading(false);
    }, []);

    // 获取表数据
    const fetchTableData = useCallback(async () => {
        if (!selectedTable) return;
        setLoading(true);
        const response = await ApiEndpoints.getTableData({
            tableName: selectedTable,
            currentPage,
            pageSize,
            sortBy,
            sortOrder
        });
        if (response.code === 200) {
            setTableData(response.data);
        }
        setLoading(false);
    }, [selectedTable, currentPage, pageSize, sortBy, sortOrder]);

    // 执行 SQL 查询
    const executeQuery = async () => {
        if (!sqlQuery.trim()) return;
        setLoading(true);
        const response = await ApiEndpoints.executeQuery(sqlQuery);
        if (response.code === 200) {
            setQueryResult(response.data);
            notifications.show({
                title: '查询成功',
                message: `返回 ${response.data.rowCount} 行记录`,
                color: 'teal'
            });
        } else {
            notifications.show({
                title: '查询失败',
                message: response.message || '执行失败',
                color: 'red'
            });
        }
        setLoading(false);
    };

    // 刷新数据
    const handleRefresh = () => {
        fetchDatabaseInfo();
        fetchTableList();
        if (selectedTable) {
            fetchTableDetail(selectedTable);
            if (activeTab === 'browse') {
                fetchTableData();
            }
        }
    };

    // 选择表
    const handleSelectTable = (tableName: string) => {
        setSelectedTable(tableName);
        setActiveTab('browse');
        setCurrentPage(1);
        fetchTableDetail(tableName);
    };

    // 排序
    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(column);
            setSortOrder('ASC');
        }
    };

    // 删除表
    const handleDeleteTable = async (tableName: string) => {
        if (!confirm(`确定要删除表 "${tableName}" 吗？此操作不可恢复！`)) return;
        const response = await ApiEndpoints.deleteTable([tableName]);
        if (response.code === 200) {
            notifications.show({
                title: '删除成功',
                message: `表 "${tableName}" 已删除`,
                color: 'teal'
            });
            handleRefresh();
            if (selectedTable === tableName) {
                setSelectedTable('');
                setTableDetail(null);
                setTableData(null);
            }
        }
    };

    // 删除数据
    const handleDeleteRow = async (rowId: any) => {
        if (!tableDetail) return;
        const pkColumn = tableDetail.columns.find(c => c.primaryKey);
        if (!pkColumn) return;
        const response = await ApiEndpoints.deleteData(selectedTable, [rowId]);
        if (response.code === 200) {
            notifications.show({
                title: '删除成功',
                message: '记录已删除',
                color: 'teal'
            });
            fetchTableData();
            fetchTableList();
        }
    };

    // 初始化
    useEffect(() => {
        fetchDatabaseInfo();
        fetchTableList();
    }, []);

    // 监听选中表变化
    useEffect(() => {
        if (selectedTable && activeTab === 'browse') {
            fetchTableData();
        }
    }, [selectedTable, currentPage, sortBy, sortOrder, activeTab]);

    return (
        <div className="container database-manager-page">
            <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-8">
                    <IconDatabase />
                    <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>数据库管理</h2>
                </div>
                <button className="btn btn-outline" onClick={handleRefresh} disabled={loading}>
                    <IconRefresh />
                    <span>刷新</span>
                </button>
            </div>

            {/* 数据库概览 */}
            {dbInfo && (
                <div className="grid-4 mb-16">
                    <div className="card stat-card">
                        <div className="stat-label">数据库大小</div>
                        <div className="stat-value">{dbInfo.fileSizeFormatted}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">表数量</div>
                        <div className="stat-value">{dbInfo.tableCount}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">总记录数</div>
                        <div className="stat-value">{dbInfo.totalRows}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">SQLite 版本</div>
                        <div className="stat-value">{dbInfo.version}</div>
                    </div>
                </div>
            )}

            <div className="database-manager-content">
                {/* 左侧表列表 */}
                <div className="database-sidebar">
                    <div className="database-sidebar-header">
                        <h3>表列表</h3>
                        <div className="search-box">
                            <IconSearch />
                            <input
                                type="text"
                                placeholder="搜索表名..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="table-list">
                        {loading && tableList.length === 0 ? (
                            <div className="text-center text-muted py-12">加载中...</div>
                        ) : tableList.length === 0 ? (
                            <div className="text-center text-muted py-12">暂无数据</div>
                        ) : (
                            tableList.map((table) => (
                                <div
                                    key={table.name}
                                    className={`table-item ${selectedTable === table.name ? 'active' : ''}`}
                                    onClick={() => handleSelectTable(table.name)}
                                >
                                    <div className="table-item-info">
                                        <IconTable />
                                        <div className="table-item-name">{table.name}</div>
                                    </div>
                                    <div className="table-item-meta">
                                        <span>{table.rowCount} 行</span>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTable(table.name);
                                            }}
                                        >
                                            <IconTrash />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 右侧主内容区 */}
                <div className="database-main">
                    {selectedTable ? (
                        <>
                            {/* Tab 切换 */}
                            <div className="tab-header">
                                <div className="tab-title">
                                    <IconTable />
                                    <span>{selectedTable}</span>
                                </div>
                                <div className="tab-list">
                                    <button
                                        className={`tab-item ${activeTab === 'browse' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('browse')}
                                    >
                                        浏览
                                    </button>
                                    <button
                                        className={`tab-item ${activeTab === 'structure' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('structure')}
                                    >
                                        结构
                                    </button>
                                    <button
                                        className={`tab-item ${activeTab === 'sql' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('sql')}
                                    >
                                        SQL
                                    </button>
                                </div>
                            </div>

                            {/* 浏览 Tab */}
                            {activeTab === 'browse' && tableData && (
                                <div className="tab-content">
                                    <div className="table-data-container">
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        {tableData.columns.map((col) => (
                                                            <th
                                                                key={col}
                                                                onClick={() => handleSort(col)}
                                                                className={sortBy === col ? 'sorted' : ''}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <span>{col}</span>
                                                                    {sortBy === col && (
                                                                        <span>{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loading ? (
                                                        <tr>
                                                            <td colSpan={tableData.columns.length + 1} className="text-center">
                                                                加载中...
                                                            </td>
                                                        </tr>
                                                    ) : tableData.list.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={tableData.columns.length + 1} className="text-center">
                                                                暂无数据
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        tableData.list.map((row, idx) => (
                                                            <tr key={idx}>
                                                                {tableData.columns.map((col) => (
                                                                    <td key={col}>{row[col]?.toString() ?? 'NULL'}</td>
                                                                ))}
                                                                <td>
                                                                    <button
                                                                        className="btn-icon btn-icon-danger"
                                                                        onClick={() => {
                                                                            const pkColumn = tableDetail?.columns.find(c => c.primaryKey);
                                                                            if (pkColumn) handleDeleteRow(row[pkColumn.name]);
                                                                        }}
                                                                    >
                                                                        <IconTrash />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 分页 */}
                                        {tableData.pagination.total > pageSize && (
                                            <div className="pagination">
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(currentPage - 1)}
                                                >
                                                    上一页
                                                </button>
                                                <span className="pagination-info">
                                                    第 {currentPage} / {Math.ceil(tableData.pagination.total / pageSize)} 页
                                                </span>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    disabled={currentPage >= Math.ceil(tableData.pagination.total / pageSize)}
                                                    onClick={() => setCurrentPage(currentPage + 1)}
                                                >
                                                    下一页
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 结构 Tab */}
                            {activeTab === 'structure' && tableDetail && (
                                <div className="tab-content">
                                    <div className="structure-info">
                                        <div className="structure-section">
                                            <h4>列信息</h4>
                                            <div className="table-wrapper">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>列名</th>
                                                            <th>类型</th>
                                                            <th>主键</th>
                                                            <th>可空</th>
                                                            <th>默认值</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tableDetail.columns.map((col) => (
                                                            <tr key={col.name}>
                                                                <td><strong>{col.name}</strong></td>
                                                                <td>{col.type}</td>
                                                                <td>{col.primaryKey ? '是' : '否'}</td>
                                                                <td>{col.nullable ? '是' : '否'}</td>
                                                                <td>{col.defaultValue?.toString() ?? '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {tableDetail.indexes.length > 0 && (
                                            <div className="structure-section">
                                                <h4>索引信息</h4>
                                                <div className="table-wrapper">
                                                    <table className="data-table">
                                                        <thead>
                                                            <tr>
                                                                <th>索引名</th>
                                                                <th>唯一</th>
                                                                <th>列</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {tableDetail.indexes.map((idx) => (
                                                                <tr key={idx.name}>
                                                                    <td>{idx.name}</td>
                                                                    <td>{idx.unique ? '是' : '否'}</td>
                                                                    <td>{idx.columns.join(', ')}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="structure-section">
                                            <h4>建表语句</h4>
                                            <pre className="code-block">{tableDetail.createSql}</pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SQL Tab */}
                            {activeTab === 'sql' && (
                                <div className="tab-content">
                                    <div className="sql-query-container">
                                        <div className="sql-input-area">
                                            <textarea
                                                value={sqlQuery}
                                                onChange={(e) => setSqlQuery(e.target.value)}
                                                placeholder="输入 SQL 查询语句..."
                                                className="sql-textarea"
                                            />
                                            <button
                                                className="btn btn-primary"
                                                onClick={executeQuery}
                                                disabled={loading}
                                            >
                                                <IconCode />
                                                执行查询
                                            </button>
                                        </div>

                                        {queryResult && (
                                            <div className="query-result">
                                                <h4>查询结果 ({queryResult.rowCount} 行)</h4>
                                                <div className="table-wrapper">
                                                    <table className="data-table">
                                                        <thead>
                                                            <tr>
                                                                {queryResult.columns.map((col: string) => (
                                                                    <th key={col}>{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {queryResult.list.map((row: any, idx: number) => (
                                                                <tr key={idx}>
                                                                    {queryResult.columns.map((col: string) => (
                                                                        <td key={col}>{row[col]?.toString() ?? 'NULL'}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <IconDatabase />
                            <p>请从左侧选择一个表进行查看</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DatabaseManagerPage;
