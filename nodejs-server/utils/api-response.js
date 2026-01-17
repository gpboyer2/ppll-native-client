const { getCurrentDateTime } = require('./time');

// 统一返回格式封装中间件
const responseFormatMiddleware = (req, res, next) => {
  const start = process.hrtime();

  // 监听响应完成事件，记录请求日志
  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const elapsedTimeInMs = parseFloat((elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2));
    const ip = (req.ip || '').replace(/^::ffff:/, '');
    console.log(`[${getCurrentDateTime()}] ${ip} [${req.method}] ${req.originalUrl} - ${res.statusCode} - ${elapsedTimeInMs}ms`);
  });

  // 格式化成功返回
  // 参数顺序：datum, message
  res.apiSuccess = (datum = null, message = '操作成功') => {
    res.status(200).json({
      status: 'success',
      message,
      datum
    });
  };

  // 格式化错误返回（参数顺序与 apiSuccess 保持一致）
  // 参数顺序：datum, message
  res.apiError = (datum = null, message = '操作失败') => {
    res.status(200).json({
      status: 'error',
      message,
      datum
    });
  };

  next();
};

module.exports = responseFormatMiddleware;
