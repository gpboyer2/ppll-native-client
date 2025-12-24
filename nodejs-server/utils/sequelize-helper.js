/**
 * 通过重命名指定的键来递归转换对象或对象数组。
 * 这是一个纯函数，不会修改原始数据。
 * @param {any} data 输入数据（对象或数组）。
 * @param {Object} keyMap 一个映射旧键到新键的对象，例如 { createdAt: 'created_at' }。
 * @returns {any} 转换后的数据。
 */
function renameKeys(data, keyMap) {
  if (Array.isArray(data)) {
    return data.map(item => renameKeys(item, keyMap));
  }

  // 这是一个纯粹的对象，而不是 Sequelize 实例或其他类
  if (data && typeof data === 'object' && data.constructor === Object) {
    const newObj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const newKey = keyMap[key] || key;
        // 仅对每个对象的顶层键应用重命名
        newObj[newKey] = data[key];
      }
    }
    return newObj;
  }

  return data;
}

/**
 * 将 Sequelize 的默认时间戳字段（createdAt, updatedAt）格式化为下划线命名（snake_case）。
 * 此函数接收来自 Sequelize 查询的原始数据对象（或其数组）
 * ，并返回一个键名被重命名的新对象。
 *
 * @param {Object|Array<Object>} data 来自 Sequelize 查询的原始数据。
 * @returns {Object|Array<Object>} 格式化后的数据。
 */
function formatTimestamps(data) {
  if (!data) return data;
  const keyMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  return renameKeys(data, keyMap);
}

module.exports = {
  formatTimestamps,
  renameKeys,
};