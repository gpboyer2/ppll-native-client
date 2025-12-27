
/**
 * API配置文件
 * 配置币安等交易所API密钥和相关设置
 */

// 导出多个包含 API 密钥和 API 密钥的对象供选择
const api = {
  api_key_1: {
    title: '大号专用',
    api_key: `Wx1DIVc4cM5l1mhZLMeTOb2cjB86OrcWh3qrX5NRZoKeN0Gj5zEjUIG3vO782Rok`,
    api_secret: `wKJBlo6l4hxmcibT6VDddChFHCW3BGeYQQs78co8VCUMqOjhlNSlswMTFdjBlAij`,
  },
  api_key_2: {
    title: '傻辉原用',
    api_key: 'udSD0Vbe8ahQti1X0tgmj8AZVBumanDK23m0hIZU7zNXMkWXjVerDsD6EUleQtBv',
    api_secret: '7oVuPkyngu6iytv58nRfOAez6SxKZjGnBPn6wOHLr2b8LZD5TtzHTs6yvZODxfWT'
  },
};

module.exports = {
  api
};