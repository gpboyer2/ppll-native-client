/**
 * 创建由拾取的对象属性组成的对象
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
       
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

/**
 * 过滤参数函数, 不在数据模型中要求的, 或者为null/undefined的不返回
 * @params {Object} params - 请求参数
 * @params {Object} model - 数据模型
 * @returns {Object} 过滤后的参数
 *
 * @use
 *  const filteredParams = filterParams(params, GridStrategy);
 */
const filterParams = (params, model) => {
  const allowedFields = Object.keys(model.rawAttributes);
  return Object.keys(params).reduce((acc, key) => {
    if (allowedFields.includes(key)) {
      acc[key] = params[key];
    }
    return acc;
  }, {});
};

/**
 * 根据 Sequelize Model 的字段定义，自动剔除无效值并转换成正确的数据类型。
 * 常用于清洗前端传入的 body / query / params，再直接投喂给 Sequelize 的
 * create / update / findOrCreate / bulkCreate 等方法。
 *
 * @param {object} payload  - 前端原始参数对象（req.body / req.query / req.params）
 * @param {import('sequelize').ModelStatic<import('sequelize').Model>} model
 *                            - Sequelize Model（内部读取 rawAttributes）
 * @returns {object}          - 已清洗且类型正确的参数对象
 *
 * @example
 * const clean = sanitizeParams(req.body, User);
 * await User.create(clean);
 *
 * @throws {Error} 如果未传入合法的 Sequelize Model
 */
function sanitizeParams(payload, model) {
  if (!model || !model.rawAttributes) {
    throw new Error('sanitizeParams: 请传入 Sequelize Model');
  }

  const attrs = model.rawAttributes;
  return Object.entries(payload).reduce((acc, [key, val]) => {
    // 剔除无效值
    if (val === undefined || val === null || val === '' || Number.isNaN(val)) return acc;

    const def = attrs[key];
    if (!def) return acc; // 不在模型中的字段直接忽略

    // 类型转换
    let parsed = val;
    const typeKey = /** @type {any} */ (def.type).key || '';
    switch (typeKey) {
      case 'INTEGER':
      case 'BIGINT':
        parsed = Number(val);
        break;
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
        parsed = parseFloat(val);
        break;
      case 'BOOLEAN':
        parsed = Boolean(val);
        break;
      case 'DATE':
      // parsed = new Date(val);
        break;
      default:
      // parsed = String(val); 
        break;
    }
    acc[key] = parsed;
    return acc;
  }, {});
};


module.exports = { pick, filterParams, sanitizeParams };

