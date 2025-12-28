/**
 * 系统服务层
 * 提供系统相关的业务逻辑，包括获取本机网络信息等
 */
const ipUtil = require('../utils/ip');
const db = require('../models');
const SocketIOManager = require('../managers/SocketIOManager');


// 服务启动时间
const SERVICE_START_TIME = Date.now();


/**
 * 格式化运行时长
 * @param {number} uptimeMs 运行时长（毫秒）
 * @returns {string} 格式化后的时长
 */
const formatUptime = (uptimeMs) => {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`;
  }
  return `${seconds}秒`;
};


/**
 * 获取本机所有 IPv4 地址列表
 * @returns {Array<string>} IPv4 地址数组
 */
const getIPv4List = () => {
  try {
    const ipList = ipUtil.getIp();
    return ipList;
  } catch (error) {
    console.error('获取 IPv4 地址列表失败:', error);
    return [];
  }
};


/**
 * 获取 Git 信息
 * @returns {object} Git 信息对象
 */
const getGitInfo = () => {
  // 从全局对象获取 git 信息（由 jobs/git.js 在启动时写入）
  return (global && global.GIT_INFO) || null;
};


/**
 * 获取数据库路径
 * @returns {string} 数据库文件路径
 */
const getDatabasePath = () => {
  try {
    return db.storagePath || '';
  } catch (error) {
    console.error('获取数据库路径失败:', error);
    return '';
  }
};


/**
 * 获取系统健康状态
 * @returns {Promise<object>} 健康状态信息
 */
const getHealth = async () => {
  // 进程信息
  const pid = process.pid;
  const uptimeMs = Date.now() - SERVICE_START_TIME;

  // 数据库健康检查
  let dbHealthy = false;
  try {
    await db.sequelize.authenticate();
    const tables = await db.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables[0].map(t => t.name);
    dbHealthy = tableNames.includes('grid_strategies');
  } catch (e) {
    dbHealthy = false;
  }

  // 资源使用
  const memUsage = process.memoryUsage();
  const memoryUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memoryTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memoryPercentage = memoryTotal > 0 ? parseFloat((memoryUsed / memoryTotal * 100).toFixed(2)) : 0;

  const cpuUsage = process.cpuUsage();
  const cpuUser = cpuUsage.user / 1000000;
  const cpuSystem = cpuUsage.system / 1000000;

  // 连接统计
  const wsStats = global.wsManager?.getStats() || { active: 0, total: 0 };
  const socketioStats = SocketIOManager.getStats();

  return {
    service: {
      is_running: true,
      pid,
      start_time: new Date(SERVICE_START_TIME).toISOString(),
      uptime: formatUptime(uptimeMs)
    },
    health: {
      is_healthy: dbHealthy,
      database: {
        healthy: dbHealthy
      }
    },
    resources: {
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        percentage: memoryPercentage
      },
      cpu: {
        user: parseFloat(cpuUser.toFixed(2)),
        system: parseFloat(cpuSystem.toFixed(2))
      }
    },
    connections: {
      websocket: {
        active: wsStats.active,
        public: wsStats.public || 0,
        user_data: wsStats.userData || 0,
        total: wsStats.total
      },
      socketio: {
        active: socketioStats.active,
        total: socketioStats.total
      }
    }
  };
};


module.exports = {
  getIPv4List,
  getGitInfo,
  getDatabasePath,
  getHealth
};
