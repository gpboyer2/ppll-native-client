/**
 * 多策略配置文件
 * 
 * 所有交易对的网格策略配置集中在此文件管理
 * 运行器会共享一个 WebSocket 连接，避免重复创建客户端
 *   pm2 start ./temporary/pm2.config.js                    # 开发环境
 */

// 账号配置
const accountList = {
  '俊鑫': {
    apiKey: 'MmsE6fb2HmWWm74dwxRtqrN2iBufutcoJN9oCmyt8q2m2y60QSg4PpsM1MpW5Luz',
    apiSecret: 'lPV3MqIuWSCqx3tEQqBR4qQEegdCglqSuw2KvFqOLrTqvcyubgRdikADETd3ZEgj',
  },
  '跟单': {
    apiKey: '0l8ME1ClpOO1qYfVW3YrBkymZRnQXHe3jClG0XWzhZmTn0mgXZVKKtpkZz6RD5D7',
    apiSecret: 'PtKZTS4j718I6OgvvAbF0myFX9dNfQfoyeXrGC7Ca863Y5TqTADg0EMo4OjVKtkq',
  },
  '大号': {
    apiKey: 'Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok',
    apiSecret: 'wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij',
  },
  '德鑫': {
    apiKey: '42pVludyrvXxoouv3N3qFRdAedXnNVEq92BZI56FEBqxza1fA4C5IhZyMGRdWMZY',
    apiSecret: 'tvb1mkILNwVroVtc6JVDWbpKzOGeWPR6mt8ABfFIkFJufoFuUZ4L4ADkewF8HmkZ',
  },
  '刘少': {
    apiKey: 'PlmSEpdIXeKyGW5faesIisO1PxjPgmJElj1MQSNykZ3pDjZCiMbyrJQwEYH3BiDb',
    apiSecret: 'ybriZgVJWoT41aTIP6Lk3kdIxopdfInCHxHsFhJT8BjYQer3XRdleMo26cp0DrN2',
  },
  '傻辉': {
    apiKey: '8dZioILkIJPmnFNL5cy8OhqIHA3wGTupKVgWA7TzlsRp2yVaBaEixy6nkQZybsFY',
    apiSecret: 'a1rHCHoA6OgPEUqD0f20b70NO0zn8iaOBPRQaRYWOOcy8glSwJe4QLAl8Jtrs9AN',
  },
};


/**
 * 策略列表
 * 
 * 每个策略配置项说明：
 * - enabled: 是否启用该策略
 * - account: 使用的账号名称（对应 accountList 中的 key）
 * - positionSide: 持仓方向 'LONG' 或 'SHORT'
 * - tradingPair: 交易对，如 'ARUSDT'
 * - gridPriceDifference: 网格价差
 * - gridLongOpenQuantity / gridLongCloseQuantity: 做多时的开仓/平仓数量
 * - gridShortOpenQuantity / gridShortCloseQuantity: 做空时的开仓/平仓数量
 * - gridTradeQuantity: 统一交易数量（当没有分别设置开仓/平仓数量时使用）
 * - maxOpenPositionQuantity: 最大持仓数量限制
 * - minOpenPositionQuantity: 最小持仓数量限制
 * - fallPreventionCoefficient: 防跌/防涨系数
 * - pollingInterval: 轮询间隔（毫秒）
 * - gtLimitationPrice: 大于等于该价格时暂停
 * - ltLimitationPrice: 小于等于该价格时暂停
 * - isAboveOpenPrice: 价格大于等于开仓价时暂停
 * - isBelowOpenPrice: 价格小于等于开仓价时暂停
 */
