/**
 * Binance ApiKey 服务层
 * 单用户系统：binance_api_keys 表即为用户表，支持多个 API Key
 */
const httpStatus = require("http-status");
const ApiError = require("../utils/api-error");
const db = require("../models");
const BinanceApiKey = db.binance_api_keys;

// API Key 调试日志前缀，方便搜索定位问题
const API_KEY_LOG_PREFIX = '[API-KEY-DEBUG]';

/**
 * 创建新的 Binance ApiKey
 * @param {Object} params - 创建 ApiKey 所需的参数对象
 * @param {string} params.name - API Key 名称
 * @param {string} params.api_key - Binance API Key
 * @param {string} params.api_secret - Binance Secret Key
 * @param {number} [params.status=2] - 状态(1:未知,2:启用,3:禁用)
 * @param {string} [params.remark] - 备注信息
 * @param {Date|string} [params.vip_expire_at] - VIP过期时间
 * @returns {Promise<Object>} 创建成功的 ApiKey 信息对象
 */
const createApiKey = async (params) => {
  const { name, api_key, api_secret, status = 2, remark, vip_expire_at } = params;

  // 检查 API Key 是否已存在
  const existingKey = await BinanceApiKey.findOne({
    where: {
      api_key: api_key,
      deleted: 0
    }
  });

  if (existingKey) {
    throw new ApiError(httpStatus.CONFLICT, '该 API Key 已存在');
  }

  // 检查名称是否重复
  const existingName = await BinanceApiKey.findOne({
    where: {
      name: name,
      deleted: 0
    }
  });

  if (existingName) {
    throw new ApiError(httpStatus.CONFLICT, '该名称已存在');
  }

  const keyData = {
    name,
    api_key,
    api_secret: api_secret,
    status: status || 2,
    deleted: 0,
    remark,
    vip_expire_at: vip_expire_at || null
  };

  const createdKey = await BinanceApiKey.create(keyData, {
    validate: false
  });
  console.log(`${API_KEY_LOG_PREFIX} CREATE_SUCCESS id=${createdKey.id} name=${name} api_key=${api_key.substring(0, 8)}...`);
  return createdKey.toJSON();
};

/**
 * 根据 ID 删除 ApiKey（软删除）
 * @param {number} api_key_id - 要删除的 ApiKey ID
 * @returns {Promise<Object>} 删除成功的 ApiKey 信息对象
 */
const deleteApiKeyById = async (api_key_id) => {
  console.log(`${API_KEY_LOG_PREFIX} DELETE_ATTEMPT id=${api_key_id}`);
  const api_key = await BinanceApiKey.findOne({
    where: {
      id: api_key_id,
      deleted: 0
    }
  });

  if (!api_key) {
    console.log(`${API_KEY_LOG_PREFIX} DELETE_NOT_FOUND id=${api_key_id}`);
    throw new ApiError(httpStatus.NOT_FOUND, 'ApiKey 不存在');
  }

  await api_key.update({ deleted: 1 });
  console.log(`${API_KEY_LOG_PREFIX} DELETE_SUCCESS id=${api_key_id} name=${api_key.name} api_key=${api_key.api_key.substring(0, 8)}...`);
  return api_key.toJSON();
};

/**
 * 根据 ID 更新 ApiKey 信息
 * @param {number} api_key_id - 要更新的 ApiKey ID
 * @param {Object} updateBody - 包含要更新字段的对象
 * @returns {Promise<Object>} 更新成功的 ApiKey 信息对象
 */
