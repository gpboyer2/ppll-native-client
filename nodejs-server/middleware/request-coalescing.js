/**
 * 请求去重合并中间件 (Request Coalescing)
 *
 * 作用：1秒窗口内相同请求（method + path + 参数相同）合并处理
 * - 第一个请求正常执行
 * - 后续请求等待第一个请求的结果
 * - 响应完成后统一返回给所有等待者
 * - 1秒窗口内后续相同请求直接返回缓存结果
 */

const crypto = require('crypto');

// 存储正在处理的请求和缓存结果
// entry: { waiting: [], completed: false, cached_response: null, cache_timer: null }
const pending_requests = new Map();

/**
 * 生成请求的唯一key
 * @param {object} req - Express请求对象
 * @returns {string} 唯一标识
 */
function generateRequestKey(req) {
  const method = req.method;
  const path = req.path;

  // 序列化请求参数
  const params = {
    query: req.query,
    body: req.body
  };

  // 对参数进行稳定排序和序列化
  const normalizedParams = normalizeObject(params);
  const paramsHash = crypto
    .createHash('md5')
    .update(JSON.stringify(normalizedParams))
    .digest('hex');

  return `${method}:${path}:${paramsHash}`;
}

/**
 * 对对象进行标准化处理（确保属性顺序一致）
 * @param {any} obj - 要标准化的对象
 * @returns {any} 标准化后的对象
 */
function normalizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizeObject);
  }

  if (typeof obj === 'object') {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = normalizeObject(obj[key]);
      });
    return sorted;
  }

  return obj;
}

/**
 * 发送缓存的响应
 */
function sendCachedResponse(waiting_list, status_code, data) {
  waiting_list.forEach(({ res: waitingRes }) => {
    try {
      waitingRes.status(status_code).json(data);
    } catch (e) {
      console.error('[Request Coalescing] Failed to send cached response:', e.message);
    }
  });
}

/**
 * 请求去重合并中间件
 */
function requestCoalescingMiddleware(req, res, next) {
  const key = generateRequestKey(req);

  // 检查是否有相同请求正在处理或已缓存
  const existing_entry = pending_requests.get(key);

  if (existing_entry) {
    // 已有缓存结果，直接返回
    if (existing_entry.cached_response) {
      console.log(`[Request Coalescing] Returning cached response: ${key}`);
      const { status_code, data } = existing_entry.cached_response;
      res.status(status_code).json(data);
      return;
    }

    // 请求正在处理，加入等待队列
    console.log(`[Request Coalescing] Duplicate request detected, waiting: ${key}`);
    existing_entry.waiting.push({ req, res });
    return;
  }

  // 第一个请求，创建新条目
  const entry = {
    waiting: [],
    completed: false,
    cached_response: null,
    cache_timer: null
  };

  pending_requests.set(key, entry);

  // 拦截响应
  const originalJson = res.json;
  const originalStatus = res.status;

  res.json = function(data) {
    if (entry.completed) return;

    entry.completed = true;

    // 保存原始状态码
    const statusCode = res.statusCode;

    // 缓存响应结果
    entry.cached_response = { status_code: statusCode, data: data };

    // 恢复原始json方法并发送响应
    res.json = originalJson;
    res.status = originalStatus;
    res.status(statusCode).json(data);

    // 将结果返回给所有等待的请求
    sendCachedResponse(entry.waiting, statusCode, data);
    entry.waiting = [];

    // 1秒后清理缓存
    entry.cache_timer = setTimeout(() => {
      pending_requests.delete(key);
    }, 1000);
  };

  res.status = function(code) {
    originalStatus.call(res, code);
    return res;
  };

  // 设置超时清理（防止请求挂起）
  res.setTimeoutTimer = setTimeout(() => {
    if (!entry.completed && pending_requests.has(key)) {
      console.log(`[Request Coalescing] Request timeout cleanup: ${key}`);
      if (entry.cache_timer) clearTimeout(entry.cache_timer);
      pending_requests.delete(key);
    }
  }, 5000); // 5秒超时保护

  res.on('finish', () => {
    if (res.setTimeoutTimer) {
      clearTimeout(res.setTimeoutTimer);
    }
  });

  next();
}

module.exports = requestCoalescingMiddleware;
