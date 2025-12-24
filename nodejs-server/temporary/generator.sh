#!/bin/bash

# 网格策略文件生成器（交互式）

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 账号配置
declare -A ACCOUNT_NAMES ACCOUNT_KEYS ACCOUNT_SECRETS
ACCOUNT_NAMES=([1]="傻辉" [2]="跟单" [3]="大号" [4]="德鑫" [5]="刘少" [6]="俊鑫")
ACCOUNT_KEYS=([1]="8dZioILkIJPmnFNL5cy8OhqIHA3wGTupKVgWA7TzlsRp2yVaBaEixy6nkQZybsFY" [2]="0l8ME1ClpOO1qYfVW3YrBkymZRnQXHe3jClG0XWzhZmTn0mgXZVKKtpkZz6RD5D7" [3]="Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok" [4]="42pVludyrvXxoouv3N3qFRdAedXnNVEq92BZI56FEBqxza1fA4C5IhZyMGRdWMZY" [5]="PlmSEpdIXeKyGW5faesIisO1PxjPgmJElj1MQSNykZ3pDjZCiMbyrJQwEYH3BiDb" [6]="MmsE6fb2HmWWm74dwxRtqrN2iBufutcoJN9oCmyt8q2m2y60QSg4PpsM1MpW5Luz")
ACCOUNT_SECRETS=([1]="a1rHCHoA6OgPEUqD0f20b70NO0zn8iaOBPRQaRYWOOcy8glSwJe4QLAl8Jtrs9AN" [2]="PtKZTS4j718I6OgvvAbF0myFX9dNfQfoyeXrGC7Ca863Y5TqTADg0EMo4OjVKtkq" [3]="wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij" [4]="tvb1mkILNwVroVtc6JVDWbpKzOGeWPR6mt8ABfFIkFJufoFuUZ4L4ADkewF8HmkZ" [5]="ybriZgVJWoT41aTIP6Lk3kdIxopdfInCHxHsFhJT8BjYQer3XRdleMo26cp0DrN2" [6]="lPV3MqIuWSCqx3tEQqBR4qQEegdCglqSuw2KvFqOLrTqvcyubgRdikADETd3ZEgj")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clear
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}              网格策略文件生成器（交互式）${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 1. 交易对
echo -e "${YELLOW}【第1步】请输入交易对（不含USDT后缀）:${NC}"
echo -e "${BLUE}  示例: BTC, ETH, SOL, AVAX, NIL, DOGE${NC}"
read -p "  交易对: " SYMBOL
SYMBOL=$(echo "$SYMBOL" | tr '[:lower:]' '[:upper:]')
TRADING_PAIR="${SYMBOL}USDT"
echo ""

# 2. 市场类型
echo -e "${YELLOW}【第2步】请选择市场类型:${NC}"
echo -e "  ${GREEN}1)${NC} U本位合约 (usdm)"
echo -e "  ${GREEN}2)${NC} 现货 (spot)"
read -p "  请选择 [1/2]: " MARKET_CHOICE
case $MARKET_CHOICE in
    2) MARKET="spot" ;;
    *) MARKET="usdm" ;;
esac
echo ""

# 3. 方向（仅合约）
if [ "$MARKET" = "usdm" ]; then
    echo -e "${YELLOW}【第3步】请选择交易方向:${NC}"
    echo -e "  ${GREEN}1)${NC} 做多 (LONG)"
    echo -e "  ${GREEN}2)${NC} 做空 (SHORT)"
    read -p "  请选择 [1/2]: " DIRECTION_CHOICE
    case $DIRECTION_CHOICE in
        2) POSITION_SIDE="SHORT" ;;
        *) POSITION_SIDE="LONG" ;;
    esac
    echo ""
fi

# 4. 账号
echo -e "${YELLOW}【第4步】请选择账号:${NC}"
for i in 1 2 3 4 5 6; do
    echo -e "  ${GREEN}${i})${NC} ${ACCOUNT_NAMES[$i]} ${ACCOUNT_KEYS[$i]}"
