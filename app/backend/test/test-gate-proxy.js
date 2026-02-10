/**
 * Gate.io 代理连接测试脚本
 * 用于验证代理配置是否正确
 */

require("dotenv").config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

async function testGateConnection() {
  console.log('========================================');
  console.log('Gate.io 代理连接测试');
  console.log('========================================\n');

  // 检查代理配置
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    
  console.log('代理配置:', proxyUrl || '未配置');
  console.log('');

  if (!proxyUrl) {
    console.log('⚠️  警告: 未配置代理，在中国大陆可能无法访问 Gate.io');
    console.log('请在 .env.development 中设置 HTTPS_PROXY');
    console.log('');
  }

  // 测试1: 访问 Gate.io 首页
  console.log('测试1: 访问 Gate.io 首页...');
  try {
    const config = {
      method: 'get',
      url: 'https://www.gate.com/zh/price',
      timeout: 15000,
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    if (proxyUrl) {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;

    console.log(`✅ 成功! 状态码: ${response.status}, 耗时: ${duration}ms`);
    console.log(`   响应大小: ${(response.data.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
  }
  console.log('');

  // 测试2: 访问 Gate.io API
  console.log('测试2: 访问 Gate.io 币种列表 API...');
  try {
    const config = {
      method: 'post',
      url: 'https://www.gate.com/api-price/api/inner/v3/price/getAllCoinList',
      timeout: 15000,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'origin': 'https://www.gate.com',
        'referer': 'https://www.gate.com/zh/price'
      },
      data: 'page=1&pageSize=10&tab=trade&is_gate=1000001'
    };

    if (proxyUrl) {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;

    if (response.data && response.data.code === 0) {
      const coinCount = response.data.data?.list?.length || 0;
      console.log(`✅ 成功! 获取到 ${coinCount} 个币种, 耗时: ${duration}ms`);
      if (coinCount > 0) {
        console.log(`   示例: ${response.data.data.list[0].coin_short_name}`);
      }
    } else {
      console.log(`⚠️  API返回异常: code=${response.data?.code}`);
    }
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
  }
  console.log('');

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
}

testGateConnection().catch(console.error);
