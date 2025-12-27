/**
 * 统一API响应工具函数
 * 确保所有API接口返回格式完全一致
 * 格式：{status: string, message: string, data: any}
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 返回的数据
 * @param {String} message - 成功消息，默认为"操作成功"
 * @returns {Object} Express响应对象
 */
const sendSuccess = (res, data, message = '操作成功') => {
  return res.status(200).send({
    status: 'success',
    message,
    data
  });
};

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @param {Number} statusCode - HTTP状态码，默认为400
 * @returns {Object} Express响应对象
 */
const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).send({
    status: 'error',
    message,
    data: null
  });
};

module.exports = {
  sendSuccess,
  sendError
};
