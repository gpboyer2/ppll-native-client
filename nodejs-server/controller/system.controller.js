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


/**
 * 获取 Git 信息
 */
const getGitInfo = (req, res) => {
  try {
    const gitInfo = systemService.getGitInfo();
    if (!gitInfo) {
      res.status(500).send({
        status: 'error',
        code: 500,
        message: 'Git 信息未初始化'
      });
      return;
    }
    res.send({
      status: 'success',
      code: 200,
      data: gitInfo
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取 Git 信息失败',
      error: error.message
    });
  }
};


/**
 * 获取系统健康状态
 */
const getHealth = async (req, res) => {
  try {
    const healthData = await systemService.getHealth();
    res.send({
      status: 'success',
      code: 200,
      data: healthData
    });
  } catch (error) {
    res.status(500).send({
      status: 'error',
      code: 500,
      message: '获取健康状态失败',
      error: error.message
    });
  }
};


module.exports = {
  getIPv4List,
  getGitInfo,
  getHealth
};
