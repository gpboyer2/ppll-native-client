/**
 * 资金流控制器
 * 处理资金流相关的业务逻辑，提供资金流向查询和分析功能
 */
/** @type {import('axios')} */
const axios = require('axios');
const httpStatus = require('http-status');
const Mock = require('mockjs');
const catchAsync = require('../utils/catch-async.js');
const fundFlowsService = require('../service/fund-flows.service.js');
const ApiError = require('../utils/api-error.js');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');

/**
 * 获取合约资金流向数据
 * 对应路由：GET /v1/fund-flows/contract
 */
const getContractFundFlows = catchAsync(async (req, res) => {
  const { asset = 'all', timeframe = '1H' } = req.query;

  // 验证参数有效性
  const validAssets = ['BTC', 'ETH', 'GT', 'XRP', 'SOL', 'all'];
  const validTimeframes = ['5M', '30M', '1H', '1D'];

  if (!validAssets.includes(asset)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的资产类型');
  }

  if (!validTimeframes.includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的时间粒度');
  }

  const result = await fundFlowsService.getContractFundFlows(asset, timeframe);

  return res.apiSuccess({
    largeOrder: {
      netInflow: result.large_net_inflow,
      inflow: result.large_inflow,
      outflow: result.large_outflow
    },
    mediumOrder: {
      netInflow: result.medium_net_inflow,
      inflow: result.medium_inflow,
      outflow: result.medium_outflow
    },
    smallOrder: {
      netInflow: result.small_net_inflow,
      inflow: result.small_inflow,
      outflow: result.small_outflow
    },
    unit: '亿'
  }, '获取合约资金流向数据成功');
});

/**
 * 获取趋势预测数据
 * 对应路由：GET /v1/fund-flows/trend-prediction
 */
const getTrendPrediction = catchAsync(async (req, res) => {
  const prediction = await fundFlowsService.getTrendPrediction();

  return res.apiSuccess({
    sentiment: prediction.sentiment,
    score: prediction.score,
    levels: [
      '强烈卖出',
      '卖出',
      '中立',
      '买入',
      '强烈买入'
    ]
  }, '获取趋势预测数据成功');
});

/**
 * 获取资金流占比数据
 * 对应路由：GET /v1/fund-flows/distribution
 */
const getFundFlowDistribution = catchAsync(async (req, res) => {
  const distribution = await fundFlowsService.getFundFlowDistribution();

  return res.apiSuccess({
    mainForce: {
      inflow: distribution.main_inflow,
      netInflow: distribution.main_net_inflow,
      outflow: distribution.main_outflow
    },
    retail: {
      inflow: distribution.retail_inflow,
      netInflow: distribution.retail_net_inflow,
      outflow: distribution.retail_outflow
    },
    percentage: distribution.percentage,
    total: distribution.total_amount,
    unit: '亿'
  }, '获取资金流占比数据成功');
});

// Gate.io API配置
const GATE_API = {
  BASE_URL: 'https://www.gate.com/api/bigdata/zone/v1',
  TIMEOUT: 5000
};

/**
 * 获取Gate.io资金流数据
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
const fetchGateIOData = async (params) => {
  try {
    const response = await axios.get(`${GATE_API.BASE_URL}/fund_flow/analysis`, {
      params,
      timeout: GATE_API.TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN'
      }
    });

    return response.data;
  } catch (error) {
    // 错误处理
    if (error.response) {
      // Gate.io返回的错误
      throw new ApiError(
        error.response.status,
        `API异常: ${error.response.data?.message || error.message}`
      );
    } else if (error.request) {
      // 请求未收到响应
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        '付费API服务不可用'
      );
    } else {
      // 其他错误
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `请求付费API失败: ${error.message}`
      );
    }
  }
};

/**
 * 获取资金流分析数据
 * 对应路由：GET /v1/fund-flows/analysis
 * 数据来源: https://www.gate.com/zh/crypto-market-data/funds/fund-flow/spot
 * 备用数据来源: 
 */
const getFundFlowAnalysis = catchAsync(async (req, res) => {
  const { coin_type = 'ALL', contra_spot = 'contra', time_type = '1H' } = req.query;

  // 参数验证
  if (!['contra', 'spot'].includes(contra_spot)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'contra_spot参数必须是contra或spot');
  }

  if (!['5M', '30M', '1H', '1D'].includes(time_type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的时间类型');
  }

  // 调用服务层获取数据
  const data = await fetchGateIOData({
    coin_type,
    contra_spot,
    time_type
  });

  return res.apiSuccess(data, '获取资金流分析数据成功');
});

