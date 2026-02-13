/**
 * 请求去重合并中间件
 *
 * 1秒窗口内相同请求合并处理：
 * - 第一个请求正常执行
 * - 后续请求等待第一个请求的结果
 * - 响应完成后统一返回给所有等待者
 * - 1秒窗口内后续相同请求直接返回缓存结果
 */

const crypto = require("crypto");

const pending_requests = new Map();

/**
 * 生成请求唯一标识
 */
function generateRequestKey(req) {
    const params = {
        query: req.query,
        body: req.body,
    };

    const normalizedParams = normalizeObject(params);
    const paramsHash = crypto
        .createHash("md5")
        .update(JSON.stringify(normalizedParams))
        .digest("hex");

    return `${req.method}:${req.path}:${paramsHash}`;
}

/**
 * 对对象进行标准化处理（确保属性顺序一致）
 */
function normalizeObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(normalizeObject);
    }

    if (typeof obj === "object") {
        const sorted = {};
        Object.keys(obj)
            .sort()
            .forEach((key) => {
                sorted[key] = normalizeObject(obj[key]);
            });
        return sorted;
    }

    return obj;
}

/**
 * 发送缓存响应给等待队列
 */
function sendCachedResponse(waiting_list, status_code, data) {
    waiting_list.forEach(({ res }) => {
        try {
            res.status(status_code).json(data);
        } catch (e) {
            console.error(
                "[Request Coalescing] Failed to send cached response:",
                e.message,
            );
        }
    });
}

/**
 * 请求去重合并中间件
 */
function requestCoalescingMiddleware(req, res, next) {
    // 跳过 OPTIONS 预检请求
    if (req.method === "OPTIONS") {
        return next();
    }

    const key = generateRequestKey(req);
    const existing_entry = pending_requests.get(key);

    // 已有缓存结果，直接返回
    if (existing_entry?.cached_response) {
        const { status_code, data } = existing_entry.cached_response;
        return res.status(status_code).json(data);
    }

    // 请求正在处理，加入等待队列
    if (existing_entry) {
        existing_entry.waiting.push({ res });
        return;
    }

    // 第一个请求，创建新条目
    const entry = {
        waiting: [],
        completed: false,
        cached_response: null,
        cache_timer: null,
        timeout_timer: null,
    };

    pending_requests.set(key, entry);

    // 拦截 res.json 以缓存响应
    const originalJson = res.json;

    res.json = function (data) {
        if (entry.completed) return;

        entry.completed = true;
        const statusCode = res.statusCode;
        entry.cached_response = { status_code: statusCode, data };

        // 恢复原始方法并发送响应
        res.json = originalJson;
        res.status(statusCode).json(data);

        // 返回给等待队列
        sendCachedResponse(entry.waiting, statusCode, data);
        entry.waiting = [];

        // 1秒后清理缓存
        entry.cache_timer = setTimeout(() => {
            pending_requests.delete(key);
        }, 1000);
    };

    // 超时保护：5秒后清理未完成的请求
    entry.timeout_timer = setTimeout(() => {
        if (!entry.completed) {
            pending_requests.delete(key);
        }
    }, 5000);

    // 请求完成后清理超时定时器
    res.on("finish", () => {
        if (entry.timeout_timer) {
            clearTimeout(entry.timeout_timer);
        }
    });

    next();
}

module.exports = requestCoalescingMiddleware;
