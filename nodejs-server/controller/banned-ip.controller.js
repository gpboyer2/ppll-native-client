const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { banned_ips: BannedIP } = require('../models');
const ApiError = require('../utils/ApiError');
const {
  getIPStats,
  getMemoryStats,
  emergencyCleanup,
  addTrustedIP,
  removeTrustedIP,
  TRUSTED_IPS
} = require('../middleware/ip-rate-limit');

/**
 * 获取IP封禁统计信息和列表 (管理员)
 * @route GET /api/v1/banned-ips
 * @access Admin
 */
const getBannedIps = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (status !== undefined) {
    whereClause.status = parseInt(status);
  }

  // 获取分页数据
  const { count, rows } = await BannedIP.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // 获取内存中的IP统计信息和系统内存使用情况
  const memoryStats = getIPStats();
  const systemMemoryStats = getMemoryStats();

  res.json({
    status: 'success',
    data: {
      bannedIPs: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      },
      memoryStats,
      systemMemoryStats,
      summary: {
        totalBanned: count,
        activeBanned: rows.filter(ip => ip.status === 1).length,
        memoryTracked: Object.keys(memoryStats).length,
        trustedIPs: Array.from(TRUSTED_IPS)
      }
    }
  });
});

/**
 * 解封一个IP地址 (管理员)
 * @route DELETE /api/v1/banned-ips/:ip
 * @access Admin
 */
const unbanIp = catchAsync(async (req, res) => {
  const { ip } = req.params;
  const result = await BannedIP.unbanIP(ip);

  if (!result) {
    // BannedIP.unbanIP 在找不到记录时会返回 false
    throw new ApiError(httpStatus.NOT_FOUND, '该IP未被封禁或记录不存在');
  }

  // 对于成功的DELETE操作，返回 204 No Content 是标准的做法
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * 手动封禁IP地址 (管理员)
 * @route POST /api/v1/banned-ips
 * @access Admin
 */
const banIP = catchAsync(async (req, res) => {
  const { ip, reason, remark, duration = 24 } = req.body;

  if (!ip || !reason) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址和封禁原因不能为空');
  }

  // 验证IP格式
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址格式不正确');
  }

  const bannedRecord = await BannedIP.banIP(
    ip,
    reason,
    req.user?.id || 0,
    remark || ''
  );

  res.status(httpStatus.CREATED).json({
    status: 'success',
    message: `IP ${ip} 已被永久封禁`,
    data: bannedRecord
  });
});

/**
 * 批量解封IP地址 (管理员)
 * @route POST /api/v1/banned-ips/batch-unban
 * @access Admin
 */
const batchUnbanIP = catchAsync(async (req, res) => {
  const { ips } = req.body;

  if (!Array.isArray(ips) || ips.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址列表不能为空');
  }

  const results = [];
  for (const ip of ips) {
    try {
      const success = await BannedIP.unbanIP(ip);
      results.push({ ip, success });
    } catch (error) {
      results.push({ ip, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;

  res.json({
    status: 'success',
    message: `成功解封 ${successCount}/${ips.length} 个IP的封禁`,
    data: { results }
  });
});

/**
 * 清理过期封禁记录 (管理员)
 * @route POST /api/v1/banned-ips/cleanup
 * @access Admin
 */
const cleanupExpiredBans = catchAsync(async (req, res) => {
  const cleanedCount = await BannedIP.cleanupExpiredRecords();

  res.json({
    status: 'success',
    message: `清理了 ${cleanedCount} 条过期封禁记录`,
    data: { cleanedCount }
  });
});

/**
 * 获取IP封禁详情 (管理员)
 * @route GET /api/v1/banned-ips/:ip
 * @access Admin
 */
const getIPBanDetail = catchAsync(async (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址不能为空');
  }

  const bannedRecord = await BannedIP.findByIp(ip);

  if (!bannedRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, '未找到该IP的封禁记录');
  }

  res.json({
    status: 'success',
    data: bannedRecord
  });
});

/**
 * 执行内存紧急清理 (管理员)
 * @route POST /api/v1/banned-ips/memory/cleanup
 * @access Admin
 */
const executeEmergencyCleanup = catchAsync(async (req, res) => {
  const beforeCount = getMemoryStats().ipCount;
  emergencyCleanup();
  const afterCount = getMemoryStats().ipCount;

  res.json({
    status: 'success',
    message: `执行紧急清理成功`,
    data: {
      beforeCount,
      afterCount,
      cleanedCount: beforeCount - afterCount
    }
  });
});

/**
 * 添加可信IP (管理员)
 * @route POST /api/v1/banned-ips/trusted-ips
 * @access Admin
 */
const addTrustedIPAddress = catchAsync(async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址不能为空');
  }

  // 验证IP格式
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址格式不正确');
  }

  addTrustedIP(ip);

  res.status(httpStatus.CREATED).json({
    status: 'success',
    message: `IP ${ip} 已添加到可信列表`,
    data: {
      ip,
      trustedIPs: Array.from(TRUSTED_IPS)
    }
  });
});

/**
 * 移除可信IP (管理员)
 * @route DELETE /api/v1/banned-ips/trusted-ips/:ip
 * @access Admin
 */
const removeTrustedIPAddress = catchAsync(async (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'IP地址不能为空');
  }

  const removed = removeTrustedIP(ip);

  if (!removed) {
    throw new ApiError(httpStatus.NOT_FOUND, '该IP不在可信列表中');
  }

  res.json({
    status: 'success',
    message: `IP ${ip} 已从可信列表移除`,
    data: {
      ip,
      trustedIPs: Array.from(TRUSTED_IPS)
    }
  });
});

/**
 * 获取可信IP列表 (管理员)
 * @route GET /api/v1/banned-ips/trusted-ips
 * @access Admin
 */
const getTrustedIPs = catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      trustedIPs: Array.from(TRUSTED_IPS),
      count: TRUSTED_IPS.size
    }
  });
});

module.exports = {
  getBannedIps,
  unbanIp,
  banIP,
  batchUnbanIP,
  cleanupExpiredBans,
  getIPBanDetail,
  executeEmergencyCleanup,
  addTrustedIPAddress,
  removeTrustedIPAddress,
  getTrustedIPs
};
