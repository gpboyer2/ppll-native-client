/**
 * 用户验证规则
 * 定义用户相关API的请求参数验证规则
 */
const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    username: Joi.string(),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    // 支持单个 id 或 逗号分隔的字符串形式，如 id="1,2,3"
    id: Joi.alternatives().try(Joi.number().integer(), Joi.string()),
    // 支持多个 ids：数组或逗号分隔字符串
    ids: Joi.alternatives().try(
      Joi.array().items(Joi.number().integer()),
      Joi.string()
    ),
    role: Joi.string(),
    sortBy: Joi.string(),
    username: Joi.string(),
    status: Joi.number().integer().valid(1, 2, 3),
    pageSize: Joi.number().integer(),
    currentPage: Joi.number().integer(),
    includeRole: Joi.boolean(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  body: Joi.object()
    .keys({
      id: Joi.number().integer().required(),
      // 基础字段（所有管理员都可以修改）
      username: Joi.string().allow(''),
      email: Joi.string().email().allow(''),
      vip_expire: Joi.date().allow(''),
      status: Joi.number().integer().valid(1, 2, 3),
      active: Joi.number().integer().valid(0, 1),
      deleted: Joi.number().integer().valid(0, 1),
      remark: Joi.string().allow(''),
      birthday: Joi.date().allow(''),
      permissions: Joi.string().allow(''),
      // 特殊字段（仅super_admin可以修改）
      role: Joi.string().valid('user', 'admin', 'super_admin'),
    })
    .unknown(true)  // 允许未知字段，忽略它们而不是报错
    .min(2),
};

const deleteUser = {
  body: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
