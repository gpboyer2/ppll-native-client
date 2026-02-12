/**
 * Information控制器
 * 提供币安市场信息查询功能
 */
const catchAsync = require("../utils/catch-async");

const template = catchAsync(async (req, res) => {
    return res.apiSuccess({ message: "You are here now..." }, "测试成功");
});

module.exports = {
    template,
};
