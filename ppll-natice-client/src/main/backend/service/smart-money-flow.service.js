/**
 * 智能资金流服务
 * 提供智能资金流分析相关的业务逻辑处理，包括高级资金流向分析
 */
const httpStatus = require("http-status");
const db = require("../models");
const User = db.User;
const { Op } = require("sequelize");
const ApiError = require("../utils/api-error");
/** @type {import('axios')} */
const axios = require("axios");

// Gate.io API configuration
const GATE_API = {
    ON_CHAIN_URL: "https://www.gate.com/api/bigdata/zone/on_chain_data",
    TIMEOUT: 5000,
};

/**
 * 获取KOL/VC链上持仓分布数据
 * @param {string} chain_name - 区块链名称 (all, sol, eth, base, bsc)
 * @returns {Promise<Object>}
 */
const getKolVcHoldings = async (chain_name = "all") => {
    try {
        const response = await axios.get(
            `${GATE_API.ON_CHAIN_URL}/coin_hold_distribution`,
            {
                params: {
                    chain_name,
                    wallet_label: "kol_vc",
                },
                timeout: GATE_API.TIMEOUT,
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    Referer:
                        "https://www.gate.com/zh/crypto-market-data/onchain/kol-vc",
                    "Sec-Ch-Ua":
                        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Source: "web",
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                },
            },
        );

        if (response.data && response.data.success) {
            return response.data.data;
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "获取KOL/VC持仓数据失败",
        );
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        if (error.response) {
            throw new ApiError(
                error.response.status,
                `上游API异常: ${error.response.data?.message || error.message}`,
            );
        } else if (error.request) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                "上游API服务不可用",
            );
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `请求上游API失败: ${error.message}`,
        );
    }
};

/**
 * Gate.io 提供的链上+社交媒体联动数据 API，专门用于分析 Solana 链上 KOL/VC 钱包地址与 Twitter 社交信号的共振关系。
 * @returns {Promise<any>}
 */
const getTwitterResonanceSignal = async (chain_name = "sol") => {
    try {
        const response = await axios.get(
            `${GATE_API.ON_CHAIN_URL}/kol_vc/twitter_resonance_signal?chain_name=${chain_name}`,
            {
                timeout: GATE_API.TIMEOUT,
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    Referer:
                        "https://www.gate.com/zh/crypto-market-data/onchain/kol-vc",
                    "Sec-Ch-Ua":
                        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Source: "web",
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                },
            },
        );

        if (response.data && response.data.success) {
            return response.data.data;
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "获取推特聪明钱共振信号失败",
        );
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        if (error.response) {
            throw new ApiError(
                error.response.status,
                `上游API异常: ${error.response.data?.message || error.message}`,
            );
        } else if (error.request) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                "上游API服务不可用",
            );
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `请求上游API失败: ${error.message}`,
        );
    }
};

/**
 * 获取KOL/VC盈亏排行榜数据
 * @param {string} chain_name - 区块链名称 (all, sol, eth, base, bsc)
 * @returns {Promise<Object>}
 */
const getKolVcTopList = async (chain_name = "sol") => {
    try {
        const response = await axios.get(
            `${GATE_API.ON_CHAIN_URL}/kol_vc/top_list`,
            {
                params: { chain_name },
                timeout: GATE_API.TIMEOUT,
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    Referer:
                        "https://www.gate.com/zh/crypto-market-data/onchain/kol-vc",
                    "Sec-Ch-Ua":
                        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Source: "web",
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                },
            },
        );

        if (response.data && response.data.success) {
            return response.data.data;
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "获取KOL/VC排行榜数据失败",
        );
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        if (error.response) {
            throw new ApiError(
                error.response.status,
                `上游API异常: ${error.response.data?.message || error.message}`,
            );
        } else if (error.request) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                "上游API服务不可用",
            );
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `请求上游API失败: ${error.message}`,
        );
    }
};

/**
 * 获取24小时KOL/VC买卖量数据
 * @param {string} chain_name - 区块链名称 (all, sol, eth, base, bsc)
 * @returns {Promise<Object>}
 */
const get24hTradeVolume = async (chain_name = "all") => {
    try {
        const response = await axios.get(
            `${GATE_API.ON_CHAIN_URL}/24h_trade_volume`,
            {
                params: {
                    chain_name,
                    wallet_label: "kol_vc",
                },
                timeout: GATE_API.TIMEOUT,
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    Referer:
                        "https://www.gate.com/zh/crypto-market-data/onchain/kol-vc",
                    "Sec-Ch-Ua":
                        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Source: "web",
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                },
            },
        );

        if (response.data && response.data.success) {
            return response.data.data;
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "获取24小时买卖量数据失败",
        );
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        if (error.response) {
            throw new ApiError(
                error.response.status,
                `上游API异常: ${error.response.data?.message || error.message}`,
            );
        } else if (error.request) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                "上游API服务不可用",
            );
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `请求上游API失败: ${error.message}`,
        );
    }
};

/**
 * 获取KOL/VC 30日盈亏分布数据
 * @param {string} chain_name - 区块链名称 (all, sol, eth, base, bsc)
 * @returns {Promise<Array>}
 */
const get30DayProfitDistribution = async (chain_name = "all") => {
    try {
        const response = await axios.get(
            `${GATE_API.ON_CHAIN_URL}/30d_profit_distribution`,
            {
                params: {
                    chain_name,
                    wallet_label: "kol_vc",
                },
                timeout: GATE_API.TIMEOUT,
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    Referer:
                        "https://www.gate.com/zh/crypto-market-data/onchain/kol-vc",
                    "Sec-Ch-Ua":
                        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Source: "web",
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                },
            },
        );

        if (response.data && response.data.success) {
            return response.data.data;
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "获取30日盈亏数据失败",
        );
    } catch (error) {
        if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
        if (error.response) {
            throw new ApiError(
                error.response.status,
                `上游API异常: ${error.response.data?.message || error.message}`,
            );
        } else if (error.request) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                "上游API服务不可用",
            );
        }
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `请求上游API失败: ${error.message}`,
        );
    }
};

module.exports = {
    getKolVcHoldings,
    getTwitterResonanceSignal,
    getKolVcTopList,
    get24hTradeVolume,
    get30DayProfitDistribution,
};
