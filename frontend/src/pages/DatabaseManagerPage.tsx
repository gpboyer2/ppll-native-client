import { useState, useEffect, useCallback, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { ApiEndpoints } from '../api/endpoints';
import { TextInput, Checkbox, Radio, Textarea } from '../components/mantine';
import {
    IconDatabase,
    IconTable,
    IconRefresh,
    IconSearch,
    IconPlus,
    IconEdit,
    IconTrash,
    IconCode,
    IconMore,
    IconCopy,
    IconClean,
    IconKey,
    IconCheck,
    IconX
} from '../components/icons';

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

    // 表操作菜单状态
    const [showTableMenu, setShowTableMenu] = useState<string | null>(null);
    const tableMenuRef = useRef<HTMLDivElement>(null);

    // 弹窗状态
    const [showRenameTableModal, setShowRenameTableModal] = useState(false);
    const [renameTableValue, setRenameTableValue] = useState('');
    const [showCopyTableModal, setShowCopyTableModal] = useState(false);
    const [copyTableName, setCopyTableName] = useState('');
    const [copyWithData, setCopyWithData] = useState(true);
    const [showRenameColumnModal, setShowRenameColumnModal] = useState(false);
    const [renameColumnOld, setRenameColumnOld] = useState('');
    const [renameColumnNew, setRenameColumnNew] = useState('');
    const [showCreateIndexModal, setShowCreateIndexModal] = useState(false);
    const [indexName, setIndexName] = useState('');
    const [indexUnique, setIndexUnique] = useState(false);
    const [indexColumns, setIndexColumns] = useState<string[]>([]);

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
                message: response.msg || '执行失败',
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

    // 重命名表
    const handleRenameTable = async () => {
        if (!renameTableValue.trim()) {
            notifications.show({ title: '错误', message: '表名不能为空', color: 'red' });
            return;
        }
        const response = await ApiEndpoints.renameTable(selectedTable, renameTableValue.trim());
        if (response.code === 200) {
            notifications.show({
                title: '重命名成功',
                message: `表已重命名为 "${renameTableValue}"`,
                color: 'teal'
            });
            setShowRenameTableModal(false);
            setRenameTableValue('');
            handleRefresh();
            setSelectedTable(renameTableValue.trim());
        } else {
            notifications.show({
                title: '重命名失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
    };

    // 复制表
    const handleCopyTable = async () => {
        if (!copyTableName.trim()) {
            notifications.show({ title: '错误', message: '新表名不能为空', color: 'red' });
            return;
        }
        const response = await ApiEndpoints.copyTable(selectedTable, copyTableName.trim(), copyWithData);
        if (response.code === 200) {
            notifications.show({
                title: '复制成功',
                message: `表已复制为 "${copyTableName}"`,
                color: 'teal'
            });
            setShowCopyTableModal(false);
            setCopyTableName('');
            handleRefresh();
        } else {
            notifications.show({
                title: '复制失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
    };

    // 清空表
    const handleTruncateTable = async (tableName: string) => {
        if (!confirm(`确定要清空表 "${tableName}" 吗？此操作将删除所有数据但保留表结构！`)) return;
        const response = await ApiEndpoints.truncateTable([tableName]);
        if (response.code === 200) {
            notifications.show({
                title: '清空成功',
                message: `表 "${tableName}" 已清空`,
                color: 'teal'
            });
            handleRefresh();
        } else {
            notifications.show({
                title: '清空失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
        setShowTableMenu(null);
    };

    // 重命名列
    const handleRenameColumn = async () => {
        if (!renameColumnNew.trim()) {
            notifications.show({ title: '错误', message: '新列名不能为空', color: 'red' });
            return;
        }
        const response = await ApiEndpoints.renameColumn(selectedTable, renameColumnOld, renameColumnNew.trim());
        if (response.code === 200) {
            notifications.show({
                title: '重命名成功',
                message: `列已重命名为 "${renameColumnNew}"`,
                color: 'teal'
            });
            setShowRenameColumnModal(false);
            setRenameColumnNew('');
            handleRefresh();
        } else {
            notifications.show({
                title: '重命名失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
    };

    // 打开重命名列弹窗
    const openRenameColumnModal = (columnName: string) => {
        setRenameColumnOld(columnName);
        setRenameColumnNew(columnName);
        setShowRenameColumnModal(true);
    };

    // 创建索引
    const handleCreateIndex = async () => {
        if (!indexName.trim()) {
            notifications.show({ title: '错误', message: '索引名不能为空', color: 'red' });
            return;
        }
        if (indexColumns.length === 0) {
            notifications.show({ title: '错误', message: '请选择至少一列', color: 'red' });
            return;
        }
        const response = await ApiEndpoints.createIndex({
            tableName: selectedTable,
            indexName: indexName.trim(),
            columns: indexColumns,
            unique: indexUnique
        });
        if (response.code === 200) {
            notifications.show({
                title: '创建成功',
                message: `索引 "${indexName}" 已创建`,
                color: 'teal'
            });
            setShowCreateIndexModal(false);
            setIndexName('');
            setIndexColumns([]);
            setIndexUnique(false);
            handleRefresh();
        } else {
            notifications.show({
                title: '创建失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
    };

    // 删除索引
    const handleDeleteIndex = async (indexName: string) => {
        if (!confirm(`确定要删除索引 "${indexName}" 吗？`)) return;
        const response = await ApiEndpoints.deleteIndex([indexName]);
        if (response.code === 200) {
            notifications.show({
                title: '删除成功',
                message: `索引 "${indexName}" 已删除`,
                color: 'teal'
            });
            handleRefresh();
        } else {
            notifications.show({
                title: '删除失败',
                message: response.msg || '操作失败',
                color: 'red'
            });
        }
    };

    // 切换索引列选择
    const toggleIndexColumn = (columnName: string) => {
        if (indexColumns.includes(columnName)) {
            setIndexColumns(indexColumns.filter(c => c !== columnName));
        } else {
            setIndexColumns([...indexColumns, columnName]);
        }
    };

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
                setShowTableMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                            <TextInput
                                placeholder="搜索表名..."
                                value={keyword}
                                onChange={(value: string) => setKeyword(value)}
                                styles={{
                                    root: { flex: 1 },
                                    input: {
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        paddingLeft: 0,
                                        paddingRight: 0,
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--color-text)'
                                    }
                                }}
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
                                        <div className="table-item-actions" ref={showTableMenu === table.name ? tableMenuRef : undefined}>
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowTableMenu(showTableMenu === table.name ? null : table.name);
                                                }}
                                            >
                                                <IconMore />
                                            </button>
                                            {showTableMenu === table.name && (
                                                <div className="table-menu-dropdown">
                                                    <div
                                                        className="table-menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowTableMenu(null);
                                                            setRenameTableValue(table.name);
                                                            setShowRenameTableModal(true);
                                                        }}
                                                    >
                                                        <IconEdit />
                                                        <span>重命名</span>
                                                    </div>
                                                    <div
                                                        className="table-menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowTableMenu(null);
                                                            setCopyTableName(table.name + '_copy');
                                                            setShowCopyTableModal(true);
                                                        }}
                                                    >
                                                        <IconCopy />
                                                        <span>复制表</span>
                                                    </div>
                                                    <div className="table-menu-divider"></div>
                                                    <div
                                                        className="table-menu-item text-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTruncateTable(table.name);
                                                        }}
                                                    >
                                                        <IconClean />
                                                        <span>清空表</span>
                                                    </div>
                                                    <div
                                                        className="table-menu-item text-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowTableMenu(null);
                                                            handleDeleteTable(table.name);
                                                        }}
                                                    >
                                                        <IconTrash />
                                                        <span>删除表</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                                            <div className="flex items-center justify-between mb-12">
                                                <h4>列信息</h4>
                                            </div>
                                            <div className="table-wrapper">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>列名</th>
                                                            <th>类型</th>
                                                            <th>主键</th>
                                                            <th>可空</th>
                                                            <th>默认值</th>
                                                            <th>操作</th>
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
                                                                <td>
                                                                    <button
                                                                        className="btn-icon"
                                                                        onClick={() => openRenameColumnModal(col.name)}
                                                                        title="重命名"
                                                                    >
                                                                        <IconEdit />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="structure-section">
                                            <div className="flex items-center justify-between mb-12">
                                                <h4>索引管理</h4>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => {
                                                        setIndexName('idx_' + selectedTable);
                                                        setIndexColumns([]);
                                                        setIndexUnique(false);
                                                        setShowCreateIndexModal(true);
                                                    }}
                                                >
                                                    <IconPlus />
                                                    <span>新建索引</span>
                                                </button>
                                            </div>
                                            <div className="table-wrapper">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>索引名</th>
                                                            <th>类型</th>
                                                            <th>列</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tableDetail.indexes.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="text-center text-muted">
                                                                    暂无索引
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            tableDetail.indexes.map((idx) => (
                                                                <tr key={idx.name}>
                                                                    <td>
                                                                        <span className="flex items-center gap-4">
                                                                            <IconKey />
                                                                            {idx.name}
                                                                        </span>
                                                                    </td>
                                                                    <td>{idx.unique ? '唯一' : '普通'}</td>
                                                                    <td>{idx.columns.join(', ')}</td>
                                                                    <td>
                                                                        {idx.name.startsWith('sqlite_autoindex_') ? (
                                                                            <span className="text-muted text-sm">主键索引</span>
                                                                        ) : (
                                                                            <button
                                                                                className="btn-icon btn-icon-danger"
                                                                                onClick={() => handleDeleteIndex(idx.name)}
                                                                                title="删除索引"
                                                                            >
                                                                                <IconTrash />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

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
                                            <Textarea
                                                value={sqlQuery}
                                                onChange={(value: string) => setSqlQuery(value)}
                                                placeholder="输入 SQL 查询语句..."
                                                classNames={{ input: 'sql-textarea' }}
                                                autosize
                                                minRows={10}
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

            {/* 重命名表弹窗 */}
            {showRenameTableModal && (
                <div className="modal-overlay" onClick={() => setShowRenameTableModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>重命名表</h3>
                            <button className="btn-icon" onClick={() => setShowRenameTableModal(false)}>
                                <IconX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>原表名</label>
                                <TextInput value={selectedTable} disabled />
                            </div>
                            <div className="form-group">
                                <label>新表名</label>
                                <TextInput
                                    value={renameTableValue}
                                    onChange={(value: string) => setRenameTableValue(value)}
                                    placeholder="输入新表名"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowRenameTableModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleRenameTable}>
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 复制表弹窗 */}
            {showCopyTableModal && (
                <div className="modal-overlay" onClick={() => setShowCopyTableModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>复制表</h3>
                            <button className="btn-icon" onClick={() => setShowCopyTableModal(false)}>
                                <IconX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>原表名</label>
                                <TextInput value={selectedTable} disabled />
                            </div>
                            <div className="form-group">
                                <label>新表名</label>
                                <TextInput
                                    value={copyTableName}
                                    onChange={(value: string) => setCopyTableName(value)}
                                    placeholder="输入新表名"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <Checkbox
                                    label="复制数据"
                                    checked={copyWithData}
                                    onChange={(checked: boolean) => setCopyWithData(checked)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowCopyTableModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleCopyTable}>
                                复制
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 重命名列弹窗 */}
            {showRenameColumnModal && (
                <div className="modal-overlay" onClick={() => setShowRenameColumnModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>重命名列</h3>
                            <button className="btn-icon" onClick={() => setShowRenameColumnModal(false)}>
                                <IconX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>原列名</label>
                                <TextInput value={renameColumnOld} disabled />
                            </div>
                            <div className="form-group">
                                <label>新列名</label>
                                <TextInput
                                    value={renameColumnNew}
                                    onChange={(value: string) => setRenameColumnNew(value)}
                                    placeholder="输入新列名"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowRenameColumnModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleRenameColumn}>
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 创建索引弹窗 */}
            {showCreateIndexModal && (
                <div className="modal-overlay" onClick={() => setShowCreateIndexModal(false)}>
                    <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>创建索引</h3>
                            <button className="btn-icon" onClick={() => setShowCreateIndexModal(false)}>
                                <IconX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>索引名</label>
                                <TextInput
                                    value={indexName}
                                    onChange={(value: string) => setIndexName(value)}
                                    placeholder="输入索引名"
                                />
                            </div>
                            <div className="form-group">
                                <label>索引类型</label>
                                <div className="radio-group">
                                    <Radio
                                        label="普通索引"
                                        checked={!indexUnique}
                                        value="normal"
                                        onChange={() => setIndexUnique(false)}
                                    />
                                    <Radio
                                        label="唯一索引"
                                        checked={indexUnique}
                                        value="unique"
                                        onChange={() => setIndexUnique(true)}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>包含列</label>
                                <div className="index-checkbox-list">
                                    {tableDetail?.columns.map((col) => (
                                        <Checkbox
                                            key={col.name}
                                            label={col.name}
                                            checked={indexColumns.includes(col.name)}
                                            onChange={() => toggleIndexColumn(col.name)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowCreateIndexModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateIndex}>
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DatabaseManagerPage;
