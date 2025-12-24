/**
 * 请求验证中间件
 * 基于Joi库的请求参数验证中间件，支持验证路径参数、查询参数和请求体
 */
const Joi = require('joi');
const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const ApiError = require('../utils/ApiError');

/**
 * 验证请求参数的中间件函数
 * @param {Object} schema - Joi验证模式对象，包含params、query、body等需要验证的属性
 * @returns {Function} 返回一个Express中间件函数，用于验证请求参数
 * 
 * 中间件函数参数：
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 * 
 * 验证流程：
 * 1. 从schema中提取需要验证的属性（params、query、body）
 * 2. 从请求对象中提取对应的属性值
 * 3. 使用Joi进行验证
 * 4. 如果验证失败，返回400错误和错误信息
 * 5. 如果验证成功，将验证后的值合并到请求对象中，并调用next()
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
