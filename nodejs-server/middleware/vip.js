/**
 * VIP用户验证中间件
 * 单用户系统：直接验证 binance_api_key 表中的 API Key
 */
const db = require('../models');
const { sendError } = require('../utils/api-response');
const BinanceApiKey = db.binance_api_keys;

/**
 * VIP访问权限验证中间件
 * 单用户系统：所有通过验证的用户都是 VIP
 * 验证 binance_api_key 表中的 VIP 状态
 *
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 *
 * 验证流程：
 * 1. 从req.body或req.query中提取apiKey和apiSecret
 * 2. 验证 binance_api_key 表中是否存在匹配的记录
 * 3. 检查 VIP 是否过期
 * 4. 如果验证通过，调用next()继续处理
 */
const validateVipAccess = async (req, res, next) => {
  try {
    // 从请求体或查询参数中获取API凭证
    const apiKey = req.body?.apiKey || req.query?.apiKey;
    const apiSecret = req.body?.apiSecret || req.query?.apiSecret;

    // 如果提供了apiKey，进行验证
    if (apiKey && apiSecret) {
      try {
        // 验证 binance_api_key 表中是否存在匹配的记录
        const keyRecord = await BinanceApiKey.findOne({
          where: {
            api_key: apiKey,
            secret_key: apiSecret,
            deleted: 0,
          }
        });

        if (!keyRecord) {
          return sendError(res, 'API Key 或 Secret 无效', 403);
        }

        // 验证状态
        if (keyRecord.status !== 2) {
          return sendError(res, 'API Key 已被禁用', 403);
        }

        // 检查 VIP 是否过期
        if (keyRecord.vip_expire_at) {
          const now = new Date();
          const expireTime = new Date(keyRecord.vip_expire_at);
          if (expireTime < now) {
            return sendError(res, 'VIP 已过期', 403);
          }
        } else {
          return sendError(res, '您不是 VIP 用户，无法使用该功能', 403);
        }

        req.vipUser = {
          id: keyRecord.id,
          username: keyRecord.name || 'admin',
          apiKey: apiKey,
          vipExpireAt: keyRecord.vip_expire_at,
        };
      } catch (error) {
        console.error('VIP验证过程中发生错误:', error);
        return sendError(res, '验证失败', 403);
      }
    } else {
      return sendError(res, '缺失参数 apiKey 或 apiSecret', 403);
    }

    // 验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('VIP中间件执行错误:', error);
    return sendError(res, '验证失败', 403);
  }
};

module.exports = {
  validateVipAccess
};