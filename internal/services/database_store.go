package services

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

// DatabaseStore SQLite 数据库存储服务
// 职责：
// 1. 初始化 SQLite 数据库连接
// 2. 自动创建表结构（如果不存在）
// 3. 提供数据库路径供 Node.js 使用
// 4. 管理数据库生命周期
type DatabaseStore struct {
	ctx        context.Context
	appName    string
	dbPath     string
	db         *sql.DB
	once       sync.Once
	mu         sync.RWMutex
}

// NewDatabaseStore 创建数据库存储实例
func NewDatabaseStore(ctx context.Context, appName string) *DatabaseStore {
	return &DatabaseStore{
		ctx:     ctx,
		appName: appName,
	}
}

// path 返回数据库文件路径
// 与 config.enc.json 在同一目录：~/.config/ppll-client/data.db
func (s *DatabaseStore) path() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		home, _ := os.UserHomeDir()
		if home == "" {
			return "", fmt.Errorf("无法获取用户目录")
		}
		dir = filepath.Join(home, ".config")
	}

	appDir := filepath.Join(dir, s.appName)
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return "", fmt.Errorf("创建应用目录失败: %w", err)
	}

	return filepath.Join(appDir, "data.db"), nil
}

// Init 初始化数据库连接并创建表结构
func (s *DatabaseStore) Init() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var initErr error
	s.once.Do(func() {
		dbPath, err := s.path()
		if err != nil {
			initErr = fmt.Errorf("获取数据库路径失败: %w", err)
			return
		}
		s.dbPath = dbPath

		// 打开数据库连接
		// 启用 WAL 模式以提高并发性能
		// 设置 busy timeout 为 30 秒
		db, err := sql.Open("sqlite", s.dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(30000)&_pragma=foreign_keys(1)")
		if err != nil {
			initErr = fmt.Errorf("打开数据库失败: %w", err)
			return
		}

		// 测试连接
		if err := db.Ping(); err != nil {
			initErr = fmt.Errorf("数据库连接测试失败: %w", err)
			db.Close()
			return
		}

		// 设置连接池（SQLite 单写模式）
		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)

		s.db = db

		// 创建表结构
		if err := s.createTables(); err != nil {
			initErr = fmt.Errorf("创建表结构失败: %w", err)
			return
		}
	})

	return initErr
}

// createTables 创建所有表结构
// 这里创建所有 Node.js 端需要的表
func (s *DatabaseStore) createTables() error {
	// 按依赖顺序创建表
	tables := []string{
		s.sqlRoles(),
		s.sqlPermissions(),
		s.sqlUsers(),
		s.sqlRobots(),
		s.sqlGridStrategies(),
		s.sqlOrders(),
		s.sqlGridTradeHistory(),
		s.sqlMarkPrice(),
		s.sqlLoginLogs(),
		s.sqlOperationLogs(),
		s.sqlApiErrorLog(),
		s.sqlSystemLogs(),
		s.sqlPageViewLog(),
		s.sqlSpotAccount(),
		s.sqlUsdMFuturesAccount(),
		s.sqlCoinMFuturesAccount(),
		s.sqlBinanceExchangeInfo(),
		s.sqlChat(),
		s.sqlToken(),
		s.sqlBannedIp(),
	}

	for _, sql := range tables {
		if _, err := s.db.Exec(sql); err != nil {
			return fmt.Errorf("创建表失败: %w", err)
		}
	}

	return nil
}

// GetPath 获取数据库文件路径（供 Node.js 使用）
func (s *DatabaseStore) GetPath() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.dbPath
}

// GetDB 获取数据库连接（仅供 Go 端内部使用，Node.js 直接连接文件）
func (s *DatabaseStore) GetDB() *sql.DB {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.db
}

// Close 关闭数据库连接
func (s *DatabaseStore) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// IsHealthy 检查数据库健康状态
func (s *DatabaseStore) IsHealthy() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.db == nil {
		return false
	}

	return s.db.Ping() == nil
}

// ==================== 表结构 SQL ====================

