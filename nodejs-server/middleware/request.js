const request = require("request");
const fs = require("fs");
const path = require("path");
const rateLimit =
  require("express-rate-limit").default || require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

/**
 * 将 -103 的错误信息写入到文件中。
 * 当错误代码为 -103 时，该函数会被调用。
 * 错误信息将被写入到 '../cache/error' 目录下的 '-103.json' 文件中。
 * 如果目录不存在，将会自动创建。
 *
 * @param {Object} error - 包含错误信息的对象。
 */
function write103ErrorToFile(error) {
  const errorInfo = JSON.stringify(error);
  const directory = path.resolve(__dirname, "../cache/error");
  const filePath = path.join(directory, "-103.json");

  // 检查目录是否存在，如果不存在则创建
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // 尝试写入文件
  fs.writeFileSync(filePath, errorInfo);
}

// IP访问频率限制中间件
const limiter = rateLimit({
  windowMs: 1000, // 1秒窗口
  max: 1, // 每个IP对同一个API接口限制1次请求
  message: "请求过于频繁，请稍后再试",
  keyGenerator: (req) => {
    // 可自定义子网掩码，比如 /64, 来自同一局域网（但设备接口地址不同）的用户，会被认为是同一个“来源”进行限流。
    // ipKeyGenerator(req, 64)
    // IPv6 地址共 128 位，格式一般为 8 组 16 位（每组 4 个十六进制位）
    // /64 表示前 64 位固定为网络前缀，后 64 位是设备自身的接口标识符（interface ID）。
    // 例如 2001:db8:abcd:0012::/64 表示一个网络，该网络内所有设备地址的前 64 位相同，后 64 位可自由变化  。
    const ip = (req.ip || "").replace(/^::ffff:/, "");
    return `${ipKeyGenerator(ip)}:${req.method}:${req.path}`; // 包含HTTP方法
  },
  skipFailedRequests: true,
  handler: (req, res) => {
    res.status(429).json({ message: "请求过于频繁，请稍后再试", code: 429 });
  },
});

module.exports = function (options, callback) {
  return request(options, function (error, response, body) {
    // 处理重定向
    if (
      response?.statusCode >= 300 &&
      response?.statusCode < 400 &&
      response?.headers?.location
    ) {
      console.log(`Redirecting to ${response?.headers?.location}`);
      return request(
        { url: response.headers.location, timeout: options.timeout },
        callback
      );
    } else {
      callback(error, response, body);
    }

    // { "code": -1003, "msg": "Way too many requests; IP(156.245.200.31) banned until 1740586824247. Please use the websocket for live updates to avoid bans." }
    if (error?.code === -1003) {
      write103ErrorToFile(error);
    }
  });
};

module.exports.limiter = limiter;
