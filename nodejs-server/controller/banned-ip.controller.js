const httpStatus = require('http-status');
const catchAsync = require('../utils/catch-async');
const { banned_ips: BannedIP } = require('../models');
const ApiError = require('../utils/api-error');
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
  const { currentPage = 1, pageSize = 20, status } = req.query;
  const offset = (currentPage - 1) * pageSize;

  const whereClause = {};
  if (status !== undefined) {
    whereClause.status = parseInt(status);
  }

  // 获取分页数据
  const { count, rows } = await BannedIP.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit: parseInt(String(pageSize)),
    offset: parseInt(String(offset))
  });

  // 获取内存中的IP统计信息和系统内存使用情况
  const memoryStats = getIPStats();
  const systemMemoryStats = getMemoryStats();

  return res.apiSuccess({
    bannedIPs: rows,
    pagination: {
      currentPage: parseInt(currentPage),
      pageSize: parseInt(pageSize),
      total: count
    },
    memoryStats,
    systemMemoryStats,
    summary: {
      totalBanned: count,
      activeBanned: rows.filter(ip => ip.status === 1).length,
      memoryTracked: Object.keys(memoryStats).length,
      trustedIPs: Array.from(TRUSTED_IPS)
    }
  }, '获取IP封禁列表成功');
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

  return res.apiSuccess(null, '解封成功');
});

/**
 * 手动封禁IP地址 (管理员)
 * @route POST /api/v1/banned-ips
 * @access Admin
 */
const banIP = catchAsync(async (req, res) => {
  const { ip, reason, remark, duration } = req.body;

  if (!ip || !reason) {
    return res.apiError(null, 'IP地址和封禁原因不能为空');
  }

  // 验证IP格式
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    return res.apiError(null, 'IP地址格式不正确');
  }

  const bannedRecord = await BannedIP.banIP(
    ip,
    reason,
    req.user?.id || 0,
    remark || ''
  );

  return res.apiSuccess(bannedRecord, `IP ${ip} 已被永久封禁`);
});

/**
 * 批量解封IP地址 (管理员)
 * @route POST /api/v1/banned-ips/batch-unban
 * @access Admin
 */
const batchUnbanIP = catchAsync(async (req, res) => {
  const { ips } = req.body;

  if (!Array.isArray(ips) || ips.length === 0) {
    return res.apiError(null, 'IP地址列表不能为空');
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

  const success_count = results.filter(r => r.success).length;

  return res.apiSuccess({ results }, `成功解封 ${success_count}/${ips.length} 个IP的封禁`);
});

/**
 * 清理过期封禁记录 (管理员)
 * @route POST /api/v1/banned-ips/cleanup
 * @access Admin
 */
const cleanupExpiredBans = catchAsync(async (req, res) => {
  const cleanedCount = await BannedIP.cleanupExpiredRecords();

  return res.apiSuccess({ cleanedCount }, `清理了 ${cleanedCount} 条过期封禁记录`);
});

/**
 * 获取IP封禁详情 (管理员)
 * @route GET /api/v1/banned-ips/:ip
 * @access Admin
 */
const getIPBanDetail = catchAsync(async (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    return res.apiError(null, 'IP地址不能为空');
  }

  const bannedRecord = await BannedIP.findByIp(ip);

  if (!bannedRecord) {
    return res.apiError(null, '未找到该IP的封禁记录');
  }

  return res.apiSuccess(bannedRecord, '获取IP封禁详情成功');
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

  return res.apiSuccess({
    beforeCount,
    afterCount,
    cleanedCount: beforeCount - afterCount
  }, '执行紧急清理成功');
});

/**
 * 添加可信IP (管理员)
 * @route POST /api/v1/banned-ips/trusted-ips
 * @access Admin
 */
const addTrustedIPAddress = catchAsync(async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    return res.apiError(null, 'IP地址不能为空');
  }

  // 验证IP格式
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    return res.apiError(null, 'IP地址格式不正确');
  }

  addTrustedIP(ip);

  return res.apiSuccess({
    ip,
    trustedIPs: Array.from(TRUSTED_IPS)
  }, `IP ${ip} 已添加到可信列表`);
});

/**
 * 移除可信IP (管理员)
 * @route DELETE /api/v1/banned-ips/trusted-ips/:ip
 * @access Admin
 */
const removeTrustedIPAddress = catchAsync(async (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    return res.apiError(null, 'IP地址不能为空');
  }

  const removed = removeTrustedIP(ip);

  if (!removed) {
    return res.apiError(null, '该IP不在可信列表中');
  }

  return res.apiSuccess({
    ip,
    trustedIPs: Array.from(TRUSTED_IPS)
  }, `IP ${ip} 已从可信列表移除`);
});

/**
 * 获取可信IP列表 (管理员)
 * @route GET /api/v1/banned-ips/trusted-ips
 * @access Admin
 */
const getTrustedIPs = catchAsync(async (req, res) => {
  return res.apiSuccess({
    trustedIPs: Array.from(TRUSTED_IPS),
    count: TRUSTED_IPS.size
  }, '获取可信IP列表成功');
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
