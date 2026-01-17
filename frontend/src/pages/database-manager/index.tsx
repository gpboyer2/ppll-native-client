import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { ApiEndpoints } from '../../api/endpoints';
import { TextInput, Select } from '../../components/mantine';
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
  IconX
} from '../components/icons';

type TabType = 'browse' | 'structure' | 'sql';

interface DatabaseInfo {
    filePath: string;
    fileSizeFormatted: string;
    tableCount: number;
    total_rows: number;
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
  const [search_params, setSearchParams] = useSearchParams();
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [tableList, setTableList] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableDetail, setTableDetail] = useState<TableDetail | null>(null);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [loading, setLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10');
  const [queryResult, setQueryResult] = useState<any>(null);

  // 是否已经从 URL 参数初始化过选中表
  const initialized_from_url_ref = useRef(false);

  // 表操作菜单状态
  const [showTableMenu, setShowTableMenu] = useState<string | null>(null);
  const table_menu_ref = useRef<HTMLDivElement>(null);

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
  const fetch_database_info = useCallback(async () => {
    const response = await ApiEndpoints.getDatabaseInfo();
    if (response.status === 'success') {
      setDbInfo(response.datum);
    }
  }, []);

  // 获取表列表
  const fetch_table_list = useCallback(async () => {
    setLoading(true);
    const response = await ApiEndpoints.getDatabaseTables({
      currentPage: 1,
      pageSize: 100,
      keyword
    });
    if (response.status === 'success') {
      setTableList(response.datum.list);
    }
    setLoading(false);
  }, [keyword]);

  // 获取表结构详情
  const fetch_table_detail = useCallback(async (tableName: string) => {
    setLoading(true);
    const response = await ApiEndpoints.getTableDetail(tableName);
    if (response.status === 'success') {
      setTableDetail(response.datum);
    }
    setLoading(false);
  }, []);

  // 获取表数据
  const fetch_table_data = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    const response = await ApiEndpoints.getTableData({
      tableName: selectedTable,
      currentPage,
      pageSize,
      sortBy,
      sortOrder
    });
    if (response.status === 'success') {
      setTableData(response.datum);
    }
    setLoading(false);
  }, [selectedTable, currentPage, pageSize, sortBy, sortOrder]);

  // 执行 SQL 查询
  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    setLoading(true);
    const response = await ApiEndpoints.executeQuery(sqlQuery);
    if (response.status === 'success') {
      setQueryResult(response.datum);
      notifications.show({
        title: '查询成功',
        message: `返回 ${response.datum.rowCount} 行记录`,
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
  const handle_refresh = () => {
    fetch_database_info();
    fetch_table_list();
    if (selectedTable) {
      fetch_table_detail(selectedTable);
      if (activeTab === 'browse') {
        fetch_table_data();
      }
    }
  };

  // 选择表
  const handle_select_table = (tableName: string) => {
    setSelectedTable(tableName);
    setActiveTab('browse');
    setCurrentPage(1);
    fetch_table_detail(tableName);

    // 更新 URL 参数
    setSearchParams({ table_name: tableName });
  };

  // 排序
  const handle_sort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  // 删除表
  const handle_delete_table = async (tableName: string) => {
    if (!confirm(`确定要删除表 "${tableName}" 吗？此操作不可恢复！`)) return;
    const response = await ApiEndpoints.deleteTable([tableName]);
    if (response.status === 'success') {
      notifications.show({
        title: '删除成功',
        message: `表 "${tableName}" 已删除`,
        color: 'teal'
      });
      handle_refresh();
      if (selectedTable === tableName) {
        setSelectedTable('');
        setTableDetail(null);
        setTableData(null);
      }
    }
  };

  // 删除数据
  const handle_delete_row = async (rowId: any) => {
    if (!tableDetail) return;
    const pk_column = tableDetail.columns.find(c => c.primaryKey);
    if (!pk_column) return;
    const response = await ApiEndpoints.deleteData(selectedTable, [rowId]);
    if (response.status === 'success') {
      notifications.show({
        title: '删除成功',
        message: '记录已删除',
        color: 'teal'
      });
      fetch_table_data();
      fetch_table_list();
    }
  };

  // 重命名表
  const handle_rename_table = async () => {
    if (!renameTableValue.trim()) {
      notifications.show({ title: '错误', message: '表名不能为空', color: 'red' });
      return;
    }
    const response = await ApiEndpoints.renameTable(selectedTable, renameTableValue.trim());
    if (response.status === 'success') {
      notifications.show({
        title: '重命名成功',
        message: `表已重命名为 "${renameTableValue}"`,
        color: 'teal'
      });
      setShowRenameTableModal(false);
      setRenameTableValue('');
      handle_refresh();
      setSelectedTable(renameTableValue.trim());
    } else {
      notifications.show({
        title: '重命名失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
  };

  // 复制表
  const handle_copy_table = async () => {
    if (!copyTableName.trim()) {
      notifications.show({ title: '错误', message: '新表名不能为空', color: 'red' });
      return;
    }
    const response = await ApiEndpoints.copyTable(selectedTable, copyTableName.trim(), copyWithData);
    if (response.status === 'success') {
      notifications.show({
        title: '复制成功',
        message: `表已复制为 "${copyTableName}"`,
        color: 'teal'
      });
      setShowCopyTableModal(false);
      setCopyTableName('');
      handle_refresh();
    } else {
      notifications.show({
        title: '复制失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
  };

  // 清空表
  const handle_truncate_table = async (tableName: string) => {
    if (!confirm(`确定要清空表 "${tableName}" 吗？此操作将删除所有数据但保留表结构！`)) return;
    const response = await ApiEndpoints.truncateTable([tableName]);
    if (response.status === 'success') {
      notifications.show({
        title: '清空成功',
        message: `表 "${tableName}" 已清空`,
        color: 'teal'
      });
      handle_refresh();
    } else {
      notifications.show({
        title: '清空失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
    setShowTableMenu(null);
  };

  // 重命名列
  const handle_rename_column = async () => {
    if (!renameColumnNew.trim()) {
      notifications.show({ title: '错误', message: '新列名不能为空', color: 'red' });
      return;
    }
    const response = await ApiEndpoints.renameColumn(selectedTable, renameColumnOld, renameColumnNew.trim());
    if (response.status === 'success') {
      notifications.show({
        title: '重命名成功',
        message: `列已重命名为 "${renameColumnNew}"`,
        color: 'teal'
      });
      setShowRenameColumnModal(false);
      setRenameColumnNew('');
      handle_refresh();
    } else {
      notifications.show({
        title: '重命名失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
  };

  // 打开重命名列弹窗
  const open_rename_column_modal = (columnName: string) => {
    setRenameColumnOld(columnName);
    setRenameColumnNew(columnName);
    setShowRenameColumnModal(true);
  };

  // 创建索引
  const handle_create_index = async () => {
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
    if (response.status === 'success') {
      notifications.show({
        title: '创建成功',
        message: `索引 "${indexName}" 已创建`,
        color: 'teal'
      });
      setShowCreateIndexModal(false);
      setIndexName('');
      setIndexColumns([]);
      setIndexUnique(false);
      handle_refresh();
    } else {
      notifications.show({
        title: '创建失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
  };

  // 删除索引
  const handle_delete_index = async (indexName: string) => {
    if (!confirm(`确定要删除索引 "${indexName}" 吗？`)) return;
    const response = await ApiEndpoints.deleteIndex([indexName]);
    if (response.status === 'success') {
      notifications.show({
        title: '删除成功',
        message: `索引 "${indexName}" 已删除`,
        color: 'teal'
      });
      handle_refresh();
    } else {
      notifications.show({
        title: '删除失败',
        message: response.message || '操作失败',
        color: 'red'
      });
    }
  };

  // 切换索引列选择
  const toggle_index_column = (columnName: string) => {
    if (indexColumns.includes(columnName)) {
      setIndexColumns(indexColumns.filter(c => c !== columnName));
    } else {
      setIndexColumns([...indexColumns, columnName]);
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (table_menu_ref.current && !table_menu_ref.current.contains(e.target as Node)) {
        setShowTableMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 初始化
  useEffect(() => {
    fetch_database_info();
    fetch_table_list();
  }, []);

  // 从 URL 参数读取并选中表
  useEffect(() => {
    // 只在表列表加载完成后执行一次
    if (initialized_from_url_ref.current || tableList.length === 0) {
      return;
    }

    const table_name_from_url = search_params.get('table_name');
    if (table_name_from_url) {
      // 检查表是否存在
      const table_exists = tableList.some(t => t.name === table_name_from_url);
      if (table_exists) {
        handle_select_table(table_name_from_url);
        initialized_from_url_ref.current = true;
      }
    }
  }, [tableList, search_params]);

  // 监听选中表变化
  useEffect(() => {
    if (selectedTable && activeTab === 'browse') {
      fetch_table_data();
    }
  }, [selectedTable, currentPage, pageSize, sortBy, sortOrder, activeTab]);

  return (
    <div className="container database-manager-page">
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-8">
          <IconDatabase />
          <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>数据库管理</h2>
        </div>
        <button className="btn btn-outline" onClick={handle_refresh} disabled={loading}>
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
            <div className="stat-value">{dbInfo.total_rows}</div>
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
                  onClick={() => handle_select_table(table.name)}
                >
                  <div className="table-item-info">
                    <IconTable />
                    <div className="table-item-name">{table.name}</div>
                  </div>
                  <div className="table-item-meta">
                    <span>{table.rowCount} 行</span>
                    <div className="table-item-actions" ref={showTableMenu === table.name ? table_menu_ref : undefined}>
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
                              handle_truncate_table(table.name);
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
                              handle_delete_table(table.name);
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
                            {tableData.columns.map((col, index) => (
                              <th
                                key={col}
                                onClick={() => handle_sort(col)}
                                className={`${sortBy === col ? 'sorted' : ''} ${index === 0 ? 'fixed-column-first' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  <span>{col}</span>
                                  {sortBy === col && (
                                    <span>{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="fixed-column-last">操作</th>
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
                                {tableData.columns.map((col, colIndex) => (
                                  <td key={col} className={colIndex === 0 ? 'fixed-column-first' : ''}>{row[col]?.toString() ?? 'NULL'}</td>
                                ))}
                                <td className="fixed-column-last">
                                  <button
                                    className="btn-icon btn-icon-danger"
                                    onClick={() => {
                                      const pk_column = tableDetail?.columns.find(c => c.primaryKey);
                                      if (pk_column) handle_delete_row(row[pk_column.name]);
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

                        {/* 页码跳转 */}
                        <div className="pagination-jump">
                          <TextInput
                            placeholder="页码"
                            value={jumpPageInput}
                            onChange={setJumpPageInput}
                            styles={{
                              root: { width: '70px' },
                              input: { textAlign: 'center' }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const page = parseInt(jumpPageInput);
                                const max_page = Math.ceil(tableData.pagination.total / pageSize);
                                if (page >= 1 && page <= max_page) {
                                  setCurrentPage(page);
                                  setJumpPageInput('');
                                }
                              }
                            }}
                          />
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              const page = parseInt(jumpPageInput);
                              const max_page = Math.ceil(tableData.pagination.total / pageSize);
                              if (page >= 1 && page <= max_page) {
                                setCurrentPage(page);
                                setJumpPageInput('');
                              }
                            }}
                          >
                            跳转
                          </button>
                        </div>

                        {/* 每页显示数量 */}
                        <div className="pagination-size">
                          <Select
                            value={String(pageSize)}
                            onChange={(value) => {
                              if (value) {
                                setPageSize(Number(value));
                                setCurrentPage(1);
                              }
                            }}
                            data={[
                              { value: '20', label: '20条/页' },
                              { value: '50', label: '50条/页' },
                              { value: '100', label: '100条/页' }
                            ]}
                            styles={{
                              root: { width: '110px' }
                            }}
                          />
                        </div>
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
                                    onClick={() => open_rename_column_modal(col.name)}
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
                                        onClick={() => handle_delete_index(idx.name)}
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
              <button className="btn btn-primary" onClick={handle_rename_table}>
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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={copyWithData}
                    onChange={(e) => setCopyWithData(e.target.checked)}
                  />
                  <span>复制数据</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCopyTableModal(false)}>
                                取消
              </button>
              <button className="btn btn-primary" onClick={handle_copy_table}>
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
              <button className="btn btn-primary" onClick={handle_rename_column}>
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
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={!indexUnique}
                      onChange={() => setIndexUnique(false)}
                    />
                    <span>普通索引</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={indexUnique}
                      onChange={() => setIndexUnique(true)}
                    />
                    <span>唯一索引</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>包含列</label>
                <div className="index-checkbox-list">
                  {tableDetail?.columns.map((col) => (
                    <label key={col.name} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={indexColumns.includes(col.name)}
                        onChange={() => toggle_index_column(col.name)}
                      />
                      <span>{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreateIndexModal(false)}>
                                取消
              </button>
              <button className="btn btn-primary" onClick={handle_create_index}>
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
