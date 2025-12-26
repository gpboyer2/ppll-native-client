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


module.exports = {
  getIPv4List
};