/**
 * 获取Gate.io资金流占比数据
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
const fetchGateIOPercentage = async (params) => {
  try {
    const response = await axios.get(`${GATE_API.BASE_URL}/fund_flow/percentage`, {
      params,
      timeout: GATE_API.TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN'
      }
    });
    return response.data;
  } catch (error) {
    // 错误处理
    if (error.response) {
      // Gate.io返回的错误
      throw new ApiError(
        error.response.status,
        `付费API异常: ${error.response.data?.message || error.message}`
      );
    } else if (error.request) {
      // 请求未收到响应
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        '付费API服务不可用'
      );
    } else {
      // 其他错误
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `请求付费API失败: ${error.message}`
      );
    }
  }
};

/**
 * 资金流向百分比接口
 * 对应路由：GET /v1/fund-flows/percentage
 * 数据来源: https://www.gate.com/zh/crypto-market-data/funds/fund-flow/spot
 * 备用数据来源: 
 */
const getFundFlowPercentage = catchAsync(async (req, res) => {
  const { coin_type = 'ALL', contra_spot = 'contra', time_type = '1H' } = req.query;

  // 参数验证
  if (!['contra', 'spot'].includes(contra_spot)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'contra_spot参数必须是contra或spot');
  }

  if (!['5M', '30M', '1H', '1D'].includes(time_type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的时间类型');
  }

  // 调用服务层
  const data = await fetchGateIOPercentage({
    coin_type,
    contra_spot,
    time_type
  });

  return res.apiSuccess(data, '获取资金流百分比数据成功');
});

// CoinAnk API配置
const COINANK_API = {
  BASE_URL: 'https://api.coinank.com/api',
  TIMEOUT: 10000, // 增加超时时间
};

/**
 * 获取CoinAnk合约持仓量历史数据
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
const coinank_fetchOpenInterestHistory = async (params) => {
  try {
    const randomUserAgent = Mock.Random.string('alphanumeric', 20); // 生成一个随机的用户代理字符串

    const response = await axios.get(`${COINANK_API.BASE_URL}/openInterest/chart`, {
      params,
      timeout: COINANK_API.TIMEOUT,
      headers: {
        'client': 'web',
        'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'coinank-apikey': 'LWIzMWUtYzU0Ny1kMjk5LWI2ZDA3Yjc2MzFhYmEyYzkwM2NjfDI4NjUwNTkyMDM5NDQzNDc=',
        'origin': 'https://coinank.com',
        'referer': 'https://coinank.com/',
        'user-agent': randomUserAgent,
        'User-Agent': randomUserAgent,
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new ApiError(
        error.response.status,
        `CoinAnk API错误: ${error.response.data?.message || error.message}`
      );
    } else if (error.request) {
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        'CoinAnk服务不可用'
      );
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `请求CoinAnk失败: ${error.message}`
      );
    }
  }
};


/**
 * TODO - 暂时废弃: 因coinank的 coinank-apikey 为动态数据, 5分钟左右就会过期, 且暂时无法爬虫获取
 * 获取各交易所不同交易对的合约持仓量(历史累计)数据
 * 对应路由：GET /v1/fund-flows/open-interest-history
 * 数据来源: https://coinank.com/zh/instruments/SOL
 * 备用数据来源: 
 */
const coinank_getOpenInterestHistory = catchAsync(async (req, res) => {
  const { baseCoin = 'BTC', interval = '1h', type = 'USD' } = req.query;

  // 参数验证
  const validIntervals = ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'];
  if (!validIntervals.includes(interval)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的时间间隔(interval)');
  }
  if (!['USD'].includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的类型(type)，必须是 USD');
  }

  // 调用服务层
  const data = await coinank_fetchOpenInterestHistory({
    baseCoin,
    interval,
    type
  });

  return res.apiSuccess(data, '获取合约持仓量历史数据成功');
});

/**
 * 获取Gate.io合约持仓量历史数据
 * @param {string} coin_type - 币种类型
 * @param {string} ex - 交易所
 * @param {string} ts - 时间间隔
 * @param {string} cy - 计价单位
 * @returns {Promise<Object>}
 */
