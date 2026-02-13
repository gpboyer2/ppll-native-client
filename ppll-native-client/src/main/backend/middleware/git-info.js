/**
 * 全局 git 信息注入中间件
 * 目标：为所有返回的 JSON 对象统一追加 gitInfo 字段，便于前端识别后端版本
 * 设计：
 * - 在 res.json 与 res.send 上做轻量封装，仅在响应体为对象（且非 Buffer/Array）时注入
 * - 若响应体已包含 gitInfo，则不覆盖
 * - 通过环境变量 GIT_INFO_IN_RESPONSE 控制开关（默认开启），可在需要时关闭
 */

module.exports = function gitInfoMiddleware() {
    // 读取环境开关，默认开启
    const enabled = process.env.GIT_INFO_IN_RESPONSE !== "false";

    return function (req, res, next) {
        if (!enabled) return next();

        // 缓存原始方法
        const _json = res.json.bind(res);
        const _send = res.send.bind(res);

        // 注入函数：仅处理普通对象
        const attachGitInfo = (body) => {
            try {
                if (!body) return body;
                if (typeof body !== "object") return body;
                if (Buffer.isBuffer(body)) return body;
                if (Array.isArray(body)) return body; // 避免改变数组响应结构

                // 读取全局 git 信息（由 jobs/git.js 在启动时写入）
                const git =
                    (global && (global.gitInfo || global.GIT_INFO)) || null;
                if (!git) return body;

                // 已存在时不覆盖
                if (!Object.prototype.hasOwnProperty.call(body, "gitInfo")) {
                    body.gitInfo = git;
                }
            } catch (e) {
                // 静默失败，不影响业务响应
            }
            return body;
        };

        // 重写 res.json
        res.json = function (body) {
            return _json(attachGitInfo(body));
        };

        // 重写 res.send：仅在传入对象时处理
        res.send = function (body) {
            if (
                typeof body === "object" &&
                !Buffer.isBuffer(body) &&
                !Array.isArray(body)
            ) {
                return _send(attachGitInfo(body));
            }
            return _send(body);
        };

        next();
    };
};
