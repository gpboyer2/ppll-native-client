const socketIo = require('socket.io');
const UtilRecord = require('../utils/record-log.js');
const db = require('../models');
const { add_frontend_log } = require('../service/frontend-logs.service');
const systemService = require('../service/system.service');

// 生产环境标识
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let io;
let wsManager;

// 连接统计
const stats = { active: 0, total: 0 };

const init = (server, wsManagerInstance) => {
  wsManager = wsManagerInstance;
  io = socketIo(server, {
    cors: {
      origin: "*", // 允许跨域
      methods: ["GET", "POST"]
    }
  });

  // 暴露到全局，供其他模块使用
  global.socketIOManager = { getIO: () => io };

  io.on('connection', (socket) => {
    // 更新连接统计
    stats.total++;
    stats.active++;
    UtilRecord.log(`[SocketIO] Client connected: ${socket.id}`);

    // 记录此 Socket 订阅了哪些用户数据流，格式: `${apiKey}:${market}`
    socket.subscribedUserStreamList = new Set();
    // 记录此 Socket 订阅了哪些 Ticker，格式: `${market}:${symbol}`
    socket.subscribedTickerList = new Set();

    /**
     * 订阅 User Data Stream（账户余额、持仓、订单更新）
     * data: { apiKey, apiSecret, market }
     * market: 'usdm'（默认）| 'coinm' | 'spot'
     */
    socket.on('subscribe_user_stream', async (data) => {
      const { apiKey, apiSecret, market = 'usdm' } = data;

      if (!apiKey || !apiSecret) {
        socket.emit('error', { message: '缺少必要参数: apiKey, apiSecret' });
        return;
      }

      const subKey = `${apiKey}:${market}`;
      const room = `user:${apiKey}:${market}`;
      socket.join(room);
      socket.subscribedUserStreamList.add(subKey);

      try {
        await wsManager.subscribeUserData(apiKey, apiSecret, market);
        socket.emit('user_stream_status', { status: 'connected', apiKey, market });
        UtilRecord.log(`[SocketIO] Socket ${socket.id} 订阅用户数据流 ${subKey}`);
      } catch (err) {
        UtilRecord.log(`[SocketIO] 订阅用户数据流失败 ${subKey}: ${err?.message || err}`);
        socket.emit('error', { message: `订阅失败: ${err?.message || err}` });
        socket.leave(room);
        socket.subscribedUserStreamList.delete(subKey);
      }
    });

    /**
     * 取消订阅 User Data Stream
     * data: { apiKey, market }
     */
    socket.on('unsubscribe_user_stream', (data) => {
      const { apiKey, market = 'usdm' } = data;
      const subKey = `${apiKey}:${market}`;

      if (apiKey && socket.subscribedUserStreamList.has(subKey)) {
        wsManager.unsubscribeUserData(apiKey, market);
        socket.leave(`user:${apiKey}:${market}`);
        socket.subscribedUserStreamList.delete(subKey);
        UtilRecord.log(`[SocketIO] Socket ${socket.id} 取消订阅用户数据流 ${subKey}`);
      }
    });

    /**
     * 订阅 Ticker（实时价格）
     * data: { symbol, market }
     * market: 'usdm'（默认）| 'coinm' | 'spot'
     */
    socket.on('subscribe_ticker', (data) => {
      const { symbol, market = 'usdm' } = data;

      if (!symbol) {
        socket.emit('error', { message: '缺少必要参数: symbol' });
        return;
      }

      const subKey = `${market}:${symbol}`;
      const room = `ticker:${subKey}`;

      // 检查是否已订阅，避免重复增加引用计数
      if (socket.subscribedTickerList.has(subKey)) {
        UtilRecord.log(`[SocketIO] Socket ${socket.id} 已订阅 Ticker ${subKey}，跳过重复订阅`);
        socket.emit('ticker_status', { status: 'connected', symbol, market });
        return;
      }

      socket.join(room);
      socket.subscribedTickerList.add(subKey);

      // 订阅标记价格
      wsManager.subscribeMarkPrice(symbol);
      socket.emit('ticker_status', { status: 'connected', symbol, market });
      UtilRecord.log(`[SocketIO] Socket ${socket.id} 订阅 Ticker ${subKey}`);
    });

    /**
     * 取消订阅 Ticker
     * data: { symbol, market }
     */
    socket.on('unsubscribe_ticker', (data) => {
      const { symbol, market = 'usdm' } = data;
      const subKey = `${market}:${symbol}`;

      if (symbol && socket.subscribedTickerList.has(subKey)) {
        wsManager.unsubscribeMarkPrice(symbol);
        socket.leave(`ticker:${subKey}`);
        socket.subscribedTickerList.delete(subKey);
        UtilRecord.log(`[SocketIO] Socket ${socket.id} 取消订阅 Ticker ${subKey}`);
      }
    });

    /**
     * 切换 Ticker 订阅（先取消旧的，再订阅新的）
     * data: { oldSymbol, newSymbol, market }
     */
    socket.on('switch_ticker', (data) => {
      const { oldSymbol, newSymbol, market = 'usdm' } = data;
      const newSubKey = newSymbol ? `${market}:${newSymbol}` : null;

      // 取消旧订阅（仅当旧订阅存在且与新订阅不同时）
      if (oldSymbol) {
        const oldSubKey = `${market}:${oldSymbol}`;
        // 如果新旧相同，无需任何操作
        if (oldSubKey === newSubKey) {
          UtilRecord.log(`[SocketIO] Socket ${socket.id} 切换 Ticker 新旧相同 ${oldSymbol}，跳过`);
          socket.emit('ticker_status', { status: 'connected', symbol: newSymbol, market });
          return;
        }
        if (socket.subscribedTickerList.has(oldSubKey)) {
          wsManager.unsubscribeMarkPrice(oldSymbol);
          socket.leave(`ticker:${oldSubKey}`);
          socket.subscribedTickerList.delete(oldSubKey);
        }
      }

      // 订阅新的（仅当未订阅时）
      if (newSymbol && newSubKey) {
        // 检查是否已订阅，避免重复增加引用计数
        if (socket.subscribedTickerList.has(newSubKey)) {
          UtilRecord.log(`[SocketIO] Socket ${socket.id} 已订阅 Ticker ${newSubKey}，跳过重复订阅`);
          socket.emit('ticker_status', { status: 'connected', symbol: newSymbol, market });
          return;
        }

        const room = `ticker:${newSubKey}`;
        socket.join(room);
        socket.subscribedTickerList.add(newSubKey);
        wsManager.subscribeMarkPrice(newSymbol);
        socket.emit('ticker_status', { status: 'connected', symbol: newSymbol, market });
        UtilRecord.log(`[SocketIO] Socket ${socket.id} 切换 Ticker ${oldSymbol || '无'} -> ${newSymbol}`);
      }
    });

    socket.on('disconnect', () => {
      stats.active--;
      UtilRecord.log(`[SocketIO] Client disconnected: ${socket.id}`);
      // 统一清理订阅
      cleanupSocketSubscription(socket);
    });

    /**
     * 接收前端日志批量保存
     * data: { logs: [{ log_data, page_url, user_agent }] }
     */
    socket.on('frontend_logs', async (data) => {
      try {
        const { logs } = data;
        if (!Array.isArray(logs) || logs.length === 0) {
          return;
        }

        // 使用公共函数批量添加日志（自动清理旧数据）
        await add_frontend_log(logs);

        // 确认收到（仅开发环境）
        if (!IS_PRODUCTION) {
          socket.emit('frontend_logs_ack', { count: logs.length });
        }
      } catch (error) {
        UtilRecord.trace(`[SocketIO] 处理前端日志失败: ${error.message}`);
      }
    });

    /**
     * 健康检查
     * data: {} - 无需参数
     * 使用 callback 模式返回结果
     */
    socket.on('health_check', async (data, callback) => {
      try {
        const healthData = await systemService.getHealth();
        callback({ status: 'success', message: '操作成功', datum: healthData });
      } catch (error) {
        callback({ status: 'error', message: error?.message || '健康检查失败', datum: null });
      }
    });
  });

  // 监听 wsManager 事件并转发给 SocketIO 房间
  // 注意：防止多次绑定
  if (!wsManager.listenerCount('userDataUpdate')) {
    wsManager.on('userDataUpdate', ({ apiKey, market, data }) => {
      io.to(`user:${apiKey}:${market}`).emit('account_update', data);
    });
  }

  // 监听 Ticker 更新事件
  if (!wsManager.listenerCount('tick')) {
    wsManager.on('tick', ({ market, symbol, latestPrice, raw }) => {
      const room = `ticker:${market}:${symbol}`;
      // 生产环境减少日志输出
      if (!IS_PRODUCTION) {
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (roomSockets && roomSockets.size > 0) {
          UtilRecord.trace(`[SocketIO] 发送 ticker_update 到房间 ${room}: ${latestPrice}`);
        }
      }
      io.to(room).emit('ticker_update', { symbol, market, price: latestPrice, raw });
    });
  }
};

