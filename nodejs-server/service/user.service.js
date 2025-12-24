/**
 * 用户服务
 * 提供用户管理相关的业务逻辑处理，包括用户信息查询、创建、更新、删除等功能
 * 
 * 主要功能包括：
 * 1. 用户的增删改查操作
 * 2. 用户角色和权限管理
 * 3. 用户状态和VIP权限验证
 * 4. 数据安全处理（如密码加密、字段过滤等）
 */
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const db = require("../models");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const roleService = require("./role.service");
const User = db.users;

/**
 * 创建新用户
 * 
 * 该函数负责创建一个新的用户记录，包含以下主要功能：
 * 1. 验证用户名、邮箱和API Key的唯一性
 * 2. 处理用户角色分配（使用默认角色或指定角色）
 * 3. 对用户密码进行加密处理
 * 4. 创建用户记录并返回不包含密码的用户信息
 * 
 * @param {Object} params - 创建用户所需的参数对象
 * @param {string} [params.username] - 用户名（可选）
 * @param {string} [params.email] - 邮箱地址（可选）
 * @param {string} [params.password] - 用户密码（可选）
 * @param {string} [params.role] - 用户角色代码（可选，默认为默认角色或'operator'）
 * @param {string} [params.apiKey] - API密钥（可选）
 * @param {string} [params.apiSecret] - API密钥对应的密钥（可选）
 * @param {number} [params.status=1] - 用户状态（1: 正常, 0: 禁用）
 * @param {string} [params.remark] - 用户备注信息（可选）
 * @returns {Promise<Object>} 创建成功的用户信息对象（不包含密码字段）
 * @throws {ApiError} 当用户名、邮箱或API Key已存在时抛出冲突错误
 * @throws {ApiError} 当指定的角色不存在时抛出BadRequest错误
 */
const createUser = async (params) => {
  const { username, email, password, role, apiKey, apiSecret, status = 1, remark } = params;
  // 检查用户名是否已存在
  if (username) {
    const existingUser = await User.findOne({
      where: { username, deleted: { [db.Sequelize.Op.ne]: 1 } }
    });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, '用户名已存在');
    }
  }

  // 检查邮箱是否已存在
  if (email) {
    const existingUser = await User.findOne({
      where: { email, deleted: { [db.Sequelize.Op.ne]: 1 } }
    });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, '邮箱已存在');
    }
  }

  // 检查API Key是否已存在
  if (apiKey) {
    const existingUser = await User.findOne({
      where: { apiKey, deleted: { [db.Sequelize.Op.ne]: 1 } }
    });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, 'API Key已存在');
    }
  }

  // 如果没有指定角色，使用默认角色
  let userRole = role;
  if (!userRole) {
    const defaultRole = await roleService.getDefaultRole();
    userRole = defaultRole ? defaultRole.code : 'operator';
  } else {
    // 验证角色是否存在
    const roleExists = await roleService.getRoleByCode(userRole);
    if (!roleExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, '指定的角色不存在');
    }
  }

  // 密码加密
  let hashedPassword = null;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(password, salt);
  }

  const userData = {
    username,
    email,
    password: hashedPassword || Date.now().toString(),
    role: userRole,
    apiKey,
    apiSecret,
    status: status || 1,
    active: 1,
    deleted: 0,
    remark
  };

  const createdUser = await User.create(userData);

  // 返回用户信息时不包含密码
  const userResult = createdUser.toJSON();
  delete userResult.password;

  return userResult;
};

/**
 * 根据用户ID删除用户（软删除）
 * 
 * 该函数通过软删除方式删除用户，将用户的deleted字段设置为1，而不是从数据库中物理删除。
 * 删除前会进行多项验证：
 * 1. 验证用户是否存在
 * 2. 验证用户是否为超级管理员（超级管理员不能被删除）
 * 
 * @param {number|string} userId - 要删除的用户ID
 * @returns {Promise<Object>} 删除成功的用户信息对象（不包含密码字段）
 * @throws {ApiError} 当用户不存在时抛出NotFound错误
 * @throws {ApiError} 当尝试删除超级管理员时抛出Forbidden错误
 * @throws {ApiError} 当数据库操作失败时抛出ServiceUnavailable错误
 */
