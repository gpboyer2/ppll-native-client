# 币安API限流问题修复记录

## 问题描述

**时间**: 2025-12-16 16:58

**现象**:
1. 创建网格策略后,连续出现 `accountInfo 数据异常 {}` 错误
2. 币安API返回空响应: `{"body":"","headers":{"connection":"close","content-length":"0"}}`
3. 订单创建失败: `Precision is over the maximum defined for this asset.`
4. 数量精度错误: ALLUSDT要求整数,但传入了 `84.36506464` (8位小数)

**根本原因**:
- 策略初始化时连续快速调用币安API (`getExchangeInfo` 和 `getAccountInformation`)
- 触发币安API限流保护,返回空响应
- 无法获取交易对精度信息,导致使用默认8位小数
- ALLUSDT实际要求0位小数(整数),导致订单被拒绝

## 修复内容

### 1. `getExchangeInfo()` 添加重试机制

**文件**: `plugin/umInfiniteGrid.js:261-294`

**修改**:
- 添加最多3次重试
- 每次重试间隔2秒
- 验证返回数据有效性
- 详细的日志输出

```javascript
this.getExchangeInfo = async () => {
  if (this.exchangeInfo) {
    return this.exchangeInfo;
  }

  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        this.logger.debug(`第 ${attempt} 次尝试获取交易所信息...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const exchangeInfo = await this.client.getExchangeInfo();
      
      if (!exchangeInfo || !exchangeInfo.symbols || exchangeInfo.symbols.length === 0) {
        throw new Error('交易所信息为空或格式异常');
      }

      this.exchangeInfo = exchangeInfo;
      this.logger.debug(`成功获取交易所信息，包含 ${exchangeInfo.symbols.length} 个交易对`);
      return this.exchangeInfo;
    } catch (error) {
      if (attempt === maxRetries) {
        this.logger.error(`获取交易所信息失败(已重试${maxRetries}次):`, error);
        this.exchangeInfo = { symbols: [] };
        return this.exchangeInfo;
      }
      this.logger.warn(`获取交易所信息失败(第${attempt}次尝试):`, error?.message || error);
    }
  }
};
```

### 2. `getAccountInfo()` 添加重试机制

**文件**: `plugin/umInfiniteGrid.js:636-662`

**修改**:
- 添加最多3次重试
- 每次重试间隔2秒
- 验证返回数据有效性
- 详细的日志输出

```javascript
this.getAccountInfo = async () => {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        this.logger.debug(`第 ${attempt} 次尝试获取账户信息...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const accountInfo = await this.client.getAccountInformation();
      
      if (!accountInfo || !accountInfo.positions) {
        throw new Error('账户信息为空或格式异常');
      }

      return accountInfo;
    } catch (error) {
      if (attempt === maxRetries) {
        this.logger.error(`获取账户信息失败(已重试${maxRetries}次):`, error);
        throw error;
      }
      this.logger.warn(`获取账户信息失败(第${attempt}次尝试):`, error?.message || error);
    }
  }
};
```

### 3. `initOrders()` 添加API调用间隔

**文件**: `plugin/umInfiniteGrid.js:1089-1120`

**修改**:
- 先获取交易所信息
- 添加1秒延迟后再获取账户信息
- 确保精度信息在开仓前已加载

```javascript
this.initOrders = async () => {
  this.onPausedGrid();

  // 先获取交易所信息,避免后续精度处理失败
  await this.getExchangeInfo().catch((err) => {
    this.logger.error('初始化时获取交易所信息失败', err);
  });

  // 添加延迟,避免API限流
  await new Promise(resolve => setTimeout(resolve, 1000));

  let isOk = true
  await this.initAccountInfo().catch(() => { isOk = false });
  if (isOk === false) {
    setTimeout(this.initOrders, 1000);
    return;
  }

  // ... 后续逻辑
};
```

## 修复效果

1. **避免API限流**: 通过重试机制和延迟,减少触发限流的概率
2. **精度处理正确**: 确保在开仓前已获取交易对精度信息
3. **错误恢复能力**: 即使首次失败,也能通过重试自动恢复
4. **日志完善**: 详细记录每次重试过程,便于排查问题

## 测试建议

1. 创建新的网格策略,观察是否还出现API限流错误
2. 检查日志中是否有 "成功获取交易所信息" 的记录
3. 验证订单数量精度是否符合交易对要求
4. 观察重试机制是否在API限流时生效

## 进一步优化: 三级缓存系统

**时间**: 2025-12-16 17:01

为了彻底解决API限流问题,实现了完整的三级缓存系统:**内存缓存 → 数据库 → API**

### 实现逻辑

1. **第一级 - 内存缓存**
   - 检查 `this.exchangeInfo` 是否有效
   - 命中则直接返回,无需任何IO操作

2. **第二级 - 数据库缓存**
   - 从 `binance_exchange_info` 表获取最新记录
   - 检查数据是否过期(超过1天)
   - 如果过期,启动后台更新任务(不阻塞主流程)

3. **第三级 - API获取**
   - 仅在内存和数据库都无数据时调用
   - 获取成功后同时更新内存和数据库

### 核心函数

**`getExchangeInfo()`** - 三级缓存主入口
```javascript
// 1. 检查内存缓存
if (this.exchangeInfo && this.exchangeInfo.symbols && this.exchangeInfo.symbols.length > 0) {
  return this.exchangeInfo;
}

// 2. 检查数据库缓存
const dbRecord = await db.binance_exchange_info.getLatest();
if (dbRecord && dbRecord.exchange_info) {
  this.exchangeInfo = JSON.parse(dbRecord.exchange_info);
  
  // 检查是否需要后台更新
  const needsUpdate = await db.binance_exchange_info.needsUpdate();
  if (needsUpdate) {
    this.updateExchangeInfoInBackground();
  }
  
  return this.exchangeInfo;
}

// 3. 从API获取
const exchangeInfo = await this.fetchExchangeInfoFromAPI();
this.exchangeInfo = exchangeInfo;
await this.saveExchangeInfoToDB(exchangeInfo);
return this.exchangeInfo;
```

**`fetchExchangeInfoFromAPI()`** - API获取(带重试)
- 最多3次重试,每次间隔2秒
- 验证返回数据有效性

**`saveExchangeInfoToDB()`** - 保存到数据库
- 异步保存,不阻塞主流程
- 保存为JSON字符串格式

**`updateExchangeInfoInBackground()`** - 后台更新
- 延迟5秒执行,避免影响主流程
- 静默更新,失败不影响业务

### 优势

1. **极大减少API调用**: 多个策略实例共享数据库缓存
2. **避免限流**: 只有首次或过期时才调用API
3. **高可用性**: 即使API不可用,仍可使用缓存数据
4. **自动更新**: 后台静默更新,保持数据新鲜度
5. **性能优化**: 内存缓存响应速度最快

### 数据库表

使用现有的 `binance_exchange_info` 表:
- `exchange_info`: JSON格式的交易所信息
- `market_type`: 市场类型(usdm/coinm/spot)
- `updated_at`: 更新时间(用于判断是否过期)

### 缓存过期策略

- **有效期**: 1天
- **过期处理**: 后台异步更新,不影响当前请求
- **更新时机**: 延迟5秒执行,避免影响主流程

## 注意事项

1. 如果仍然出现限流,可以适当增加 `retryDelay` 的值
2. 如果API持续不可用,策略会在3次重试后使用默认配置
3. 建议在生产环境监控 "获取交易所信息失败" 和 "获取账户信息失败" 的日志
4. **数据库缓存**: 多个策略实例会共享数据库缓存,大幅减少API调用
5. **首次启动**: 如果数据库无缓存,首次启动会调用API并保存到数据库

---

## 第二次修复: 账户信息获取的缓存优化

**时间**: 2025-12-16 18:11

### 问题分析

通过日志分析发现，即使添加了重试机制，仍然频繁出现账户信息获取失败：

```
[WARN] 获取账户信息失败(第1次尝试): {"body":"","headers":{"connection":"close","content-length":"0"}}
[WARN] 获取账户信息失败(第2次尝试): {"body":"","headers":{"connection":"close","content-length":"0"}}
[ERROR] 获取账户信息失败(已重试3次): {"body":"","headers":{"connection":"close","content-length":"0"}}
```

**根本原因**：
1. `umInfiniteGrid.js` 的 `getAccountInfo()` 直接调用 `this.client.getAccountInformation()`
2. **完全绕过了 Service 层的20秒数据库缓存机制**
3. 在短时间内触发多次账户信息获取：
   - 创建订单后立即调用 `initAccountInfo()` (第671行)
   - 查询订单失败后又调用 `initAccountInfo()` (第636行)
   - 每次重试都是真实的API请求
4. 短时间内10+次真实API请求 → 触发币安限流

### 修复方案

让 `umInfiniteGrid.js` 使用 `binance-account.service.js` 的缓存机制：

#### 1. 引入 Service 层

**文件**: `plugin/umInfiniteGrid.js:17`

```javascript
const binanceAccountService = require('../service/binance-account.service.js');
```

#### 2. 修改 `getAccountInfo()` 方法

**文件**: `plugin/umInfiniteGrid.js:740-780`

```javascript
/**
 * 获取账户信息（U本位合约账户）
 * 使用 Service 层的缓存机制，避免频繁调用币安API导致限流
 * Service 层有20秒的数据库缓存，可以有效减少API调用次数
 */
this.getAccountInfo = async () => {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        this.logger.debug(`第 ${attempt} 次尝试获取账户信息...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // 使用 Service 层获取账户信息（带20秒缓存）
      // 如果没有 userId，则直接调用 client（向后兼容）
      let accountInfo;
      if (this.config.userId) {
        accountInfo = await binanceAccountService.getUSDMFuturesAccount(
          this.config.apiKey,
          this.config.apiSecret,
          this.config.userId,
          true // includePositions
        );
      } else {
        // 向后兼容：没有 userId 时使用原有方式
        this.logger.warn('未提供 userId，使用直接API调用（无缓存保护）');
        accountInfo = await this.client.getAccountInformation();
      }

      if (!accountInfo || !accountInfo.positions) {
        throw new Error('账户信息为空或格式异常');
      }

      return accountInfo;
    } catch (error) {
      if (attempt === maxRetries) {
        this.logger.error(`获取账户信息失败(已重试${maxRetries}次):`, error);
        throw error;
      }
      this.logger.warn(`获取账户信息失败(第${attempt}次尝试):`, error?.message || error);
    }
  }
};
```

#### 3. 传入 userId 参数

**文件**: `service/grid-strategy.service.js:108`

```javascript
infiniteGridParams.userId = userId; // 传入 userId 以使用缓存机制
```

### Service 层缓存机制

**文件**: `service/binance-account.service.js`

**缓存策略**：
- **有效期**: 20秒
- **存储**: 数据库表 `usd_m_futures_account`
- **逻辑**: 
  1. 先查询数据库缓存
  2. 缓存未过期 → 直接返回
  3. 缓存过期/不存在 → 调用API并更新缓存

**优势**：
1. 多个策略实例共享同一份缓存
2. 20秒内的重复请求都使用缓存数据
3. 大幅减少API调用次数
4. 有效避免限流

### 测试验证

创建了两个测试文件验证修复效果：

#### 1. `test/service-account-test.js`
测试 Service 层的缓存机制是否正常工作

**测试结果**：
- ✅ 单次调用: 成功
- ✅ 连续调用: 使用缓存，耗时<10ms
- ✅ 并发调用: 全部成功
- ✅ 缓存验证: 20秒内使用缓存

#### 2. `test/grid-cache-fix-test.js`
对比旧版本和新版本的API调用次数

**预期效果**：
- 旧版本: 4次真实API调用
- 新版本: 1次API调用 + 3次缓存命中
- 节省: 75%的API调用

### 修复效果

1. **大幅减少API调用**: 20秒内的重复请求都使用缓存
2. **避免限流**: 不再短时间内发起大量请求
3. **提高稳定性**: 即使部分请求失败，缓存仍可用
4. **性能提升**: 缓存响应速度远快于API调用

### 关键改进点

| 项目 | 旧版本 | 新版本 |
|------|--------|--------|
| 缓存机制 | ❌ 无 | ✅ 20秒数据库缓存 |
| API调用频率 | 每次都调用 | 20秒内仅1次 |
| 限流风险 | ⚠️ 高 | ✅ 低 |
| 多实例共享 | ❌ 否 | ✅ 是 |
| 响应速度 | 400-700ms | 5-10ms (缓存命中) |

### 后续优化建议

1. **监控缓存命中率**: 添加日志统计缓存命中情况
2. **调整缓存时长**: 根据实际情况调整20秒的缓存时间
3. **添加内存缓存**: 在 Service 层添加内存缓存，进一步提升性能
4. **请求队列**: 考虑添加请求队列，避免并发请求
