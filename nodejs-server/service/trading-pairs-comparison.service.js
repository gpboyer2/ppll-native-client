const { MainClient, USDMClient, CoinMClient } = require("binance");
const { HttpsProxyAgent } = require("https-proxy-agent");
const proxy = require("../utils/proxy.js");
const { BINANCE_CONFIG: config } = proxy;
const ApiError = require("../utils/api-error");


// 缓存配置 - 1小时缓存时间
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

// 内存缓存对象
const pairsCache = {
  spotPairs: {
    data: null,
    timestamp: null
  },
  futuresPairs: {
    data: null,
    timestamp: null
  },
  coinMFuturesPairs: {
    data: null,
    timestamp: null
  }
};

/**
 * 根据后缀过滤交易对数据
 * @param {Array} pairs - 交易对数组
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Array} 过滤后的交易对数组
 */
const filterPairsBySuffix = (pairs, suffix) => {
  if (!suffix) {
    return pairs;
  }
  return pairs.filter(pair => pair.endsWith(suffix.toUpperCase()));
};

/**
 * 检查缓存是否有效
 * @param {Object} cacheItem - 缓存项
 * @returns {boolean} 缓存是否有效
 */
const isCacheValid = (cacheItem) => {
  if (!cacheItem?.data?.length || !cacheItem.timestamp) {
    return false;
  }
  return (Date.now() - cacheItem.timestamp) < CACHE_DURATION;
};

/**
 * 清除缓存
 */
const clearCache = () => {
  pairsCache.spotPairs = { data: null, timestamp: null };
  pairsCache.futuresPairs = { data: null, timestamp: null };
  pairsCache.coinMFuturesPairs = { data: null, timestamp: null };
  console.log('交易对缓存已清除');
};

/**
 * 创建现货客户端
 * @returns {MainClient} 币安现货客户端实例
 */
const createSpotClient = () => {
  const clientOptions = {
    // 不需要API密钥，只是获取公开的交易对信息
  };

  const requestOptions = {
    timeout: 10000,
  };

  // 非生产环境启用代理配置
  if (process.env.NODE_ENV !== "production") {
    requestOptions.httpsAgent = new HttpsProxyAgent(config.proxy);
    console.log(`现货客户端使用代理: ${config.proxy}`);
  }

  return new MainClient(clientOptions, requestOptions);
};

/**
 * 创建USDM期货客户端
 * @returns {USDMClient} 币安USDM期货客户端实例
 */
const createUSDMClient = () => {
  const clientOptions = {
    // 不需要API密钥，只是获取公开的交易对信息
  };

  const requestOptions = {
    timeout: 10000,
  };

  // 非生产环境启用代理配置
  if (process.env.NODE_ENV !== "production") {
    requestOptions.httpsAgent = new HttpsProxyAgent(config.proxy);
    console.log(`合约客户端使用代理: ${config.proxy}`);
  }

  return new USDMClient(clientOptions, requestOptions);
};

/**
 * 创建币本位合约客户端
 * @returns {CoinMClient} 币安币本位合约客户端实例
 */
const createCoinMClient = () => {
  const clientOptions = {
    // 不需要API密钥，只是获取公开的交易对信息
  };

  const requestOptions = {
    timeout: 10000,
  };

  // 非生产环境启用代理配置
  if (process.env.NODE_ENV !== "production") {
    requestOptions.httpsAgent = new HttpsProxyAgent(config.proxy);
    console.log(`币本位合约客户端使用代理: ${config.proxy}`);
  }

  return new CoinMClient(clientOptions, requestOptions);
};

/**
 * 获取币安现货交易对信息（带缓存）
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Promise<Array>} 现货交易对列表
 */
const fetchSpotTradingPairs = async (suffix = null) => {
  // 检查缓存
  if (isCacheValid(pairsCache.spotPairs)) {
    console.log('使用现货交易对缓存数据');
    const pairs = pairsCache.spotPairs.data;
    return filterPairsBySuffix(pairs, suffix);
  }

  console.log('获取现货交易对数据...');
  const client = createSpotClient();
  const data = await client.getExchangeInfo();

  // 提取现货交易对符号，只返回状态为TRADING的交易对
  const spotPairs = data.symbols
    .filter(symbol => symbol.status === 'TRADING')
    .map(symbol => symbol.symbol);

  // 更新缓存
  pairsCache.spotPairs.data = spotPairs;
  pairsCache.spotPairs.timestamp = Date.now();
  console.log(`现货交易对数据已缓存，共 ${spotPairs.length} 个交易对`);

  return filterPairsBySuffix(spotPairs, suffix);
};

/**
 * 获取币安合约交易对信息（带缓存）
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Promise<Array>} 合约交易对列表
 */
