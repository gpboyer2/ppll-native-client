/**
 * 模型索引文件
 * 统一管理和初始化所有数据模型，建立数据库连接和模型关联
 *
 * 支持 SQLite 数据库，数据库路径通过环境变量 SQLITE_PATH 指定
 * 由 Go 端启动时注入环境变量
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// 加载数据库配置
const config = require(__dirname + '/../config/database.json')[env];

// 获取数据库存储路径
// 如果配置为 "auto"，则从环境变量 SQLITE_PATH 获取
// 如果环境变量未设置，使用默认路径
let storagePath = config.storage;
if (storagePath === 'auto') {
  storagePath = process.env.SQLITE_PATH;
  if (!storagePath) {
    // 默认路径：~/.config/ppll-client/data.db
    const os = require('os');
    const homeDir = os.homedir();
    storagePath = path.join(homeDir, '.config', 'ppll-client', 'data.db');
  }
}

// 确保数据库目录存在
if (storagePath && storagePath !== ':memory:') {
  const dbDir = path.dirname(storagePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const db = {};

// 配置 Sequelize 选项
const sequelizeOptions = {
  ...config,
  storage: storagePath,
  // 日志由 Go 端统一控制：默认不打印，debug 模式打印
  logging: false,
  // SQLite 特定配置
  dialectOptions: {
    // 启用外键约束
    // 设置 busy timeout 避免并发冲突
  },
  // SQLite 连接池配置（单写模式）
  pool: config.pool || {
    max: 1,           // SQLite 只能单写连接
    idle: 10000,
    acquire: 30000,
  },
  define: {
    // 禁用自动复数化
    freezeTableName: true,
    // 使用下划线命名
    underscored: false,
  },
};

// 创建 Sequelize 实例
let sequelize;
if (config.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: sequelizeOptions.logging,
    pool: sequelizeOptions.pool,
    define: sequelizeOptions.define,
    // 使用 sqlite3 包
    dialectModule: require('sqlite3'),
  });
} else {
  // MySQL 等其他数据库的兼容配置（保留以防回退）
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    sequelizeOptions
  );
}

// 加载所有模型文件
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// 建立模型关联关系
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 导出数据库路径供其他模块使用
db.storagePath = storagePath;

module.exports = db;