/**
 * 清理 Socket 的所有订阅（内部使用）
 * @param {import('socket.io').Socket} socket - Socket.IO 客户端实例
 */
const cleanupSocketSubscription = (socket) => {
  // 清理用户数据流订阅
  for (const subKey of socket.subscribedUserStreamList) {
    const [apiKey, market] = subKey.split(':');
    wsManager.unsubscribeUserData(apiKey, market);
  }
  socket.subscribedUserStreamList.clear();

  // 清理 Ticker 订阅
  for (const subKey of socket.subscribedTickerList) {
    const [, symbol] = subKey.split(':');
    wsManager.unsubscribeMarkPrice(symbol);
  }
  socket.subscribedTickerList.clear();
};

/**
 * 获取连接统计信息
 * @returns {object} 统计信息
 */
const getStats = () => {
  return {
    active: io?.sockets?.sockets?.size || stats.active,
    total: stats.total
  };
};

/**
 * 推送策略状态更新到所有连接的客户端
 * @param {number} strategyId - 策略ID
 * @param {string} executionStatus - 执行状态
 * @param {object} extraData - 额外数据（可选）
 */
const emitStrategyStatusUpdate = (strategyId, executionStatus, extraData = {}) => {
  if (!io) {
    UtilRecord.trace('[SocketIO] IO 未初始化，无法推送策略状态更新');
    return;
  }
  // 推送给所有连接的客户端
  io.emit('strategy_status_update', {
    strategy_id: strategyId,
    execution_status: executionStatus,
    timestamp: Date.now(),
    ...extraData
  });
  if (!IS_PRODUCTION) {
    UtilRecord.log(`[SocketIO] 推送策略状态更新: strategyId=${strategyId}, status=${executionStatus}`);
  }
};

module.exports = { init, getStats, emitStrategyStatusUpdate };