const fetchFuturesTradingPairs = async (suffix = null) => {
  // 检查缓存
  if (isCacheValid(pairsCache.futuresPairs)) {
    console.log('使用合约交易对缓存数据');
    const pairs = pairsCache.futuresPairs.data;
    return filterPairsBySuffix(pairs, suffix);
  }

  console.log('获取合约交易对数据...');
  const client = createUSDMClient();
  const data = await client.getExchangeInfo();

  // 提取合约交易对符号，过滤永续合约且状态为TRADING的交易对
  const futuresPairs = data.symbols
    .filter(symbol =>
      symbol.contractType === 'PERPETUAL' &&
      symbol.status === 'TRADING'
    )
    .map(symbol => symbol.symbol);

  // 更新缓存
  pairsCache.futuresPairs.data = futuresPairs;
  pairsCache.futuresPairs.timestamp = Date.now();
  console.log(`合约交易对数据已缓存，共 ${futuresPairs.length} 个交易对`);

  return filterPairsBySuffix(futuresPairs, suffix);
};

/**
 * 获取币安币本位合约交易对信息（带缓存）
 * @returns {Promise<Array>} 币本位合约交易对列表
 */
const fetchCoinMFuturesTradingPairs = async () => {
  // 检查缓存
  if (isCacheValid(pairsCache.coinMFuturesPairs)) {
    console.log('使用币本位合约交易对缓存数据');
    return pairsCache.coinMFuturesPairs.data;
  }

  console.log('获取币本位合约交易对数据...');
  const client = createCoinMClient();
  const data = await client.getExchangeInfo();

  // 提取币本位合约交易对符号，过滤永续合约且状态为TRADING的交易对
  const coinMFuturesPairs = data.symbols
    .filter(symbol =>
      symbol.contractType === 'PERPETUAL' &&
      symbol.contractStatus === 'TRADING'
    )
    .map(symbol => symbol.symbol);

  // 更新缓存
  pairsCache.coinMFuturesPairs.data = coinMFuturesPairs;
  pairsCache.coinMFuturesPairs.timestamp = Date.now();
  console.log(`币本位合约交易对数据已缓存，共 ${coinMFuturesPairs.length} 个交易对`);

  return coinMFuturesPairs;
};

/**
 * 获取有合约但没有现货的交易对
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Promise<Array>} 有合约但没有现货的交易对列表
 */
const getFuturesOnlyPairs = async (suffix = null) => {
  const [spotPairs, futuresPairs] = await Promise.all([
    fetchSpotTradingPairs(),
    fetchFuturesTradingPairs()
  ]);

  const spotPairsSet = new Set(spotPairs);
  let futures_only_pairs = futuresPairs.filter(pair => !spotPairsSet.has(pair));

  // 应用后缀过滤
  futures_only_pairs = filterPairsBySuffix(futures_only_pairs, suffix);

  return {
    count: futures_only_pairs.length,
    pairs: futures_only_pairs.sort(),
    description: suffix ? `以${suffix}结尾的有合约但没有现货的交易对` : "有合约但没有现货的交易对"
  };
};

/**
 * 获取有现货但没有合约的交易对
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Promise<Array>} 有现货但没有合约的交易对列表
 */
const getSpotOnlyPairs = async (suffix = null) => {
  const [spotPairs, futuresPairs] = await Promise.all([
    fetchSpotTradingPairs(),
    fetchFuturesTradingPairs()
  ]);

  const futuresPairsSet = new Set(futuresPairs);
  let spot_only_pairs = spotPairs.filter(pair => !futuresPairsSet.has(pair));

  // 应用后缀过滤
  spot_only_pairs = filterPairsBySuffix(spot_only_pairs, suffix);

  return {
    count: spot_only_pairs.length,
    pairs: spot_only_pairs.sort(),
    description: suffix ? `以${suffix}结尾的有现货但没有合约的交易对` : "有现货但没有合约的交易对"
  };
};

/**
 * 获取交易对与基础资产综合分析报告
 * @param {string} suffix - 可选的后缀过滤器
 * @returns {Promise<Object>} 综合分析报告，包含交易对对比和基础资产分析
 */
