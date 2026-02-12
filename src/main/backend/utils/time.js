/**
 * 时间工具函数
 * 提供时间格式化、时间戳获取等时间相关的工具函数
 */

const moment = require("moment");

// 获取当前时间 (格式: YYYY-MM-DD HH:mm:ss)
function getCurrentDateTime(_format = "YYYY-MM-DD HH:mm:ss") {
    return moment().format(_format);
}

// 获取毫秒时间戳
function getTimeStampMS() {
    return new Date().getTime();
}

// 获取秒级时间戳
function getTimeStamp() {
    return Math.round(new Date().getTime() / 1000);
}

module.exports = {
    getCurrentDateTime,
    getTimeStampMS,
    getTimeStamp,
};
