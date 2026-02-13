/**
 * 无限网格策略（现货版本）
 * 基于 umInfiniteGrid.js 适配现货交易
 * 支持策略模式、工厂模式等设计模式
 */

const path = require("path");
const dayjs = require("dayjs");
const bigNumber = require("bignumber.js");
const { getProxyConfig } = require("../utils/proxy.js");
const UtilRecord = require("../utils/record-log.js");
const StrategyLog = require("../utils/strategy-log.js");
const { MainClient } = require("binance");
const db = require("../models");
const execution_status = require("../constants/grid-strategy-status-map");

/**
 * 无限网格策略 - 现货版本
 *
 * @param {Object} options - 策略配置参数
 * @param {string} options.trading_pair - 交易对，例如`BTCUSDT`
 * @param {string} options.api_key - 币安API Key
 * @param {string} options.api_secret - 币安API Secret
 * @param {number} [options.base_asset_balance=0] - 基础资产初始余额（如BTC）
 * @param {number} [options.quote_asset_balance=0] - 计价资产初始余额（如USDT）
 * @param {number} [options.max_open_position_quantity] - 限制的最大基础资产持有数量
 * @param {number} [options.min_open_position_quantity] - 限制的最少基础资产持有数量
 * @param {number} options.grid_price_difference - 网格之间的价格差价
 * @param {number} [options.grid_trade_quantity] - 网格每次交易的数量（向后兼容，当没有设置分离数量时使用）
 * @param {number} [options.grid_long_open_quantity] - 现货开仓数量：每次买入基础资产的数量
 * @param {number} [options.grid_long_close_quantity] - 现货平仓数量：每次卖出基础资产的数量
 * @param {number} [options.fall_prevention_coefficient=0] - 防跌系数
 * @param {number} [options.gt_limitation_price] - 大于等于某价格时暂停网格
 * @param {number} [options.lt_limitation_price] - 小于等于某价格时暂停网格
 * @param {boolean} [options.is_above_open_price=false] - 是否开启"当价格大于等于开仓价格时则暂停网格"
 * @param {boolean} [options.is_below_open_price=false] - 是否开启"当价格低于等于开仓价格时则暂停网格"
 * @param {number} [options.polling_interval=10000] - 获得最新价格的轮询间隔时间，单位：毫秒
 * @param {boolean} [options.enable_log=true] - 是否启用日志输出，默认为true
 * @param {boolean} [options.priority_close_on_trend=false] - 允许'顺势仅减仓策略'：当网格仓位记录为空但实际持有仓位时，在上涨趋势中优先执行卖出而不创建新买入仓位
 */
