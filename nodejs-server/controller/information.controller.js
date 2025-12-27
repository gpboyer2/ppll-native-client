/**
 * Information控制器
 * 提供币安市场信息查询功能
 */
const catchAsync = require('../utils/catch-async');
const { success } = require('../utils/api-response');

const template = catchAsync(async (req, res) => {
    return sendSuccess(res, { message: 'You are here now...' }, '测试成功');
});

module.exports = {
    template
}
