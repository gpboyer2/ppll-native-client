const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const db = require('../models');
const MarkPrice = db.MarkPrice;
const UtilRecord = require('../utils/record-log.js');


/**
 * 创建一条标记价格记录
 * @param {Object} params 参数对象
 * @returns {Promise<MarkPrice>} 创建的标记价格实例
 */
const createMarkPrice = async (params) => {
  const {
    event_type = 'markPriceUpdate',
    event_time,
    symbol,
    mark_price,
    index_price,
    estimated_settle_price,
    funding_rate,
    next_funding_time,
  } = params;

  if (!symbol) {
    throw new ApiError(httpStatus.BAD_REQUEST, '交易对(symbol)不能为空');
  }

  const [record, created] = await MarkPrice.findOrCreate({
    where: { symbol },
    defaults: {
      event_type,
      event_time,
      symbol,
      mark_price,
      index_price,
      estimated_settle_price,
      funding_rate,
      next_funding_time,
    },
  });

  if (!created) {
    throw new ApiError(httpStatus.CONFLICT, '该交易对标记价格已存在');
  }

  return record;
};

/**
 * 根据ID删除标记价格记录
 * @param {number} id 主键ID
 * @returns {Promise<MarkPrice|null>} 删除的记录
 */
const deleteMarkPriceById = async (id) => {
  const record = await MarkPrice.findByPk(id);
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, '标记价格记录不存在');
  }
  await record.destroy();
  return record;
};

/**
 * 根据ID更新标记价格记录
 * @param {number} id 主键ID
 * @param {Object} updateBody 更新内容
 * @returns {Promise<MarkPrice|null>} 更新后的记录
 */
const updateMarkPriceById = async (id, updateBody) => {
  const record = await MarkPrice.findByPk(id);
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, '标记价格记录不存在');
  }

  // 过滤空值
  Object.keys(updateBody).forEach((key) => {
    if (updateBody[key] === null || updateBody[key] === undefined) {
      delete updateBody[key];
    }
  });

  await record.update(updateBody);
  return record;
};

/**
 * 查询标记价格列表
 * @param {Object} filter 过滤条件
 * @param {Object} options 分页排序等选项
 * @returns {Promise<{list: MarkPrice[], total: number, page: number, limit: number}>} 包含分页信息的结果
 */
const queryMarkPrices = async (filter, options) => {
  const limit = options.limit ? parseInt(options.limit, 10) : 10;
  const page = options.page ? parseInt(options.page, 10) : 1;
  const offset = (page - 1) * limit;

  const order = [];
  if (options.sortBy) {
    const [field, direction = 'ASC'] = options.sortBy.split(':');
    order.push([field, direction.toUpperCase()]);
  } else {
    order.push(['id', 'ASC']); // 默认排序
  }

  const where = {};
  if (filter.symbol) {
    where.symbol = normalizeSymbol(filter.symbol);; // 按规范化后的 symbol 查询
  }

  const { count, rows } = await MarkPrice.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });

  return {
    list: rows,
    total: count,
    page,
    limit,
  };
};

/**
 * 规范化用户输入的 symbol 为数据库存储格式（全大写 + 无分隔符）
 * 示例: 
 *   - "ETH/USDT" → "ETHUSDT"
 *   - "btc"      → "BTCUSDT"（默认交易对是 USDT）
 *   - "SOL-USD"  → "SOLUSD"
 * @param {string} userInput - 用户输入的 symbol（如 ETH、Btc、ethusdt）
 * @returns {string} 规范化后的 symbol（如 ETHUSDT）
 */
const normalizeSymbol = (userInput) => {
  // 移除所有非字母字符（如 /、-），并转为全大写
  let symbol = userInput.toUpperCase().replace(/[\/\-]/g, '');

  // 如果用户只输入了币种代号（如 ETH、BTC），默认补全为 "XXXUSDT"
  // 注意：根据实际需求调整默认后缀（如 USDT、USD、BTC 等）
  if (symbol.length > 0 && !symbol.includes('USDT') && !symbol.includes('USD')) {
    symbol += 'USDT'; // 默认补全为 USDT 交易对
  }

  return symbol;
};

/**
 * 根据symbol获取单条记录
 * @param {string} symbol 交易对
 * @returns {Promise<MarkPrice|null>}
 */
const getMarkPriceBySymbol = async (symbol) => {
  return MarkPrice.findOne({ where: { symbol } });
};


/**
 * 批量更新标记价格记录
 * @param {Array} records 需要更新的记录数组
 * @returns {Promise<void>}
 */
const bulkUpdateMarkPrices = async (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    UtilRecord.log('批量更新标记价格时，传入的记录数组为空');
    return;
  }

  try {
    await MarkPrice.bulkCreate(records, {
      updateOnDuplicate: [
        'mark_price',
        'index_price',
        'estimated_settle_price',
        'funding_rate',
        'next_funding_time',
        'updated_at'
      ],
      // 批量更新标记价格的SQL语句过长，建议关闭日志
      // 设置环境变量 DISABLE_MARK_PRICE_SQL_LOGGING=true 可关闭
      logging: process.env.DISABLE_MARK_PRICE_SQL_LOGGING === 'true' ? false : console.log
    });
    UtilRecord.log(`批量更新了 ${records.length} 条标记价格记录`);
  } catch (error) {
    // 打印完整错误信息便于排查
    UtilRecord.log('批量更新标记价格失败:', error.message || error);
    if (error.original) {
      UtilRecord.log('数据库原始错误:', error.original.message || error.original);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, '批量更新标记价格失败');
  }
};


module.exports = {
  createMarkPrice,
  deleteMarkPriceById,
  updateMarkPriceById,
  queryMarkPrices,
  getMarkPriceBySymbol,
  bulkUpdateMarkPrices,
};