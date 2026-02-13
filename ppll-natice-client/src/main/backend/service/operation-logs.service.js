/**
 * 操作日志服务
 * 基于 operation_logs 表，提供查询、详情、写入与批量写入能力
 * 本地客户端系统：无需用户系统，直接使用 operator 字段
 */
const httpStatus = require("http-status");
const ApiError = require("../utils/api-error");
const db = require("../models");
const { Op } = require("sequelize");
const AnalyticsService = require("./analytics.service.js");

/**
 * 将记录转换为可安全返回的对象（当前字段无强敏感项，保留结构以便未来扩展）
 * @param {object} record Sequelize 实例或普通对象
 * @returns {object}
 */
function sanitize(record) {
    if (!record) return record;
    const data = record.toJSON ? record.toJSON() : record;
    return data;
}

/**
 * 从 UA 文本解析操作系统与浏览器类型（轻量级启发式）
 * @param {string} ua
 */
function parseUa(ua = "") {
    const text = String(ua || "").toLowerCase();
    let os = "unknown";
    if (text.includes("windows")) os = "Windows";
    else if (text.includes("mac os") || text.includes("macintosh"))
        os = "macOS";
    else if (text.includes("android")) os = "Android";
    else if (
        text.includes("iphone") ||
        text.includes("ipad") ||
        text.includes("ios")
    )
        os = "iOS";
    else if (text.includes("linux")) os = "Linux";

    let browser = "unknown";
    if (text.includes("edg/")) browser = "Edge";
    else if (text.includes("chrome/")) browser = "Chrome";
    else if (text.includes("firefox/")) browser = "Firefox";
    else if (text.includes("safari/") && !text.includes("chrome/"))
        browser = "Safari";
    else if (text.includes("trident") || text.includes("msie")) browser = "IE";

    return { os, browser };
}

/**
 * 从页面路径或扩展数据中推断模块名
 */
function deriveModule(page, extra = {}) {
    if (extra && typeof extra === "object" && extra.module) return extra.module;
    if (!page) return "unknown";
    const p = String(page);
    const seg = p.startsWith("/") ? p.slice(1) : p;
    const first = seg.split("/")[0];
    return first || "unknown";
}

/**
 * 组合含展示字段的视图对象
 */
function toViewObject(data) {
    const extra = (data && data.extra_data) || {};
    // 优先使用数据库字段，其次从 UA/扩展数据推断
    const uaParsed = parseUa(data.user_agent);
    const os = data.os || uaParsed.os;
    const browser = data.browser || uaParsed.browser;
    const operator = data.operator || "系统";
    const module_name = data.module || deriveModule(data.page, extra);
    const summary = data.summary || data.description || data.action || "";
    const ip = data.ip_address || "";
    const location = data.location || extra.location || "";
    // 新表中 status 为 0/1，兼容旧扩展定义
    let status = typeof data.status === "number" ? data.status : undefined;
    if (typeof status === "undefined") {
        if (typeof extra.status !== "undefined")
            status = String(extra.status) === "0" ? 0 : 1;
        else if (extra.error || extra.error_message) status = 0;
        else status = 1;
    }
    const time = data.operation_time || data.created_at;

    return {
        ...data,
        operator, // 操作人员
        module: module_name, // 所属模块
        summary, // 操作概要
        ip, // 操作 IP
        location, // 操作地点
        os, // 操作系统
        browser, // 浏览器类型
        status, // 操作状态(0/1)
        time, // 展示时间（优先 operation_time）
    };
}

/**
 * 针对入参中的扩展数据进行脱敏（仅处理常见敏感键名）
 * @param {object} obj 任意对象
 * @returns {object}
 */
function maskExtra(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const sensitiveKeys = [
        "password",
        "api_secret",
        "secret",
        "api_secret",
        "privateKey",
    ];
    const cloned = { ...obj };
    for (const k of sensitiveKeys) {
        if (Object.prototype.hasOwnProperty.call(cloned, k)) {
            cloned[k] = "***";
        }
    }
    return cloned;
}

/**
 * 构建 where 条件
 * @param {object} filter 过滤条件
 */
function buildWhere(filter = {}) {
    const where = {};
    const {
        id,
        ids,
        action,
        description,
        page_path,
        ip,
        start,
        end,
        module,
        operator,
        status,
    } = filter;

    // 支持按单个或多个ID查询
    if (Array.isArray(ids) && ids.length > 0) where.id = { [Op.in]: ids };
    else if (id) where.id = id;

    if (action) where.action = { [Op.like]: `%${action}%` };
    if (description) where.description = { [Op.like]: `%${description}%` };
    if (page_path) where.page = { [Op.like]: `%${page_path}%` };
    if (ip) where.ip_address = { [Op.like]: `%${ip}%` };
    if (module) where.module = { [Op.like]: `%${module}%` };
    if (operator) where.operator = { [Op.like]: `%${operator}%` };
    if (status !== undefined && status !== null && status !== "")
        where.status = Number(status) === 1 ? 1 : 0;
    if (start || end) {
        // 时间范围按 operation_time 过滤
        where.operation_time = {};
        if (start) where.operation_time[Op.gte] = new Date(start);
        if (end) where.operation_time[Op.lte] = new Date(end);
    }
    return where;
}

