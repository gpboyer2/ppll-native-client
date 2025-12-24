const { WebsocketClient } = require("binance");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { ws_proxy } = require("../binance/config.js");
const agent = new SocksProxyAgent(ws_proxy);
const UtilRecord = require("../utils/record-log.js");
const markPriceService = require("../service/mark-price.service.js");

const wsName = "!markPrice@arr@1s";
const wsMarket = "usdm";

// 内存缓存对象
const markPriceCache = {};
// 更新间隔(毫秒)
const UPDATE_INTERVAL = 60 * 1000;
// 是否放开允许更新数据库
let allowDatabaseUpdate = true;

UtilRecord.log(
    `为实现功能 “订阅所有市场的标记价格流”, 正在初始化币安 WebSocket 客户端: ${wsName}...`
);

const wsClient = new WebsocketClient(
    {
        beautify: true,
        wsOptions: process.env.NODE_ENV === "production" ? {} : { agent },
    },
    {
        trace: (...args) => UtilRecord.trace('[WSClient] trace:', ...args),
        info: (...args) => UtilRecord.log('[WSClient] info:', ...args),
        error: (...args) => UtilRecord.error('[WSClient] error:', ...args),
        warn: (...args) => UtilRecord.warn('[WSClient] warn:', ...args),
        silly: (...args) => UtilRecord.trace('[WSClient] silly:', ...args),
        debug: (...args) => UtilRecord.debug('[WSClient] debug:', ...args),
    }
);

/**
 * 定时更新数据库
 */
const updateDatabase = async () => {
    const records = Object.values(markPriceCache);
    if (records.length === 0) return;

    try {
        await markPriceService.bulkUpdateMarkPrices(records);
        UtilRecord.log(
            `已批量更新 ${records.length} 个交易对的标记价格`
        );
    } catch (error) {
        UtilRecord.log("定时更新数据库失败:", error);
    }
};

// 处理格式化后的消息
wsClient.on("formattedMessage", (data) => {
    try {
        if (!Array.isArray(data)) {
            UtilRecord.log(
                `数据格式异常，无法处理: ${data}`
            );
            return;
        }

        if (!allowDatabaseUpdate) {
            UtilRecord.trace("数据更新逻辑正在节流中，跳过本次更新");
            return;
        }

        // 在指定时间 UPDATE_INTERVAL 后允许更新数据库
        allowDatabaseUpdate = false;
        setTimeout(() => {
            allowDatabaseUpdate = true;
        }, UPDATE_INTERVAL);

        // 更新内存缓存
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (item.eventType !== "markPriceUpdate") return;

            markPriceCache[item.symbol] = {
                event_type: item.eventType,
                event_time: item.eventTime,
                symbol: item.symbol,
                mark_price: item.markPrice,
                index_price: item.indexPrice,
                estimated_settle_price: item.settlePriceEstimate,
                funding_rate: item.fundingRate,
                next_funding_time: item.nextFundingTime,
            };
        }

        updateDatabase();
    } catch (error) {
        UtilRecord.log("处理formattedMessage时出错:", error);
    }
});

wsClient.on("open", (data) => {
    UtilRecord.log(`✅ WebSocket 连接已建立: ${data.wsKey}`);
});

wsClient.on("reconnecting", (data) => {
    UtilRecord.log(`WebSocket 正在重新连接: ${data.wsKey}`);
});

wsClient.on("close", () => {
    UtilRecord.log(`WebSocket 连接已关闭: ${wsName}`);
});

wsClient.on("error", (err) => {
    UtilRecord.log(`WebSocket 发生错误: ${wsName}`, err);
});

//// 设置定时更新
// const updateInterval = setInterval(updateDatabase, UPDATE_INTERVAL);

//// 程序退出处理
//// Note: 在异常下可能出现频繁重启程序的情况，需要进一步优化
// process.on('SIGINT', () => {
//   updateDatabase().finally(() => {
//     clearInterval(updateInterval);
//     process.exit(0);
//   });
// });

// 订阅所有市场的标记价格流
wsClient.subscribeAllMarketMarkPrice(wsMarket, 3000);

UtilRecord.log(`已订阅币安 WebSocket 数据流: ${wsName}`);

module.exports = wsClient;
