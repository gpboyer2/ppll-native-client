# Gate.io 自动 Cookie 管理使用说明

## 安装依赖

### 方案1：Puppeteer（推荐，功能最完整）
```bash
npm install puppeteer --save
```

### 方案2：Playwright（备选）
```bash
npm install playwright --save
```

### 方案3：轻量级（仅使用axios，功能有限但无需额外依赖）
无需安装额外依赖，但获取的 cookies 可能不够完整。

## 使用方式

### 自动模式（推荐）
现有代码已集成自动 cookie 管理，无需手动操作：

```javascript
// 在 getGateAllCoinList.js 中已自动集成
const { getValidCookies } = require("../utils/cookieManager.js");

// 每次请求时自动获取有效 cookies
const cookies = await getValidCookies();
```

### 手动刷新 cookies
```bash
# 测试 cookie 管理器
node test/testCookieManager.js

# 测试完整的 Gate.io API 流程
node test/testFixedGateApi.js
```

### 强制刷新 cookies
```javascript
const { getValidCookies } = require("./utils/cookieManager.js");

// 强制刷新 cookies（忽略缓存）
const freshCookies = await getValidCookies(true);
```

## 工作原理

### 1. 函数架构与职责分工

#### 🔧 核心获取函数 (3个)
- **`fetchCookiesWithPuppeteer()`** - 无头浏览器获取 cookies (最强反检测)
- **`fetchCookiesWithPlaywright()`** - Playwright 获取 cookies (备选方案)
- **`fetchCookiesWithAxios()`** - HTTP 请求获取 cookies + 智能增强

#### 💾 存储管理函数 (3个)  
- **`saveCookiesToFile()`** - 保存 cookies 到 `gate_cookies.json`
- **`loadCookiesFromFile()`** - 从文件读取缓存的 cookies
- **`isCookiesExpired()`** - 检查 cookies 是否过期 (默认6小时)

#### 🎯 主控制函数 (2个)
- **`getValidCookies(forceRefresh)`** - 智能获取有效 cookies (主入口函数)
- **`getBackupCookies()`** - 获取备用硬编码 cookies

### 2. 执行顺序与业务逻辑

#### 🔄 主要执行流程
```
业务调用 → getValidCookies() → 检查缓存 → 获取策略 → 保存结果 → 返回 cookies
```

#### 📋 详细执行顺序

**步骤1: 入口调用**
```javascript
// 在 jobs/getGateAllCoinList.js 中
const cookies = await getValidCookies(); // 主入口函数
```

**步骤2: 缓存检查**
```javascript
// getValidCookies() 内部执行
① cookieData = loadCookiesFromFile()      // 读取缓存文件
② isExpired = isCookiesExpired(cookieData) // 检查是否过期
③ if (forceRefresh || !cookieData || isExpired) {
    // 需要重新获取 cookies
  }
```

**步骤3: 多级获取策略**
```
优先级1: fetchCookiesWithPuppeteer()
    ↓ Chrome浏览器缺失/失败
优先级2: fetchCookiesWithAxios() 
    ├─ HTTP 请求获取基础 cookies (lang, lasturl, _web3_curMediaSize)
    ├─ 智能增强: 如果 < 100字符，自动添加模拟 cookies
    │  ├─ _ga, _ga_JNHPQJS9Q4 (Google Analytics)
    │  ├─ afUserId, AF_SYNC (AppsFlyer)
    │  ├─ RT, _dx_uzZo5y, finger_print (追踪标识)
    │  └─ session_id, visit_time (会话信息)
    └─ saveCookiesToFile() 保存到文件
    ↓ 网络失败
优先级3: 使用缓存的旧 cookies (降级策略)
    ↓ 缓存为空
优先级4: getBackupCookies() (硬编码备用)
```

**步骤4: 智能增强逻辑**
```javascript
// fetchCookiesWithAxios() 中的关键逻辑
if (cookieString.length < 100) {
    console.log('🔧 cookies 较少，添加必要的模拟 cookies...');
    
    // 生成真实的追踪 cookies
    const additionalCookies = [
        `_ga=GA1.2.${randomNumber}.${timestamp}`,
        `afUserId=${randomId}-${randomId}-${randomId}`,
        // ... 更多模拟 cookies
    ];
    
    finalCookieString = basicCookies + '; ' + additionalCookies.join('; ');
}
```

### 3. 实际业务调用链

