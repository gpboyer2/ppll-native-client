# 网格策略运行目录

## 文件说明

| 文件 | 说明 |
|------|------|
| `strategies.config.list.js` | 策略配置文件，所有交易对和账号配置集中管理 |
| `single-strategy-runner.js` | 策略运行器，单个策略实例执行文件 |
| `pm2.config.js` | PM2 增量管理器，自动管理策略进程的启动/停止/重启 |
| `multi-strategy-runner.js` | 多策略运行器，所有策略共享一个 WebSocket 连接 |

---

## 方式一：PM2 多进程模式（推荐）

每个策略独立进程，可以单独查看日志，互不干扰。

### 增量更新（智能管理）

```bash
# 开发环境（自动增量更新所有策略）
node ./temporary/pm2.config.js

# 生产环境
NODE_ENV=production node ./temporary/pm2.config.js
```

**增量更新逻辑**：
- ✅ 新增策略 → 只启动新增的进程
- ❌ 删除策略 → 只停止对应进程
- 🔄 修改策略 → 只重启被修改的进程
- ⏩ 未变更策略 → 保持运行
- ⏸️ 手动停止的策略 → 保持停止状态
- 🔄 手动删除的策略 → 若配置仍启用则重新启动

### 查看进程

```bash
# 查看所有进程
pm2 list

# 查看单个策略日志（进程名格式：交易对-方向-umInfiniteGrid-账号）
pm2 logs ALL-LONG-umInfiniteGrid-俊鑫
pm2 logs ALL-SHORT-umInfiniteGrid-俊鑫

# 手动控制进程
pm2 stop ALL-LONG-umInfiniteGrid-俊鑫     # 停止单个策略
pm2 delete ALL-LONG-umInfiniteGrid-俊鑫   # 删除单个策略
pm2 stop all                               # 停止所有策略
pm2 delete all                             # 删除所有策略
```

---

## 方式二：多策略运行器（共享连接）

所有策略共享一个 WebSocket 连接，节省权重消耗。

### 优势
- **节省权重**：100个交易对只需1个连接（5权重），而不是100个连接（500权重）
- **统一管理**：所有策略配置集中在 `strategies.config.list.js`

### 启动

```bash
# 开发环境（启用代理）
NODE_ENV=development node ./temporary/multi-strategy-runner.js

# 生产环境
NODE_ENV=production node ./temporary/multi-strategy-runner.js

# 使用 PM2 运行
NODE_ENV=development pm2 start ./temporary/multi-strategy-runner.js --name multi-strategy
NODE_ENV=production pm2 start ./temporary/multi-strategy-runner.js --name multi-strategy
```

---

## 配置说明

编辑 `strategies.config.list.js` 文件：

1. **accountList**: 账号配置，包含 apiKey 和 apiSecret
2. **strategyList**: 策略列表，每个策略包含：
   - `enabled`: 是否启用
   - `account`: 使用的账号名称
   - `positionSide`: 'LONG' 或 'SHORT'
   - `tradingPair`: 交易对
   - 其他网格参数...

### 同一交易对多策略

支持同一交易对同时运行多个策略（如做多+做空），只需在 strategyList 中添加多条配置即可。

---

# 小额对冲（旧方式）

TODO:
webhook 需要切换为 root 用户;

我现在是通过 webhook 来启动的，但是 webhook 是 www 用户，而我通过终端访问 pm2 是 www 用户，这样会导致端口被占用，怎么解决？
终止了占用端口 7002 的进程（PID 2403），它仍然存在并继续占用端口; 经过排查, 该进程的用户是 www，而不是 root。而我是以 root 用户身份运行命令, 那应该怎么办?

# 各个 apiKey 账号

- 傻辉的
  8dZioILkIJPmnFNL5cy8OhqIHA3wGTupKVgWA7TzlsRp2yVaBaEixy6nkQZybsFY
  a1rHCHoA6OgPEUqD0f20b70NO0zn8iaOBPRQaRYWOOcy8glSwJe4QLAl8Jtrs9AN
- 跟单的(现在是傻辉的,5万元)
  0l8ME1ClpOO1qYfVW3YrBkymZRnQXHe3jClG0XWzhZmTn0mgXZVKKtpkZz6RD5D7
  PtKZTS4j718I6OgvvAbF0myFX9dNfQfoyeXrGC7Ca863Y5TqTADg0EMo4OjVKtkq
- 大号
  Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok
  wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij
- 德鑫
  42pVludyrvXxoouv3N3qFRdAedXnNVEq92BZI56FEBqxza1fA4C5IhZyMGRdWMZY
  tvb1mkILNwVroVtc6JVDWbpKzOGeWPR6mt8ABfFIkFJufoFuUZ4L4ADkewF8HmkZ
- 刘少
  API密钥： PlmSEpdIXeKyGW5faesIisO1PxjPgmJElj1MQSNykZ3pDjZCiMbyrJQwEYH3BiDb
  密钥： ybriZgVJWoT41aTIP6Lk3kdIxopdfInCHxHsFhJT8BjYQer3XRdleMo26cp0DrN2
- 俊鑫
  API密钥： MmsE6fb2HmWWm74dwxRtqrN2iBufutcoJN9oCmyt8q2m2y60QSg4PpsM1MpW5Luz
  密钥： lPV3MqIuWSCqx3tEQqBR4qQEegdCglqSuw2KvFqOLrTqvcyubgRdikADETd3ZEgj
 
## 服务器

ssh -v root@156.245.200.31 -p 22000 # 查看连接信息与配置
ssh root@156.245.200.31 -p 22000
root
US57dBAyKQEG
cd /www/wwwroot/
cd /www/wwwroot/cssc-node-view
cd /www/wwwroot/ppll_wap
cd /www/wwwroot/ppll_server
cd /www/wwwroot/ppll_admin
git reset --hard origin/master
git status
git diff
git pull
pm2 ls
pm2 restart 16 && pm2 log 16
ps aux --sort=-%cpu | head -n 6
top -o cpu
ps -eo pid,comm,%cpu --sort=-%cpu | head -n 6

pm2 logs 12 > trump_logs.txt

内网面板地址:
http://156.245.200.31:40009/caf8251b
username: vyzq6hga/91b698f3

NODE_ENV=production pm2 start app.js --name ppll_server

NODE_ENV=production pm2 start ./temporary/无限做多网格-websocket-sol.js
NODE_ENV=production pm2 start ./temporary/无限做空网格-websocket-red.js
NODE_ENV=development pm2 start ./temporary/POL-LONG-umInfiniteGrid.js
NODE_ENV=development pm2 start ./temporary/HYPE-LONG-umInfiniteGrid.js
NODE_ENV=development pm2 start ./temporary/无限做多网格-websocket-avax.js
NODE_ENV=development pm2 start ./temporary/无限做多网格-websocket-jto.js
NODE_ENV=development pm2 start ./temporary/无限做多网格-websocket-pepe.js
NODE_ENV=development pm2 start ./temporary/无限做多网格-websocket-trump.js

NODE_ENV=production node ./temporary/无限做多网格-websocket-nil.js
NODE_ENV=development node ./temporary/无限做多网格-websocket-nil.js
NODE_ENV=development node ./temporary/无限做空网格-websocket-nil.js

pm2 start 0 | pm2 log 0
pm2 restart 2 | pm2 log 2

you-get -x 127.0.0.1:7890 "https://x.com/i/status/1848975141478240537"

## AI

当前 1 个 AR 价格是 9.7
每次交易 1 个
建仓平仓来回的手续费合计是千分是一
每次涨 0.1 就平仓
问每笔平仓能收益多少 ？
直接给出结果和简单公式