const getComprehensiveReport = async (suffix = null) => {
  const [spotPairs, futuresPairs, futuresOnlyResult, spotOnlyResult] = await Promise.all([
    fetchSpotTradingPairs(),
    fetchFuturesTradingPairs(),
    getFuturesOnlyPairs(suffix),
    getSpotOnlyPairs(suffix)
  ]);

  // 获取同时存在现货和合约的交易对
  const spotPairsSet = new Set(spotPairs);
  let common_pairs = futuresPairs.filter(pair => spotPairsSet.has(pair));

  // 应用后缀过滤
  common_pairs = filterPairsBySuffix(common_pairs, suffix);

  // 如果有后缀过滤，也需要重新过滤原始数据
  const filteredSpotPairs = filterPairsBySuffix(spotPairs, suffix);
  const filteredFuturesPairs = filterPairsBySuffix(futuresPairs, suffix);

  // 提取基础资产（根据后缀过滤器确定提取逻辑）
  const suffixForAnalysis = suffix || 'USDT';
  const extractBaseAsset = (pairs) => {
    return pairs
      .filter(pair => pair.endsWith(suffixForAnalysis))
      .map(pair => pair.replace(suffixForAnalysis, ''))
      .filter(asset => asset.length > 0);
  };

  const spotBaseAssets = new Set(extractBaseAsset(filteredSpotPairs));
  const futuresBaseAssets = new Set(extractBaseAsset(filteredFuturesPairs));

  const allBaseAssets = new Set([...spotBaseAssets, ...futuresBaseAssets]);

  const assetAnalysis = {
    totalBaseAssets: allBaseAssets.size,
    spotOnlyAssets: [],
    futuresOnlyAssets: [],
    commonAssets: []
  };

  allBaseAssets.forEach(asset => {
    const hasSpot = spotBaseAssets.has(asset);
    const hasFutures = futuresBaseAssets.has(asset);

    if (hasSpot && hasFutures) {
      assetAnalysis.commonAssets.push(asset);
    } else if (hasSpot && !hasFutures) {
      assetAnalysis.spotOnlyAssets.push(asset);
    } else if (!hasSpot && hasFutures) {
      assetAnalysis.futuresOnlyAssets.push(asset);
    }
  });

  // 排序
  assetAnalysis.spotOnlyAssets.sort();
  assetAnalysis.futuresOnlyAssets.sort();
  assetAnalysis.commonAssets.sort();

  return {
    summary: {
      totalSpotPairs: filteredSpotPairs.length,
      totalFuturesPairs: filteredFuturesPairs.length,
      common_pairs: common_pairs.length,
      futuresOnlyCount: futuresOnlyResult.count,
      spotOnlyCount: spotOnlyResult.count,
      totalBaseAssets: assetAnalysis.totalBaseAssets,
      commonAssetsCount: assetAnalysis.commonAssets.length,
      spotOnlyAssetsCount: assetAnalysis.spotOnlyAssets.length,
      futuresOnlyAssetsCount: assetAnalysis.futuresOnlyAssets.length
    },
    common_pairs: {
      count: common_pairs.length,
      pairs: common_pairs.sort(),
      description: suffix ? `以${suffix}结尾的同时存在现货和合约的交易对` : "同时存在现货和合约的交易对"
    },
    futuresOnly: futuresOnlyResult,
    spotOnly: spotOnlyResult,
    assetAnalysis: {
      summary: {
        totalBaseAssets: assetAnalysis.totalBaseAssets,
        commonAssetsCount: assetAnalysis.commonAssets.length,
        spotOnlyAssetsCount: assetAnalysis.spotOnlyAssets.length,
        futuresOnlyAssetsCount: assetAnalysis.futuresOnlyAssets.length
      },
      details: assetAnalysis,
      generatedAt: new Date().toISOString()
    },
    generatedAt: new Date().toISOString()
  };
};

/**
 * 分析特定交易对的可用性
 * @param {string} symbol - 交易对符号
 * @returns {Promise<Object>} 交易对可用性信息
 */
const analyzeTradingPairAvailability = async (symbol) => {
  const [spotPairs, futuresPairs] = await Promise.all([
    fetchSpotTradingPairs(),
    fetchFuturesTradingPairs()
  ]);

  const hasSpot = spotPairs.includes(symbol);
  const hasFutures = futuresPairs.includes(symbol);

  let category = "";
  if (hasSpot && hasFutures) {
    category = "现货和合约都可用";
  } else if (hasSpot && !hasFutures) {
    category = "仅现货可用";
  } else if (!hasSpot && hasFutures) {
    category = "仅合约可用";
  } else {
    category = "都不可用";
  }

  return {
    symbol,
    hasSpot,
    hasFutures,
    category,
    checkedAt: new Date().toISOString()
  };
};

module.exports = {
  fetchSpotTradingPairs,
  fetchFuturesTradingPairs,
  fetchCoinMFuturesTradingPairs,
  getFuturesOnlyPairs,
  getSpotOnlyPairs,
  getComprehensiveReport,
  analyzeTradingPairAvailability,
  createSpotClient,
  createUSDMClient,
  createCoinMClient,
  clearCache // 导出清除缓存函数，便于测试或手动清除
};