function InfiniteGridSpot(options) {
    if (!new.target) {
        return new InfiniteGridSpot(options);
    }

    const default_options = {
        /** 由GridStrategyService生成并传入的策略ID */
        id: "",

        /** 必填，交易对 */
        trading_pair: `BTCUSDT`,

        /** 必填，币安API Key */
        api_key: ``,

        /** 必填，币安API Secret */
        api_secret: ``,

        /**
         * 基础资产初始余额（如BTC）
         * 现货交易需要同时管理基础资产和计价资产的余额
         */
        base_asset_balance: 0,

        /**
         * 计价资产初始余额（如USDT）
         */
        quote_asset_balance: 0,

        /** 限制的最大基础资产持有数量 eg: 1个BTC */
        max_open_position_quantity: undefined,

        /** 限制的最少基础资产持有数量 eg: 0.1个BTC */
        min_open_position_quantity: undefined,

        /** 必填，网格之间的价格差价 */
        grid_price_difference: undefined,

        /** 网格每次交易的数量（向后兼容，当没有设置分离数量时使用） */
        grid_trade_quantity: undefined,

        /** 现货开仓数量：每次买入基础资产的数量 */
        grid_long_open_quantity: undefined,

        /** 现货平仓数量：每次卖出基础资产的数量 */
        grid_long_close_quantity: undefined,

        /** 防跌系数：系数越大，价格变动时的触发价格会下放的更低，为0时固定使用网格差价 */
        fall_prevention_coefficient: 0,

        /** 大于等于某价格时暂停网格 */
        gt_limitation_price: undefined,

        /** 小于等于某价格时暂停网格 */
        lt_limitation_price: undefined,

        /** 是否开启"当价格大于等于开仓价格时则暂停网格" */
        is_above_open_price: false,

        /** 是否开启"当价格低于等于开仓价格时则暂停网格" */
        is_below_open_price: false,

        /**
         * 获得最新价格的轮询间隔时间，单位：毫秒
         * 内部关于限制轮询频率的逻辑, 避免频繁下单
         * 设为0则不限制, 回测用
         */
        polling_interval: 10000,

        /** 是否启用日志输出，默认为 true */
        enable_log: true,

        /** 允许'顺势仅减仓策略'：当网格仓位记录为空但实际持有仓位时，在上涨趋势中优先执行卖出而不创建新买入仓位 */
        priority_close_on_trend: true,

        /** 计算平均成本价的默认天数 */
        avg_cost_price_days: 30,
    };

    if (!options.grid_price_difference) {
        console.error(`❗️ 必填项'grid_price_difference'不能为空`);
        return;
    }

    // 检查交易数量配置的有效性
    const hasGridTradeQuantity =
        options.grid_trade_quantity && options.grid_trade_quantity > 0;
    const hasSeparateQuantities =
        options.grid_long_open_quantity &&
        options.grid_long_open_quantity > 0 &&
        options.grid_long_close_quantity &&
        options.grid_long_close_quantity > 0;

    if (!hasGridTradeQuantity && !hasSeparateQuantities) {
        console.error(
            `❗️ 必须配置 'grid_trade_quantity' 或者同时配置 'grid_long_open_quantity' 和 'grid_long_close_quantity'，且值必须大于0`,
        );
        return;
    }

    this.config = { ...default_options, ...options };

    /** 策略日志记录器 */
    this.logger = StrategyLog.createLogger({
        symbol: this.config.trading_pair,
        apiKey: this.config.api_key,
        market: "spot",
        direction: "long",
    });

    /**
     * 启用日志输出
     */
    this.enableLog = () => {
        this.logger.enabled = true;
        this.logger.log(" 日志输出已启用");
    };

    /**
     * 禁用日志输出
     */
    this.disableLog = () => {
        this.logger.enabled = false;
    };

    // 如果禁用日志输出，则将 logger 设置为禁用状态
    if (!this.config.enable_log) this.disableLog();

    if (!this.config.api_key || !this.config.api_secret) {
        this.logger.error(`❗️ 必填项'api_key'和'api_secret'不能为空`);
        return;
    }

    /** 当前网格是否暂停(用户手动暂停当前网格), 暂停权重1(最高) */
    this.paused = false;

    /** 当前网格是否暂停(业务逻辑自动判断进行设定的暂停与否), 暂停权重2 */
    this.auto_paused = true;

    /** 初始化状态 */
    this.init_status = false;

    /** 当前基础资产持有数量（如BTC数量） */
    this.current_base_asset_quantity = 0;

    /** 当前计价资产余额（如USDT余额） */
    this.current_quote_asset_balance = 0;

    /** 当前平均持仓成本价格 */
    this.total_open_position_entry_price = 0;

    /** 期望下次涨至某价格 */
    this.next_expected_rise_price = null;

    /** 期望下次跌至某价格 */
    this.next_expected_fall_price = null;

    /** 仓位记录，日志记录 */
    this.logs = [];

    /** 建仓记录/持仓记录, 剩余未匹配平仓的订单（与期货策略保持一致的命名） */
    this.position_open_history = [];

    /** 查询次数计数器 */
    this.count = 0;

    /** 配合 polling_interval 进行轮询操作, 为true则禁止通行 */
    this.throttle_enabled = false;

    /** 账户信息重试间隔时间 */
    this.account_info_retry_interval = 5000;

    /** 订单操作锁：防止异步竞态导致重复买入或卖出。'idle': 空闲, 'buying': 买入中, 'selling': 卖出中 */
    this.order_options = { lock: "idle" };

    /** 账户信息 */
    this.account_info = {};

    /** 当前交易对余额信息 */
    this.balance_info = {};

    let mainClientConfig = {};
    if (process.env.NODE_ENV !== "production") {
        const proxyConfig = getProxyConfig();
        if (proxyConfig) {
            mainClientConfig.proxy = proxyConfig;
        }
    }

    /** 调用binance生成的客户端（现货） */
    this.client = new MainClient(
        {
            api_key: this.config.api_key,
            api_secret: this.config.api_secret,
        },
        mainClientConfig,
    );

    /** 交易所信息缓存 */
    this.exchange_info = null;

    /**
     * 获取交易所信息(三级缓存:内存→数据库→API)
     * @returns {Promise<Object>} 交易所信息对象
     */
    this.getExchangeInfo = async () => {
        // 第一级:检查内存缓存
        if (
            this.exchange_info &&
            this.exchange_info.symbols &&
            this.exchange_info.symbols.length > 0
        ) {
            this.logger.debug(
                `从内存缓存获取交易所信息(${this.exchange_info.symbols.length}个交易对)`,
            );
            return this.exchange_info;
        }

        try {
            // 第二级:检查数据库缓存
            const dbRecord = await db.binance_exchange_info.getLatest();
            if (dbRecord && dbRecord.exchange_info) {
                try {
                    const exchangeInfo = JSON.parse(dbRecord.exchange_info);
                    if (
                        exchangeInfo &&
                        exchangeInfo.symbols &&
                        exchangeInfo.symbols.length > 0
                    ) {
                        this.exchange_info = exchangeInfo;
                        this.logger.debug(
                            `从数据库缓存获取交易所信息(${exchangeInfo.symbols.length}个交易对)`,
                        );

                        // 检查是否需要后台更新(超过1天)
                        const needsUpdate =
                            await db.binance_exchange_info.needsUpdate();
                        if (needsUpdate) {
                            this.logger.debug(
                                `数据库缓存已过期,启动后台更新任务`,
                            );
                            this.updateExchangeInfoInBackground();
                        }

                        return this.exchange_info;
                    }
                } catch (parseError) {
                    this.logger.warn(
                        `解析数据库中的交易所信息失败:`,
                        parseError?.message,
                    );
                }
            }

            // 第三级:从API获取
            this.logger.debug(
                `内存和数据库均无有效缓存,从币安API获取交易所信息`,
            );
            const exchangeInfo = await this.fetchExchangeInfoFromAPI();

            if (
                exchangeInfo &&
                exchangeInfo.symbols &&
                exchangeInfo.symbols.length > 0
            ) {
                // 更新内存缓存
                this.exchange_info = exchangeInfo;

                // 更新数据库缓存(异步,不阻塞主流程)
                this.saveExchangeInfoToDB(exchangeInfo).catch((err) => {
                    this.logger.warn(
                        `保存交易所信息到数据库失败:`,
                        err?.message,
                    );
                });

                return this.exchange_info;
            }

            // 所有方式都失败,返回空结构
            this.logger.error(`无法通过任何方式获取交易所信息`);
            this.exchange_info = { symbols: [] };
            return this.exchange_info;
        } catch (error) {
            this.logger.error(`获取交易所信息过程出错:`, error);
            this.exchange_info = { symbols: [] };
            return this.exchange_info;
        }
    };

    /**
     * 从币安API获取交易所信息(带重试机制)
     * @returns {Promise<Object>} 交易所信息对象
     */
    this.fetchExchangeInfoFromAPI = async () => {
        const maxRetries = 3;
        const retryDelay = 2000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    this.logger.debug(
                        `第 ${attempt} 次尝试从API获取交易所信息...`,
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, retryDelay),
                    );
                }

                const exchangeInfo = await this.client.getExchangeInfo();

                if (
                    !exchangeInfo ||
                    !exchangeInfo.symbols ||
                    exchangeInfo.symbols.length === 0
                ) {
                    throw new Error("API返回的交易所信息为空或格式异常");
                }

                this.logger.debug(
                    `成功从API获取交易所信息(${exchangeInfo.symbols.length}个交易对)`,
                );
                return exchangeInfo;
            } catch (error) {
                if (attempt === maxRetries) {
                    this.logger.error(
                        `从API获取交易所信息失败(已重试${maxRetries}次):`,
                        error,
                    );
                    throw error;
                }
                this.logger.warn(
                    `从API获取交易所信息失败(第${attempt}次尝试):`,
                    error?.message || error,
                );
            }
        }
    };

    /**
     * 保存交易所信息到数据库
     * @param {Object} exchangeInfo 交易所信息对象
     */
    this.saveExchangeInfoToDB = async (exchangeInfo) => {
        try {
            await db.binance_exchange_info.create({
                exchange_info: JSON.stringify(exchangeInfo),
                market_type: "spot",
            });
            this.logger.debug(`交易所信息已保存到数据库`);
        } catch (error) {
            this.logger.error(`保存交易所信息到数据库失败:`, error);
            throw error;
        }
    };

    /**
     * 后台更新交易所信息(不阻塞主流程)
     */
    this.updateExchangeInfoInBackground = () => {
        setTimeout(async () => {
            try {
                this.logger.debug(`开始后台更新交易所信息`);
                const exchangeInfo = await this.fetchExchangeInfoFromAPI();

                if (
                    exchangeInfo &&
                    exchangeInfo.symbols &&
                    exchangeInfo.symbols.length > 0
                ) {
                    // 更新内存缓存
                    this.exchange_info = exchangeInfo;

                    // 更新数据库缓存
                    await this.saveExchangeInfoToDB(exchangeInfo);
                    this.logger.debug(`后台更新交易所信息完成`);
                }
            } catch (error) {
                this.logger.warn(`后台更新交易所信息失败:`, error?.message);
            }
        }, 5000); // 延迟5秒执行,避免影响主流程
    };

    /**
     * 调整订单数量精度
     * @param {Number|String} quantity 原始数量
     * @returns {Promise<String>} 调整后的数量
     */
    this.adjustQuantity = async (quantity) => {
        try {
            const exchangeInfo = await this.getExchangeInfo();
            const binancePrecision = require("../utils/binance-precision");
            return binancePrecision.smartAdjustQuantity(
                exchangeInfo,
                this.config.trading_pair,
                quantity.toString(),
            );
        } catch (error) {
            this.logger.error("调整数量精度失败:", error);
            // 回退到默认的精度处理
            return new bigNumber(quantity).toFixed(8);
        }
    };

    /**
     * 更新策略执行状态到数据库
     * @param {string} newStatus - 新的执行状态
     */
    this.updateExecutionStatus = async (newStatus) => {
        try {
            await db.grid_strategies.update(
                { execution_status: newStatus },
                { where: { id: this.config.id } },
            );
            this.logger.debug(`策略执行状态已更新为: ${newStatus}`);
        } catch (error) {
            this.logger.error(`更新策略执行状态失败:`, error);
        }
    };

    /**
     * 获取账户信息（现货账户）
     */
    this.getAccountInfo = async () => {
        try {
            const account_info = await this.client.getAccountInformation();
            return account_info;
        } catch (error) {
            this.logger.error("获取现货账户信息失败:", error);
            throw error;
        }
    };

    /**
     * 解析交易对符号
     * @param {String} symbol 交易对符号，如 'BTCUSDT'
     * @returns {Array} [base_asset, quote_asset]
     */
    this.parseSymbol = (symbol) => {
        const quote_assets = ["USDT", "BUSD", "USDC", "BTC", "ETH", "BNB"];

        for (let quote of quote_assets) {
            if (symbol.endsWith(quote)) {
                const base = symbol.slice(0, -quote.length);
                return [base, quote];
            }
        }

        return [symbol.slice(0, 3), symbol.slice(3)];
    };

    /**
     * 初始化账户信息与余额信息
     */
    this.initAccountInfo = async () => {
        try {
            const account_info = await this.getAccountInfo();
            this.account_info = account_info;

            const [base_asset, quote_asset] = this.parseSymbol(
                this.config.trading_pair,
            );
            const base_balance = account_info.balances.find(
                (b) => b.asset === base_asset,
            );
            const quote_balance = account_info.balances.find(
                (b) => b.asset === quote_asset,
            );

            this.balance_info = {
                base_asset,
                quote_asset,
                base_balance: base_balance ? Number(base_balance.free) : 0,
                quote_balance: quote_balance ? Number(quote_balance.free) : 0,
            };

            this.current_base_asset_quantity = this.balance_info.base_balance;
            this.current_quote_asset_balance = this.balance_info.quote_balance;
            this.account_info_retry_interval = 5000;
            this.last_account_info_update = Date.now();
        } catch (error) {
            this.logger.error(`账户信息获取异常`, error);

            if (typeof this.onWarn === "function") {
                this.onWarn({
                    id: this.config.id,
                    message: "初始化账户信息失败",
                    error: error,
                });
            }

            setTimeout(
                async () => {
                    await this.initAccountInfo();
                },
                (this.account_info_retry_interval += 1000),
            );
        }
    };

    /**
     * 获取指定交易对在特定时间范围内的平均持仓成本。
     * - 注意：此方法通过计算历史买入订单的加权平均价得出，并未考虑卖出订单。
     * @param {string} symbol - 交易对, 例如 'BTCUSDT'
     * @param {number} [days] - 可选参数。计算最近N天的平均成本。如果未提供，则使用 this.config.avg_cost_price_days 作为默认值。
     * @returns {Promise<number|null>} - 返回平均成本价, 如果没有买入记录或发生错误则返回 null
     */
    this.getAverageCostPrice = async (symbol, days) => {
        const daysToCalculate =
            days === null || days === undefined
                ? this.config.avg_cost_price_days
                : days;

        // 1. 参数校验
        if (typeof symbol !== "string" || !symbol) {
            this.logger.error("错误：symbol 参数必须是一个非空的字符串。");
            return null;
        }
        if (
            daysToCalculate !== null &&
            (typeof daysToCalculate !== "number" || daysToCalculate < 0)
        ) {
            this.logger.error("错误：days 参数必须是一个非负数。");
            return null;
        }

        try {
            const params = {
                symbol: symbol,
                // 币安接口的 limit 最大值为 1000
                limit: 1000,
            };

            // 如果指定了有效的天数，则计算开始时间
            if (daysToCalculate && daysToCalculate > 0) {
                const startTime = new Date();
                startTime.setDate(startTime.getDate() - daysToCalculate);
                params.startTime = startTime.getTime();
            }

            // 获取该交易对的历史成交记录
            // 重要提示：币安API单次最多返回1000条记录。
            // 如果指定时间范围内的交易超过1000条，此函数仅基于最近的1000条计算。
            // 若需完全精确，需要实现分页逻辑来获取所有交易。
            const trades = await this.client.getAccountTradeList(params);

            // 2. API响应校验
            if (!Array.isArray(trades)) {
                this.logger.error("错误：从API获取的交易数据格式不正确。");
                return null;
            }

            let totalCost = 0; // 总花费
            let totalQty = 0; // 总数量

            // 遍历所有买入交易
            for (const trade of trades) {
                // 3. 数据健壮性校验
                if (
                    trade &&
                    trade.isBuyer &&
                    trade.quoteQty &&
                    !isNaN(parseFloat(String(trade.quoteQty))) &&
                    trade.qty &&
                    !isNaN(parseFloat(String(trade.qty))) &&
                    parseFloat(String(trade.qty)) > 0
                ) {
                    totalCost += parseFloat(String(trade.quoteQty));
                    totalQty += parseFloat(String(trade.qty));
                }
            }

            // 如果没有有效的买入记录，成本为0
            if (totalQty === 0) {
                this.logger.log(
                    `在指定的时间范围内没有找到 ${symbol} 的有效买入记录。`,
                );
                return 0;
            }

            // 计算加权平均成本
            const averageCost = totalCost / totalQty;
            return averageCost;
        } catch (error) {
            this.logger.error(`获取 ${symbol} 平均成本价时出错:`, error);
            // 可以在这里向上层抛出错误或根据需要处理
            return null;
        }
    };

    /**
     * 重置期望价格, 通过防跌系数计算出预期价格(即下一次可以建仓的价格)
     * @param {Number|String} execution_price 成交价格
     */
    this.resetTargetPrice = (execution_price) => {
        if (!execution_price || !this.config.grid_price_difference) {
            this.logger.warn(
                `重置期望价格失败，execution_price: ${execution_price}, grid_price_difference: ${this.config.grid_price_difference}`,
            );
            return;
        }

        // 现货网格：低买高卖策略
        this.next_expected_rise_price = bigNumber(execution_price)
            .plus(this.config.grid_price_difference)
            .toNumber();

        // 应用防跌系数
        let coefficient = bigNumber(this.config.grid_price_difference)
            .times(
                bigNumber(this.current_base_asset_quantity).div(
                    this.config.max_open_position_quantity ||
                        this.current_base_asset_quantity + 1,
                ),
            )
            .times(this.config.fall_prevention_coefficient);
        coefficient = coefficient.isNaN() ? bigNumber(0) : coefficient;

        this.next_expected_fall_price = bigNumber(execution_price)
            .minus(this.config.grid_price_difference)
            .minus(coefficient)
            .toNumber();
    };

    /**
     * 事件监听: 当触发订单操作时
     * @param {string} type 事件类型
     * @param {Function} callback 回调函数
     */
    this.on = (type, callback) => {
        if (typeof callback !== "function") return;
        switch (type.toLowerCase()) {
            case "onWarn":
            case "warn":
                this.onWarn = callback;
                break;
            case "onOpenPosition":
            case "openPosition":
                this.onOpenPosition = callback;
                break;
            case "onClosePosition":
            case "closePosition":
                this.onClosePosition = callback;
                break;
            default:
                this.logger.warn(`未知的事件类型 "${type}"`);
        }
    };

    /**
     * 处理平仓操作的错误
     * 根据不同的错误码执行相应的恢复逻辑
     * @param {Object} error 错误对象
     * @returns {boolean} 是否已处理该错误（true表示已处理，调用方可跳过后续逻辑）
     */
    this.handleCloseOrderError = (error) => {
        const errorCode = error?.code;
        if (!errorCode) return false;

        switch (errorCode) {
            // -2010: 账户余额不足，说明实际没有足够的币可平仓（可能被手动卖出了）
            case -2010:
                this.logger.warn(
                    `检测到仓位已被手动平仓（错误码-2010），清空开仓历史记录并重新初始化`,
                );
                this.position_open_history = [];
                this.current_base_asset_quantity = 0;
                this.next_expected_rise_price = undefined;
                this.next_expected_fall_price = undefined;
                return true;

            // 可在此处扩展其他错误码的处理逻辑
            // case -xxxx:
            //   UtilRecord.log(`⚠️ 处理错误码 -xxxx`);
            //   return true;

            default:
                return false;
        }
    };

    /**
     * 解析object数据为快捷可读的数据
     * @param {Object} datum 无法确认类型和内容的object数据
     */
    this.getParseDatum = (datum) => {
        let data = datum;
        if (typeof datum === "string") {
            data = JSON.parse(datum);
        }
        return data;
    };

    /**
     * 获取现货开仓数量（买入基础资产的数量）
     * 优先使用 grid_long_open_quantity，如果没有则使用 grid_trade_quantity
     * @returns {number} 现货开仓数量
     */
    this.getLongOpenQuantity = () => {
        return (
            this.config.grid_long_open_quantity ||
            this.config.grid_trade_quantity
        );
    };

    /**
     * 获取现货平仓数量（卖出基础资产的数量）
     * 优先使用 grid_long_close_quantity，如果没有则使用 grid_trade_quantity
     * @returns {number} 现货平仓数量
     */
    this.getLongCloseQuantity = () => {
        return (
            this.config.grid_long_close_quantity ||
            this.config.grid_trade_quantity
        );
    };

    /**
     * 调用卖出操作（卖出基础资产，获得计价资产）
     * @param {Number|String} quantity 卖出数量
     */
    this.sellOrder = async (quantity) => {
        const adjusted_quantity = await this.adjustQuantity(quantity);
        return this.client.submitNewOrder({
            symbol: this.config.trading_pair,
            side: "SELL",
            type: "MARKET",
            quantity: Number(adjusted_quantity),
        });
    };

    /**
     * 调用买入操作（买入基础资产，消耗计价资产）
     * @param {Number|String} quantity 买入数量
     */
    this.buyOrder = async (quantity) => {
        const adjusted_quantity = await this.adjustQuantity(quantity);
        return this.client.submitNewOrder({
            symbol: this.config.trading_pair,
            side: "BUY",
            type: "MARKET",
            quantity: Number(adjusted_quantity),
        });
    };

    /**
     * 查询订单详情，最多重试3次，超过后通过持仓推断订单结果
     * @param {Number|String} orderId 订单ID
     * @param {Number} prePositionQty 订单前持仓数量
     * @param {Number} orderQty 订单数量
     * @param {String} orderType 订单类型 'buy' | 'sell'
     * @returns {Promise<Object|null>} 订单详情，失败返回null
     */
    this.queryOrder = async (orderId, prePositionQty, orderQty, orderType) => {
        if (!orderId) return null;

        const MAX_RETRY = 3;
        for (let i = 0; i <= MAX_RETRY; i++) {
            this.logger.log(`🔍 查询订单详情 (重试${i + 1}/${MAX_RETRY})`);
            try {
                let res = await this.client.getOrder({
                    symbol: this.config.trading_pair,
                    orderId: Number(orderId),
                });
                this.logger.order("query", res);
                return res;
            } catch (error) {
                this.logger.error(
                    `查询订单详情失败 (重试${i + 1}/${MAX_RETRY})`,
                    error,
                );
                if (i < MAX_RETRY)
                    await new Promise((r) => setTimeout(r, 10000));
            }
        }

        // 超过最大重试次数，启用持仓推断机制
        this.logger.warn(`超过最大重试次数，启用持仓推断机制`);
        await this.initAccountInfo().catch(() => {});
        const expectedQty =
            orderType === "buy"
                ? bigNumber(prePositionQty).plus(orderQty).toNumber()
                : bigNumber(prePositionQty).minus(orderQty).toNumber();
        const isSuccess =
            Math.abs(this.current_base_asset_quantity - expectedQty) <=
            bigNumber(orderQty).times(0.001).toNumber();
        this.logger.log(
            `📊 持仓推断: 订单前=${prePositionQty}, 预期=${expectedQty}, 当前=${this.current_base_asset_quantity}, 推断${isSuccess ? "成功" : "失败"}`,
        );
        if (typeof this.onWarn === "function") {
            this.onWarn({
                id: this.config.id,
                message: `订单查询失败，通过持仓推断${isSuccess ? "成功" : "失败"}`,
            });
        }
        return isSuccess
            ? {
                  orderId,
                  cummulativeQuoteQty: String(
                      bigNumber(this.latestPrice || 0).times(orderQty),
                  ),
                  executedQty: String(orderQty),
                  status: "INFERRED",
              }
            : null;
    };

    /**
     * 创建仓位（开仓）
     * @param {*} quantity 开仓数量
     */
    this.openOrders = async (quantity) => {
        if (this.order_options.lock !== "idle") {
            this.logger.warn(
                `订单操作进行中(${this.order_options.lock})，跳过本次开仓请求`,
            );
            return;
        }
        this.order_options.lock = "opening";
        const prePositionQty = this.current_base_asset_quantity;

        let result = null;
        try {
            const res = await this.buyOrder(quantity);
            this.logger.order("create", res);
            result = this.getParseDatum(res);
        } catch (error) {
            this.logger.error(`创建仓位失败`, error);
            if (typeof this.onWarn === "function")
                this.onWarn({
                    id: this.config.id,
                    message: "创建仓位失败",
                    error,
                });
        }
        this.initAccountInfo().catch(() => {});
        if (!result) {
            this.order_options.lock = "idle";
            return;
        }

        const orderDetail = await this.queryOrder(
            result.orderId,
            prePositionQty,
            quantity,
            "buy",
        );
        if (!orderDetail) {
            this.logger.warn(`创建仓位后，无法查询订单详情`);
            this.order_options.lock = "idle";
            return;
        }

        const executionPrice =
            Number(orderDetail.cummulativeQuoteQty) /
            Number(orderDetail.executedQty);
        this.logs.push(orderDetail);
        this.position_open_history.push(orderDetail);
        if (typeof this.onOpenPosition === "function")
            this.onOpenPosition({ id: this.config.id, ...orderDetail });
        this.logger.log(`🎉 建仓成功`);
        this.total_open_position_entry_price = await this.getAverageCostPrice(
            this.config.trading_pair,
        );
        this.resetTargetPrice(executionPrice);
        this.order_options.lock = "idle";
    };

    /**
     * 平掉仓位（平仓）
     * @param {*} quantity 平仓数量
     */
    this.closeOrders = async (quantity) => {
        if (this.order_options.lock !== "idle") {
            this.logger.warn(
                `订单操作进行中(${this.order_options.lock})，跳过本次平仓请求`,
            );
            return;
        }
        this.order_options.lock = "closing";
        const prePositionQty = this.current_base_asset_quantity;

        let result = null;
        try {
            const res = await this.sellOrder(quantity);
            this.logger.order("close", res);
            result = this.getParseDatum(res);
        } catch (error) {
            this.logger.error(`平仓失败`, error);
            if (typeof this.onWarn === "function")
                this.onWarn({ id: this.config.id, message: "平仓失败", error });
            this.handleCloseOrderError(error);
        }
        this.initAccountInfo().catch(() => {});
        if (!result) {
            this.order_options.lock = "idle";
            return;
        }

        const orderDetail = await this.queryOrder(
            result.orderId,
            prePositionQty,
            quantity,
            "sell",
        );
        if (!orderDetail) {
            this.logger.warn(`平仓后，无法查询订单详情`);
            this.order_options.lock = "idle";
            return;
        }

        const executionPrice =
            Number(orderDetail.cummulativeQuoteQty) /
            Number(orderDetail.executedQty);
        this.logs.push(orderDetail);
        if (this.position_open_history.length > 0)
            this.position_open_history.pop();
        if (typeof this.onClosePosition === "function")
            this.onClosePosition({ id: this.config.id, ...orderDetail });
        this.logger.log(`🎉 平仓成功`);
        this.total_open_position_entry_price = await this.getAverageCostPrice(
            this.config.trading_pair,
        );
        this.resetTargetPrice(executionPrice);
        this.order_options.lock = "idle";
    };

    /**
     * 计算总资产价值（以计价资产计算）
     * @param {Number} currentPrice 当前价格
     * @returns {Number} 总资产价值
     */
    this.getTotalAssetValue = (currentPrice) => {
        return bigNumber(this.current_base_asset_quantity)
            .times(currentPrice)
            .plus(this.current_quote_asset_balance)
            .toNumber();
    };

    /**
     * 当前每网格匹配成功所得利润
     * @returns {number} 每个网格匹配成功的实际利润
     */
    this.getGridProfit = (latestPrice) => {
        let buyQuantity = this.getLongOpenQuantity(); // 买入基础资产数量
        let sellQuantity = this.getLongCloseQuantity(); // 卖出基础资产数量
        let buyValue = bigNumber(latestPrice)
            .minus(this.config.grid_price_difference)
            .times(buyQuantity);
        let sellValue = bigNumber(latestPrice).times(sellQuantity);
        let buyFee = buyValue.times(0.001);
        let sellFee = sellValue.times(0.001);
        let actualProfit = sellValue
            .minus(buyValue)
            .minus(buyFee)
            .minus(sellFee);
        return actualProfit.toNumber();
    };

    /**
     * 获取上一个卖出的订单信息
     * @returns {Object|null} 上一个卖出的订单详情，如果没有找到则返回 null
     */
    this.getLastSellOrder = () => {
        for (let i = this.logs.length - 1; i >= 0; i--) {
            const order = this.logs[i];
            if (order.side === "SELL") {
                return order;
            }
        }
        return null;
    };

    /**
     * 主流程函数 - 现货网格交易核心逻辑
     * @param {Object} data - 包含最新价格信息的对象
     * @param {number} data.latestPrice - 最新的市场价格
     */
    this.gridWebsocket = async ({ latestPrice }) => {
        if (!latestPrice) {
            this.logger.error(
                `InfiniteGridSpot gridWebsocket latestPrice error: `,
                latestPrice,
            );
            return;
        }

        if (!this.init_status || !this.account_info?.balances) {
            this.logger.warn(`⚠️ 初始化函数还未完成, 请稍等...`);
            return;
        }

        this.latestPrice = latestPrice;

        if (this.paused || this.auto_paused) {
            this.logger.log(`⛔️ 根据用户要求, 将网格暂停`);
            return;
        }

        let { lt_limitation_price, gt_limitation_price } = this.config;
        if (
            Number.isFinite(lt_limitation_price) &&
            latestPrice <= lt_limitation_price
        ) {
            this.logger.log(`⛔️ 币价小于等于限制价格，暂停网格`);
            await this.onPausedGrid(execution_status.PRICE_BELOW_MIN);
        } else if (
            Number.isFinite(gt_limitation_price) &&
            latestPrice >= gt_limitation_price
        ) {
            this.logger.log(`⛔️ 币价大于等于限制价格，暂停网格`);
            await this.onPausedGrid(execution_status.PRICE_ABOVE_MAX);
        } else {
            await this.onContinueGrid();
        }

        // TODO
        // 现货需要获得 平均开仓价格, 才能执行这步判定
        // if (latestPrice >= this.tradingPairInfo.entryPrice && this.config.is_above_open_price) {
        //   UtilRecord.log(`⛔️ 币价${latestPrice} 大于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
        //   this.onPausedGrid();
        // }
        // else if (latestPrice <= this.tradingPairInfo.entryPrice && this.config.is_below_open_price) {
        //   UtilRecord.log(`⛔️ 币价${latestPrice} 小于等于开仓价格${this.tradingPairInfo.entryPrice}，暂停网格`);
        //   this.onPausedGrid();
        // }
        // else {
        //   // 网格处于 正常的状态(没有暂停), 则可以 继续网格.
        //   // 主要是需要兼容 ltLimitationPrice, gtLimitationPrice 的情况.
        //   if (!this.paused) this.onContinueGrid();
        // }

        if (this.paused || this.auto_paused) {
            this.logger.log(`⛔️ 因不满足本交易对的配置要求, 网格已暂停`);
            return;
        }

        if (this.throttle_enabled) return;
        if (this.config.polling_interval) {
            this.throttle_enabled = true;
            setTimeout(
                () => (this.throttle_enabled = false),
                this.config.polling_interval,
            );
        }

        // 假设没有仓位时：
        //  - 初始化账户信息与仓位信息；
        if (
            !this.current_base_asset_quantity ||
            !this.position_open_history?.length
        ) {
            this.logger.warn(
                `⚠️ 当前已没有仓位信息，重新初始化账户信息与仓位信息用以同步最新数据`,
            );
            this.logger.warn(
                `⚠️ this.current_base_asset_quantity`,
                this.current_base_asset_quantity,
            );
            this.logger.warn(
                `⚠️ this.position_open_history`,
                this.position_open_history,
            );
            await this.initAccountInfo().catch(() => {});
        }

        // 定期刷新账户信息，避免手动转入资金后无法及时更新余额的问题
        // 每100次轮询或超过5分钟未更新时强制刷新一次
        if (
            this.count % 100 === 0 ||
            !this.last_account_info_update ||
            Date.now() - this.last_account_info_update > 300000
        ) {
            this.logger.log(`🔄 定期刷新账户信息以同步最新余额`);
            await this.initAccountInfo().catch(() => {});
        }

        this.logger.log(`----- ${dayjs().format("YYYY-MM-DD HH:mm:ss")} -----`);
        this.logger.log(
            `💰 现货网格, ID:${this.config.id} . 轮询第 ${this.count} 次`,
        );
        this.count += 1;

        let buyQuantity = this.getLongOpenQuantity();
        let sellQuantity = this.getLongCloseQuantity();

        this.logger.log(`当前价格: ${latestPrice}`);
        this.logger.log(
            `近${this.config.avg_cost_price_days}天平均持仓成本: ${this.total_open_position_entry_price}`,
        );

        this.logger.log(
            `每次买入数量: ${buyQuantity}/${this.config.trading_pair}, 每次卖出数量: ${sellQuantity}/${this.config.trading_pair}, 网格价差: ${this.config.grid_price_difference} ${this.balance_info.quoteAsset}, 下次网格匹配利润预计为(扣除0.1%手续费): ${this.getGridProfit(latestPrice)} ${this.balance_info.quoteAsset}`,
        );

        this.logger.log(
            `是否允许'顺势仅减仓策略': ${this.config.priority_close_on_trend}`,
        );
        this.logger.log(
            `期望下次涨至: ${this.next_expected_rise_price}, 期望下次跌至: ${this.next_expected_fall_price}`,
        );
        this.logger.log(`累计已成交 ${this.logs.length} 次`);
        this.logger.log(
            `当前持仓数量为 ${this.current_base_asset_quantity}/${this.config.trading_pair}, 限制最大持仓数量为 ${this.config.max_open_position_quantity}/${this.config.trading_pair}`,
        );
        this.logger.log(`剩余未匹配平仓的订单: `, this.position_open_history);

        // 如果没有期望价格，初始化
        if (
            (!this.next_expected_rise_price ||
                !this.next_expected_fall_price) &&
            this.logs.length
        ) {
            let lastOrder = this.logs[this.logs.length - 1];
            let lastPrice =
                Number(lastOrder.cummulativeQuoteQty) /
                Number(lastOrder.executedQty);
            this.resetTargetPrice(lastPrice);
        }

        // 缓存中没有仓位且没有超过最大持仓数量限制, 创建一个新的仓位;
        // 假设 priorityCloseOnTrend 为true, 则逻辑有微调
        if (
            !this.position_open_history?.length &&
            (this.config.max_open_position_quantity
                ? this.current_base_asset_quantity <
                  this.config.max_open_position_quantity
                : true)
        ) {
            if (
                this.current_quote_asset_balance <
                bigNumber(latestPrice).times(buyQuantity).toNumber()
            ) {
                await this.updateExecutionStatus(
                    execution_status.INSUFFICIENT_BALANCE,
                );
                this.logger.log(`余额不足，无法执行买入操作`);
                return;
            }

            // 检查 priorityCloseOnTrend 配置,
            // 且存在仓位可以卖出,
            // 且当前价格latestPrice 大于等于 this.next_expected_fall_price(即不满足买入条件, 小于预期价格才买入)
            // 时,
            // 不买入
            if (
                this.config.priority_close_on_trend &&
                Number.isFinite(this.next_expected_fall_price) &&
                Number.isFinite(this.total_open_position_entry_price) &&
                this.current_base_asset_quantity >= buyQuantity &&
                latestPrice >= this.next_expected_fall_price &&
                latestPrice >= this.total_open_position_entry_price
            ) {
                // latestPrice >= this.next_expected_fall_price : 代表持续上涨中，不买入
                this.logger.log(
                    `🔄 启用顺势仅减仓策略：当前实际仓位数量为 ${this.current_base_asset_quantity} / ${this.config.trading_pair}， 足够平仓，且当前仍处于上涨趋势，因此跳过创建新仓位`,
                );
            } else {
                this.logger.log(
                    `😎 缓存中没有仓位且没有超过最大持仓数量限制, 增加一个新的仓位`,
                );
                this.openOrders(buyQuantity);
                return;
            }
        }

        // 订单历史中，最后一个订单的成交价格（用于价格参考）
        let lastPosition =
            this.position_open_history[this.position_open_history.length - 1];

        // 价格上涨到期望价格，执行卖出 (要求: 订单历史中，最后一个订单的成交价格（用于价格参考）满足期待涨跌价格, 当前持仓数量大于等于每次网格交易数量, 当前持仓数量大于等于限定最少持仓数量)
        if (
            latestPrice > this.next_expected_rise_price &&
            Number.isFinite(this.next_expected_rise_price) &&
            this.current_base_asset_quantity >= sellQuantity &&
            this.current_base_asset_quantity >=
                (this.config.min_open_position_quantity || 0)
        ) {
            this.logger.log(
                `⬆️ 价格上涨，执行平仓操作. 匹配上一个网格的价格为：`,
                lastPosition?.cummulativeQuoteQty,
            );
            this.closeOrders(sellQuantity);
            return;
        }

        // 价格下跌到期望价格，执行买入
        if (
            latestPrice < this.next_expected_fall_price &&
            Number.isFinite(this.next_expected_fall_price) &&
            (this.config.max_open_position_quantity
                ? this.current_base_asset_quantity <
                  this.config.max_open_position_quantity
                : true)
        ) {
            if (
                this.current_quote_asset_balance <
                bigNumber(latestPrice).times(buyQuantity).toNumber()
            ) {
                await this.updateExecutionStatus(
                    execution_status.INSUFFICIENT_BALANCE,
                );
                this.logger.log(`余额不足，无法执行买入操作`);
                return;
            }

            this.logger.log(`⬇️ 价格下跌，执行开仓操作`);
            this.openOrders(buyQuantity);
            return;
        }

        // 如果基础资产少于最小持仓要求，立即买入
        if (
            this.config.min_open_position_quantity &&
            this.current_base_asset_quantity <
                this.config.min_open_position_quantity
        ) {
            if (
                this.current_quote_asset_balance <
                bigNumber(latestPrice).times(buyQuantity).toNumber()
            ) {
                await this.updateExecutionStatus(
                    execution_status.INSUFFICIENT_BALANCE,
                );
                this.logger.log(`余额不足，无法执行买入操作`);
                return;
            }

            this.logger.log(`😎 基础资产低于最小持仓要求，立即开仓`);
            this.openOrders(buyQuantity);
            return;
        }
    };

    /** 暂停网格(业务逻辑自动判断进行设定的暂停与否) */
    this.onPausedGrid = async (status) => {
        this.auto_paused = true;
        if (status) {
            await this.updateExecutionStatus(status);
        }
    };

    /** 继续网格交易(业务逻辑自动判断进行设定的暂停与否) */
    this.onContinueGrid = async () => {
        this.auto_paused = false;
    };

    /** 手动暂停网格 */
    this.onManualPausedGrid = async () => {
        this.paused = true;
        await this.updateExecutionStatus(execution_status.PAUSED_MANUAL);
    };

    /** 手动继续网格 */
    this.onManualContinueGrid = async () => {
        this.paused = false;
        await this.updateExecutionStatus(execution_status.TRADING);
    };

    /**
     * 私有初始化方法 - 初始化持仓信息
     */
    this._initOrders = async () => {
        // 设置状态为初始化中
        await this.updateExecutionStatus(execution_status.INITIALIZING);

        let isOk = true;
        await this.initAccountInfo().catch(() => {
            isOk = false;
        });
        if (!isOk) {
            setTimeout(() => this._initOrders(), 1000);
            return;
        }

        // 初始化时获取准确的平均持仓成本
        this.total_open_position_entry_price = await this.getAverageCostPrice(
            this.config.trading_pair,
        );
        this.logger.log(
            `📈 初始平均持仓成本: ${this.total_open_position_entry_price}`,
        );

        let { min_open_position_quantity } = this.config;
        let buyQuantity = this.getLongOpenQuantity();

        // 如果基础资产少于最小持仓要求，补仓
        if (
            min_open_position_quantity &&
            this.current_base_asset_quantity < min_open_position_quantity
        ) {
            let quantity = bigNumber(min_open_position_quantity)
                .minus(this.current_base_asset_quantity)
                .plus(buyQuantity)
                .toNumber();

            // 修复：只有在有最新价格时才计算需要的计价资产
            if (this.latestPrice && this.latestPrice > 0) {
                let requiredQuote = bigNumber(this.latestPrice)
                    .times(quantity)
                    .toNumber();

                if (this.current_quote_asset_balance >= requiredQuote) {
                    await this.openOrders(quantity).catch((error) =>
                        this.logger.error("补仓失败:", error),
                    );
                } else {
                    this.logger.log(
                        `计价资产不足，需要 ${requiredQuote}，当前仅有 ${this.current_quote_asset_balance}`,
                    );
                }
            } else {
                this.logger.log(`等待获取最新价格后再进行初始化补仓`);
            }
        }

        this.init_status = true;

        // 初始化完成后，恢复网格运行
        await this.onContinueGrid();
        this.logger.log(`✅ 策略初始化完成，网格已恢复运行`);

        // 设置状态为正常交易中
        await this.updateExecutionStatus(execution_status.TRADING);
    };
}

