/**
 * VIP用户验证中间件
 * 验证API密钥对应的用户是否为有效的VIP用户，提供统一的VIP权限控制
 */

const userService = require('../service/user.service');

/**
 * VIP访问权限验证中间件
 * 从请求体或查询参数中获取apiKey和apiSecret，验证用户VIP状态
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象  
 * @param {Function} next - Express下一个中间件函数
 * 
 * 验证流程：
 * 1. 从req.body或req.query中提取apiKey和apiSecret
 * 2. 调用 userService.validateVipAccess 进行VIP状态验证
 * 3. 如果不是VIP用户，返回403错误
 * 4. 如果验证通过，调用next()继续处理
 * 
 * 错误处理：
 * - VIP验证失败：返回403 Forbidden
 * - 验证过程异常：返回403 Forbidden（安全考虑）
 */
const validateVipAccess = async (req, res, next) => {
  try {
    // 从请求体或查询参数中获取API凭证
    const apiKey = req.body?.apiKey || req.query?.apiKey;
    const apiSecret = req.body?.apiSecret || req.query?.apiSecret;

    // 如果提供了apiKey，进行VIP验证
    if (apiKey && apiSecret) {
      try {
        // 调用用户服务进行VIP状态检查，同时获取用户信息
        const vipResult = await userService.validateVipAccess(apiKey, apiSecret);

        if (!vipResult.isVip) {
          return res.send({
            status: 'error',
            code: 403,
            message: '您不是VIP用户，无法使用该功能'
          });
        }

        // 将用户信息挂载到请求对象，供后续中间件和控制器使用
        req.vipUser = vipResult.user;
      } catch (error) {
        // VIP验证过程中的任何错误都视为无权限访问
        console.error('VIP验证过程中发生错误:', error);
        return res.send({
          status: 'error',
          code: 403,
          message: '您不是VIP用户，无法使用该功能'
        });
      }
    } else {
      return res.send({
        status: 'error',
        code: 403,
        message: '缺失参数 apiKey 或 apiSecret'
      });
    }

    // 验证通过，继续处理请求
    next();
  } catch (error) {
    // 中间件级别的错误处理
    console.error('VIP中间件执行错误:', error);
    return res.send({
      status: 'error',
      code: 403,
      message: '您不是VIP用户，无法使用该功能'
    });
  }
};

module.exports = {
  validateVipAccess
};