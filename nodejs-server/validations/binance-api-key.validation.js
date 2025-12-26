/**
 * Binance ApiKey 验证规则
 * 定义 Binance ApiKey 相关 API 的请求参数验证规则
 */
const Joi = require('joi');

/**
 * 创建 ApiKey 的验证规则
 */
const createApiKey = {
  body: Joi.object().keys({
    name: Joi.string().min(1).max(64).required().messages({
      'string.min': '名称不能为空',
      'string.max': '名称长度不能超过64个字符',
      'any.required': '名称是必填项'
    }),
    apiKey: Joi.string().min(10).max(255).required().messages({
      'string.min': 'API Key 长度不能少于10个字符',
      'string.max': 'API Key 长度不能超过255个字符',
      'any.required': 'API Key 是必填项'
    }),
    secretKey: Joi.string().min(10).max(255).required().messages({
      'string.min': 'Secret Key 长度不能少于10个字符',
      'string.max': 'Secret Key 长度不能超过255个字符',
      'any.required': 'Secret Key 是必填项'
    }),
    status: Joi.number().integer().valid(1, 2, 3).optional().messages({
      'number.base': '状态必须是数字',
      'any.only': '状态必须是 1(未知)、2(启用) 或 3(禁用)'
    }),
    remark: Joi.string().max(255).allow('').optional().messages({
      'string.max': '备注长度不能超过255个字符'
    })
  })
};

/**
 * 删除 ApiKey 的验证规则
 */
const deleteApiKey = {
  body: Joi.object().keys({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID必须是数字',
      'number.positive': 'ID必须是正整数',
      'any.required': 'ID是必填项'
    })
  })
};

/**
 * 更新 ApiKey 的验证规则
 */
const updateApiKey = {
  body: Joi.object().keys({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID必须是数字',
      'number.positive': 'ID必须是正整数',
      'any.required': 'ID是必填项'
    }),
    name: Joi.string().min(1).max(64).optional().messages({
      'string.min': '名称不能为空',
      'string.max': '名称长度不能超过64个字符'
    }),
    apiKey: Joi.string().min(10).max(255).optional().messages({
      'string.min': 'API Key 长度不能少于10个字符',
      'string.max': 'API Key 长度不能超过255个字符'
    }),
    secretKey: Joi.string().min(10).max(255).optional().messages({
      'string.min': 'Secret Key 长度不能少于10个字符',
      'string.max': 'Secret Key 长度不能超过255个字符'
    }),
    status: Joi.number().integer().valid(1, 2, 3).optional().messages({
      'number.base': '状态必须是数字',
      'any.only': '状态必须是 1(未知)、2(启用) 或 3(禁用)'
    }),
    remark: Joi.string().max(255).allow('').optional().messages({
      'string.max': '备注长度不能超过255个字符'
    })
  }).min(2).messages({
    'object.min': '至少需要提供一个要更新的字段（除了 id）'
  })
};

/**
 * 查询 ApiKey 列表的验证规则
 */
const getApiKeys = {
  query: Joi.object().keys({
    // 支持单个 id 或 逗号分隔的字符串形式
    id: Joi.alternatives().try(Joi.number().integer(), Joi.string()),
    // 支持多个 ids：数组或逗号分隔字符串
    ids: Joi.alternatives().try(
      Joi.array().items(Joi.number().integer()),
      Joi.string()
    ),
    name: Joi.string().optional(),
    status: Joi.number().integer().valid(1, 2, 3).optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional(),
    currentPage: Joi.number().integer().min(1).optional()
  })
};

module.exports = {
  createApiKey,
  deleteApiKey,
  updateApiKey,
  getApiKeys
};
