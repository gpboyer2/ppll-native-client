/**
 * Hello控制器
 * 提供基础测试功能的控制器，用于系统健康检查和测试
 */
const catchAsync = require('../utils/catch-async');
const { success } = require('../utils/api-response');

const template = catchAsync(async (req, res) => {
    return sendSuccess(res, { message: 'You are here now...' }, '测试成功');
});

module.exports = {
    template
}
