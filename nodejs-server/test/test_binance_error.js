const { USDMClient } = require("binance");

// 傻辉的错误凭证
const api_key = 'PlmSEpdIXeKyGW5faesIisO1PxjPgmJElj1MQSNykZ3pDjZCiMbyrJQwEYH3BiDb';
const api_secret = 'a1rHCHoA6OgPEUqD0f20b70NO0zn8iaOBPRQaRYWOOcy8glSwJe4QLAl8Jtrs9AN';

console.log('\n========== 测试错误处理 - 傻辉账户 ==========');
console.log('API Key:', api_key.substring(0, 8) + '...');
console.log('Secret Key:', api_secret.substring(0, 8) + '...');
console.log('\n调用币安 API...\n');

async function testErrorHandling() {
  try {
    const client = new USDMClient({
      api_key: api_key,
      api_secret: api_secret,
      beautify: true,
    }, {
      timeout: 10000,
    });

    const accountInfo = await client.getAccountInformation();
    console.log('✓ 成功! (不应该到这里)');
    console.log('可用余额:', accountInfo.availableBalance);
  } catch (error) {
    console.log('========== 错误响应 ==========');
    console.log('错误消息:', error.message);
    console.log('错误代码:', error.code);

    if (error.body) {
      try {
        const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        console.log('\n解析的 Body:');
        console.log('  code:', body.code);
        console.log('  msg:', body.msg);
      } catch (e) {
        console.log('\n无法解析 Body:', error.body);
      }
    }

    console.log('\n========== 错误处理逻辑模拟 ==========');

    // 模拟后端的错误处理逻辑
    let errorCode = null;
    let errorMessage = error.message || '获取账户信息失败';

    if (error.body) {
      try {
        const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        errorCode = body.code;
        errorMessage = body.msg || errorMessage;
      } catch (e) {
        // 无法解析 body
      }
    }

    if (!errorCode && error.code) {
      errorCode = error.code;
    }

    console.log('提取的错误代码:', errorCode);
    console.log('提取的错误消息:', errorMessage);

    // 检查是否是签名错误
    if (errorCode === -1022 || errorMessage.includes('Signature for this request is not valid')) {
      console.log('\n========== 用户体验优化后的错误提示 ==========');
      console.log(`API Key 配置错误，请检查以下项：

1. 检查 API Key 是否正确复制
   • 确保没有多余的空格
   • 确保复制了完整的内容

2. 检查 Secret Key 是否正确复制
   • 确保没有多余的空格
   • 确保复制了完整的内容

3. 检查币安后台权限设置
   • 访问：https://www.binance.com/zh-CN/my/settings/api-management
   • 确保启用了「U本位合约交易」权限
   • 如果设置了 IP 白名单，请删除限制或添加服务器 IP

4. 重新生成 API Key
   • 如果以上都正确，建议删除当前 API Key
   • 重新生成新的 API Key 和 Secret Key
   • 然后在系统中更新

💡 提示：签名错误通常是因为 Secret Key 输入错误或权限设置不正确。`);
    }

    // 检查是否是无效 API Key
    if (errorCode === -2015 || errorMessage.includes('Invalid API-key')) {
      console.log('\n========== 用户体验优化后的错误提示 ==========');
      console.log(`API Key 无效，请检查以下项：

1. 检查 API Key 是否正确复制
   • 确保没有多余的空格
   • 确保复制了完整的内容

2. 检查币安后台 API Key 状态
   • 访问：https://www.binance.com/zh-CN/my/settings/api-management
   • 确认 API Key 是否被禁用或删除

3. 重新生成 API Key
   • 如果 API Key 已失效，请重新生成
   • 然后在系统中更新

💡 提示：API Key 可能已过期或被删除，需要重新生成。`);
    }
  }
}

testErrorHandling().catch(console.error);
