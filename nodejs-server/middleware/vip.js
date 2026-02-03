/**
 * VIP用户验证中间件
 * 单用户系统：直接验证 binance_api_key 表中的 API Key
 */
const db = require('../models');
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
 * 1. 从req.body或req.query中提取api_key和api_secret
 * 2. 验证 binance_api_key 表中是否存在匹配的记录
 * 3. 检查 VIP 是否过期
 * 4. 如果验证通过，调用next()继续处理
 */
const validateVipAccess = async (req, res, next) => {
  try {
    // 从请求体或查询参数中获取API凭证
    const api_key = req.body?.api_key || req.query?.api_key;
    const api_secret = req.body?.api_secret || req.query?.api_secret;

    // 如果提供了api_key，进行验证
    if (api_key && api_secret) {
      try {
        // 验证 binance_api_key 表中是否存在匹配的记录
        const keyRecord = await BinanceApiKey.findOne({
          where: {
            api_key: api_key,
            api_secret: api_secret,
            deleted: 0,
          }
        });

        if (!keyRecord) {
          return res.apiError(null, 'API Key 或 Secret 无效');
        }

        // 验证状态
        if (keyRecord.status !== 2) {
          return res.apiError(null, 'API Key 已被禁用');
        }

        // 检查 VIP 是否过期
        if (keyRecord.vip_expire_at) {
          const now = new Date();
          const expireTime = new Date(keyRecord.vip_expire_at);
          if (expireTime < now) {
            return res.apiError(null, 'VIP 已过期');
          }
        } else {
          return res.apiError(null, '您不是 VIP 用户，无法使用该功能');
        }

        req.vipUser = {
          id: keyRecord.id,
          username: keyRecord.name || 'admin',
          api_key: api_key,
          vipExpireAt: keyRecord.vip_expire_at,
        };
      } catch (error) {
        console.error('VIP验证过程中发生错误:', error);
        return res.apiError(null, '验证失败');
      }
    } else {
      return res.apiError(null, '缺失参数 api_key 或 api_secret');
    }

    // 验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('VIP中间件执行错误:', error);
    return res.apiError(null, '验证失败');
  }
};

module.exports = {
  validateVipAccess
};