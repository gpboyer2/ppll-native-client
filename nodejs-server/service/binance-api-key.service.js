/**
 * Binance ApiKey 服务层
 * 提供 Binance ApiKey 管理相关的业务逻辑处理，包括增删改查功能
 */
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const db = require("../models");
const BinanceApiKey = db.binance_api_keys;

/**
 * 创建新的 Binance ApiKey
 * @param {Object} params - 创建 ApiKey 所需的参数对象
 * @param {number} params.userId - 用户ID
 * @param {string} params.name - API Key 名称
 * @param {string} params.apiKey - Binance API Key
 * @param {string} params.secretKey - Binance Secret Key
 * @param {number} [params.status=2] - 状态(1:未知,2:启用,3:禁用)
 * @param {string} [params.remark] - 备注信息
 * @returns {Promise<Object>} 创建成功的 ApiKey 信息对象
 */
const createApiKey = async (params) => {
  const { userId, name, apiKey, secretKey, status = 2, remark } = params;

  // 构建查询条件
  const keyCondition = {
    api_key: apiKey,
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };
  const nameCondition = {
    name: name,
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  // 如果有 userId，添加 user_id 条件；否则检查 NULL 值
  if (userId !== undefined && userId !== null) {
    keyCondition.user_id = userId;
    nameCondition.user_id = userId;
  } else {
    keyCondition.user_id = { [db.Sequelize.Op.is]: null };
    nameCondition.user_id = { [db.Sequelize.Op.is]: null };
  }

  // 检查 API Key 是否已存在
  const existingKey = await BinanceApiKey.findOne({
    where: keyCondition
  });

  if (existingKey) {
    throw new ApiError(httpStatus.CONFLICT, '该 API Key 已存在');
  }

  // 检查名称是否重复
  const existingName = await BinanceApiKey.findOne({
    where: nameCondition
  });

  if (existingName) {
    throw new ApiError(httpStatus.CONFLICT, '该名称已存在');
  }

  const keyData = {
    name,
    api_key: apiKey,
    secret_key: secretKey,
    status: status || 2,
    deleted: 0,
    remark
  };

  // 只有在有 userId 时才设置 user_id 字段
  if (userId !== undefined && userId !== null) {
    keyData.user_id = userId;
  }

  const createdKey = await BinanceApiKey.create(keyData, {
    validate: false
  });
  return createdKey.toJSON();
};

/**
 * 根据 ID 删除 ApiKey（软删除）
 * @param {number} apiKeyId - 要删除的 ApiKey ID
 * @param {number} userId - 当前用户ID（用于权限验证）
 * @returns {Promise<Object>} 删除成功的 ApiKey 信息对象
 */
const deleteApiKeyById = async (apiKeyId, userId) => {
  const apiKey = await BinanceApiKey.findOne({
    where: {
      id: apiKeyId,
      user_id: userId,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  if (!apiKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ApiKey 不存在或无权操作');
  }

  await apiKey.update({ deleted: 1 });
  return apiKey.toJSON();
};

/**
 * 根据 ID 更新 ApiKey 信息
 * @param {number} apiKeyId - 要更新的 ApiKey ID
 * @param {Object} updateBody - 包含要更新字段的对象
 * @param {number} userId - 当前用户ID（用于权限验证）
 * @returns {Promise<Object>} 更新成功的 ApiKey 信息对象
 */
const updateApiKeyById = async (apiKeyId, updateBody, userId) => {
  const existingKey = await BinanceApiKey.findOne({
    where: {
      id: apiKeyId,
      user_id: userId,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  if (!existingKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ApiKey 不存在或无权操作');
  }

  // 定义允许修改的字段白名单
  const ALLOWED_FIELDS = ['name', 'api_key', 'secret_key', 'status', 'remark'];

  // 检查是否有不允许的字段
  const requestFields = Object.keys(updateBody);
  const invalidFields = requestFields.filter(field => !ALLOWED_FIELDS.includes(field));

  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.FORBIDDEN, `禁止修改以下字段: ${invalidFields.join(', ')}`);
  }

  const { name, api_key, secret_key, status, remark } = updateBody;
  const updateData = {};

  if (name !== undefined) {
    // 检查名称是否与其他 Key 重复
    const duplicateName = await BinanceApiKey.findOne({
      where: {
        user_id: userId,
        name: name,
        id: { [db.Sequelize.Op.ne]: apiKeyId },
        deleted: { [db.Sequelize.Op.ne]: 1 }
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
        user_id: userId,
        api_key: api_key,
        id: { [db.Sequelize.Op.ne]: apiKeyId },
        deleted: { [db.Sequelize.Op.ne]: 1 }
      }
    });

    if (duplicateKey) {
      throw new ApiError(httpStatus.CONFLICT, '该 API Key 已存在');
    }
    updateData.api_key = api_key;
  }

  if (secret_key !== undefined) updateData.secret_key = secret_key;
  if (status !== undefined) updateData.status = status;
  if (remark !== undefined) updateData.remark = remark;

  await existingKey.update(updateData);

  // 重新查询获取最新数据
  const updatedKey = await BinanceApiKey.findOne({
    where: {
      id: apiKeyId,
      user_id: userId,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  return updatedKey.toJSON();
};

/**
 * 获取 ApiKey 列表（支持分页和筛选）
 * @param {Object} [filter={}] - 筛选条件对象
 * @param {number} [filter.userId] - 用户ID
 * @param {string} [filter.name] - 名称模糊匹配
 * @param {number} [filter.status] - 状态筛选
 * @param {Object} [options={}] - 查询选项对象
 * @param {number} [options.limit] - 每页返回的记录数
 * @param {number} [options.offset] - 偏移量（用于分页）
 * @returns {Promise<Array<Object>>} ApiKey 列表数组
 */
const getAllApiKeys = async (filter = {}, options = {}) => {
  const { userId, name, status, ids } = filter;
  const { limit, offset } = options;

  const whereCondition = {
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  // 支持按用户ID筛选
  if (userId !== undefined) {
    whereCondition.user_id = userId;
  }

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
  return apiKeys;
};

/**
 * 根据 ID 获取单个 ApiKey
 * @param {number} apiKeyId - ApiKey ID
 * @param {number} userId - 用户ID（用于权限验证）
 * @returns {Promise<Object|null>} ApiKey 信息对象或 null
 */
const getApiKeyById = async (apiKeyId, userId) => {
  const apiKey = await BinanceApiKey.findOne({
    where: {
      id: apiKeyId,
      user_id: userId,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  return apiKey ? apiKey.toJSON() : null;
};

/**
 * 根据条件获取 ApiKey 数量（用于分页统计）
 * @param {Object} filter - 筛选条件对象
 * @returns {Promise<number>} 符合条件的记录数
 */
const countApiKeys = async (filter = {}) => {
  const { userId, name, status } = filter;

  const whereCondition = {
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  if (userId !== undefined) {
    whereCondition.user_id = userId;
  }

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
