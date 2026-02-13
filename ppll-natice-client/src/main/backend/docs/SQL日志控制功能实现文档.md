# SQL日志控制功能实现文档

## 用户需求

用户在启动开发服务器时，遇到大量的SQL语句输出，希望能够通过一个变量开关来手动控制是否显示这些SQL语句。

## 问题分析

通过分析代码发现，SQL语句的输出来自以下几个层面：

1. Sequelize ORM的全局日志配置
2. 特定的批量操作（如`bulkCreate`）可能绕过全局配置
3. 主要涉及`mark_price`表的大量插入/更新操作

## 解决方案

### 1. 添加环境变量控制

在项目的环境配置文件中添加了`DISABLE_SQL_LOGGING`变量：

**开发环境配置** (`.env.development`)：

```bash
# 禁用SQL日志显示（设置为'true'禁用，'false'或删除此行启用）
DISABLE_SQL_LOGGING='true'
```

**生产环境配置** (`.env.production`)：

```bash
# 禁用SQL日志显示（设置为'true'禁用，'false'或删除此行启用）
DISABLE_SQL_LOGGING='true'
```

### 2. 修改Sequelize全局日志配置

在`models/index.js`文件中，修改了Sequelize实例的初始化配置：

```javascript
// 配置Sequelize选项，包括SQL日志控制
const sequelizeOptions = Object.assign({}, config, {
    // 通过环境变量DISABLE_SQL_LOGGING控制SQL语句日志显示
    // 设置为 'true' 时禁用SQL日志，设置为 'false' 或未设置时显示SQL日志
    logging: process.env.DISABLE_SQL_LOGGING === "true" ? false : console.log,
});

let sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    sequelizeOptions,
);
```

### 3. 修复批量操作的日志控制

发现特定的批量操作可能绕过全局配置，需要单独处理：

**修改mark-price.service.js**：

```javascript
await MarkPrice.bulkCreate(records, {
    updateOnDuplicate: [
        "mark_price",
        "index_price",
        "estimated_settle_price",
        "funding_rate",
        "next_funding_time",
        "updated_at",
    ],
    // 通过环境变量控制此批量操作的SQL日志显示
    logging: process.env.DISABLE_SQL_LOGGING === "true" ? false : console.log,
});
```

**修改analytics.service.js**：

```javascript
await UserActionLog.bulkCreate(formattedLogs, {
    // 通过环境变量控制此批量操作的SQL日志显示
    logging: process.env.DISABLE_SQL_LOGGING === "true" ? false : console.log,
});
```

## 使用方法

### 禁用SQL日志

将环境变量设置为：

```bash
DISABLE_SQL_LOGGING='true'
```

### 启用SQL日志

将环境变量设置为：

```bash
DISABLE_SQL_LOGGING='false'
```

或者直接删除该配置项。

## 技术要点

1. **环境变量优先级**：通过检查`process.env.DISABLE_SQL_LOGGING === 'true'`来决定是否禁用日志
2. **向后兼容性**：如果未设置环境变量，默认保持原有的日志行为
3. **全面覆盖**：既处理了全局Sequelize配置，也处理了特定的批量操作
4. **灵活控制**：支持在不同环境（开发、测试、生产）中分别控制

## 维护说明

1. 如果将来添加新的批量数据库操作，需要同样为其添加日志控制参数
2. 环境变量的值必须是字符串`'true'`才会禁用日志，其他任何值都会保持日志输出
3. 修改环境变量后需要重启服务才能生效