const fetchGateIOOpenInterestHistory = async (coin_type, ex, ts, cy) => {
  try {
    const url = `https://www.gate.com/api-bigdata/v6/data/hold/pic/coin_type/${coin_type}/ex/${ex}/ts/${ts}/cy/${cy}?url=fetchGrayscaleAll`;
    const response = await axios.get(url, {
      timeout: GATE_API.TIMEOUT,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'lang': 'zh-Hans',
        'source': 'web',
        'user-agent': Mock.Random.string('alphanumeric', 20)
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new ApiError(
        error.response.status,
        `付费API异常: ${error.response.data?.message || error.message}`
      );
    } else if (error.request) {
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        '付费API服务不可用'
      );
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `请求付费API失败: ${error.message}`
      );
    }
  }
};

/**
 * 获取各交易所不同交易对的合约持仓量(历史累计)数据
 * 对应路由：GET /v1/fund-flows/open-interest-history
 * 数据来源: https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/eth
 */
const getOpenInterestHistory = catchAsync(async (req, res) => {
  const { coin_type = 'BTC', ex = 'ALL', ts = '1H', cy = 'ALL' } = req.query;

  // 参数验证
  const validExchanges = ['ALL', 'binance', 'okx', 'bybit', 'gate-io', 'huobi', 'bitget', 'bingx', 'bitmex', 'coinex'];
  if (!validExchanges.includes(ex)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的交易所(ex)');
  }

  const validTimestamps = ['1H', '4H', '1D'];
  if (!validTimestamps.includes(ts)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的时间间隔(ts)');
  }

  const validCurrencies = ['ALL', 'USDT'];
  if (!validCurrencies.includes(cy)) {
    throw new ApiError(httpStatus.BAD_REQUEST, '无效的计价单位(cy)');
  }

  // 调用服务层
  const data = await fetchGateIOOpenInterestHistory(coin_type, ex, ts, cy);

  return res.apiSuccess(data, '获取合约持仓量历史数据成功');
});

/**
 * 抓取Gate.io页面获取各交易所持仓量数据
 * @param {string} coin_type - 币种 (e.g., 'btc', 'eth')
 * @returns {Promise<Object>}
 */
const fetchOpenInterestFromPage = async (coin_type) => {
  const url = `https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/${coin_type}`;

  // 简单反爬：随机 UA
  const client = axios.create({
    headers: {
      'User-Agent': new UserAgent().toString(),
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive'
    },
    timeout: 15000,
    // 如果您的服务器在需要代理的环境中，请取消注释以下行
    // proxy: {
    //     protocol: 'http',
    //     host: '127.0.0.1',
    //     port: 7890
    // }
  });

  try {
    const { data: html } = await client.get(url);
    const $ = cheerio.load(html);

    // 定位页面中的数据表格
    const rows = $('table tbody tr').toArray();
    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, '无法在页面上找到持仓数据表格，可能是页面结构已更改。');
    }

    const result = rows.map(tr => {
      const $td = $(tr).find('td');
      const exchangeRaw = $td.eq(0).text().trim();
      const [abbr, name] = exchangeRaw.split('\n');

      return {
        exchangeAbbr: abbr,
        openInterest: $td.eq(1).text().trim(),
        change24h: $td.eq(2).text().trim()
      };
    });

    const perpetualRows = result.filter(r => r.exchangeAbbr.includes('永续'));

    return perpetualRows;

  } catch (error) {
    // 处理Axios或网络错误
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, `抓取持仓数据失败: ${error.message}`);
  }
};

/**
 * 获取全网各交易所持仓量
 * 对应路由: GET /v1/fund-flows/open-interest-by-exchange
 * 数据来源: 通过爬虫抓取 https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/
 */
const getOpenInterestByExchange = catchAsync(async (req, res) => {
  const { coin_type = 'btc' } = req.query; // 默认为btc, 也可支持 eth 等

  const data = await fetchOpenInterestFromPage(coin_type.toLowerCase()); // 小写

  return res.apiSuccess(data, `获取全网交易所持仓量数据成功`+`https://www.gate.com/zh/crypto-market-data/funds/futures-open-interest/${coin_type}`);
});


module.exports = {
  getContractFundFlows,
  getTrendPrediction,
  getFundFlowDistribution,
  getFundFlowAnalysis,
  getFundFlowPercentage,
  getOpenInterestHistory,
  getOpenInterestByExchange,
};