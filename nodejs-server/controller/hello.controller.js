
/**
 * Hello控制器
 * 提供基础测试功能的控制器，用于系统健康检查和测试
 */

const template = (req, res) => {
    res.send({
        status: 'success',
        code: 200,
        data: {
            message: 'You are here now...'
        }
    })
}


module.exports = {
    template
}