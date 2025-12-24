/**
 * 仪表盘控制器
 * 处理仪表盘相关的请求和响应
 */
const dashboardService = require('../service/dashboard.service.js');


/**
 * 获取仪表盘概览数据
 */
const dashboard = (req, res) => {
    const data = dashboardService.getDashboard();
    res.send({
        status: 'success',
        code: 200,
        data
    });
};


/**
 * 获取合约账户详情
 */
const account = async (req, res) => {
    const { apiKey, apiSecret } = req.body;
    const userId = req.vipUser?.id; // 通过中间件validateVipAccess可以得到vipUser
    const result = await dashboardService.getAccount(apiKey, apiSecret, userId);
    res.send(result);
};


module.exports = {
    dashboard,
    account
};