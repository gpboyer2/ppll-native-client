/**
 * 异步错误捕获工具
 * 包装异步函数，自动捕获Promise异常并传递给Express错误处理中间件
 */
const UtilRecord = require("../utils/record-log.js");

const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        let { message } = err;
        if (message) {
            UtilRecord.log(err);
            res.send({ status: "error", code: 400, message });
            return;
        }

        return next(err);
    });
};

module.exports = catchAsync;