const updateApiKeyById = async (api_key_id, updateBody) => {
  const existingKey = await BinanceApiKey.findOne({
    where: {
      id: api_key_id,
      deleted: 0
    }
  });

  if (!existingKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ApiKey 不存在');
  }

  // 定义允许修改的字段白名单
  const ALLOWED_FIELDS = ['name', 'api_key', 'api_secret', 'status', 'remark', 'vip_expire_at'];

  // 检查是否有不允许的字段
  const requestFields = Object.keys(updateBody);
  const invalidFields = requestFields.filter(field => !ALLOWED_FIELDS.includes(field));

  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.FORBIDDEN, `禁止修改以下字段: ${invalidFields.join(', ')}`);
  }

  const { name, api_key, api_secret, status, remark, vip_expire_at } = updateBody;
  const updateData = {};

  if (name !== undefined) {
    // 检查名称是否与其他 Key 重复
    const duplicateName = await BinanceApiKey.findOne({
      where: {
        name: name,
        id: { [db.Sequelize.Op.ne]: api_key_id },
        deleted: 0
      }
    });

    if (duplicateName) {
      throw new ApiError(httpStatus.CONFLICT, '该名称已被其他 ApiKey 使用');
    }
    updateData.name = name;
  }

  if (api_key !== undefined) {
    // 检查 API Key 是否与其他 Key 重复
    const duplicateKey = await BinanceApiKey.findOne({
      where: {
        api_key: api_key,
        id: { [db.Sequelize.Op.ne]: api_key_id },
        deleted: 0
      }
    });

    if (duplicateKey) {
      throw new ApiError(httpStatus.CONFLICT, '该 API Key 已存在');
    }
    updateData.api_key = api_key;
  }

  if (api_secret !== undefined) updateData.api_secret = api_secret;
  if (status !== undefined) updateData.status = status;
  if (remark !== undefined) updateData.remark = remark;
  if (vip_expire_at !== undefined) updateData.vip_expire_at = vip_expire_at;

  await existingKey.update(updateData);

  // 重新查询获取最新数据
  const updatedKey = await BinanceApiKey.findOne({
    where: {
      id: api_key_id,
      deleted: 0
    }
  });

  console.log(`${API_KEY_LOG_PREFIX} UPDATE_SUCCESS id=${api_key_id} fields=${Object.keys(updateData).join(',')}`);
  return updatedKey.toJSON();
};

/**
 * 获取 ApiKey 列表（支持分页和筛选）
 * @param {Object} [filter={}] - 筛选条件对象
 * @param {string} [filter.name] - 名称模糊匹配
 * @param {number} [filter.status] - 状态筛选
 * @param {Array<number>} [filter.ids] - ID列表
 * @param {Object} [options={}] - 查询选项对象
 * @param {number} [options.limit] - 每页返回的记录数
 * @param {number} [options.offset] - 偏移量（用于分页）
 * @returns {Promise<Array<Object>>} ApiKey 列表数组
 */
const getAllApiKeys = async (filter = {}, options = {}) => {
  const { name, status, ids } = filter;
  const { limit, offset } = options;

  const whereCondition = {
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  // 支持按多个ID查询
  if (Array.isArray(ids) && ids.length > 0) {
    whereCondition.id = { [db.Sequelize.Op.in]: ids };
  }

  // 处理状态筛选
  if (status !== undefined && Number(status) !== 1) {
    whereCondition.status = Number(status);
  }

  // 处理名称模糊匹配
  if (name) {
    whereCondition.name = {
      [db.Sequelize.Op.like]: `%${name}%`
    };
  }

  const queryOptions = {
    where: whereCondition,
    order: [['created_at', 'DESC']]
  };

  if (limit) queryOptions.limit = parseInt(limit);
  if (offset) queryOptions.offset = parseInt(offset);

  const apiKeys = await BinanceApiKey.findAll(queryOptions);
  console.log(`${API_KEY_LOG_PREFIX} QUERY filter=${JSON.stringify(filter)} result_count=${apiKeys.length} ids=${apiKeys.map(k => k.id).join(',')}`);
  return apiKeys;
};

/**
 * 根据 ID 获取单个 ApiKey
 * @param {number} api_key_id - ApiKey ID
 * @returns {Promise<Object|null>} ApiKey 信息对象或 null
 */
const getApiKeyById = async (api_key_id) => {
  const api_key = await BinanceApiKey.findOne({
    where: {
      id: api_key_id,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  return api_key ? api_key.toJSON() : null;
};

/**
 * 根据条件获取 ApiKey 数量（用于分页统计）
 * @param {Object} filter - 筛选条件对象
 * @returns {Promise<number>} 符合条件的记录数
 */
const countApiKeys = async (filter = {}) => {
  const { name, status } = filter;

  const whereCondition = {
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  if (status !== undefined && Number(status) !== 1) {
    whereCondition.status = Number(status);
  }

  if (name) {
    whereCondition.name = {
      [db.Sequelize.Op.like]: `%${name}%`
    };
  }

  return BinanceApiKey.count({ where: whereCondition });
};

/**
 * 根据条件获取所有 ApiKey（用于计算总数）
 * @param {Object} filter - 筛选条件对象
 * @returns {Promise<Array<Object>>} ApiKey 数组
 */
const getAllBy = async (filter = {}) => {
  return BinanceApiKey.findAll({
    where: {
      ...filter,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });
};

module.exports = {
  createApiKey,
  deleteApiKeyById,
  updateApiKeyById,
  getAllApiKeys,
  getApiKeyById,
  countApiKeys,
  getAllBy
};
