/**
 * Gate.io 币种数据控制器
 * 提供24h涨跌幅排序数据接口
 */

const catchAsync = require('../utils/catch-async');
const { sendSuccess } = require('../utils/api-response');


/**
 * 获取涨幅榜数据
 */
const getGainers = catchAsync(async (req, res) => {
  const { currentPage = 1, pageSize = 20 } = req.query;

  if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.gainers) {
    return sendSuccess(res, {
      list: [],
      pagination: {
        currentPage: parseInt(currentPage),
        pageSize: parseInt(pageSize),
        total: 0
      },
      lastUpdate: null
    }, '数据正在加载中，请稍后再试');
  }

  const start_index = (parseInt(currentPage) - 1) * parseInt(pageSize);
  const end_index = start_index + parseInt(pageSize);
  const paginated_data = global.GATE_COIN_CACHE.gainers.slice(start_index, end_index);

  return sendSuccess(res, {
    list: paginated_data,
    pagination: {
      currentPage: parseInt(currentPage),
      pageSize: parseInt(pageSize),
      total: global.GATE_COIN_CACHE.gainers.length
    },
    lastUpdate: global.GATE_COIN_CACHE.lastUpdate
  }, '获取涨幅榜数据成功');
});

/**
 * 获取跌幅榜数据
 */
const getLosers = catchAsync(async (req, res) => {
  const { currentPage = 1, pageSize = 20 } = req.query;

  if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.losers) {
    return sendSuccess(res, {
      list: [],
      pagination: {
        currentPage: parseInt(currentPage),
        pageSize: parseInt(pageSize),
        total: 0
      },
      lastUpdate: null
    }, '数据正在加载中，请稍后再试');
  }

  const start_index = (parseInt(currentPage) - 1) * parseInt(pageSize);
  const end_index = start_index + parseInt(pageSize);
  const paginated_data = global.GATE_COIN_CACHE.losers.slice(start_index, end_index);

  return sendSuccess(res, {
    list: paginated_data,
    pagination: {
      currentPage: parseInt(currentPage),
      pageSize: parseInt(pageSize),
      total: global.GATE_COIN_CACHE.losers.length
    },
    lastUpdate: global.GATE_COIN_CACHE.lastUpdate
  }, '获取跌幅榜数据成功');
});

/**
 * 获取全部币种数据（按24h涨跌幅排序）
 */
const getAllSorted = catchAsync(async (req, res) => {
  const { currentPage = 1, pageSize = 20, sort = 'desc' } = req.query;

  if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.all) {
    return sendSuccess(res, {
      list: [],
      pagination: {
        currentPage: parseInt(currentPage),
        pageSize: parseInt(pageSize),
        total: 0
      },
      lastUpdate: null
    }, '数据正在加载中，请稍后再试');
  }

  // 按24h涨跌幅排序
  let sorted_data = [...global.GATE_COIN_CACHE.all];
  sorted_data.sort((a, b) => {
    const aChange = parseFloat(a.dimension_24h) || 0;
    const bChange = parseFloat(b.dimension_24h) || 0;
    return sort === 'desc' ? bChange - aChange : aChange - bChange;
  });

  const start_index = (parseInt(currentPage) - 1) * parseInt(pageSize);
  const end_index = start_index + parseInt(pageSize);
  const paginated_data = sorted_data.slice(start_index, end_index);

  return sendSuccess(res, {
    list: paginated_data,
    pagination: {
      currentPage: parseInt(currentPage),
      pageSize: parseInt(pageSize),
      total: sorted_data.length
    },
    lastUpdate: global.GATE_COIN_CACHE.lastUpdate,
    sort: sort
  }, '获取币种数据成功');
});

/**
 * 获取缓存状态信息
 */
const getCacheStatus = catchAsync(async (req, res) => {
  const has_cache = global.GATE_COIN_CACHE && global.GATE_COIN_CACHE.lastUpdate;

  return sendSuccess(res, {
    isReady: has_cache,
    lastUpdate: global.GATE_COIN_CACHE?.lastUpdate || null,
    gainersCount: global.GATE_COIN_CACHE?.gainers?.length || 0,
    losersCount: global.GATE_COIN_CACHE?.losers?.length || 0,
    totalCount: global.GATE_COIN_CACHE?.all?.length || 0,
    stats: global.GATE_COIN_CACHE?.stats || {
      totalRequests: 0,
      averageResponseTime: 0,
      updateDuration: 0
    }
  }, '获取缓存状态成功');
});


module.exports = {
  getGainers,
  getLosers,
  getAllSorted,
  getCacheStatus,
};