/**
 * 静态工厂方法：负责完整的创建流程
 *
 * @param {Object} params - 策略参数（不含 id）
 * @returns {Promise<InfiniteGridSpot>} - 返回创建的实例
 */
InfiniteGridSpot.create = async function (params) {
    const db = require("../models");
    const GridStrategy = db.grid_strategies;
    const { sanitizeParams } = require("../utils/pick.js");

    // 参数清洗
    const valid_params = sanitizeParams(params, GridStrategy);

    // 先检查是否已存在相同策略
    const existing = await GridStrategy.findOne({
        where: {
            api_key: params.api_key,
            api_secret: params.api_secret,
            trading_pair: params.trading_pair,
            position_side: params.position_side,
        },
    });

    if (existing) {
        const instance = new InfiniteGridSpot({
            ...params,
            ...valid_params,
            id: existing.id,
        });
        await instance.start();
        return instance;
    }

    // 创建新记录
    const row = await GridStrategy.create({
        api_key: params.api_key,
        api_secret: params.api_secret,
        trading_pair: params.trading_pair,
        position_side: params.position_side,
        execution_status: execution_status.INITIALIZING,
        ...valid_params,
    });

    // 用真实 ID 创建实例
    const instance = new InfiniteGridSpot({
        ...params,
        ...valid_params,
        id: row.id,
    });

    // 执行初始化
    try {
        await instance._initOrders();
        // 初始化成功后，更新状态为 TRADING
        await instance.updateExecutionStatus(execution_status.TRADING);
    } catch (error) {
        // 初始化失败
        await instance.updateExecutionStatus(execution_status.INIT_FAILED);
        throw new Error(`网格策略初始化失败：${error.message}`);
    }

    return instance;
};

/**
 * 公共启动方法（用于恢复已存在的策略）
 */
InfiniteGridSpot.prototype.start = async function () {
    await this._initOrders();
};

module.exports = InfiniteGridSpot;