const deleteUserById = async (userId) => {
  try {
    const user = await getOneBy({ id: parseInt(userId) });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, '用户不存在');
    }

    // 检查是否为超级管理员
    if (user.role === 'super_admin') {
      throw new ApiError(httpStatus.FORBIDDEN, '不能删除超级管理员');
    }

    // 软删除
    await user.update({ deleted: 1 });

    const userResult = user.toJSON();
    delete userResult.password;

    return userResult;
  } catch (error) {
    // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
  }
};

/**
 * 根据用户ID更新用户信息
 * 
 * 该函数负责更新用户信息，具有以下特点：
 * 1. 验证用户是否存在
 * 2. 根据当前操作用户的角色权限控制可修改字段
 * 3. 普通用户只能修改部分基础字段
 * 4. 超级管理员可以额外修改用户角色
 * 5. 禁止修改超级管理员的角色
 * 6. 验证角色是否存在（当修改角色时）
 * 
 * @param {number|string} userId - 要更新的用户ID
 * @param {Object} updateBody - 包含要更新字段的对象
 * @param {Object} [currentUser] - 当前操作的用户信息（用于权限控制）
 * @param {string} [currentUser.role] - 当前操作用户的角色
 * @returns {Promise<Object>} 更新成功的用户信息对象（不包含密码字段）
 * @throws {ApiError} 当用户不存在时抛出NotFound错误
 * @throws {ApiError} 当尝试修改不允许的字段时抛出Forbidden错误
 * @throws {ApiError} 当指定的角色不存在时抛出BadRequest错误
 * @throws {ApiError} 当数据库操作失败时抛出ServiceUnavailable错误
 */
async function updateUserById(userId, updateBody, currentUser) {
  try {
    const existingUser = await getOneBy({ id: parseInt(userId) });
    if (!existingUser) {
      throw new ApiError(httpStatus.NOT_FOUND, '用户不存在');
    }

    // 安全限制：非 super_admin 不得修改 super_admin 的任何信息
    if (existingUser.role === 'super_admin' && (!currentUser || currentUser.role !== 'super_admin')) {
      throw new ApiError(httpStatus.FORBIDDEN, '禁止修改超级管理员的任何信息');
    }

    // 定义基础允许修改的字段白名单
    const ALLOWED_FIELDS = ['username', 'email', 'vip_expire', 'status', 'active', 'deleted', 'remark', 'birthday', 'permissions'];

    // super_admin可以额外修改role字段
    const SUPER_ADMIN_EXTRA_FIELDS = ['role'];

    // 根据当前用户角色确定允许的字段
    let allowedFields = [...ALLOWED_FIELDS];
    if (currentUser && currentUser.role === 'super_admin') {
      allowedFields = [...ALLOWED_FIELDS, ...SUPER_ADMIN_EXTRA_FIELDS];
    }

    // 检查是否有不允许的字段
    const requestFields = Object.keys(updateBody).filter(key => key !== 'id');
    const invalidFields = requestFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new ApiError(httpStatus.FORBIDDEN, `禁止修改以下字段: ${invalidFields.join(', ')}。当前用户允许修改: ${allowedFields.join(', ')}`);
    }

    const { username, email, vip_expire, status, active, deleted, remark, birthday, permissions, role } = updateBody;
    const updateData = {};

    // 处理基础字段
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (vip_expire !== undefined) updateData.vip_expire = vip_expire;
    if (status !== undefined) updateData.status = status;
    if (active !== undefined) updateData.active = active;
    if (deleted !== undefined) updateData.deleted = deleted;
    if (remark !== undefined) updateData.remark = remark;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (permissions !== undefined) updateData.permissions = permissions;

    // 处理role字段（仅super_admin可以修改）
    if (role !== undefined) {
      if (!currentUser || currentUser.role !== 'super_admin') {
        throw new ApiError(httpStatus.FORBIDDEN, '只有super_admin可以修改用户角色');
      }

      // 不允许修改super_admin的角色
      if (existingUser.role === 'super_admin') {
        throw new ApiError(httpStatus.FORBIDDEN, '不能修改超级管理员的角色');
      }

      // 不允许将用户提升为super_admin
      if (role === 'super_admin') {
        throw new ApiError(httpStatus.FORBIDDEN, '不能将用户提升为超级管理员');
      }

      // 验证角色是否存在
      const roleExists = await roleService.getRoleByCode(role);
      if (!roleExists) {
        throw new ApiError(httpStatus.BAD_REQUEST, '指定的角色不存在');
      }

      updateData.role = role;
    }

    await User.update(updateData, {
      where: { id: parseInt(userId) }
    });

    const updatedUser = await getOneBy({ id: userId });
    const userResult = updatedUser.toJSON();
    delete userResult.password;

    return userResult;
  } catch (error) {
    // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message);
  }
}

