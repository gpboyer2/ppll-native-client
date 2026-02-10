/**
 * 模板服务
 * 提供模板相关的业务逻辑处理，包括模板管理和数据操作
 */
const db = require("../models");
const Order = db.orders;
const ApiError = require("../utils/api-error");
const httpStatus = require("http-status");


const createOrder = async (params) => {
  const order = Object.assign({}, {
    password: Date.now(),
    active: 0,
    status: 0,
    deleted: 0
  }, params);

  const [row, created] = await Order.findOrCreate({
    where: { email: order.email },
    defaults: order,
  });

  if (created) {
    return row;
  }

  return null;
};


/**
 * 获取所有订单
 * @param {Object} filter - 查询条件
 * @param {Object} options - 分页选项
 * @param {number} options.page - 页码，默认为1
 * @param {number} options.limit - 每页数量，默认为10
 * @returns {Promise<any>} 包含订单总数，总页数，当前页码，以及订单数据的对象
 */
const getAllOrders = async (filter = {}, options = { page: 1, limit: 10 }) => {
  try {
    const { page = 1, limit = 10 } = options;
    const offset = page ? (page - 1) * limit : 0;

    const { count, rows } = await Order.findAndCountAll({
      where: filter,
      limit,
      offset,
      order: [["id", "DESC"]], // 按ID降序排列
    });

    return {
      list: rows,
      pagination: {
        total: count,
        currentPage: page,
        pageSize: limit
      }
    };
  } catch (error) {
    console.error("⚠️ 获取订单失败:", error);
    if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, '【获取订单】失败');
  }
};

const getOrderById = async (id) => {
  return Order.findOne({ where: { id } });
};

/**
 * 查询订单列表（支持单个id、多个id和分页查询）
 * @param {Object} filter - 查询条件
 * @param {string|number} filter.id - 单个订单ID
 * @param {string} filter.ids - 多个订单ID，逗号分隔
 * @param {Object} options - 分页选项
 * @param {number} options.page - 页码，默认为1
 * @param {number} options.pageSize - 每页数量，默认为10
 * @returns {Promise<any>} 包含列表数据、总数、分页信息的对象
 */
const queryOrders = async (filter = {}, options = {}) => {
  try {
    const { id, ids, ...otherFilters } = filter;
    const { page = 1, pageSize = 10 } = options;

    // 构建查询条件
    let where = { ...otherFilters };

    // 处理单个ID查询
    if (id) {
      where.id = id;
    }

    // 处理多个ID查询
    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        where.id = idArray;
      }
    }

    // 如果是查询单个ID，直接返回该记录
    if (id && !ids) {
      const order = await Order.findOne({ where });
      return {
        list: order ? [order.toJSON()] : [],
        pagination: {
          total: order ? 1 : 0,
          currentPage: 1,
          pageSize: 1
        }
      };
    }
        
    // 否则进行分页查询
    const offset = (page - 1) * pageSize;
    const { count, rows } = await Order.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["id", "DESC"]]
    });
        
    return {
      list: rows.map(row => row.toJSON()),
      pagination: {
        total: count,
        currentPage: page,
        pageSize: pageSize
      }
    };
  } catch (error) {
    console.error("⚠️ 查询订单失败:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, '【查询订单】失败');
  }
};

const getOrderByEmail = async (email) => {
  return Order.findOne({ where: { email } });
};


const updateOrderById = async (orderId, updateBody) => {
  const { ordername, email, password, active, status } = updateBody;
  const order = {
    ordername,
    email,
    active,
    status,
  };
  if (password) {
    order.password = Date.now();
  }

  const row = await Order.update(order, {
    where: { id: orderId },
  });
  return row;
};


const deleteOrderById = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) return null;
  await order.destroy();
  return order;
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  queryOrders,
  getOrderByEmail,
  updateOrderById,
  deleteOrderById,
};
