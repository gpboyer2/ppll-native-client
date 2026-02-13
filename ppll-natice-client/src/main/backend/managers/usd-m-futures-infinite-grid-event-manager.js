/**
 * U本位合约无限网格策略事件管理器
 * 统一管理网格策略插件的事件，将事件记录到数据库并通知前端
 */

const EventEmitter = require("events");
const db = require("../models");
const { usd_m_futures_infinite_grid_logs: UsdMFuturesInfiniteGridLog } = db;
const dayjs = require("dayjs");

class UsdMFuturesInfiniteGridLogManager extends EventEmitter {
    constructor() {
        super();
        this.eventTypes = {
            ERROR: "error",
            WARN: "warn",
            INFO: "info",
            SUCCESS: "success",
            PAUSE: "pause",
            RESUME: "resume",
            OPEN_POSITION: "open_position",
            CLOSE_POSITION: "close_position",
            LIMIT_REACHED: "limit_reached",
            DEBUG: "debug",
        };
    }

    /**
     * 记录插件事件到数据库
     * @param {Object} event - 事件对象
     * @param {number} event.strategyId - 策略ID
     * @param {string} event.tradingPair - 交易对
     * @param {string} event.eventType - 事件类型
     * @param {string} event.message - 消息内容
     * @param {Object} event.details - 详细信息
     */
    async logEvent(event) {
        const {
            strategyId,
            tradingPair,
            eventType,
            message,
            details = {},
        } = event;

        try {
            // 保存到数据库
            const log = await UsdMFuturesInfiniteGridLog.create({
                strategy_id: strategyId,
                trading_pair: tradingPair,
                event_type: eventType,
                message,
                details: {
                    ...details,
                    timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                },
            });

            // 通过 Socket.IO 通知前端
            this.emitToFrontend(strategyId, {
                id: log.id,
                strategy_id: strategyId,
                trading_pair: tradingPair,
                event_type: eventType,
                message,
                details,
                created_at: log.created_at,
            });

            // 触发内部事件（添加错误处理）
            try {
                this.emit(eventType, {
                    strategyId,
                    tradingPair,
                    message,
                    details,
                });
            } catch (emitError) {
                console.error(
                    "[UsdMFuturesInfiniteGridLogManager] 触发内部事件失败:",
                    emitError,
                );
            }

            return log;
        } catch (error) {
            console.error(
                "[UsdMFuturesInfiniteGridLogManager] 记录事件失败:",
                error,
            );

            // 即使数据库记录失败，也要通知前端
            this.emitToFrontend(strategyId, event);
        }
    }

    /**
     * 通过 Socket.IO 通知前端
     */
    emitToFrontend(strategyId, event) {
        if (global.socketIOManager) {
            const io = global.socketIOManager.getIO();
            if (io) {
                // 通知订阅了该策略的所有客户端
                io.to(`strategy:${strategyId}`).emit("plugin_event", event);

                // 同时通知管理员频道
                io.to("admin:plugin_logs").emit("plugin_event", event);
            }
        }
    }

    /**
     * 查询插件日志
     */
    async getLogs(filter = {}, options = {}) {
        const { strategy_id, trading_pair, event_type, start_time, end_time } =
            filter;

        const {
            current_page = 1,
            page_size = 50,
            sort_by = "created_at:desc",
        } = options;

        const where = {};

        if (strategy_id) where.strategy_id = strategy_id;
        if (trading_pair) where.trading_pair = trading_pair;
        if (event_type) where.event_type = event_type;
        if (start_time && end_time) {
            where.created_at = {
                [db.Sequelize.Op.between]: [start_time, end_time],
            };
        }

        const [field, direction] = sort_by.split(":");
        const order = [[field, direction.toUpperCase()]];

        const offset = (current_page - 1) * page_size;

        const { count, rows } =
            await UsdMFuturesInfiniteGridLog.findAndCountAll({
                where,
                order,
                limit: page_size,
                offset,
            });

        return {
            list: rows,
            pagination: {
                current_page,
                page_size,
                total: count,
            },
        };
    }

    /**
     * 清理旧日志
     */
    async cleanOldLogs(daysToKeep = 30) {
        const cutoffDate = dayjs().subtract(daysToKeep, "day").toDate();

        const deleted = await UsdMFuturesInfiniteGridLog.destroy({
            where: {
                created_at: {
                    [db.Sequelize.Op.lt]: cutoffDate,
                },
            },
        });

        console.log(
            `[UsdMFuturesInfiniteGridLogManager] 清理了 ${deleted} 条旧日志`,
        );
        return deleted;
    }

    /**
     * 获取日志统计
     */
    async getStatistics(strategy_id = null) {
        const where = strategy_id ? { strategy_id } : {};

        const [total, byType] = await Promise.all([
            UsdMFuturesInfiniteGridLog.count({ where }),
            UsdMFuturesInfiniteGridLog.findAll({
                where,
                attributes: [
                    "event_type",
                    [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "count"],
                ],
                group: ["event_type"],
                raw: true,
            }),
        ]);

        return {
            total,
            by_type: byType.reduce((acc, item) => {
                acc[item.event_type] = parseInt(item.count);
                return acc;
            }, {}),
        };
    }
}

// 创建单例实例
const usd_m_futures_infinite_grid_event_manager =
    new UsdMFuturesInfiniteGridLogManager();

module.exports = usd_m_futures_infinite_grid_event_manager;
