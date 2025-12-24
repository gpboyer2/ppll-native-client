/**
 * IP工具
 * 提供IP地址获取、处理等相关的工具函数
 */
const os = require('os');
const https = require('https');

// 获取本机所有网络接口的信息
const networkInterfaces = os.networkInterfaces();



function getIp() {
  var ips = [];
  // 遍历网络接口以找到 IPv4 地址
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaceInfo = networkInterfaces[interfaceName];
    interfaceInfo.forEach((info) => {
      if (info.family === 'IPv4' && !info.internal) {
        ips.push(info.address);
      }
    });
  });

  return ips;
}


/**
 * 获取本机公网 IPv4 地址的函数
 * 该函数通过向 ipinfo.io 发送 HTTPS 请求来获取本机的公网 IP 地址信息
 * 
 * @returns null
 */
function ipinfo() {
  https.get('https://ipinfo.io/json', (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.ip) {
          console.log(`本机公网 IPv4 地址: ${result.ip}`);
        } else {
          console.error('无法获取公网 IPv4 地址');
        }
      } catch (error) {
        console.error('发生错误:', error.message);
      }
    });
  }).on('error', (error) => {
    console.error('发生错误:', error.message);
  });
}


/**
 * 从请求中提取客户端真实 IP（带标准化）
 * 优先使用 X-Forwarded-For 首个地址，其次为 req.ip/remoteAddress
 * 返回形如 127.0.0.1 或 203.0.113.10
 */
function getClientIp(req) {
  if (!req) return '';
  let ip = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  if (ip && typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  ip = ip || req.ip || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || '';
  // 去除 IPv4 映射前缀
  if (typeof ip === 'string') ip = ip.replace(/^::ffff:/, '');
  return ip;
}


/**
 * 基于 IP 粗略归类位置
 * - 127.0.0.1/::1 → 本地
 * - 10.* / 172.16-31.* / 192.168.* → 内网
 * - 其他 → 外网
 */
function classifyLocation(ip = '') {
  const t = String(ip || '');
  if (!t) return '未知';
  const ipv4 = t.replace(/^::ffff:/, '');
  if (ipv4 === '127.0.0.1' || t === '::1') return '本地';
  if (/^10\./.test(ipv4)) return '内网';
  if (/^192\.168\./.test(ipv4)) return '内网';
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ipv4)) return '内网';
  return '外网';
}


module.exports = {
  getIp,
  ipinfo,
  getClientIp,
  classifyLocation
};