const strategyList = [
  // ==================== 1000SHIB ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: '1000SHIBUSDT',             // 交易对：柴犬币
  //   gridPriceDifference: 0.00004,            // 网格价差
  //   gridLongOpenQuantity: 10000,             // 做多开仓数量
  //   gridLongCloseQuantity: 10000,            // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== ALL ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'ALLUSDT',                  // 交易对：ALL币
    gridPriceDifference: 0.004,              // 网格价差
    gridLongOpenQuantity: 260,                // 做多开仓数量
    gridLongCloseQuantity: 240,               // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isBelowOpenPrice: undefined,             // 价格小于等于开仓价时暂停
  },
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                          // 使用账号
    positionSide: 'SHORT',                   // 持仓方向：做空
    tradingPair: 'ALLUSDT',                  // 交易对：ALL币
    gridPriceDifference: 0.004,              // 网格价差
    gridShortOpenQuantity: 300,               // 做空开仓数量
    gridShortCloseQuantity: 280,              // 做空平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== AR ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'ARUSDT',                   // 交易对：Arweave
    gridPriceDifference: 0.0227,             // 网格价差
    gridLongOpenQuantity: 13.5,              // 做多开仓数量
    gridLongCloseQuantity: 13,               // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== ASTER ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'ASTERUSDT',                // 交易对：ASTER币
    gridPriceDifference: 0.01,               // 网格价差
    gridLongOpenQuantity: 67,                // 做多开仓数量
    gridLongCloseQuantity: 50,               // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== AVAX LONG ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'AVAXUSDT',                 // 交易对：雪崩币
    gridPriceDifference: 0.07,               // 网格价差
    gridLongOpenQuantity: 9,                // 做多开仓数量
    gridLongCloseQuantity: 8,                // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== AVAX SHORT ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'SHORT',                   // 持仓方向：做空
    tradingPair: 'AVAXUSDT',                 // 交易对：雪崩币
    gridPriceDifference: 0.07,               // 网格价差
    gridLongOpenQuantity: 5,                // 做多开仓数量
    gridLongCloseQuantity: 5,                // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== AVAX SPOT ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'SPOT',                    // 持仓方向：现货
  //   tradingPair: 'AVAXUSDT',                 // 交易对：雪崩币
  //   gridPriceDifference: 0.2,                // 网格价差
  //   gridTradeQuantity: 1,                    // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== BROCCOLIF3B ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'BROCCOLIF3BUSDT',          // 交易对：西兰花币
  //   gridPriceDifference: 0.00004194,         // 网格价差
  //   gridLongOpenQuantity: 10000,             // 做多开仓数量
  //   gridLongCloseQuantity: 7000,             // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  //   gtLimitationPrice: 0.00637,              // 高于价格限制
  //   ltLimitationPrice: 0.006,                // 低于价格限制
  // },

  // ==================== BTC ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'BTCUSDT',                  // 交易对：比特币
  //   gridPriceDifference: 100,                // 网格价差
  //   gridLongOpenQuantity: 0.001,             // 做多开仓数量
  //   gridLongCloseQuantity: 0.001,            // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== DOGE LONG ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'DOGEUSDT',                 // 交易对：狗狗币
  //   gridPriceDifference: 0.001,              // 网格价差
  //   gridTradeQuantity: 200,                  // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== DOGE SHORT ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'SHORT',                   // 持仓方向：做空
  //   tradingPair: 'DOGEUSDT',                 // 交易对：狗狗币
  //   gridPriceDifference: 0.001,              // 网格价差
  //   gridTradeQuantity: 150,                  // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== ENA ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'ENAUSDT',                  // 交易对：Ethena
    gridPriceDifference: 0.002,              // 网格价差
    gridLongOpenQuantity: 290,               // 做多开仓数量
    gridLongCloseQuantity: 280,              // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== ETH LONG ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '俊鑫',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'ETHUSDT',                  // 交易对：以太坊
  //   gridPriceDifference: 20,                 // 网格价差
  //   gridTradeQuantity: 0.06,                 // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  //   isBelowOpenPrice: false,                  // 低于开仓价时暂停
  // },

  // ==================== ETH SHORT ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'SHORT',                   // 持仓方向：做空
    tradingPair: 'ETHUSDT',                  // 交易对：以太坊
    gridPriceDifference: 20,                 // 网格价差
    gridTradeQuantity: 0.03,                 // 统一交易数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: undefined,             // 价格大于等于开仓价时暂停
  },

  // ==================== FIL ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '俊鑫',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'FILUSDT',                  // 交易对：Filecoin
  //   gridPriceDifference: 0.01,               // 网格价差
  //   gridLongOpenQuantity: 40,                // 做多开仓数量
  //   gridLongCloseQuantity: 35,               // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== HYPE LONG ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '刘少',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'HYPEUSDT',                 // 交易对：Hyperliquid
  //   gridPriceDifference: 0.3,                // 网格价差
  //   gridLongOpenQuantity: 1.5,               // 做多开仓数量
  //   gridLongCloseQuantity: 1,                // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  //   gtLimitationPrice: 41,                   // 高于价格限制
  //   ltLimitationPrice: 28,                   // 低于价格限制
  // },

  // ==================== HYPE SHORT ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '跟单',                         // 使用账号
  //   positionSide: 'SHORT',                   // 持仓方向：做空
  //   tradingPair: 'HYPEUSDT',                 // 交易对：Hyperliquid
  //   gridPriceDifference: 0.3,                // 网格价差
  //   gridTradeQuantity: 1,                    // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  //   gtLimitationPrice: 41,                   // 高于价格限制
  //   ltLimitationPrice: 38,                   // 低于价格限制
  // },

  // ==================== KERNEL SPOT ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'SPOT',                    // 持仓方向：现货
  //   tradingPair: 'KERNELUSDT',               // 交易对：KERNEL币
  //   gridPriceDifference: 0.005,              // 网格价差
  //   gridTradeQuantity: 30,                   // 统一交易数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== NIL ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'NILUSDT',                  // 交易对：NIL币
  //   gridPriceDifference: 0.0005,             // 网格价差
  //   gridLongOpenQuantity: 1329.787234,       // 做多开仓数量
  //   gridLongCloseQuantity: 1329.787234,      // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== OP ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '大号',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'OPUSDT',                   // 交易对：Optimism
  //   gridPriceDifference: 0.00303429,         // 网格价差
  //   gridLongOpenQuantity: 20,                // 做多开仓数量
  //   gridLongCloseQuantity: 17,               // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== PEOPLE ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '俊鑫',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'PEOPLEUSDT',               // 交易对：PEOPLE币
  //   gridPriceDifference: 0.0001,             // 网格价差
  //   gridLongOpenQuantity: 8355,              // 做多开仓数量
  //   gridLongCloseQuantity: 8300,             // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },

  // ==================== POL ====================
  {
    enabled: true,                           // 是否启用
    account: '俊鑫',                         // 使用账号
    positionSide: 'LONG',                    // 持仓方向：做多
    tradingPair: 'POLUSDT',                  // 交易对：Polygon
    gridPriceDifference: 0.0005,             // 网格价差
    gridLongOpenQuantity: 1100,               // 做多开仓数量
    gridLongCloseQuantity: 1000,              // 做多平仓数量
    pollingInterval: 5000,                   // 轮询间隔(毫秒)
    isAboveOpenPrice: true,                  // 价格大于等于开仓价时暂停
  },

  // ==================== RESOLV ====================
  // {
  //   enabled: true,                           // 是否启用
  //   account: '俊鑫',                         // 使用账号
  //   positionSide: 'LONG',                    // 持仓方向：做多
  //   tradingPair: 'RESOLVUSDT',               // 交易对：RESOLV币
  //   gridPriceDifference: 0.0005,             // 网格价差
  //   gridLongOpenQuantity: 150,               // 做多开仓数量
  //   gridLongCloseQuantity: 100,              // 做多平仓数量
  //   pollingInterval: 5000,                   // 轮询间隔(毫秒)
  // },
];


module.exports = {
  accountList,
  strategyList,
};
