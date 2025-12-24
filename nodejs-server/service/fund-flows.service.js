const httpStatus = require('http-status');
const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

/**
 * 获取合约资金流向数据
 * @param {string} asset - 资产类型(BTC/ETH等)
 * @param {string} timeframe - 时间粒度(5M/30M/1H/1D)
 * @returns {Promise<Object>}
 */
const getContractFundFlows = async (asset, timeframe) => {
    // 实际项目中这里应该从数据库或第三方API获取真实数据
    // 以下是模拟数据，对应UI截图中的数值

    // 按资产类型返回不同数据集
    const dataMap = {
        BTC: {
            large_net_inflow: -1.87,
            large_inflow: 92.44,
            large_outflow: 94.32,
            medium_net_inflow: -3.04,
            medium_inflow: 32.95,
            medium_outflow: 36.00,
            small_net_inflow: -7.21,
            small_inflow: 285.51,
            small_outflow: 292.72
        },
        // 其他资产可以定义不同数据集
        all: {
            large_net_inflow: -1.87,
            large_inflow: 92.44,
            large_outflow: 94.32,
            medium_net_inflow: -3.04,
            medium_inflow: 32.95,
            medium_outflow: 36.00,
            small_net_inflow: -7.21,
            small_inflow: 285.51,
            small_outflow: 292.72
        }
    };

    // 根据时间粒度调整数据（模拟逻辑）
    const timeframeFactors = {
        '5M': 0.2,
        '30M': 0.5,
        '1H': 1,
        '1D': 3
    };

    const baseData = dataMap[asset] || dataMap.all;
    const factor = timeframeFactors[timeframe] || 1;

    // 应用时间粒度因子
    return Object.fromEntries(
        Object.entries(baseData).map(([key, value]) => [
            key,
            key.includes('net') ? value * factor : Math.round(value * factor * 100) / 100
        ])
    );
};

/**
 * 获取趋势预测数据
 * @returns {Promise<Object>}
 */
const getTrendPrediction = async () => {
    // 实际项目应从分析模型获取数据
    return {
        sentiment: '中立',
        score: 51.52
        // levels字段由controller层固定返回
    };
};

/**
 * 获取资金流占比数据
 * @returns {Promise<Object>}
 */
const getFundFlowDistribution = async () => {
    // 模拟数据对应UI截图
    return {
        main_inflow: 125.40,
        main_net_inflow: -4.92,
        main_outflow: 130.32,
        retail_inflow: 285.51,
        retail_net_inflow: -7.21,
        retail_outflow: 292.72,
        percentage: 10,
        total_amount: 92.72
    };
};

module.exports = {
    getContractFundFlows,
    getTrendPrediction,
    getFundFlowDistribution
};