// sqlRoles 角色表
func (s *DatabaseStore) sqlRoles() string {
	return `
	CREATE TABLE IF NOT EXISTS roles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name VARCHAR(100) NOT NULL,
		code VARCHAR(50) NOT NULL UNIQUE,
		description VARCHAR(255),
		permissions TEXT,
		isDefault TINYINT(1) DEFAULT 0,
		status TINYINT(1) DEFAULT 1,
		remark VARCHAR(255),
		sort INTEGER DEFAULT 0,
		deleted INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlPermissions 权限表
func (s *DatabaseStore) sqlPermissions() string {
	return `
	CREATE TABLE IF NOT EXISTS permissions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name VARCHAR(100) NOT NULL,
		code VARCHAR(50) NOT NULL UNIQUE,
		description VARCHAR(255),
		module VARCHAR(50),
		remark VARCHAR(255),
		sort INTEGER DEFAULT 0,
		deleted INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlUsers 用户表
func (s *DatabaseStore) sqlUsers() string {
	return `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username VARCHAR(64) DEFAULT '',
		email VARCHAR(128) DEFAULT '',
		password VARCHAR(256) NOT NULL DEFAULT '',
		apiKey VARCHAR(255),
		apiSecret VARCHAR(255),
		role VARCHAR(32) DEFAULT 'user',
		permissions VARCHAR(255),
		status TINYINT DEFAULT 2,
		active TINYINT DEFAULT 1,
		deleted TINYINT DEFAULT 0,
		vip_expire DATETIME,
		last_login_time DATETIME,
		last_login_ip VARCHAR(64),
		token VARCHAR(255),
		token_expire VARCHAR(255),
		remark VARCHAR(255),
		birthday DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlRobots 机器人表
func (s *DatabaseStore) sqlRobots() string {
	return `
	CREATE TABLE IF NOT EXISTS robots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		apiKey VARCHAR(255),
		apiSecret VARCHAR(255),
		symbol VARCHAR(255),
		minPrice INTEGER,
		maxPrice INTEGER,
		maxOpenPositionQuantity INTEGER,
		minOpenPositionQuantity INTEGER,
		leverage INTEGER,
		gridPriceDifference INTEGER,
		gridTradeQuantity INTEGER,
		initialFillPrice INTEGER,
		initialFillQuantity INTEGER,
		pollingInterval INTEGER,
		fallPreventionCoefficient VARCHAR(255),
		robotname VARCHAR(255),
		message VARCHAR(255),
		remark VARCHAR(255),
		active INTEGER,
		status INTEGER,
		deleted INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlGridStrategies 网格策略表
func (s *DatabaseStore) sqlGridStrategies() string {
	return `
	CREATE TABLE IF NOT EXISTS grid_strategies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name VARCHAR(100),
		user_id BIGINT,
		trading_pair VARCHAR(20) NOT NULL,
		api_key VARCHAR(128) NOT NULL,
		api_secret VARCHAR(256) NOT NULL,
		grid_price_difference DECIMAL(20,8) NOT NULL,
		grid_trade_quantity DECIMAL(20,8),
		grid_long_open_quantity DECIMAL(20,8),
		grid_long_close_quantity DECIMAL(20,8),
		grid_short_open_quantity DECIMAL(20,8),
		grid_short_close_quantity DECIMAL(20,8),
		max_open_position_quantity DECIMAL(20,8),
		min_open_position_quantity DECIMAL(20,8),
		fall_prevention_coefficient DECIMAL(20,8) DEFAULT 0,
		execution_type VARCHAR(20) DEFAULT 'WEBSOCKET',
		polling_interval INTEGER DEFAULT 10000,
		status VARCHAR(20) DEFAULT 'RUNNING',
		total_open_position_quantity DECIMAL(20,8) DEFAULT 0,
		total_open_position_value DECIMAL(20,8) DEFAULT 0,
		total_pairing_times INTEGER DEFAULT 0,
		invested_margin DECIMAL(20,8) DEFAULT 0,
		funding_fee DECIMAL(20,8) DEFAULT 0,
		total_fee DECIMAL(20,8) DEFAULT 0,
		liquidation_price DECIMAL(20,8),
		is_above_open_price BOOLEAN DEFAULT 0,
		is_below_open_price BOOLEAN DEFAULT 0,
		priority_close_on_trend BOOLEAN DEFAULT 1,
		grid_strategy_name VARCHAR(100),
		position_side VARCHAR(20),
		paused BOOLEAN DEFAULT 0,
		throttle_enabled BOOLEAN DEFAULT 0,
		gt_limitation_price DECIMAL(20,8),
		lt_limitation_price DECIMAL(20,8),
		total_profit_loss DECIMAL(20,8) DEFAULT 0,
		total_trades INTEGER DEFAULT 0,
		successful_trades INTEGER DEFAULT 0,
		failed_trades INTEGER DEFAULT 0,
		start_time DATETIME,
		last_trade_time DATETIME,
		exchange VARCHAR(20) DEFAULT 'BINANCE',
		exchange_type VARCHAR(20) DEFAULT 'USDT-M',
		leverage INTEGER DEFAULT 20,
		margin_type VARCHAR(20) DEFAULT 'ISOLATED',
		price_precision INTEGER DEFAULT 8,
		quantity_precision INTEGER DEFAULT 8,
		min_notional DECIMAL(20,8),
		current_grid_price DECIMAL(20,8),
		last_grid_price DECIMAL(20,8),
		stop_loss_price DECIMAL(20,8),
		take_profit_price DECIMAL(20,8),
		max_drawdown DECIMAL(10,4),
		daily_profit_limit DECIMAL(20,8),
		avg_execution_time INTEGER,
		error_count INTEGER DEFAULT 0,
		last_error_time DATETIME,
		last_error_message VARCHAR(500),
		remark VARCHAR(255),
		initial_fill_price DECIMAL(20,8) DEFAULT 0,
		total_open_position_entry_price DECIMAL(20,8) DEFAULT 0,
		next_expected_rise_price DECIMAL(20,8),
		next_expected_fall_price DECIMAL(20,8),
		max_position_value DECIMAL(20,8) DEFAULT 0,
		max_profit_value DECIMAL(20,8) DEFAULT 0,
		max_single_loss DECIMAL(20,8) DEFAULT 0,
		daily_max_loss DECIMAL(20,8),
		today_profit DECIMAL(20,8) DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlOrders 订单表
func (s *DatabaseStore) sqlOrders() string {
	return `
	CREATE TABLE IF NOT EXISTS orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id VARCHAR(64) NOT NULL UNIQUE,
		client_order_id VARCHAR(64),
		symbol VARCHAR(20) NOT NULL,
		side VARCHAR(10) NOT NULL,
		position_side VARCHAR(10),
		type VARCHAR(20) NOT NULL,
		quantity DECIMAL(20,8) NOT NULL,
		price DECIMAL(20,8),
		stop_price DECIMAL(20,8),
		status VARCHAR(20) NOT NULL,
		time_in_force VARCHAR(10),
		executed_qty DECIMAL(20,8) DEFAULT 0,
		executed_price DECIMAL(20,8),
		executed_amount DECIMAL(20,8) DEFAULT 0,
		fee DECIMAL(20,8) DEFAULT 0,
		fee_asset VARCHAR(10) DEFAULT 'USDT',
		realized_pnl DECIMAL(20,8) DEFAULT 0,
		apiKey VARCHAR(255),
		apiSecret VARCHAR(255),
		grid_id VARCHAR(64),
		grid_level INTEGER,
		grid_type VARCHAR(20),
		grid_price_difference DECIMAL(20,8),
		grid_trade_quantity DECIMAL(20,8),
		max_position_quantity DECIMAL(20,8),
		min_position_quantity DECIMAL(20,8),
		fall_prevention_coefficient DECIMAL(20,8),
		source VARCHAR(20),
		execution_type VARCHAR(20),
		user_id BIGINT,
		remark VARCHAR(255),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlGridTradeHistory 网格交易历史表
func (s *DatabaseStore) sqlGridTradeHistory() string {
	return `
	CREATE TABLE IF NOT EXISTS grid_trade_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		grid_id BIGINT NOT NULL,
		trading_pair VARCHAR(20) NOT NULL,
		open_order_id VARCHAR(64),
		close_order_id VARCHAR(64),
		open_time DATETIME,
		close_time DATETIME,
		open_price DECIMAL(20,8),
		close_price DECIMAL(20,8),
		quantity DECIMAL(20,8),
		profit_loss DECIMAL(20,8) DEFAULT 0,
		profit_loss_percentage DECIMAL(10,4) DEFAULT 0,
		fee DECIMAL(20,8) DEFAULT 0,
		position_side VARCHAR(20),
		remark VARCHAR(255),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlMarkPrice 标记价格表
func (s *DatabaseStore) sqlMarkPrice() string {
	return `
	CREATE TABLE IF NOT EXISTS mark_price (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		symbol VARCHAR(20) NOT NULL,
		price DECIMAL(20,8) NOT NULL,
		timestamp BIGINT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlLoginLogs 登录日志表
func (s *DatabaseStore) sqlLoginLogs() string {
	return `
	CREATE TABLE IF NOT EXISTS login_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		username VARCHAR(64),
		email VARCHAR(128),
		ip VARCHAR(64),
		user_agent TEXT,
		status VARCHAR(20),
		error_message VARCHAR(255),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlOperationLogs 操作日志表
func (s *DatabaseStore) sqlOperationLogs() string {
	return `
	CREATE TABLE IF NOT EXISTS operation_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		username VARCHAR(64),
		action VARCHAR(100),
		module VARCHAR(50),
		description TEXT,
		request_data TEXT,
		response_data TEXT,
		ip VARCHAR(64),
		user_agent TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlApiErrorLog API错误日志表
func (s *DatabaseStore) sqlApiErrorLog() string {
	return `
	CREATE TABLE IF NOT EXISTS api_error_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		endpoint VARCHAR(255),
		method VARCHAR(10),
		request_data TEXT,
		error_message TEXT,
		stack_trace TEXT,
		ip VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlSystemLogs 系统日志表
func (s *DatabaseStore) sqlSystemLogs() string {
	return `
	CREATE TABLE IF NOT EXISTS system_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		level VARCHAR(20),
		message TEXT,
		module VARCHAR(50),
		data TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlPageViewLog 页面访问日志表
func (s *DatabaseStore) sqlPageViewLog() string {
	return `
	CREATE TABLE IF NOT EXISTS page_view_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		page_url VARCHAR(255),
		referrer VARCHAR(255),
		ip VARCHAR(64),
		user_agent TEXT,
		duration INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlSpotAccount 现货账户表
func (s *DatabaseStore) sqlSpotAccount() string {
	return `
	CREATE TABLE IF NOT EXISTS spot_account (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		api_key VARCHAR(128),
		asset VARCHAR(20),
		free DECIMAL(20,8) DEFAULT 0,
		locked DECIMAL(20,8) DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlUsdMFuturesAccount U本位合约账户表
func (s *DatabaseStore) sqlUsdMFuturesAccount() string {
	return `
	CREATE TABLE IF NOT EXISTS usd_m_futures_account (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		api_key VARCHAR(128),
		total_wallet_balance DECIMAL(20,8) DEFAULT 0,
		available_balance DECIMAL(20,8) DEFAULT 0,
		unrealized_profit DECIMAL(20,8) DEFAULT 0,
		margin_balance DECIMAL(20,8) DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlCoinMFuturesAccount 币本位合约账户表
func (s *DatabaseStore) sqlCoinMFuturesAccount() string {
	return `
	CREATE TABLE IF NOT EXISTS coin_m_futures_account (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		api_key VARCHAR(128),
		asset VARCHAR(20),
		total_wallet_balance DECIMAL(20,8) DEFAULT 0,
		available_balance DECIMAL(20,8) DEFAULT 0,
		unrealized_profit DECIMAL(20,8) DEFAULT 0,
		margin_balance DECIMAL(20,8) DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlBinanceExchangeInfo 币安交易所信息表
func (s *DatabaseStore) sqlBinanceExchangeInfo() string {
	return `
	CREATE TABLE IF NOT EXISTS binance_exchange_info (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		symbol VARCHAR(20),
		exchange_type VARCHAR(20),
		data TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlChat 聊天表
func (s *DatabaseStore) sqlChat() string {
	return `
	CREATE TABLE IF NOT EXISTS chat (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id BIGINT,
		message TEXT,
		role VARCHAR(20),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlToken Token表
func (s *DatabaseStore) sqlToken() string {
	return `
	CREATE TABLE IF NOT EXISTS token (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token VARCHAR(255) NOT NULL UNIQUE,
		user_id BIGINT,
		type VARCHAR(20),
		expires DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}

// sqlBannedIp 封禁IP表
func (s *DatabaseStore) sqlBannedIp() string {
	return `
	CREATE TABLE IF NOT EXISTS banned_ip (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ip VARCHAR(64) NOT NULL UNIQUE,
		reason VARCHAR(255),
		banned_until DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
}
