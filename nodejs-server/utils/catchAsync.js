/**
 * 异步错误捕获工具
 * 包装异步函数，自动捕获Promise异常并传递给Express错误处理中间件
 */
const UtilRecord = require('../utils/record-log.js');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    let { message } = err;
    if (message) {
      UtilRecord.log(err);
      res.send({ status: 'error', code: 400, message });
      return;
    }

    return next(err)
  });
};


/**
 * 将错误信息记录到JSON文件中
 * @param {Object} error - 错误对象
 */
function logErrorToFile(error) {
  if (error.code === -1003) {
    // 错误信息
    const errorData = {
      timestamp: new Date().toISOString(),
      error: error
    };

    // 保存错误信息到JSON文件
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
    const filePath = path.join(cacheDir, 'error_log.json');

    fs.writeFile(filePath, JSON.stringify(errorData, null, 2), (err) => {
      if (err) {
        console.error('Failed to write error log:', err);
      } else {
        console.log('Error logged to', filePath);
      }
    });
  } else {
    console.error('Unexpected error:', error);
  }
}


module.exports = catchAsync;
