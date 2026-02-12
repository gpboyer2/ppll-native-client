# Gate币种数据24h涨跌幅排序功能实现文档

## 用户需求

实现按24h涨跌幅排序的功能，包括：

- 每30分钟自动更新Gate.io币种数据
- 将数据缓存到内存中供快速访问
- 提供API接口返回涨跌幅排序数据

## 实现过程中发现的问题

1. **API请求频率限制**：Gate.io接口有请求频率限制，需要合理设置更新间隔
2. **数据量大**：全部币种数据较多，需要分页处理和内存优化
3. **网络稳定性**：外部API调用可能失败，需要错误处理和重试机制
4. **并发访问**：多个用户同时访问缓存数据，需要考虑性能

## 使用的解决方案

### 1. 定时任务实现

**文件位置**: `jobs/getGateAllCoinList.js`

**主要功能**:

- 每30分钟自动调用Gate.io API获取最新数据
- 并行获取涨幅榜、跌幅榜和全部币种数据
- 将数据存储到全局内存缓存 `global.GATE_COIN_CACHE`
- 提供详细的日志记录和错误处理

**核心实现**:

```javascript
// 全局缓存结构
global.GATE_COIN_CACHE = {
    gainers: [], // 涨幅榜数据
    losers: [], // 跌幅榜数据
    all: [], // 全部币种数据
    lastUpdate: null, // 最后更新时间
};

// 定时任务每30分钟执行
setInterval(updateGateCoinCache, 30 * 60 * 1000);
```

### 2. API接口实现

**控制器文件**: `controller/gate-coin-list.controller.js`
**路由文件**: `route/v1/gate-coin-list.route.js`

**提供的接口**:

- `GET /v1/gate-coin-list/gainers` - 获取涨幅榜数据
- `GET /v1/gate-coin-list/losers` - 获取跌幅榜数据
- `GET /v1/gate-coin-list/all` - 获取全部币种数据（支持排序）
- `GET /v1/gate-coin-list/status` - 获取缓存状态信息

**特性**:

- 支持分页查询（page, pageSize参数）
- 支持排序方向控制（sort参数：desc/asc）
- 统一的响应格式和错误处理
- 缓存未准备时的友好提示

### 3. 应用集成

**修改文件**: `app.js`

- 在应用启动时自动加载定时任务模块
- 确保服务重启后立即开始数据更新

**修改文件**: `route/route.manager.js`

- 注册新的API路由到路由管理器
- 统一管理所有API端点

### 4. Gate.io API调用

**使用的API端点**: `https://www.gate.com/api-price/api/inner/v3/price/getAllCoinList`

**请求参数说明**:

- 涨幅榜: `tab=crypto-gainers&sort=dimension_24h&order=desc`
- 跌幅榜: `tab=crypto-losers&sort=dimension_24h&order=asc`
- 全部数据: `tab=trade&is_gate=1000001`

**请求头配置**:

- 模拟浏览器User-Agent避免被识别为爬虫
- 设置适当的Accept和Content-Type头部
- 包含必要的Referer和Origin信息

## 将来如何维护

### 1. 监控和日志

- 定时任务会输出详细日志，包括获取数据条数和耗时
- 可通过 `/v1/gate-coin-list/status` 接口监控缓存状态
- 关注错误日志中的API调用失败信息

### 2. 性能优化

- 当前每30分钟更新一次，可根据需要调整频率
- 如果数据量增大，可考虑只缓存热门币种
- 可添加Redis等外部缓存替换内存缓存

### 3. 错误处理

- API调用失败时会记录错误但不影响服务运行
- 建议添加告警机制，连续失败时发送通知
- 可考虑添加备用数据源

### 4. 功能扩展

- 可添加更多排序维度（成交量、市值等）
- 可添加币种搜索和筛选功能
- 可扩展支持其他交易所数据

### 5. 测试验证

**快速验证脚本**: `test/test-gate-coin-cache.js`

```bash
node test/test-gate-coin-cache.js
```

**完整功能测试**: `test/gate-coin-list.test.js`

```bash
node test/gate-coin-list.test.js
```

### 6. 配置管理

**环境变量支持**:

- 可通过环境变量控制更新频率
- 可配置API超时时间和重试次数
- 可控制缓存大小和保留时间

**建议配置项**:

```env
GATE_UPDATE_INTERVAL=1800000  # 更新间隔（毫秒）
GATE_API_TIMEOUT=10000        # API超时时间
GATE_CACHE_SIZE=1000          # 缓存币种数量上限
```