done
read -p "  请选择 [1-6]: " ACCOUNT_CHOICE
[[ ! "$ACCOUNT_CHOICE" =~ ^[1-6]$ ]] && ACCOUNT_CHOICE="3"
ACCOUNT_NAME="${ACCOUNT_NAMES[$ACCOUNT_CHOICE]}"
API_KEY="${ACCOUNT_KEYS[$ACCOUNT_CHOICE]}"
API_SECRET="${ACCOUNT_SECRETS[$ACCOUNT_CHOICE]}"
echo ""

# 5. K线周期
echo -e "${YELLOW}【第5步】请选择K线周期（用于分析市场波动）:${NC}"
echo -e "  ${GREEN}1)${NC} 1小时K线 - 短线交易"
echo -e "  ${GREEN}2)${NC} 4小时K线 - 中短线交易（推荐）"
echo -e "  ${GREEN}3)${NC} 日K线 - 中长线交易"
echo -e "  ${GREEN}4)${NC} 周K线 - 长线交易"
echo -e "  ${GREEN}5)${NC} 月K线 - 超长线交易"
read -p "  请选择 [1/2/3/4/5]: " INTERVAL_CHOICE
case $INTERVAL_CHOICE in
    1) INTERVAL="1h"; INTERVAL_LABEL="1小时" ;;
    2) INTERVAL="4h"; INTERVAL_LABEL="4小时" ;;
    3) INTERVAL="1d"; INTERVAL_LABEL="日线" ;;
    4) INTERVAL="1w"; INTERVAL_LABEL="周线" ;;
    5) INTERVAL="1M"; INTERVAL_LABEL="月线" ;;
    *) INTERVAL="4h"; INTERVAL_LABEL="4小时" ;;
esac
echo ""

# 6. 优化策略
echo -e "${YELLOW}【第6步】请选择优化策略:${NC}"
echo -e "  ${GREEN}1)${NC} 收益最大化 - 追求最高日收益"
echo -e "  ${GREEN}2)${NC} 成本摊薄 - 高频交易降低持仓成本"
read -p "  请选择 [1/2]: " OPTIMIZE_CHOICE
case $OPTIMIZE_CHOICE in
    2) OPTIMIZE_TARGET="cost"; OPTIMIZE_LABEL="成本摊薄" ;;
    *) OPTIMIZE_TARGET="profit"; OPTIMIZE_LABEL="收益最大化" ;;
esac
echo ""

# 7. 调用优化器
echo -e "${YELLOW}【第7步】正在分析 ${TRADING_PAIR} 市场数据（${INTERVAL_LABEL}K线 + ${OPTIMIZE_LABEL}）...${NC}"
echo ""

