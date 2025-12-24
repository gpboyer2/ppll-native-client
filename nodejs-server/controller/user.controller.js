const db = require("../models");
const userService = require("../service/user.service");
const roleService = require("../service/role.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

const signUp = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    if (user) {
        res.send({ user });
        return;
    }
    res.status(httpStatus.CONFLICT).send({
        "message": "User already exists",
    })
});

const createUser = catchAsync(async (req, res) => {
    try {
        const result = await userService.createUser(req.body);
        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '创建用户失败'
        });
    }
});

const deleteUser = catchAsync(async (req, res) => {
    try {
        const deleted = await userService.deleteUserById(req.body.id);
        res.send({
            status: 'success',
            data: deleted
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '删除用户失败'
        });
    }
});

const updateUser = catchAsync(async (req, res) => {
    try {
        // 传递当前用户信息到服务层，用于权限控制
        const currentUser = req.user; // 从认证中间件获取当前用户
        const result = await userService.updateUserById(req.body.id, req.body, currentUser);

        res.send({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '更新用户失败'
        });
    }
});

const queryUser = catchAsync(async (req, res) => {
    try {
        let { id, ids, username, status, role, pageSize = 10, currentPage = 1, includeRole } = req.query;
        const currentUser = req.user; // 当前请求用户

        // 解析 id/ids 支持：id=1 或 id=1,2,3 或 ids=1,2,3 或 ids[]=1&ids[]=2
        const parseIds = (idVal, idsVal) => {
            const out = [];
            if (Array.isArray(idsVal)) {
                for (const v of idsVal) {
                    const n = Number(v);
                    if (!Number.isNaN(n)) out.push(n);
                }
            } else if (typeof idsVal === 'string') {
                for (const v of idsVal.split(',')) {
                    const n = Number(v.trim());
                    if (!Number.isNaN(n)) out.push(n);
                }
            }
            if (idVal !== undefined && idVal !== null && idVal !== '') {
                const idStr = String(idVal);
                for (const v of idStr.split(',')) {
                    const n = Number(v.trim());
                    if (!Number.isNaN(n)) out.push(n);
                }
            }
            return Array.from(new Set(out));
        };

        const idList = parseIds(id, ids);

        const filter = {};
        if (idList.length === 1) {
            filter.id = idList[0];
        } else if (idList.length > 1) {
            filter.ids = idList;
        }
        if (username) filter.username = username;
        // 处理状态筛选逻辑：1表示未知，2表示启用，3表示禁用
        // 如果status为空值(null/undefined/"")则不作限制，否则按指定状态筛选
        if (status !== undefined && status !== null && status !== '' && Number(status) !== 1) {
            filter.status = Number(status);
        }

        // 只有 super_admin 才能查看所有用户与角色（包括通过role参数过滤），
        // 其他所有角色（包括 admin）都只能查询 'user' 角色的用户
        // 补丁：只有当明确指定了role参数时才添加role过滤
        if (role !== undefined && role !== null && role !== '') {
            if (currentUser.role === 'super_admin') {
                filter.role = role;
            } else {
                filter.role = 'user';
            }
        }

        const options = {};
        if (idList.length > 0) {
            // 指定了id集合时，忽略分页，直接返回匹配集合
            options.limit = idList.length;
            options.offset = 0;
        } else {
            if (pageSize) options.limit = Number(pageSize);
            if (currentPage > 1) options.offset = (Number(currentPage) - 1) * Number(pageSize);
        }
        if (includeRole === 'true') options.includeRole = true;

        let users = await userService.getAllUsers(filter, options);

        // 计算总数
        let total = 0;
        if (idList.length > 0) {
            total = users.length;
        } else {
            if (Object.keys(filter).length) {
                const totalUsers = await userService.getAllBy(filter);
                total = totalUsers.length;
            } else {
                const totalUsers = await userService.getAllUsers();
                total = totalUsers.length;
            }
        }

        res.send({
            status: 'success',
            data: {
                list: users,
                total: total,
                pageSize: idList.length > 0 ? users.length : Number(pageSize),
                currentPage: idList.length > 0 ? 1 : Number(currentPage),
            }
        });
    } catch (error) {
        res.status(error.statusCode || httpStatus.BAD_REQUEST).send({
            status: 'error',
            code: error.statusCode || httpStatus.BAD_REQUEST,
            message: error.message || '查询用户失败'
        });
    }
});


module.exports = {
    // signUp,
    // getAllUsers,
    createUser,
    deleteUser,
    updateUser,
    queryUser,
}