/**
 * 获取用户列表（支持分页和筛选）
 * 
 * 该函数用于获取用户列表，支持多种筛选条件和分页功能：
 * 1. 支持按状态、角色、用户名筛选用户
 * 2. 支持分页查询（limit和offset）
 * 3. 支持包含角色信息的关联查询
 * 4. 自动排除已软删除的用户（deleted != 1）
 * 5. 返回结果不包含密码字段
 * 
 * @param {Object} [filter={}] - 筛选条件对象
 * @param {number} [filter.status] - 用户状态筛选（1: 未知, 2: 启用, 3: 禁用）
 * @param {string} [filter.role] - 用户角色代码筛选
 * @param {string} [filter.username] - 用户名模糊匹配筛选
 * @param {Object} [options={}] - 查询选项对象
 * @param {number} [options.limit] - 每页返回的记录数
 * @param {number} [options.offset] - 偏移量（用于分页）
 * @param {boolean} [options.includeRole=false] - 是否包含角色信息
 * @returns {Promise<Array<Object>>} 用户列表数组，每个元素是不包含密码字段的用户信息对象
 */
async function getAllUsers(filter = {}, options = {}) {
  const { status, role, username, id, ids } = filter;
  const { limit, offset, includeRole } = options;

  const whereCondition = {
    deleted: { [db.Sequelize.Op.ne]: 1 }
  };

  // 支持按单个或多个ID查询
  if (Array.isArray(ids) && ids.length > 0) {
    whereCondition.id = { [db.Sequelize.Op.in]: ids };
  } else if (id !== undefined) {
    whereCondition.id = id;
  }

  // 处理状态筛选逻辑：1表示未知，2表示启用，3表示禁用
  if (status !== undefined && Number(status) !== 1) {
    whereCondition.status = Number(status);
  }
  if (role) whereCondition.role = role;
  if (username) {
    whereCondition.username = {
      [db.Sequelize.Op.like]: `%${username}%`
    };
  }

  const queryOptions = {
    where: whereCondition,
    attributes: { exclude: ['password'] }, // 排除密码字段
    order: [['created_at', 'DESC']]
  };

  if (limit) queryOptions.limit = parseInt(limit);
  if (offset) queryOptions.offset = parseInt(offset);

  // 如果需要包含角色信息
  if (includeRole) {
    queryOptions.include = [{
      model: db.roles,
      as: 'roleInfo',
      attributes: ['name', 'code', 'permissions']
    }];
  }

  const users = await User.findAll(queryOptions);
  return users;
}

/**
 * 根据传入的 field 对象中的条件，在用户表中查找一条未被标记为删除（deleted != 1）的记录，并返回该记录。
 * 如果找不到匹配的记录，则返回 null
 * @param {*} field 
 * @returns 
 */
async function getOneBy(field) {
  const result = await User.findOne({
    where: {
      ...field,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    }
  });

  return result;
}

/**
 * 根据传入的 field 对象中的条件，在用户表中查找所有未被标记为删除（deleted != 1）的记录，并返回这些记录。
 * 返回的结果不包含密码字段。
 * 
 * @param {Object} field - 查询条件对象，支持任意字段作为查询条件
 * @returns {Promise<Array<Object>>} 符合条件的用户记录数组，每个元素是不包含密码字段的用户信息对象
 */
