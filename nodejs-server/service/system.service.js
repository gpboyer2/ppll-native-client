/**
 * 系统服务层
 * 提供系统相关的业务逻辑，包括获取本机网络信息等
 */
const ipUtil = require('../utils/ip');


/**
 * 获取本机所有 IPv4 地址列表
 * @returns {Array<string>} IPv4 地址数组
 */
const getIPv4List = () => {
  try {
    const ipList = ipUtil.getIp();
    return ipList;
  } catch (error) {
    console.error('获取 IPv4 地址列表失败:', error);
    return [];
  }
};


/**
 * 获取 Git 信息
 * @returns {object} Git 信息对象
 */
const getGitInfo = () => {
  // 从全局对象获取 git 信息（由 jobs/git.js 在启动时写入）
  return (global && global.GIT_INFO) || null;
};


module.exports = {
  getIPv4List,
  getGitInfo
};