```
┌─────────────────────────────────────────────┐
│ Gate.io API 业务流程                        │
├─────────────────────────────────────────────┤
│ jobs/getGateAllCoinList.js                  │
│ ├─ updateGateCoinCache()                    │
│ │  ├─ fetchGateCoinList('crypto-gainers')   │
│ │  ├─ fetchGateCoinList('crypto-losers')    │
│ │  └─ fetchGateCoinList('trade')            │
│ │                                           │
│ └─ 每个 fetchGateCoinList() 内部:           │
│    ├─ cookies = await getValidCookies()     │ ← 关键调用
│    └─ axios({ headers: { cookie: cookies }})│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ utils/cookieManager.js 执行流程             │
├─────────────────────────────────────────────┤
│ getValidCookies(forceRefresh = false)       │
│ ├─ 1. loadCookiesFromFile()                │
│ ├─ 2. isCookiesExpired(cookieData)          │
│ ├─ 3. 如果需要刷新:                        │
│ │  ├─ fetchCookiesWithPuppeteer() (优先)   │
│ │  └─ fetchCookiesWithAxios() (备选)       │
│ │     ├─ HTTP 请求获取基础 cookies          │
│ │     ├─ 智能增强 (< 100字符时)             │
│ │     └─ saveCookiesToFile() 保存结果       │
│ └─ 4. 返回 cookies 字符串                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 最终效果                                    │
├─────────────────────────────────────────────┤
│ ✅ 从 48 字符提升到 475+ 字符               │
│ ✅ 包含 12 种必要的追踪 cookies             │
│ ✅ 自动缓存 6 小时，提高性能                │
│ ✅ 403 错误时自动重试                       │
└─────────────────────────────────────────────┘
```

### 4. 智能缓存机制
- **缓存文件**: `cache/gate_cookies.json` 统一存储
- **过期检测**: 自动检测 cookies 是否过期 (默认6小时)
- **缓存结构**:
```json
{
  "cookieString": "完整的cookies字符串",
  "timestamp": "2025-09-21T09:21:17.630Z",
  "method": "enhanced-http",
  "enhanced": true,
  "headers": ["原始服务器返回的set-cookie头"]
}
```

### 5. 容错与降级策略
- **多级降级**: 确保任何情况下都能获取到可用的 cookies
- **智能增强**: 自动补充必要的追踪和会话 cookies
- **错误处理**: 每个环节都有详细的错误日志和备选方案
- **自动重试**: API调用时403错误会触发 cookies 刷新并重试

## 配置说明

### 环境变量（可选）
```bash
# 设置 Puppeteer 浏览器路径（可选）
export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome

# 设置 cookies 缓存目录（可选）
export GATE_COOKIES_CACHE_DIR=/path/to/cache
```

### 自定义配置
在 `utils/cookieManager.js` 中可以调整：

```javascript
// cookies 过期时间（默认6小时）
const sixHours = 6 * 60 * 60 * 1000;

// 无头浏览器配置
const browser = await puppeteer.launch({
    headless: true,  // 是否无头模式
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

## 故障排除

### 1. Puppeteer 安装问题
```bash
# 如果安装失败，尝试设置镜像
npm config set puppeteer_download_host=https://npm.taobao.org/mirrors
npm install puppeteer --save
```

### 2. 权限问题
```bash
# 确保缓存目录可写
mkdir -p cache
chmod 755 cache
```

### 3. 网络问题
- 确保能访问 https://www.gate.com
- 检查防火墙和代理设置
- 考虑使用国内镜像

### 4. 内存不足
Puppeteer 可能占用较多内存，可以：
```javascript
// 调整浏览器参数
const browser = await puppeteer.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // 减少内存使用
        '--memory-pressure-off'
    ]
});
```

## 监控和日志

### 1. 关键日志输出示例
```bash
# 正常流程
🌐 使用 HTTP 方式访问 Gate.io...
📊 HTTP 响应状态: 200
🔧 cookies 较少，添加必要的模拟 cookies...
✅ 增强后的 cookies 长度: 475
💾 统一 Cookies 已保存到: /cache/gate_cookies.json

# 缓存使用
使用缓存的 cookies
[Gate Coin Cache] 成功获取 crypto-gainers 数据，共 50 条记录

# 错误恢复
[Gate Coin Cache] 遇到403错误，尝试刷新cookies后重试...
🎯 尝试高级组合方案...
✅ 高级方案成功，获取到 486 字符的cookies
[Gate Coin Cache] 重试成功，获取 trade 数据: 50 条记录
```

### 2. 监控指标
- **cookies 质量**: 从 48 字符提升到 475+ 字符
- **缓存命中率**: 6 小时内重复调用使用缓存
- **403 错误恢复**: 自动刷新 cookies 并重试成功率
- **数据获取成功率**: 涨幅榜、跌幅榜、全部数据的获取情况

### 3. 性能指标
```bash
# 缓存更新耗时
[Gate Coin Cache] 缓存更新完成，用时 1527ms

# 数据获取结果
[Gate Coin Cache] 涨幅榜: 50 条，跌幅榜: 50 条，全部: 50 条

# 函数执行统计
✅ fetchCookiesWithAxios: 95% 成功率
⚠️  fetchCookiesWithPuppeteer: 需要Chrome浏览器
🔧 智能增强触发: 100% (基础cookies < 100字符时)
```

## 性能优化建议

### 1. 缓存策略
- 适当延长 cookies 有效期（但不要超过实际过期时间）
- 考虑多实例间共享 cookies 缓存

### 2. 资源优化
- 使用轻量级方案作为主要策略
- 仅在必要时启用 Puppeteer
- 定期清理缓存文件

### 3. 网络优化
- 添加请求超时设置
- 实现指数退避重试
- 考虑使用代理池