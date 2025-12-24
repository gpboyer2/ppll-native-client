
/**
 * 将字符串或其他类型的值转换为布尔值
 * @param {any} value - 需要转换的值
 * @returns {boolean} 转换后的布尔值
 */
const convertToBoolean = (value) => {
  // 如果已经是布尔值，直接返回
  if (typeof value === 'boolean') {
    return value;
  }

  // 转换为字符串并转换为小写
  const stringValue = String(value).toLowerCase();

  // 支持多种形式的"false"值
  const falseValues = ['false', '0', 'no', 'n', 'off', ''];
  return !falseValues.includes(stringValue);
};


module.exports = {
  convertToBoolean
}