async function getAllBy(field) {
  return User.findAll({
    where: {
      ...field,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    },
    attributes: { exclude: ['password'] }
  });
}

/**
 * 根据用户ID获取用户信息（包含角色信息）
 * 
 * 该函数通过用户ID查找用户，并关联查询用户的角色信息。
 * 自动排除已软删除的用户（deleted != 1）。
 * 返回的结果不包含密码字段。
 * 
 * @param {number} userId - 用户ID
 * @returns {Object|null} 用户信息对象（包含角色信息）或null（如果用户不存在）
 */
async function getUserWithRole(userId) {
  const user = await User.findOne({
    where: {
      id: userId,
      deleted: { [db.Sequelize.Op.ne]: 1 }
    },
    attributes: { exclude: ['password'] },
    include: [{
      model: db.roles,
      as: 'roleInfo',
      attributes: ['name', 'code', 'permissions']
    }]
  });

  return user;
}

/**
 * 检查给定的API密钥是否为VIP用户，并且VIP状态是否未过期。
 * 
 * 该函数用于验证API密钥的VIP访问权限，具有以下特点：
 * 1. 如果用户不存在，则创建新用户（使用apiKey和apiSecret）
 * 2. 如果用户已存在但没有apiSecret，则更新apiSecret
 * 3. 检查用户的VIP过期时间是否在当前时间之后
 * 4. 处理并发情况下的唯一约束冲突错误
 * 
 * @param {string} apiKey - 要检查的API密钥
 * @param {string} apiSecret - API密钥对应的密钥
 * @returns {Promise<{isVip: boolean, user: Object|null}>} 返回包含VIP状态和用户信息的对象
 * @throws {Error} 当发生非预期错误时抛出异常
 */
async function validateVipAccess(apiKey, apiSecret) {
  if (!apiKey) return { isVip: false, user: null };

  try {
    // 使用 findOrCreate 确保原子性操作，避免并发创建重复用户
    const [user, created] = await User.findOrCreate({
      where: {
        apiKey: apiKey,
      },
      defaults: {
        apiKey: apiKey,
        apiSecret: apiSecret,
        username: '',
        email: '',
        password: Date.now().toString(),
        role: 'user',
        status: 2,
        active: 1,
        deleted: 0,
      },
    });

    // 如果用户已存在但没有 apiSecret，则更新
    if (!created && !user.apiSecret && apiSecret) {
      await user.update({
        apiSecret: apiSecret,
      });
    }

    const expire = user.vip_expire;
    if (!expire) return { isVip: false, user };
    const isVip = dayjs(expire).isAfter(dayjs());
    return { isVip, user };
  } catch (error) {
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息

    // 如果是唯一约束冲突错误，重新查询用户
    if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
      console.log('检测到apiKey重复冲突，重新查询用户...');
      const user = await User.findOne({
        where: {
          apiKey: apiKey,
        },
      });

      if (user) {
        // 如果用户存在但没有 apiSecret，则更新
        if (!user.apiSecret && apiSecret) {
          await user.update({
            apiSecret: apiSecret,
          });
        }

        const expire = user.vip_expire;
        if (!expire) return { isVip: false, user };
        const isVip = dayjs(expire).isAfter(dayjs());
        return { isVip, user };
      }
    }

    console.error('validateVipAccess error:', error);
    throw error;
  }
}

/**
 * 获取所有用户数据，用于备份
 * 
 * 该函数获取数据库中的所有用户记录（包括已软删除的用户），
 * 使用 raw: true 选项以获取纯粹的 JSON 数据，提高查询性能。
 * 主要用于数据备份场景。
 * 
 * @returns {Promise<User[]>} 包含所有用户数据的数组
 */
async function getAllUsersForBackup() {
  // 使用 raw: true 来获取纯粹的 JSON 数据，提高性能
  return User.findAll({ raw: true });
}

module.exports = {
  createUser,
  deleteUserById,
  updateUserById,
  getAllUsers,
  getOneBy,
  getAllBy,
  getUserWithRole,
  validateVipAccess,
  getAllUsersForBackup,
};
