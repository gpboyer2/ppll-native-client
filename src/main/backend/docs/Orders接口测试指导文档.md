# Orders接口测试指导

## 📋 测试概述

本测试套件用于验证重构后的Orders接口是否正常工作，包含完整的建仓、平仓流程测试。

## ⚠️ 重要提醒

1. 真实资金风险：使用真实API Key和Secret进行测试，涉及真实资金
2. 测试金额：每次测试金额限制在10U以内，避免大额资金损失
3. 测试顺序：严格按照建仓→平仓的顺序进行测试
4. 监控持仓：测试过程中请持续监控账户持仓情况

## 🔧 测试配置

### API信息

- API Key: `Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok`
- API Secret: `wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij`
- 测试金额: 10U
- 测试交易对: DOGEUSDT, YGGUSDT

### 服务器配置

- 基础URL: `http://localhost:3000`
- 超时时间: 30秒

## 🚀 测试方法

### 方法1: 快速测试（推荐首次使用）

```bash
cd /Users/peng/Desktop/Project/0-ppll/ppll-server
node test/quick-test.js
```

测试内容：

- 模板接口连通性测试
- 批量检查接口测试
- 参数验证功能测试
- 小金额建仓测试（1U）
- 平仓功能测试

### 方法2: 完整流程测试

```bash
cd /Users/peng/Desktop/Project/0-ppll/ppll-server
node test/orders-interface-test.js
```

测试内容：

- 账户余额检查
- 批量建仓（10U）
- 自定义建仓（10U）
- 指定平仓
- 自定义平多单
- 批量平仓
- 自定义平仓

### 方法3: 单个接口测试

```bash
cd /Users/peng/Desktop/Project/0-ppll/ppll-server
node test/orders-interface-test.js [接口名称]
```

可用接口名称：

- `batch-inspect` - 批量检查
- `custom-build-position` - 自定义建仓
- `appoint-close-position` - 指定平仓
- `custom-close-multiple-position` - 自定义平多单
- `batch-close-position` - 批量平仓
- `custom-close-position` - 自定义平仓

## 📊 测试结果分析

### 预期结果

1. 模板接口: 应该返回成功状态
2. 批量检查: 应该返回持仓信息
3. 参数验证: 缺少参数时应返回错误
4. 建仓接口: 应该成功创建持仓
5. 平仓接口: 应该成功平掉持仓

### 错误处理

- 如果接口返回错误，请检查错误信息
- 可能的错误原因：
    - API Key/Secret错误
    - 余额不足
    - 持仓不存在
    - 服务器错误

## 🔍 安全检查清单

### 测试前

- [ ] 确认使用测试账户
- [ ] 确认账户余额充足
- [ ] 确认服务器正常运行
- [ ] 确认API Key权限正确

### 测试中

- [ ] 监控账户持仓变化
- [ ] 观察建仓金额是否正确
- [ ] 确保平仓操作完成
- [ ] 记录每个接口的响应

### 测试后

- [ ] 检查最终持仓状态
- [ ] 确认所有持仓已平仓
- [ ] 记录测试结果
- [ ] 清理测试数据

## 🚨 紧急情况处理

### 如果测试出现问题：

1. 立即停止测试脚本
2. 检查当前持仓状态
3. 使用批量平仓接口平掉所有持仓
4. 联系技术支持

### 紧急平仓命令：

```bash
# 手动调用平仓接口
curl -X POST http://localhost:3000/v1/orders/batch-close-position \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok",
    "apiSecret": "wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij",
    "positions": ["DOGEUSDT", "YGGUSDT"]
  }'
```

## 📝 测试记录模板

| 测试时间 | 测试接口 | 预期结果 | 实际结果 | 备注 |
| -------- | -------- | -------- | -------- | ---- |
|          |          |          |          |      |
|          |          |          |          |      |
|          |          |          |          |      |

## 🎯 测试目标

1. 功能验证: 确认所有接口正常工作
2. 性能测试: 验证接口响应时间
3. 错误处理: 确认错误处理机制正常
4. 安全性: 确认参数验证和权限控制有效

## 📞 技术支持

如果测试过程中遇到问题，请提供以下信息：

1. 错误信息
2. 测试步骤
3. 服务器日志
4. API响应详情

## 🔗 相关文档

- [币安API文档](https://developers.binance.com/)
- [项目README](../README.md)
- [重构文档](../docs/重构总结.md)