/**
 * 分页查询操作日志
 */
async function list(filter = {}, options = {}) {
    const where = buildWhere(filter);
    const currentPage = Math.max(parseInt(options.currentPage || 1, 10), 1);
    const pageSize = Math.min(
        Math.max(parseInt(options.pageSize || 20, 10), 1),
        200,
    );

    // 如包含按ID条件查询，则忽略分页，直接返回匹配集合
    if (where.id) {
        const rows = await db.operation_logs.findAll({
            where,
            order: [
                ["operation_time", "DESC"],
                ["id", "DESC"],
            ],
        });
        const plainRows = rows.map(sanitize);
        return {
            list: plainRows.map((r) => toViewObject(r)),
            pagination: {
                currentPage: 1,
                pageSize: plainRows.length,
                total: plainRows.length,
            },
        };
    }

    const { rows, count } = await db.operation_logs.findAndCountAll({
        where,
        order: [["operation_time", "DESC"]],
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
    });

    const plainRows = rows.map(sanitize);

    return {
        list: plainRows.map((r) => toViewObject(r)),
        pagination: {
            currentPage,
            pageSize,
            total: count,
        },
    };
}

/**
 * 详情（按主键ID）
 */
async function detail(id) {
    if (!id) throw new ApiError(httpStatus.BAD_REQUEST, "缺少参数 id");
    const item = await db.operation_logs.findByPk(id);
    if (!item) throw new ApiError(httpStatus.NOT_FOUND, "记录不存在");
    const plain = sanitize(item);
    return toViewObject(plain);
}

/**
 * 新增单条操作日志（复用 AnalyticsService.logUserAction）
 * @param {import('express').Request} req 请求对象（用于拿 ip/ua）
 */
async function create(req) {
    const body = req.body || {};
    // 提取必要字段
    const action = body.action;
    const description = body.description || null;
    const page = body.page || null;
    const ipAddress =
        body.ip || req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = body.user_agent || req.headers["user-agent"] || null;
    const extraData = maskExtra(body.extra_data || body.extraData || null);
    const operator = body.operator || "系统";
    const module_name = body.module || deriveModule(page, extraData);
    const summary = body.summary || description || action || null;
    const status =
        typeof body.status !== "undefined"
            ? Number(body.status) === 1
                ? 1
                : 0
            : undefined;
    const operation_time = body.operation_time
        ? new Date(body.operation_time)
        : new Date();

    if (!action)
        throw new ApiError(httpStatus.BAD_REQUEST, "缺少必要参数 action");

    // 复用分析服务写入能力，传入扩展选项以兼容新表字段
    await AnalyticsService.logUserAction(
        null,
        action,
        description,
        page,
        ipAddress,
        userAgent,
        extraData,
        { operator, module: module_name, summary, status, operation_time },
    );

    // 返回最近一条写入记录（无强一致性要求，仅便于客户端确认）
    const created = await db.operation_logs.findOne({
        where: { action, description, page },
        order: [["operation_time", "DESC"]],
    });
    return sanitize(
        created || {
            operator,
            module: module_name,
            action,
            summary,
            description,
            page,
            ip_address: ipAddress,
            user_agent: userAgent,
            extra_data: extraData,
            status: typeof status === "number" ? status : 1,
            operation_time: operation_time,
        },
    );
}

/**
 * 批量新增（复用 AnalyticsService.batchLogUserActions）
 */
async function batchCreate(req, logs = []) {
    if (!Array.isArray(logs) || logs.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "缺少参数 logs");
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || null;
    const ua = req.headers["user-agent"] || null;

    // 规范化并脱敏扩展字段（单用户系统）
    const normalized = logs.map((l) => ({
        action: l.action,
        description: l.description || null,
        page: l.page || null,
        ipAddress: l.ip || ip,
        userAgent: l.user_agent || l.userAgent || ua,
        extraData: maskExtra(l.extra_data || l.extraData || null),
        created_at: l.created_at || l.created_at || new Date(),
        operator: l.operator || "系统",
        module:
            l.module || deriveModule(l.page, l.extra_data || l.extraData || {}),
        summary: l.summary || l.description || l.action || null,
        status:
            typeof l.status !== "undefined"
                ? Number(l.status) === 1
                    ? 1
                    : 0
                : undefined,
        operation_time: l.operation_time || l.operationTime || new Date(),
    }));

    await AnalyticsService.batchLogUserActions(normalized);
    return { count: normalized.length };
}

/**
 * 删除（按主键ID，谨慎使用）
 */
async function remove(id) {
    if (!id) throw new ApiError(httpStatus.BAD_REQUEST, "缺少参数 id");
    const record = await db.operation_logs.findByPk(id);
    if (!record) throw new ApiError(httpStatus.NOT_FOUND, "记录不存在");
    await db.operation_logs.destroy({ where: { id } });
    return { id: Number(id) };
}

module.exports = {
    list,
    detail,
    create,
    batchCreate,
    remove,
};
