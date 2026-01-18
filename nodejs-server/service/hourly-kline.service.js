const httpStatus = require('http-status');
const ApiError = require('../utils/api-error');
const db = require('../models');
const HourlyKline = db.HourlyKline;

/**
 * 创建小时K线记录
 * @param {Object} params 参数对象
 * @returns {Promise<HourlyKline>} 创建的K线实例
 */
const createHourlyKline = async (params) => {
  const {
    symbol,
    open_time,
    open,
    high,
    low,
    close,
    volume,
  } = params;

  if (!symbol) {
    throw new ApiError(httpStatus.BAD_REQUEST, '交易对(symbol)不能为空');
  }
  if (!open_time) {
    throw new ApiError(httpStatus.BAD_REQUEST, '开盘时间(open_time)不能为空');
  }

  const [record, created] = await HourlyKline.findOrCreate({
    where: { symbol, open_time },
    defaults: {
      symbol,
      open_time,
      open,
      high,
      low,
      close,
      volume,
    },
  });

  if (!created) {
    throw new ApiError(httpStatus.CONFLICT, '该交易对在该时间的K线已存在');
  }

  return record;
};

/**
 * 根据ID删除K线记录
 * @param {number|Array<number>} id 主键ID或ID数组
 * @returns {Promise<HourlyKline|null>} 删除的记录
 */
const deleteHourlyKline = async (id) => {
  const idList = Array.isArray(id) ? id : [id];

  const records = await HourlyKline.findAll({
    where: { id: idList },
  });

  if (records.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'K线记录不存在');
  }

  await HourlyKline.destroy({
    where: { id: idList },
  });

  return records;
};

/**
 * 根据ID更新K线记录
 * @param {number} id 主键ID
 * @param {Object} updateBody 更新内容
 * @returns {Promise<HourlyKline|null>} 更新后的记录
 */
const updateHourlyKline = async (id, updateBody) => {
  const record = await HourlyKline.findByPk(id);
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, 'K线记录不存在');
  }

  await record.update(updateBody);
  return record;
};

/**
 * 查询K线列表
 * @param {Object} filter 过滤条件
 * @param {Object} options 分页排序等选项
 * @returns {Promise<{list: HourlyKline[], pagination: Object}>} 包含分页信息的结果
 */
const queryHourlyKline = async (filter, options) => {
  const page_size = options.page_size ? parseInt(options.page_size, 10) : 20;
  const current_page = options.current_page ? parseInt(options.current_page, 10) : 1;
  const offset = (current_page - 1) * page_size;

  const order = [];
  if (options.sortBy) {
    const [field, direction = 'DESC'] = options.sortBy.split(':');
    order.push([field, direction.toUpperCase()]);
  } else {
    order.push(['open_time', 'DESC']);
  }

  const where = {};
  if (filter.symbol) {
    where.symbol = filter.symbol;
  }
  if (filter.start_time && filter.end_time) {
    where.open_time = {
      [db.Sequelize.Op.between]: [filter.start_time, filter.end_time],
    };
  }

  const { count, rows } = await HourlyKline.findAndCountAll({
    where,
    order,
    limit: page_size,
    offset,
  });

  return {
    list: rows,
    pagination: {
      current_page,
      page_size,
      total: count,
    },
  };
};

module.exports = {
  createHourlyKline,
  deleteHourlyKline,
  updateHourlyKline,
  queryHourlyKline,
};
