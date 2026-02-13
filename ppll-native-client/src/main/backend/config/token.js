/**
 * Token类型和过期时间配置
 * 定义系统中使用的各种token类型和其过期时间
 */
const tokenTypes = {
    ACCESS: "access",
    REFRESH: "refresh",
    RESET_PASSWORD: "resetPassword",
    VERIFY_EMAIL: "verifyEmail",
};

module.exports = {
    tokenTypes,
};
