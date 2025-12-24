/**
 * Gate.io 币种数据控制器
 * 提供24h涨跌幅排序数据接口
 */

const catchAsync = require('../utils/catchAsync');


/**
 * 获取涨幅榜数据
 */
const getGainers = catchAsync(async (req, res) => {
    const { page = 1, pageSize = 20 } = req.query;

    if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.gainers) {
        return res.status(200).json({
            status: 'success',
            code: 200,
            message: '数据正在加载中，请稍后再试',
            data: {
                list: [],
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: 0,
                lastUpdate: null
            }
        });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedData = global.GATE_COIN_CACHE.gainers.slice(startIndex, endIndex);

    res.status(200).json({
        status: 'success',
        code: 200,
        message: '获取涨幅榜数据成功',
        data: {
            list: paginatedData,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: global.GATE_COIN_CACHE.gainers.length,
            lastUpdate: global.GATE_COIN_CACHE.lastUpdate
        }
    });
});

/**
 * 获取跌幅榜数据
 */
const getLosers = catchAsync(async (req, res) => {
    const { page = 1, pageSize = 20 } = req.query;

    if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.losers) {
        return res.status(200).json({
            status: 'success',
            code: 200,
            message: '数据正在加载中，请稍后再试',
            data: {
                list: [],
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: 0,
                lastUpdate: null
            }
        });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedData = global.GATE_COIN_CACHE.losers.slice(startIndex, endIndex);

    res.status(200).json({
        status: 'success',
        code: 200,
        message: '获取跌幅榜数据成功',
        data: {
            list: paginatedData,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: global.GATE_COIN_CACHE.losers.length,
            lastUpdate: global.GATE_COIN_CACHE.lastUpdate
        }
    });
});

/**
 * 获取全部币种数据（按24h涨跌幅排序）
 */
const getAllSorted = catchAsync(async (req, res) => {
    const { page = 1, pageSize = 20, sort = 'desc' } = req.query;

    if (!global.GATE_COIN_CACHE || !global.GATE_COIN_CACHE.all) {
        return res.status(200).json({
            status: 'success',
            code: 200,
            message: '数据正在加载中，请稍后再试',
            data: {
                list: [],
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: 0,
                lastUpdate: null
            }
        });
    }

    // 按24h涨跌幅排序
    let sortedData = [...global.GATE_COIN_CACHE.all];
    sortedData.sort((a, b) => {
        const aChange = parseFloat(a.dimension_24h) || 0;
        const bChange = parseFloat(b.dimension_24h) || 0;
        return sort === 'desc' ? bChange - aChange : aChange - bChange;
    });

    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedData = sortedData.slice(startIndex, endIndex);

    res.status(200).json({
        status: 'success',
        code: 200,
        message: '获取币种数据成功',
        data: {
            list: paginatedData,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total: sortedData.length,
            lastUpdate: global.GATE_COIN_CACHE.lastUpdate,
            sort: sort
        }
    });
});

/**
 * 获取缓存状态信息
 */
const getCacheStatus = catchAsync(async (req, res) => {
    const hasCache = global.GATE_COIN_CACHE && global.GATE_COIN_CACHE.lastUpdate;

    res.status(200).json({
        status: 'success',
        code: 200,
        message: '获取缓存状态成功',
        data: {
            isReady: hasCache,
            lastUpdate: global.GATE_COIN_CACHE?.lastUpdate || null,
            gainersCount: global.GATE_COIN_CACHE?.gainers?.length || 0,
            losersCount: global.GATE_COIN_CACHE?.losers?.length || 0,
            totalCount: global.GATE_COIN_CACHE?.all?.length || 0,
            stats: global.GATE_COIN_CACHE?.stats || {
                totalRequests: 0,
                averageResponseTime: 0,
                updateDuration: 0
            }
        }
    });
});


module.exports = {
    getGainers,
    getLosers,
    getAllSorted,
    getCacheStatus,
};