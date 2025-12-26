/**
 * 系统控制器
 * 处理系统相关的请求和响应
 */
const systemService = require('../service/system.service.js');


/**
 * 获取本机 IPv4 地址列表
 */
const getIPv4List = (req, res) => {
  try {
    const ipList = systemService.getIPv4List();
    res.send({
      status: 'success',
      code: 200,
      data: ipList
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取 IPv4 地址列表失败',
      error: error.message
    });
  }
};


module.exports = {
  getIPv4List
};