OPTIMIZER_RESULT=$(cd "${SCRIPT_DIR}/.." && node -e "
// 将所有日志输出重定向到stderr，只将JSON结果输出到stdout
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
console.log = (...args) => process.stderr.write(args.join(' ') + '\\n');
console.error = (...args) => process.stderr.write(args.join(' ') + '\\n');
console.warn = (...args) => process.stderr.write(args.join(' ') + '\\n');

const { optimizeGridParams } = require('./service/grid-optimizer.service');
(async () => {
  try {
    const result = await optimizeGridParams({
      symbol: '${TRADING_PAIR}',
      interval: '${INTERVAL}',
      totalCapital: 1000,
      optimizeTarget: '${OPTIMIZE_TARGET}',
      apiKey: '${API_KEY}',
      apiSecret: '${API_SECRET}'
    });
    const topList = result.recommended.analysis?.topList || [];
    // 使用原始的console.log输出JSON到stdout
    originalLog(JSON.stringify({
      success: true,
      currentPrice: parseFloat(result.market.currentPrice),
      volatility: result.market.volatility,
      topList: topList.slice(0, 5).map(cfg => ({
        gridSpacing: cfg.gridSpacing,
        tradeValue: cfg.tradeValue,
        dailyFrequency: cfg.dailyFrequency,
        dailyProfit: cfg.dailyProfit,
        turnoverRatio: cfg.turnoverRatio
      }))
    }));
  } catch (error) {
    originalLog(JSON.stringify({ success: false, error: error.message || String(error) }));
  }
})();
" 2>/dev/null)

OPTIMIZER_SUCCESS=$(echo "$OPTIMIZER_RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');try{console.log(JSON.parse(d).success)}catch{console.log('false')}")

if [ "$OPTIMIZER_SUCCESS" != "true" ]; then
    # 尝试从结果中提取错误信息
    ERROR_MSG=$(echo "$OPTIMIZER_RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');try{const j=JSON.parse(d);console.log(j.error||'未知错误')}catch{console.log('JSON解析失败')}" 2>/dev/null)
    echo -e "${RED}  ✗ 市场分析失败: ${ERROR_MSG}${NC}"
    exit 1
fi

CURRENT_PRICE=$(echo "$OPTIMIZER_RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).currentPrice)")
VOLATILITY=$(echo "$OPTIMIZER_RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).volatility)")

echo -e "${GREEN}  ✓ 市场分析完成${NC}"
echo -e "    当前价格: ${CURRENT_PRICE} USDT"
echo -e "    波动率: ${VOLATILITY}"
echo ""

# 8. 选择配置
echo -e "${YELLOW}【第8步】请选择网格配置:${NC}"
echo ""
echo -e "    ${BLUE}┌────┬──────────────┬──────────┬──────────┬────────────┬────────┐${NC}"
echo -e "    ${BLUE}│ NO │    网格间距    │  交易金额  │  日频率   │   日收益    │  换手率 │${NC}"
echo -e "    ${BLUE}├────┼──────────────┼──────────┼──────────┼────────────┼────────┤${NC}"

CONFIG_COUNT=0
for i in 0 1 2 3 4; do
    CONFIG_LINE=$(echo "$OPTIMIZER_RESULT" | node -e "
const d=require('fs').readFileSync(0,'utf8');
const data=JSON.parse(d);
const cfg=data.topList[$i];
if(cfg){
  const spacing=cfg.gridSpacing>=1?cfg.gridSpacing.toFixed(4):cfg.gridSpacing.toFixed(8);
  const trade=cfg.tradeValue.toFixed(0);
  const freq=cfg.dailyFrequency.toFixed(1);
  const profit=cfg.dailyProfit.toFixed(2);
  const turnover=(cfg.turnoverRatio*100).toFixed(0);
  console.log(spacing+'|'+trade+'|'+freq+'|'+profit+'|'+turnover);
}
")
    if [ -n "$CONFIG_LINE" ]; then
        SPACING=$(echo "$CONFIG_LINE" | cut -d'|' -f1)
        TRADE=$(echo "$CONFIG_LINE" | cut -d'|' -f2)
        FREQ=$(echo "$CONFIG_LINE" | cut -d'|' -f3)
        PROFIT=$(echo "$CONFIG_LINE" | cut -d'|' -f4)
        TURNOVER=$(echo "$CONFIG_LINE" | cut -d'|' -f5)
        NO=$((i + 1))
        CONFIG_COUNT=$NO
        printf "    ${BLUE}│${NC} ${GREEN}%2d${NC} ${BLUE}│${NC} %10s U ${BLUE}│${NC} %6s U ${BLUE}│${NC} %6s次 ${BLUE}│${NC} %8s U ${BLUE}│${NC} %5s%% ${BLUE}│${NC}\n" "$NO" "$SPACING" "$TRADE" "$FREQ" "$PROFIT" "$TURNOVER"
        eval "CONFIG_SPACING_$NO=$SPACING"
        eval "CONFIG_TRADE_$NO=$TRADE"
    fi
done

echo -e "    ${BLUE}└────┴──────────────┴──────────┴──────────┴────────────┴────────┘${NC}"
echo ""
read -p "  请选择 [1-${CONFIG_COUNT}]: " CONFIG_CHOICE

# 验证选择
if [[ ! "$CONFIG_CHOICE" =~ ^[1-5]$ ]] || [ "$CONFIG_CHOICE" -gt "$CONFIG_COUNT" ]; then
    CONFIG_CHOICE=1
fi

eval "GRID_PRICE_DIFF=\$CONFIG_SPACING_$CONFIG_CHOICE"
eval "TRADE_VALUE=\$CONFIG_TRADE_$CONFIG_CHOICE"
TRADE_QUANTITY=$(node -e "console.log(($TRADE_VALUE / $CURRENT_PRICE).toFixed(6))")
echo ""

# 9. 轮询间隔
echo -e "${YELLOW}【第9步】请输入轮询间隔（毫秒，直接回车默认5000）:${NC}"
read -p "  轮询间隔: " POLLING_INTERVAL
[ -z "$POLLING_INTERVAL" ] && POLLING_INTERVAL="5000"
echo ""

# 生成文件
if [ "$MARKET" = "usdm" ]; then
    FILE_NAME="${SYMBOL}-${POSITION_SIDE}-umInfiniteGrid.js"
    POSITION_SIDE_TEXT=$([[ "$POSITION_SIDE" = "LONG" ]] && echo "做多" || echo "做空")
    
    if [ "$POSITION_SIDE" = "LONG" ]; then
        QUANTITY_CONFIG="gridLongOpenQuantity: ${TRADE_QUANTITY},
    gridLongCloseQuantity: ${TRADE_QUANTITY},"
    else
        QUANTITY_CONFIG="gridShortOpenQuantity: ${TRADE_QUANTITY},
    gridShortCloseQuantity: ${TRADE_QUANTITY},"
    fi
    
    cat > "${SCRIPT_DIR}/${FILE_NAME}" << TEMPLATE
const { WebsocketClient, DefaultLogger } = require('binance');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const InfiniteGrid = require('../plugin/umInfiniteGrid.js');

/**
 * ${TRADING_PAIR} U本位合约 ${POSITION_SIDE_TEXT}网格策略
 * 账号: ${ACCOUNT_NAME}
 * 生成时间: $(date '+%Y/%m/%d %H:%M:%S')
 */

setTimeout(function pm2_blockDuplicateStart() {
    setTimeout(pm2_blockDuplicateStart, 100000);
}, 100000);

const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '${API_KEY}';
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '${API_SECRET}';
const agent = new SocksProxyAgent(ws_proxy);

const gridOptions = {
    positionSide: '${POSITION_SIDE}',
    tradingPair: '${TRADING_PAIR}',
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
    gridPriceDifference: ${GRID_PRICE_DIFF},
    ${QUANTITY_CONFIG}
    maxOpenPositionQuantity: undefined,
    minOpenPositionQuantity: undefined,
    fallPreventionCoefficient: 0,
    pollingInterval: ${POLLING_INTERVAL},
    gtLimitationPrice: undefined,
    ltLimitationPrice: undefined,
};

const grid = new InfiniteGrid(gridOptions);
grid.initOrders();

const logger = { ...DefaultLogger, silly: (...params) => console.log('sillyLog: ', params) };

const wsClient = new WebsocketClient({
    api_key: gridOptions.apiKey,
    api_secret: gridOptions.apiSecret,
    beautify: true,
    wsOptions: process.env.NODE_ENV === 'production' ? {} : { agent },
}, logger);

wsClient.on('open', (data) => console.log('ws connection opened:', data.wsKey));
wsClient.on('formattedMessage', (data) => {
    if (data.eventType === 'markPriceUpdate') grid.gridWebsocket({ latestPrice: data.markPrice });
});
wsClient.on('reconnecting', (data) => console.log('ws reconnecting...', data?.wsKey));
wsClient.on('reconnected', (data) => console.log('ws reconnected', data?.wsKey));
wsClient.on('error', (data) => console.log('ws error', data?.wsKey));

wsClient.subscribeMarkPrice(gridOptions.tradingPair, 'usdm');
TEMPLATE

else
    FILE_NAME="${SYMBOL}-SPOT-InfiniteGrid.js"
    
    cat > "${SCRIPT_DIR}/${FILE_NAME}" << TEMPLATE
const { WebsocketClient, DefaultLogger } = require('binance');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { ws_proxy } = require('../binance/config.js');
const InfiniteGridSpot = require('../plugin/spotInfiniteGrid.js');

/**
 * ${TRADING_PAIR} 现货网格策略
 * 账号: ${ACCOUNT_NAME}
 * 生成时间: $(date '+%Y/%m/%d %H:%M:%S')
 */

setTimeout(function pm2_blockDuplicateStart() {
    setTimeout(pm2_blockDuplicateStart, 100000);
}, 100000);

const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '${API_KEY}';
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '${API_SECRET}';
const agent = new SocksProxyAgent(ws_proxy);

const spotGridOptions = {
    tradingPair: '${TRADING_PAIR}',
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
    gridPriceDifference: ${GRID_PRICE_DIFF},
    gridTradeQuantity: ${TRADE_QUANTITY},
    maxBaseAssetQuantity: undefined,
    minBaseAssetQuantity: undefined,
    fallPreventionCoefficient: 0,
    pollingInterval: ${POLLING_INTERVAL},
    gtLimitationPrice: undefined,
    ltLimitationPrice: undefined,
    enableLog: true,
};

const grid = new InfiniteGridSpot(spotGridOptions);
grid.initOrders();

const logger = { ...DefaultLogger, silly: (...params) => console.log('sillyLog: ', params) };

const wsClient = new WebsocketClient({
    api_key: spotGridOptions.apiKey,
    api_secret: spotGridOptions.apiSecret,
    beautify: true,
    wsOptions: process.env.NODE_ENV === 'production' ? {} : { agent },
}, logger);

wsClient.on('open', (data) => console.log('ws connection opened:', data.wsKey));
wsClient.on('formattedMessage', (data) => {
    if (data.eventType === '24hrTicker' && data.currentClose) {
        grid.gridWebsocket({ latestPrice: parseFloat(data.currentClose) });
    }
});
wsClient.on('reconnecting', (data) => console.log('ws reconnecting...', data?.wsKey));
wsClient.on('reconnected', (data) => console.log('ws reconnected', data?.wsKey));
wsClient.on('error', (data) => console.log('ws error', data?.wsKey));

wsClient.subscribeSymbol24hrTicker(spotGridOptions.tradingPair, 'spot');
TEMPLATE
fi

FILE_PATH="${SCRIPT_DIR}/${FILE_NAME}"

# 输出结果
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ 网格策略文件生成成功！${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}📄 文件:${NC} ${FILE_NAME}"
echo -e "  ${BLUE}📈 交易对:${NC} ${TRADING_PAIR}"
echo -e "  ${BLUE}🏦 账号:${NC} ${ACCOUNT_NAME}"
echo -e "  ${BLUE}📊 市场:${NC} $([[ "$MARKET" = "usdm" ]] && echo "U本位合约 ${POSITION_SIDE_TEXT}" || echo "现货")"
echo -e "  ${BLUE}💰 网格间距:${NC} ${GRID_PRICE_DIFF} USDT"
echo -e "  ${BLUE}📦 交易数量:${NC} ${TRADE_QUANTITY}"
echo ""
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}  启动命令:${NC}"
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}Node:${NC}  NODE_ENV=development node ./temporary/${FILE_NAME}"
echo -e "  ${GREEN}PM2:${NC}   NODE_ENV=development pm2 start ./temporary/${FILE_NAME}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
